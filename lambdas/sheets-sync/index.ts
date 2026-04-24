import { DynamoDBClient, GetItemCommand, UpdateItemCommand } from "@aws-sdk/client-dynamodb";
import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import type { SQSEvent } from "aws-lambda";
import { google } from "googleapis";
import type { SheetsMessage, TransactionItem } from "../types.js";

const dynamo        = new DynamoDBClient({});
const secretsClient = new SecretsManagerClient({});

const { TRANSACTIONS_TABLE, SHEETS_SECRET_ARN, SPREADSHEET_ID } = process.env as Record<string, string>;

let sheetsApi: ReturnType<typeof google.sheets> | undefined;

async function getSheetsApi(): Promise<ReturnType<typeof google.sheets>> {
  if (!sheetsApi) {
    const res            = await secretsClient.send(new GetSecretValueCommand({ SecretId: SHEETS_SECRET_ARN }));
    const serviceAccount = JSON.parse(res.SecretString!);

    const auth = new google.auth.GoogleAuth({
      credentials: serviceAccount,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    sheetsApi = google.sheets({ version: "v4", auth });
  }
  return sheetsApi;
}

function formatAmount(amountStr: string): string {
  const n = parseFloat(amountStr);
  return n < 0 ? `$${Math.abs(n).toFixed(2)}` : `$${n.toFixed(2)} (credit)`;
}

export const handler = async (event: SQSEvent): Promise<void> => {
  const sheets = await getSheetsApi();

  for (const record of event.Records) {
    const { userId, transactionId } = JSON.parse(record.body) as SheetsMessage;

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

      if (tx.syncedToSheets) {
        console.log(`Already synced: ${transactionId}`);
        continue;
      }

      const date = (tx.settledAt || tx.createdAt).substring(0, 10);

      // Columns match the Expenses sheet: Date | Description | Bucket | Category | Amount (AUD) | Split | Notes
      const row: string[] = [
        date,
        tx.merchantNormalized ?? tx.description,
        tx.bucket    ?? "",
        tx.category  ?? "",
        formatAmount(tx.amount),
        tx.split     ?? "Personal",
        `id:${transactionId}`,
      ];

      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: "Expenses!A:G",
        valueInputOption: "USER_ENTERED",
        requestBody: { values: [row] },
      });

      console.log(`Appended: ${date} | ${row[1]} | ${tx.bucket} | ${tx.category} | ${row[4]}`);

      await dynamo.send(new UpdateItemCommand({
        TableName: TRANSACTIONS_TABLE,
        Key: marshall({ userId, transactionId }),
        UpdateExpression: "SET syncedToSheets = :true, syncedAt = :now",
        ExpressionAttributeValues: marshall({ ":true": true, ":now": new Date().toISOString() }),
      }));

    } catch (err) {
      console.error(`Error syncing ${transactionId}:`, err);
      throw err;
    }
  }
};
