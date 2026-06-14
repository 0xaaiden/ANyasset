export type InvoiceStatus =
  | "draft"
  | "open"
  | "quoted"
  | "submitted"
  | "settled"
  | "failed"
  | "cancelled";

export type EnsProfile = {
  name: string;
  resolvedAddress?: string | null;
  avatar?: string | null;
  description?: string | null;
  url?: string | null;
  twitter?: string | null;
  github?: string | null;
  checkout?: string | null;
  settlement?: string | null;
  records: Record<string, string | null>;
  error?: string;
};

export type Merchant = {
  id: string;
  dynamicUserId: string;
  ownerAddress: string;
  ensName?: string;
  ensProfile?: EnsProfile;
  settlementChainId: "5042002";
  settlementTokenSymbol: "USDC";
  settlementTokenAddress: "0x3600000000000000000000000000000000000000";
  settlementAddress: string;
  dynamicCheckoutId?: string;
  dynamicCheckoutMode: "live" | "demo";
  createdAt: string;
  updatedAt: string;
};

export type Invoice = {
  id: string;
  merchantId: string;
  title: string;
  description?: string;
  amountUsd: string;
  status: InvoiceStatus;
  dynamicCheckoutId?: string;
  dynamicTransactionId?: string;
  payerAddress?: string;
  sourceChain?: string;
  sourceToken?: string;
  settlementTxHash?: string;
  memo: string;
  createdAt: string;
  updatedAt: string;
};

export type PaymentEvent = {
  id: string;
  invoiceId: string;
  type: string;
  raw: unknown;
  createdAt: string;
};

export type InvoiceWithMerchant = {
  invoice: Invoice;
  merchant: Merchant;
};

export type Database = {
  merchants: Merchant[];
  invoices: Invoice[];
  paymentEvents: PaymentEvent[];
};
