import { DynamoDBClient, PutItemCommand, QueryCommand } from "@aws-sdk/client-dynamodb";
import { KMSClient, EncryptCommand } from "@aws-sdk/client-kms";
import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import { randomUUID } from "crypto";
import type { TransactionItem } from "../types.js";

const dynamo = new DynamoDBClient({});
const kms    = new KMSClient({});
const lambda = new LambdaClient({});

const { USERS_TABLE, TRANSACTIONS_TABLE, KMS_KEY_ID, FETCH_LAMBDA_ARN } =
  process.env as Record<string, string>;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
};

function json(statusCode: number, body: unknown): APIGatewayProxyResultV2 {
  return {
    statusCode,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
    body: JSON.stringify(body),
  };
}

// ── POST /users ───────────────────────────────────────────────────────────────

async function registerUser(rawBody: string | null): Promise<APIGatewayProxyResultV2> {
  if (!rawBody) return json(400, { error: "Request body required" });

  let payload: { email?: string; apiKey?: string; mobileNumber?: string };
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return json(400, { error: "Invalid JSON body" });
  }

  const { email, apiKey, mobileNumber } = payload;
  if (!email || !apiKey || !mobileNumber) {
    return json(400, { error: "email, apiKey, and mobileNumber are required" });
  }

  if (!/^(\+61|04)\d{8,9}$/.test(mobileNumber.replace(/\s/g, ""))) {
    return json(400, { error: "mobileNumber must be a valid Australian mobile (+61 or 04xx)" });
  }

  const existing = await dynamo.send(new QueryCommand({
    TableName: USERS_TABLE,
    IndexName: "email-index",
    KeyConditionExpression: "email = :email",
    ExpressionAttributeValues: marshall({ ":email": email }),
    Select: "COUNT",
  }));
  if ((existing.Count ?? 0) > 0) return json(409, { error: "Email already registered" });

  const encrypted = await kms.send(new EncryptCommand({
    KeyId: KMS_KEY_ID,
    Plaintext: Buffer.from(apiKey),
  }));

  const userId = randomUUID();
  await dynamo.send(new PutItemCommand({
    TableName: USERS_TABLE,
    Item: marshall({
      userId,
      email,
      apiKeyEncrypted: Buffer.from(encrypted.CiphertextBlob!).toString("base64"),
      mobileNumber,
      active: true,
      createdAt: new Date().toISOString(),
    }),
  }));

  return json(201, { userId, message: "Registered. Your first sync will run within the hour." });
}

// ── GET /users/:userId/transactions ──────────────────────────────────────────

async function getTransactions(
  userId: string,
  queryParams: Record<string, string>,
): Promise<APIGatewayProxyResultV2> {
  const limit = Math.min(parseInt(queryParams["limit"] ?? "50", 10), 200);
  const since = queryParams["since"];

  const params = since
    ? {
        TableName: TRANSACTIONS_TABLE,
        IndexName: "userId-settledAt-index",
        KeyConditionExpression: "userId = :uid AND settledAt >= :since",
        ExpressionAttributeValues: marshall({ ":uid": userId, ":since": since }),
        Limit: limit,
        ScanIndexForward: false,
      }
    : {
        TableName: TRANSACTIONS_TABLE,
        KeyConditionExpression: "userId = :uid",
        ExpressionAttributeValues: marshall({ ":uid": userId }),
        Limit: limit,
        ScanIndexForward: false,
      };

  const result = await dynamo.send(new QueryCommand(params));
  const transactions = (result.Items ?? []).map(unmarshall) as TransactionItem[];
  return json(200, { transactions, count: result.Count });
}

// ── POST /users/:userId/sync ──────────────────────────────────────────────────

async function triggerSync(userId: string): Promise<APIGatewayProxyResultV2> {
  await lambda.send(new InvokeCommand({
    FunctionName: FETCH_LAMBDA_ARN,
    InvocationType: "Event",
    Payload: JSON.stringify({ userId }),
  }));
  return json(202, { message: "Sync triggered." });
}

// ── Handler ───────────────────────────────────────────────────────────────────

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  const method = event.requestContext.http.method;
  const path   = event.requestContext.http.path;
  const params = event.pathParameters ?? {};
  const query  = (event.queryStringParameters ?? {}) as Record<string, string>;

  console.log(`${method} ${path}`);

  try {
    if (method === "OPTIONS") return { statusCode: 200, headers: CORS_HEADERS, body: "" };
    if (method === "GET"  && path === "/health")                                      return json(200, { status: "ok" });
    if (method === "POST" && path === "/users")                                       return await registerUser(event.body ?? null);
    if (method === "GET"  && path === `/users/${params["userId"]}/transactions`)      return await getTransactions(params["userId"]!, query);
    if (method === "POST" && path === `/users/${params["userId"]}/sync`)              return await triggerSync(params["userId"]!);

    return json(404, { error: "Not found" });
  } catch (err) {
    console.error("Unhandled error:", err);
    return json(500, { error: "Internal server error" });
  }
};
