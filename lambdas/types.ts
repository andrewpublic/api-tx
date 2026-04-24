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
  enriched: boolean;
  syncedToSheets: boolean;
  fetchedAt: string;
  // Set by enrich lambda
  bucket?: string;
  category?: string;
  split?: string;
  merchantNormalized?: string;
  enrichedAt?: string;
  // Set by sheets-sync lambda
  syncedAt?: string;
}

// ── Enrichment ────────────────────────────────────────────────────────────────

export interface EnrichmentResult {
  bucket: string;
  category: string;
  split: string;
  merchantNormalized: string;
}

export type BudgetThresholds = Record<string, number>;

export const BUDGET_THRESHOLDS: BudgetThresholds = {
  "Short Savings": 658,
  Spendathon:      1550,
  Bills:           2842,
  "Long Savings":  2500,
  Buffer:          150,
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
