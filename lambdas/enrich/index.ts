import { DynamoDBClient, GetItemCommand, UpdateItemCommand, QueryCommand } from "@aws-sdk/client-dynamodb";
import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import type { SQSEvent } from "aws-lambda";
import OpenAI from "openai";
import type { EnrichMessage, SheetsMessage, EnrichmentResult, TransactionItem, UserItem } from "../types.js";
import { SUBCATEGORY_THRESHOLDS } from "../types.js";

const dynamo        = new DynamoDBClient({});
const secretsClient = new SecretsManagerClient({});
const sqs           = new SQSClient({});

const {
  TRANSACTIONS_TABLE,
  USERS_TABLE,
  SHEETS_QUEUE_URL,
  DEEPSEEK_SECRET_ARN,
  TWILIO_SECRET_ARN,
} = process.env as Record<string, string>;

// ── Secret caching ────────────────────────────────────────────────────────────

const secretCache = new Map<string, Record<string, string>>();

async function getSecret(arn: string): Promise<Record<string, string>> {
  if (!secretCache.has(arn)) {
    const res = await secretsClient.send(new GetSecretValueCommand({ SecretId: arn }));
    secretCache.set(arn, JSON.parse(res.SecretString!));
  }
  return secretCache.get(arn)!;
}

let deepseekClient: OpenAI | undefined;

async function getDeepSeekClient(): Promise<OpenAI> {
  if (!deepseekClient) {
    const { apiKey } = await getSecret(DEEPSEEK_SECRET_ARN);
    deepseekClient = new OpenAI({ baseURL: "https://api.deepseek.com", apiKey });
  }
  return deepseekClient;
}

// ── Categorisation ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a personal finance assistant categorising Australian bank transactions.

Valid subcategories and their parent buckets:
- "Cool Stuff" (Short Savings) — entertainment, events, concerts, experiences
- "Medical" (Short Savings) — health appointments, pharmacy, supplements, protein powder
- "Gifts" (Short Savings) — presents for others
- "Solo" (Spendathon) — personal groceries, meals, coffee, personal items, fuel
- "Partner – Regular" (Spendathon) — regular shared expenses with partner
- "Partner – Special" (Spendathon) — special occasions with partner, flowers, dates
- "Clothes" (Spendathon) — clothing, accessories
- "Rent" (Bills) — housing rent payments, BPAY rent
- "Utilities" (Bills) — subscriptions, phone, internet, electricity, gym, streaming, boxing, haircuts
- "Savings" (Long Savings) — savings transfers, investments, superannuation
- "Reserve" (Buffer) — emergency funds
- "Marketing" (Buffer) — business or marketing expenses

Rules:
- Savings account transfers → Savings / Long Savings
- BPAY rent payments → Rent / Bills
- Supermarkets (Woolworths, Coles, Aldi, IGA) → Solo / Spendathon
- Cafes, restaurants, UberEats, DoorDash → Solo / Spendathon (unless clearly a date → Partner – Special)
- Petrol stations → Solo / Spendathon
- Netflix, Spotify, Disney+, Apple, Claude, etc. → Utilities / Bills
- Gyms, boxing clubs → Utilities / Bills
- Pharmacies, medical centres, physio → Medical / Short Savings
- Protein powder, supplements → Medical / Short Savings

Split types:
- "Personal" — solely your own expense
- "Shared" — split equally with others
- "Partner's" — partner's expense you're tracking

Normalise merchantNormalized to a clean human-readable name (e.g. "ALDI STORES #42" → "Aldi").

Return ONLY valid JSON, no markdown:
{"bucket":"...","subcategory":"...","split":"...","merchantNormalized":"..."}`;

async function categorise(
  description: string,
  amount: string,
  rawText: string,
): Promise<EnrichmentResult> {
  const client  = await getDeepSeekClient();
  const userMsg = `Transaction: "${description}"${rawText ? ` (raw: "${rawText}")` : ""} — AUD ${amount}`;

  const res = await client.chat.completions.create({
    model: "deepseek-chat",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user",   content: userMsg },
    ],
    temperature: 0.1,
    max_tokens: 150,
  });

  return JSON.parse(res.choices[0]!.message.content!.trim()) as EnrichmentResult;
}

// ── Pay cycle spend ───────────────────────────────────────────────────────────

function getPayCycleStartISO(): string {
  // Determine current date in Melbourne
  const nowParts = new Intl.DateTimeFormat("en-AU", {
    timeZone: "Australia/Melbourne",
    year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date());
  const np = Object.fromEntries(nowParts.map(({ type, value }) => [type, value]));
  const day   = parseInt(np.day!);
  const month = parseInt(np.month!); // 1-indexed
  const year  = parseInt(np.year!);

  // Cycle starts on the 14th; if today is before the 14th, use last month's 14th
  let startMonth = day >= 14 ? month : month - 1;
  let startYear  = year;
  if (startMonth === 0) { startMonth = 12; startYear--; }

  // Convert Melbourne midnight on the 14th → UTC
  // Strategy: check what Melbourne shows for UTC midnight on the 14th to get the offset
  const utcMidnight14 = new Date(Date.UTC(startYear, startMonth - 1, 14, 0, 0, 0));
  const melbHourParts = new Intl.DateTimeFormat("en-AU", {
    timeZone: "Australia/Melbourne",
    hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(utcMidnight14);
  const hp = Object.fromEntries(melbHourParts.map(({ type, value }) => [type, value]));
  const offsetMs = (parseInt(hp.hour!) * 60 + parseInt(hp.minute!)) * 60 * 1000;

  // Melbourne midnight = UTC midnight − offset
  return new Date(utcMidnight14.getTime() - offsetMs).toISOString();
}

async function getPayCycleSubcategorySpend(userId: string, subcategory: string): Promise<number> {
  const cycleStart = getPayCycleStartISO();

  const result = await dynamo.send(new QueryCommand({
    TableName: TRANSACTIONS_TABLE,
    IndexName: "userId-settledAt-index",
    KeyConditionExpression: "userId = :uid AND settledAt >= :start",
    FilterExpression: "subcategory = :sub AND amountInCents < :zero",
    ExpressionAttributeValues: marshall({
      ":uid":   userId,
      ":start": cycleStart,
      ":sub":   subcategory,
      ":zero":  0,
    }),
    ProjectionExpression: "amountInCents",
  }));

  const items = (result.Items ?? []).map(unmarshall) as Pick<TransactionItem, "amountInCents">[];
  return Math.abs(items.reduce((sum, tx) => sum + tx.amountInCents, 0)) / 100;
}

async function sendSmsAlert(mobileNumber: string, message: string): Promise<void> {
  const { accountSid, authToken, fromNumber } = await getSecret(TWILIO_SECRET_ARN);
  const body = new URLSearchParams({ To: mobileNumber, From: fromNumber!, Body: message });

  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    },
  );

  if (!res.ok) console.error("Twilio error:", await res.text());
}

// ── Handler ───────────────────────────────────────────────────────────────────

export const handler = async (event: SQSEvent): Promise<void> => {
  for (const record of event.Records) {
    const { userId, transactionId } = JSON.parse(record.body) as EnrichMessage;

    try {
      const txResult = await dynamo.send(new GetItemCommand({
        TableName: TRANSACTIONS_TABLE,
        Key: marshall({ userId, transactionId }),
      }));

      if (!txResult.Item) {
        console.error(`Transaction not found: ${transactionId}`);
        continue;
      }

      const tx = unmarshall(txResult.Item) as TransactionItem;

      if (tx.enriched) {
        console.log(`Already enriched: ${transactionId}`);
        continue;
      }

      const enrichment = await categorise(tx.description, tx.amount, tx.rawText);
      console.log(`Enriched ${transactionId}:`, enrichment);

      await dynamo.send(new UpdateItemCommand({
        TableName: TRANSACTIONS_TABLE,
        Key: marshall({ userId, transactionId }),
        UpdateExpression:
          "SET #bucket = :bucket, subcategory = :sub, #split = :split, merchantNormalized = :merchant, enriched = :true, enrichedAt = :now",
        ExpressionAttributeNames: { "#bucket": "bucket", "#split": "split" },
        ExpressionAttributeValues: marshall({
          ":bucket":   enrichment.bucket,
          ":sub":      enrichment.subcategory,
          ":split":    enrichment.split,
          ":merchant": enrichment.merchantNormalized,
          ":true":     true,
          ":now":      new Date().toISOString(),
        }),
      }));

      // Budget alert — skip savings and zero-threshold subcategories
      const isSavings = enrichment.subcategory === "Savings";
      const threshold = SUBCATEGORY_THRESHOLDS[enrichment.subcategory];

      if (!isSavings && threshold !== undefined && threshold > 0) {
        const spent = await getPayCycleSubcategorySpend(userId, enrichment.subcategory);
        const pct   = (spent / threshold) * 100;

        if (pct >= 90) {
          const userResult = await dynamo.send(new GetItemCommand({
            TableName: USERS_TABLE,
            Key: marshall({ userId }),
          }));
          const user = unmarshall(userResult.Item!) as UserItem;

          if (user.mobileNumber) {
            const msg = `Budget alert: ${enrichment.subcategory} is at ${Math.round(pct)}% ($${spent.toFixed(0)} of $${threshold}) this pay cycle.`;
            await sendSmsAlert(user.mobileNumber, msg);
            console.log(`SMS sent: ${msg}`);
          }
        }
      }

      await sqs.send(new SendMessageCommand({
        QueueUrl: SHEETS_QUEUE_URL,
        MessageBody: JSON.stringify({ userId, transactionId } satisfies SheetsMessage),
      }));

    } catch (err) {
      console.error(`Error enriching ${transactionId}:`, err);
      throw err; // SQS retry → DLQ after maxReceiveCount
    }
  }
};
