import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  ARC_TESTNET_CHAIN_ID,
  ARC_USDC_ADDRESS
} from "@/lib/config";
import {
  ARC_SETTLEMENT_ASSET_ID,
  findSettlementAssetByChainAndToken,
  getSettlementAsset,
  type SettlementTokenPreset
} from "@/lib/assets";
import type {
  Database,
  EnsProfile,
  Invoice,
  InvoiceStatus,
  InvoiceWithMerchant,
  Merchant,
  PaymentEvent
} from "@/lib/types";

const dbPath =
  process.env.DATABASE_FILE ||
  (process.env.VERCEL
    ? path.join(tmpdir(), "anyasset-checkout.json")
    : path.join(process.cwd(), "data", "anyasset-checkout.json"));

const now = () => new Date().toISOString();

function seedDatabase(): Database {
  const createdAt = now();
  const settlementAsset = getSettlementAsset(ARC_SETTLEMENT_ASSET_ID);
  const merchant: Merchant = {
    id: "merch_demo_coffee",
    dynamicUserId: "demo-user",
    ownerAddress: "0x1111111111111111111111111111111111111111",
    ensName: "coffee.aiden.eth",
    ensProfile: {
      name: "coffee.aiden.eth",
      resolvedAddress: "0x1111111111111111111111111111111111111111",
      description: "Hackathon coffee checkout with global USDC settlement.",
      url: "https://anyasset.example",
      checkout: "/m/coffee.aiden.eth",
      settlement: "Global USDC settlement",
      records: {
        description: "Hackathon coffee checkout with global USDC settlement.",
        url: "https://anyasset.example",
        "anyasset:checkout": "/m/coffee.aiden.eth",
        "anyasset:settlement": "Global USDC settlement"
      }
    },
    settlementAssetId: settlementAsset.id,
    settlementNetwork: settlementAsset.network,
    settlementChainId: settlementAsset.chainId,
    settlementTokenSymbol: settlementAsset.symbol,
    settlementTokenAddress: settlementAsset.tokenAddress,
    settlementTokenDecimals: settlementAsset.tokenDecimals,
    settlementFlowSupported: settlementAsset.flowSupported,
    settlementAddress: "0x1111111111111111111111111111111111111111",
    dynamicCheckoutId: "demo_checkout_coffee_arc",
    dynamicCheckoutMode: "demo",
    createdAt,
    updatedAt: createdAt
  };

  const invoice: Invoice = {
    id: "inv_demo_latte",
    merchantId: merchant.id,
    title: "Hackathon Latte",
    description: "NYC demo checkout link.",
    amountUsd: "5.00",
    status: "open",
    dynamicCheckoutId: merchant.dynamicCheckoutId,
    memo: "inv_demo_latte",
    createdAt,
    updatedAt: createdAt
  };

  return {
    merchants: [merchant],
    invoices: [invoice],
    paymentEvents: []
  };
}

function normalizeMerchant(merchant: Merchant): Merchant {
  const chainId = merchant.settlementChainId || ARC_TESTNET_CHAIN_ID;
  const tokenAddress = merchant.settlementTokenAddress || ARC_USDC_ADDRESS;
  const asset =
    (merchant.settlementAssetId ? getSettlementAsset(merchant.settlementAssetId) : undefined) ??
    findSettlementAssetByChainAndToken(chainId, tokenAddress) ??
    getSettlementAsset(ARC_SETTLEMENT_ASSET_ID);

  return {
    ...merchant,
    settlementAssetId: asset.id,
    settlementNetwork: merchant.settlementNetwork || asset.network,
    settlementChainId: chainId,
    settlementTokenSymbol: merchant.settlementTokenSymbol || asset.symbol,
    settlementTokenAddress: tokenAddress,
    settlementTokenDecimals: merchant.settlementTokenDecimals ?? asset.tokenDecimals,
    settlementFlowSupported: merchant.settlementFlowSupported ?? asset.flowSupported
  };
}

async function ensureDbFile() {
  await mkdir(path.dirname(dbPath), { recursive: true });
  try {
    await readFile(dbPath, "utf8");
  } catch {
    await writeFile(dbPath, JSON.stringify(seedDatabase(), null, 2));
  }
}

async function readDb(): Promise<Database> {
  await ensureDbFile();
  const raw = await readFile(dbPath, "utf8");
  const db = JSON.parse(raw) as Database;
  db.merchants = db.merchants.map(normalizeMerchant);
  return db;
}

let writeQueue = Promise.resolve();

async function updateDb<T>(mutator: (db: Database) => T | Promise<T>) {
  const run = async () => {
    const db = await readDb();
    const result = await mutator(db);
    await writeFile(dbPath, JSON.stringify(db, null, 2));
    return result;
  };

  const pending = writeQueue.then(run, run);
  writeQueue = pending.then(
    () => undefined,
    () => undefined
  );
  return pending;
}

export async function listMerchants() {
  const db = await readDb();
  return db.merchants.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getMerchant(id: string) {
  const db = await readDb();
  return db.merchants.find((merchant) => merchant.id === id) ?? null;
}

export async function getMerchantByEns(ensName: string) {
  const normalized = ensName.toLowerCase();
  const db = await readDb();
  return (
    db.merchants.find(
      (merchant) => merchant.ensName?.toLowerCase() === normalized
    ) ?? null
  );
}

export async function createMerchant(input: {
  dynamicUserId: string;
  ownerAddress: string;
  ensName?: string;
  ensProfile?: EnsProfile;
  settlementAsset: SettlementTokenPreset;
  settlementAddress: string;
  dynamicCheckoutId?: string;
  dynamicCheckoutMode: "live" | "demo";
}) {
  return updateDb((db) => {
    const timestamp = now();
    const merchant: Merchant = {
      id: `merch_${crypto.randomUUID().slice(0, 8)}`,
      dynamicUserId: input.dynamicUserId,
      ownerAddress: input.ownerAddress,
      ensName: input.ensName,
      ensProfile: input.ensProfile,
      settlementAssetId: input.settlementAsset.id,
      settlementNetwork: input.settlementAsset.network,
      settlementChainId: input.settlementAsset.chainId,
      settlementTokenSymbol: input.settlementAsset.symbol,
      settlementTokenAddress: input.settlementAsset.tokenAddress,
      settlementTokenDecimals: input.settlementAsset.tokenDecimals,
      settlementFlowSupported: input.settlementAsset.flowSupported,
      settlementAddress: input.settlementAddress,
      dynamicCheckoutId: input.dynamicCheckoutId,
      dynamicCheckoutMode: input.dynamicCheckoutMode,
      createdAt: timestamp,
      updatedAt: timestamp
    };
    db.merchants.unshift(merchant);
    return merchant;
  });
}

export async function listInvoices(merchantId?: string) {
  const db = await readDb();
  return db.invoices
    .filter((invoice) => !merchantId || invoice.merchantId === merchantId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function createInvoice(input: {
  merchantId: string;
  title: string;
  amountUsd: string;
  description?: string;
}) {
  return updateDb((db) => {
    const merchant = db.merchants.find((item) => item.id === input.merchantId);
    if (!merchant) {
      throw new Error("Merchant not found");
    }

    const timestamp = now();
    const id = `inv_${crypto.randomUUID().slice(0, 10)}`;
    const invoice: Invoice = {
      id,
      merchantId: merchant.id,
      title: input.title,
      description: input.description,
      amountUsd: input.amountUsd,
      status: "open",
      dynamicCheckoutId: merchant.dynamicCheckoutId,
      memo: id,
      createdAt: timestamp,
      updatedAt: timestamp
    };
    db.invoices.unshift(invoice);
    return invoice;
  });
}

export async function getInvoiceWithMerchant(
  invoiceId: string
): Promise<InvoiceWithMerchant | null> {
  const db = await readDb();
  const invoice = db.invoices.find((item) => item.id === invoiceId);
  if (!invoice) {
    return null;
  }
  const merchant = db.merchants.find((item) => item.id === invoice.merchantId);
  if (!merchant) {
    return null;
  }
  return { invoice, merchant };
}

export async function updateInvoice(
  invoiceId: string,
  patch: Partial<
    Pick<
      Invoice,
      | "status"
      | "dynamicTransactionId"
      | "payerAddress"
      | "sourceChain"
      | "sourceToken"
      | "settlementTxHash"
    >
  >
) {
  return updateDb((db) => {
    const invoice = db.invoices.find((item) => item.id === invoiceId);
    if (!invoice) {
      throw new Error("Invoice not found");
    }
    Object.assign(invoice, patch, { updatedAt: now() });
    return invoice;
  });
}

export async function setInvoiceStatus(
  invoiceId: string,
  status: InvoiceStatus
) {
  return updateInvoice(invoiceId, { status });
}

export async function addPaymentEvent(input: {
  invoiceId: string;
  type: string;
  raw: unknown;
}) {
  return updateDb((db) => {
    const event: PaymentEvent = {
      id: `evt_${crypto.randomUUID().slice(0, 10)}`,
      invoiceId: input.invoiceId,
      type: input.type,
      raw: input.raw,
      createdAt: now()
    };
    db.paymentEvents.unshift(event);
    return event;
  });
}
