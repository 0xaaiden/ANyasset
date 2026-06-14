"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  Loader2,
  ReceiptText,
  RefreshCw,
  Send,
  Wallet
} from "lucide-react";
import { DynamicWidget, useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { EnsProfileCard } from "@/components/EnsProfileCard";
import { PaymentStatusTimeline } from "@/components/PaymentStatusTimeline";
import { arcscanTxUrl } from "@/lib/config";
import { formatUsd, shortAddress, statusLabel } from "@/lib/format";
import type { EnsProfile, Invoice, Merchant } from "@/lib/types";

const hasDynamicEnv = Boolean(process.env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID);

type FlowAction = "started" | "quoted" | "submitted" | "settled" | "failed" | "cancelled";

async function markInvoice(
  invoiceId: string,
  action: FlowAction,
  payload: Record<string, unknown> = {}
) {
  const response = await fetch("/api/flow/transaction", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ invoiceId, action, ...payload })
  });
  const body = await response.json();
  if (!response.ok) {
    throw new Error(body.error || "Payment state update failed");
  }
  return body.invoice as Invoice;
}

function extractTransactionHash(value: unknown): string | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }
  const object = value as Record<string, unknown>;
  const keys = ["settlementTxHash", "transactionHash", "txHash", "hash"];
  for (const key of keys) {
    if (typeof object[key] === "string") {
      return object[key] as string;
    }
  }
  for (const nested of ["transaction", "result", "settlement"]) {
    const hash = extractTransactionHash(object[nested]);
    if (hash) {
      return hash;
    }
  }
  return undefined;
}

async function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function DynamicPaymentActions({
  invoice,
  merchant,
  onInvoice,
  onError,
  onBusy
}: {
  invoice: Invoice;
  merchant: Merchant;
  onInvoice: (invoice: Invoice) => void;
  onError: (message: string) => void;
  onBusy: (busy: boolean) => void;
}) {
  const { primaryWallet } = useDynamicContext();
  const [sourceChainId, setSourceChainId] = useState("84532");
  const [sourceTokenAddress, setSourceTokenAddress] = useState(
    "0x0000000000000000000000000000000000000000"
  );

  async function payWithDynamicFlow() {
    onBusy(true);
    onError("");
    try {
      if (!primaryWallet?.address) {
        throw new Error("Connect a wallet before paying.");
      }
      if (!merchant.dynamicCheckoutId || merchant.dynamicCheckoutMode !== "live") {
        throw new Error("Live Dynamic Flow checkout is not configured.");
      }

      const flowClient = await import("@dynamic-labs-sdk/client");
      const { transaction } = await flowClient.createCheckoutTransaction({
        amount: invoice.amountUsd,
        currency: "USD",
        checkoutId: merchant.dynamicCheckoutId
      });

      onInvoice(
        await markInvoice(invoice.id, "started", {
          transactionId: transaction.id,
          payerAddress: primaryWallet.address,
          sourceChain: `EVM ${sourceChainId}`,
          sourceToken: sourceTokenAddress,
          raw: transaction
        })
      );

      await flowClient.attachCheckoutTransactionSource({
        transactionId: transaction.id,
        fromAddress: primaryWallet.address,
        fromChainId: sourceChainId,
        fromChainName: "EVM"
      });

      const quote = await flowClient.getCheckoutTransactionQuote({
        transactionId: transaction.id,
        fromTokenAddress: sourceTokenAddress
      });

      onInvoice(
        await markInvoice(invoice.id, "quoted", {
          transactionId: transaction.id,
          raw: quote
        })
      );

      const result = await flowClient.submitCheckoutTransaction({
        transactionId: transaction.id,
        walletAccount: primaryWallet as never
      });

      onInvoice(
        await markInvoice(invoice.id, "submitted", {
          transactionId: transaction.id,
          raw: result
        })
      );

      let finalState: unknown = result;
      for (let attempt = 0; attempt < 12; attempt += 1) {
        await delay(3000);
        finalState = await flowClient.getCheckoutTransaction({
          transactionId: transaction.id
        });
        const state = finalState as Record<string, unknown>;
        if (
          ["completed", "failed"].includes(String(state.settlementState).toLowerCase()) ||
          ["cancelled", "expired", "failed"].includes(String(state.executionState).toLowerCase())
        ) {
          break;
        }
      }

      const final = finalState as Record<string, unknown>;
      const settled = String(final.settlementState).toLowerCase() === "completed";
      onInvoice(
        await markInvoice(invoice.id, settled ? "settled" : "submitted", {
          transactionId: transaction.id,
          settlementTxHash: extractTransactionHash(final),
          raw: final
        })
      );
    } catch (error) {
      onError(error instanceof Error ? error.message : "Dynamic Flow payment failed");
      try {
        onInvoice(await markInvoice(invoice.id, "failed", { raw: { error: String(error) } }));
      } catch {
        // The visible error above is more useful than a secondary state-sync failure.
      }
    } finally {
      onBusy(false);
    }
  }

  return (
    <div className="stack">
      <div className="form-card">
        <div className="invoice-title">
          <div>
            <p className="muted">Customer wallet</p>
            <h3>{primaryWallet?.address ? shortAddress(primaryWallet.address) : "Connect to pay"}</h3>
          </div>
          <Wallet size={22} aria-hidden="true" />
        </div>
        <DynamicWidget />
      </div>

      <div className="form-card">
        <div className="form-grid">
          <div className="field">
            <label htmlFor="sourceChainId">Source chain ID</label>
            <input
              id="sourceChainId"
              className="input"
              value={sourceChainId}
              onChange={(event) => setSourceChainId(event.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="sourceToken">Source token address</label>
            <input
              id="sourceToken"
              className="input mono"
              value={sourceTokenAddress}
              onChange={(event) => setSourceTokenAddress(event.target.value)}
            />
          </div>
        </div>
        <button className="button" type="button" onClick={payWithDynamicFlow}>
          <Send size={16} aria-hidden="true" />
          Pay with Dynamic Flow
        </button>
      </div>
    </div>
  );
}

export function CheckoutFlow({
  initialInvoice,
  merchant,
  ensProfile
}: {
  initialInvoice: Invoice;
  merchant: Merchant;
  ensProfile?: EnsProfile;
}) {
  const [invoice, setInvoice] = useState(initialInvoice);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [demoSource, setDemoSource] = useState("Base Sepolia USDC");

  const receiptItems = useMemo(
    () => [
      ["Invoice memo", invoice.memo],
      ["Merchant receives", "USDC on Arc Testnet"],
      ["Settlement address", merchant.settlementAddress],
      ["Source asset", invoice.sourceToken || demoSource]
    ],
    [demoSource, invoice.memo, invoice.sourceToken, merchant.settlementAddress]
  );

  const refreshInvoice = useCallback(async () => {
    const response = await fetch(`/api/invoices/${invoice.id}`, { cache: "no-store" });
    const body = await response.json();
    if (response.ok) {
      setInvoice(body.invoice);
    }
  }, [invoice.id]);

  useEffect(() => {
    if (invoice.status === "submitted" || invoice.status === "quoted") {
      const timer = setInterval(() => void refreshInvoice(), 3000);
      return () => clearInterval(timer);
    }
    return undefined;
  }, [invoice.status, refreshInvoice]);

  async function runDemoPayment() {
    setBusy(true);
    setError("");
    try {
      setInvoice(
        await markInvoice(invoice.id, "started", {
          payerAddress: "0x2222222222222222222222222222222222222222",
          sourceChain: "Base Sepolia",
          sourceToken: demoSource
        })
      );
      await delay(700);
      setInvoice(await markInvoice(invoice.id, "quoted", { sourceToken: demoSource }));
      await delay(800);
      setInvoice(await markInvoice(invoice.id, "submitted"));
      await delay(1000);
      setInvoice(
        await markInvoice(invoice.id, "settled", {
          settlementTxHash:
            "0x" + Array.from({ length: 64 }, (_, index) => ((index + 10) % 16).toString(16)).join("")
        })
      );
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Demo payment failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="checkout-layout">
      <aside className="stack-lg">
        <EnsProfileCard
          profile={ensProfile || merchant.ensProfile}
          fallbackName={merchant.ensName}
          settlementAddress={merchant.settlementAddress}
        />

        <div className="form-card">
          <div className="invoice-title">
            <div>
              <p className="muted">Hosted checkout</p>
              <h2>{invoice.title}</h2>
            </div>
            <span className={`status-${invoice.status}`}>{statusLabel(invoice.status)}</span>
          </div>
          <div className="amount">{formatUsd(invoice.amountUsd)}</div>
          {invoice.description ? <p className="lede">{invoice.description}</p> : null}
          <PaymentStatusTimeline status={invoice.status} />
        </div>

        <div className="form-card">
          <div className="invoice-title">
            <div>
              <p className="muted">Payment receipt</p>
              <h3>Source asset to USDC on Arc</h3>
            </div>
            <ReceiptText size={22} aria-hidden="true" />
          </div>
          <div className="receipt-grid">
            {receiptItems.map(([label, value]) => (
              <div className="receipt-item" key={label}>
                <p className="muted">{label}</p>
                <strong className="address mono">{value}</strong>
              </div>
            ))}
          </div>
          {invoice.settlementTxHash ? (
            <a
              className="button secondary"
              href={arcscanTxUrl(invoice.settlementTxHash)}
              target="_blank"
              rel="noreferrer"
            >
              <ExternalLink size={16} aria-hidden="true" />
              View Arc settlement
            </a>
          ) : null}
        </div>
      </aside>

      <main className="stack-lg">
        <div className="rail-visual panel-muted">
          <div className="rail-row">
            <div className="rail-icon">
              <Wallet size={22} aria-hidden="true" />
            </div>
            <div>
              <strong>Customer pays from any supported source</strong>
              <div className="rail-track" aria-hidden="true" />
            </div>
          </div>
          <div className="rail-row">
            <div className="rail-icon">
              <ArrowRight size={22} aria-hidden="true" />
            </div>
            <div>
              <strong>Dynamic Flow quotes, signs, and routes</strong>
              <div className="rail-track" aria-hidden="true" />
            </div>
          </div>
          <div className="rail-row">
            <div className="rail-icon">
              <CheckCircle2 size={22} aria-hidden="true" />
            </div>
            <div>
              <strong>Merchant receives USDC on Arc</strong>
              <div className="rail-track" aria-hidden="true" />
            </div>
          </div>
        </div>

        {error ? <div className="callout amber error">{error}</div> : null}

        {hasDynamicEnv ? (
          <DynamicPaymentActions
            invoice={invoice}
            merchant={merchant}
            onInvoice={setInvoice}
            onError={setError}
            onBusy={setBusy}
          />
        ) : (
          <div className="form-card">
            <div className="invoice-title">
              <div>
                <p className="muted">Demo payment route</p>
                <h3>Simulate Dynamic Flow lifecycle</h3>
              </div>
              {busy ? (
                <Loader2 size={22} aria-hidden="true" />
              ) : (
                <RefreshCw size={22} aria-hidden="true" />
              )}
            </div>
            <div className="field">
              <label htmlFor="demoSource">Source asset</label>
              <select
                id="demoSource"
                className="select"
                value={demoSource}
                onChange={(event) => setDemoSource(event.target.value)}
              >
                <option>Base Sepolia USDC</option>
                <option>Ethereum Sepolia ETH</option>
                <option>Solana Devnet SOL</option>
                <option>Bitcoin testnet BTC</option>
              </select>
            </div>
            <p className="muted">
              Set Dynamic API keys to run the live Flow SDK. Demo mode preserves the checkout,
              invoice memo, status polling, and Arc receipt UX for judging walkthroughs.
            </p>
            <button
              className="button"
              type="button"
              disabled={busy || invoice.status === "settled"}
              onClick={runDemoPayment}
              data-testid="pay-demo-invoice-button"
            >
              <Send size={16} aria-hidden="true" />
              {busy ? "Routing..." : "Pay demo invoice"}
            </button>
          </div>
        )}

        <div className="button-row">
          <button className="button secondary" type="button" onClick={refreshInvoice}>
            <RefreshCw size={16} aria-hidden="true" />
            Refresh status
          </button>
          <Link className="button ghost" href="/merchant">
            Merchant dashboard
          </Link>
        </div>
      </main>
    </div>
  );
}
