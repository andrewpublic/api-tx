import { DynamoDBClient, ScanCommand, PutItemCommand, QueryCommand, UpdateItemCommand } from "@aws-sdk/client-dynamodb";
import { KMSClient, DecryptCommand } from "@aws-sdk/client-kms";
import { SQSClient, SendMessageBatchCommand } from "@aws-sdk/client-sqs";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import type { UpTransaction, UpTransactionsResponse, UserItem, EnrichMessage } from "../types.js";

const dynamo = new DynamoDBClient({});
const kms    = new KMSClient({});
const sqs    = new SQSClient({});
const s3     = new S3Client({});

const { USERS_TABLE, TRANSACTIONS_TABLE, ENRICH_QUEUE_URL, RAW_BUCKET } = process.env as Record<string, string>;

async function decryptApiKey(encryptedBase64: string): Promise<string> {
  const result = await kms.send(new DecryptCommand({
    CiphertextBlob: Buffer.from(encryptedBase64, "base64"),
  }));
  return Buffer.from(result.Plaintext!).toString("utf8");
}

async function fetchUpBankTransactions(apiKey: string, since: string): Promise<UpTransaction[]> {
  const transactions: UpTransaction[] = [];
  let url: string | null =
    `https://api.up.com.au/api/v1/transactions?filter[status]=SETTLED&page[size]=100&filter[since]=${encodeURIComponent(since)}`;

  while (url) {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${apiKey}` } });
    if (!res.ok) throw new Error(`Up Bank API ${res.status}: ${await res.text()}`);
    const data = (await res.json()) as UpTransactionsResponse;
    transactions.push(...data.data);
    url = data.links.next ?? null;
  }

  return transactions;
}

async function txExists(userId: string, transactionId: string): Promise<boolean> {
  const result = await dynamo.send(new QueryCommand({
    TableName: TRANSACTIONS_TABLE,
    KeyConditionExpression: "userId = :uid AND transactionId = :tid",
    ExpressionAttributeValues: marshall({ ":uid": userId, ":tid": transactionId }),
    Select: "COUNT",
  }));
  return (result.Count ?? 0) > 0;
}

export const handler = async (event: { userId?: string }): Promise<void> => {
  let users: UserItem[];

  if (event.userId) {
    const result = await dynamo.send(new QueryCommand({
      TableName: USERS_TABLE,
      KeyConditionExpression: "userId = :uid",
      ExpressionAttributeValues: marshall({ ":uid": event.userId }),
    }));
    users = (result.Items ?? []).map(unmarshall) as UserItem[];
  } else {
    const result = await dynamo.send(new ScanCommand({
      TableName: USERS_TABLE,
      FilterExpression: "#active = :true",
      ExpressionAttributeNames: { "#active": "active" },
      ExpressionAttributeValues: marshall({ ":true": true }),
    }));
    users = (result.Items ?? []).map(unmarshall) as UserItem[];
  }

  console.log(`Processing ${users.length} user(s)`);

  for (const user of users) {
    try {
      const apiKey = await decryptApiKey(user.apiKeyEncrypted);
      const since  = user.lastSyncAt || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

      const transactions = await fetchUpBankTransactions(apiKey, since);
      console.log(`Fetched ${transactions.length} settled transactions for ${user.userId}`);

      const newTransactions: UpTransaction[] = [];
      for (const tx of transactions) {
        if (!(await txExists(user.userId, tx.id))) newTransactions.push(tx);
      }
      console.log(`${newTransactions.length} new`);

      for (const tx of newTransactions) {
        const item = {
          userId:         user.userId,
          transactionId:  tx.id,
          description:    tx.attributes.description,
          rawText:        tx.attributes.rawText ?? "",
          amount:         tx.attributes.amount.value,
          amountInCents:  tx.attributes.amount.valueInBaseUnits,
          status:         tx.attributes.status,
          createdAt:      tx.attributes.createdAt,
          settledAt:      tx.attributes.settledAt ?? "",
          upCategory:     tx.relationships.category?.data?.id ?? "",
          enriched:       false,
          syncedToSheets: false,
          fetchedAt:      new Date().toISOString(),
        };

        await dynamo.send(new PutItemCommand({
          TableName: TRANSACTIONS_TABLE,
          Item: marshall(item),
          ConditionExpression: "attribute_not_exists(transactionId)",
        }));

        const date = (tx.attributes.settledAt ?? tx.attributes.createdAt).substring(0, 10);
        await s3.send(new PutObjectCommand({
          Bucket: RAW_BUCKET,
          Key: `raw/${user.userId}/${date}/${tx.id}.json`,
          Body: JSON.stringify(tx),
          ContentType: "application/json",
        }));
      }

      // Send to enrich queue in batches of 10
      for (let i = 0; i < newTransactions.length; i += 10) {
        const batch = newTransactions.slice(i, i + 10);
        await sqs.send(new SendMessageBatchCommand({
          QueueUrl: ENRICH_QUEUE_URL,
          Entries: batch.map((tx, idx) => ({
            Id: String(idx),
            MessageBody: JSON.stringify({ userId: user.userId, transactionId: tx.id } satisfies EnrichMessage),
          })),
        }));
      }

      await dynamo.send(new UpdateItemCommand({
        TableName: USERS_TABLE,
        Key: marshall({ userId: user.userId }),
        UpdateExpression: "SET lastSyncAt = :now",
        ExpressionAttributeValues: marshall({ ":now": new Date().toISOString() }),
      }));

    } catch (err) {
      console.error(`Error processing user ${user.userId}:`, err);
    }
  }
};
