// ── Up Bank API ───────────────────────────────────────────────────────────────

export interface UpMoneyObject {
  currencyCode: string;
  value: string;         // e.g. "-10.56"
  valueInBaseUnits: number; // e.g. -1056
}

export interface UpTransaction {
  id: string;
  type: "transactions";
  attributes: {
    status: "HELD" | "SETTLED";
    rawText: string | null;
    description: string;
    message: string | null;
    isCategorizable: boolean;
    amount: UpMoneyObject;
    foreignAmount: UpMoneyObject | null;
    createdAt: string;
    settledAt: string | null;
    transactionType: string | null;
  };
  relationships: {
    account: { data: { id: string } };
    transferAccount?: { data: { id: string } | null };
    category?: { data: { id: string } | null };
    parentCategory?: { data: { id: string } | null };
  };
}

export interface UpTransactionsResponse {
  data: UpTransaction[];
  links: {
    prev: string | null;
    next: string | null;
  };
}

// ── DynamoDB items ────────────────────────────────────────────────────────────

export interface UserItem {
  userId: string;
  email: string;
  apiKeyEncrypted: string;
  mobileNumber: string;
  active: boolean;
  createdAt: string;
  lastSyncAt?: string;
  twoUpAccountId?: string;
}

export interface TransactionItem {
  userId: string;
  transactionId: string;
  description: string;
  rawText: string;
  amount: string;
  amountInCents: number;
  status: "HELD" | "SETTLED";
  createdAt: string;
  settledAt: string;
  upCategory: string;
  isJoint: boolean;
  enriched: boolean;
  syncedToSheets: boolean;
  fetchedAt: string;
  // Set by enrich lambda
  bucket?: string;
  subcategory?: string;
  category?: string; // legacy — use subcategory
  split?: string;
  merchantNormalized?: string;
  enrichedAt?: string;
  // Set by sheets-sync lambda
  syncedAt?: string;
}

// ── Enrichment ────────────────────────────────────────────────────────────────

export interface EnrichmentResult {
  bucket: string;
  subcategory: string;
  split: string;
  merchantNormalized: string;
}

export type SubcategoryThresholds = Record<string, number>;

export const SUBCATEGORY_THRESHOLDS: SubcategoryThresholds = {
  "Cool Stuff":        400,
  "Medical":           150,
  "Gifts":             108,
  "Solo":              800,
  "Partner – Regular": 400,
  "Partner – Special": 100,
  "Clothes":           250,
  "Rent":              2042,
  "Utilities":         800,
  "Savings":           2500,
  "Reserve":           0,
  "Marketing":         150,
};

// ── SQS message payloads ──────────────────────────────────────────────────────

export interface EnrichMessage {
  userId: string;
  transactionId: string;
}

export interface SheetsMessage {
  userId: string;
  transactionId: string;
}
