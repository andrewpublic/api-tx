import { DynamoDBClient, GetItemCommand, UpdateItemCommand, QueryCommand } from "@aws-sdk/client-dynamodb";
import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import type { SQSEvent } from "aws-lambda";
import OpenAI from "openai";
import type { EnrichMessage, SheetsMessage, EnrichmentResult, TransactionItem, UserItem } from "../types.js";
import { BUDGET_THRESHOLDS } from "../types.js";

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

Budget buckets and sub-categories:
- "Short Savings": "Cool Stuff" (entertainment, events, concerts, experiences), "Medical" (health appointments, pharmacy, supplements), "Gifts" (presents for others)
- "Spendathon": "Solo" (personal groceries, meals, coffee, personal items, fuel), "Partner – Regular" (regular shared expenses with partner), "Partner – Special" (special occasions with partner, flowers, dates), "Clothes" (clothing, accessories)
- "Bills": "Rent" (housing rent payments), "Utilities" (subscriptions, phone, internet, electricity, gym, streaming services, boxing, haircuts)
- "Long Savings": "Savings" (savings transfers, investments, superannuation)
- "Buffer": "Reserve" (emergency funds), "Marketing" (business or marketing expenses)

Split types:
- "Personal" — solely your own expense
- "Shared" — split equally with others
- "Partner's" — partner's expense you're tracking

Rules:
- Savings account transfers → Long Savings / Savings
- BPAY rent payments → Bills / Rent
- Supermarkets (Woolworths, Coles, Aldi, IGA) → Spendathon / Solo
- Cafes, restaurants, UberEats, DoorDash → Spendathon / Solo (unless clearly a date → Partner – Special)
- Petrol stations → Spendathon / Solo
- Netflix, Spotify, Disney+, Apple, Claude, etc. → Bills / Utilities
- Gyms, boxing clubs → Bills / Utilities
- Pharmacies, medical centres, physio → Short Savings / Medical
- Protein powder, supplements → Short Savings / Medical

Normalise merchantNormalized to a clean human-readable name (e.g. "ALDI STORES #42" → "Aldi").

Return ONLY valid JSON, no markdown:
{"bucket":"...","category":"...","split":"...","merchantNormalized":"..."}`;

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

// ── Budget threshold check ────────────────────────────────────────────────────

async function getMonthlyBucketSpend(userId: string, bucket: string): Promise<number> {
  const now          = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const result = await dynamo.send(new QueryCommand({
    TableName: TRANSACTIONS_TABLE,
    IndexName: "userId-settledAt-index",
    KeyConditionExpression: "userId = :uid AND settledAt >= :start",
    FilterExpression: "#bucket = :bucket AND amountInCents < :zero",
    ExpressionAttributeNames: { "#bucket": "bucket" },
    ExpressionAttributeValues: marshall({
      ":uid":    userId,
      ":start":  startOfMonth,
      ":bucket": bucket,
      ":zero":   0,
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
          "SET #bucket = :bucket, category = :cat, #split = :split, merchantNormalized = :merchant, enriched = :true, enrichedAt = :now",
        ExpressionAttributeNames: { "#bucket": "bucket", "#split": "split" },
        ExpressionAttributeValues: marshall({
          ":bucket":   enrichment.bucket,
          ":cat":      enrichment.category,
          ":split":    enrichment.split,
          ":merchant": enrichment.merchantNormalized,
          ":true":     true,
          ":now":      new Date().toISOString(),
        }),
      }));

      // Budget alert — debits only, skip savings transfers
      const isDebit   = tx.amountInCents < 0;
      const isSavings = enrichment.bucket === "Long Savings";
      const threshold = BUDGET_THRESHOLDS[enrichment.bucket];

      if (isDebit && !isSavings && threshold !== undefined) {
        const spent = await getMonthlyBucketSpend(userId, enrichment.bucket);
        const pct   = (spent / threshold) * 100;

        if (pct >= 90) {
          const userResult = await dynamo.send(new GetItemCommand({
            TableName: USERS_TABLE,
            Key: marshall({ userId }),
          }));
          const user = unmarshall(userResult.Item!) as UserItem;

          if (user.mobileNumber) {
            const msg = `Budget alert: ${enrichment.bucket} is at ${Math.round(pct)}% ($${spent.toFixed(0)} of $${threshold}) this month.`;
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
