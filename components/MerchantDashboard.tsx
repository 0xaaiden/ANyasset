"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Check,
  Copy,
  ExternalLink,
  Link2,
  Plus,
  ReceiptText,
  ShieldCheck,
  Wallet
} from "lucide-react";
import { DynamicWidget, useDynamicContext, useIsLoggedIn } from "@dynamic-labs/sdk-react-core";
import { ArcBalanceCard } from "@/components/ArcBalanceCard";
import { EnsProfileCard } from "@/components/EnsProfileCard";
import { PaymentStatusTimeline } from "@/components/PaymentStatusTimeline";
import { APP_URL } from "@/lib/config";
import { formatUsd, shortAddress, statusLabel } from "@/lib/format";
import type { Invoice, Merchant } from "@/lib/types";

const hasDynamicEnv = Boolean(process.env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID);
const demoAddress = "0x1111111111111111111111111111111111111111";

type MerchantsPayload = { merchants: Merchant[] };
type InvoicesPayload = { invoices: Invoice[] };

function DynamicWalletPanel({
  onWallet
}: {
  onWallet: (wallet: { address: string; userId: string }) => void;
}) {
  const isLoggedIn = useIsLoggedIn();
  const { primaryWallet, user } = useDynamicContext();

  useEffect(() => {
    if (primaryWallet?.address) {
      onWallet({
        address: primaryWallet.address,
        userId: user?.userId || primaryWallet.address
      });
    }
  }, [onWallet, primaryWallet?.address, user?.userId]);

  return (
    <div className="form-card">
      <div className="invoice-title">
        <div>
          <p className="muted">Dynamic auth</p>
          <h3>{isLoggedIn ? "Merchant connected" : "Connect merchant wallet"}</h3>
        </div>
        <Wallet size={22} aria-hidden="true" />
      </div>
      <DynamicWidget />
      <p className="muted">
        {primaryWallet?.address
          ? `Using ${shortAddress(primaryWallet.address)} for merchant ownership.`
          : "Dynamic handles the merchant login and wallet session."}
      </p>
    </div>
  );
}

function DemoWalletPanel({
  onWallet
}: {
  onWallet: (wallet: { address: string; userId: string }) => void;
}) {
  useEffect(() => {
    onWallet({ address: demoAddress, userId: "demo-user" });
  }, [onWallet]);

  return (
    <div className="form-card">
      <div className="invoice-title">
        <div>
          <p className="muted">Dynamic auth</p>
          <h3>Demo wallet mode</h3>
        </div>
        <ShieldCheck size={22} aria-hidden="true" />
      </div>
      <p className="muted">
        Add <span className="mono">NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID</span> to enable the live
        Dynamic widget. The demo wallet keeps the product testable without sponsor credentials.
      </p>
      <span className="merchant-chip">
        <Wallet size={14} aria-hidden="true" />
        {shortAddress(demoAddress)}
      </span>
    </div>
  );
}

export function MerchantDashboard({
  initialMerchants,
  initialInvoices
}: {
  initialMerchants: Merchant[];
  initialInvoices: Invoice[];
}) {
  const [merchants, setMerchants] = useState(initialMerchants);
  const [invoices, setInvoices] = useState(initialInvoices);
  const [selectedMerchantId, setSelectedMerchantId] = useState(initialMerchants[0]?.id ?? "");
  const [wallet, setWallet] = useState({ address: demoAddress, userId: "demo-user" });
  const [merchantForm, setMerchantForm] = useState({
    ensName: initialMerchants[0]?.ensName ?? "coffee.aiden.eth",
    settlementAddress: initialMerchants[0]?.settlementAddress ?? demoAddress
  });
  const [invoiceForm, setInvoiceForm] = useState({
    title: "Hackathon Latte",
    amountUsd: "5.00",
    description: "NYC demo checkout"
  });
  const [savingMerchant, setSavingMerchant] = useState(false);
  const [savingInvoice, setSavingInvoice] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const selectedMerchant = useMemo(
    () => merchants.find((merchant) => merchant.id === selectedMerchantId) ?? merchants[0],
    [merchants, selectedMerchantId]
  );
  const merchantInvoices = useMemo(
    () => invoices.filter((invoice) => invoice.merchantId === selectedMerchant?.id),
    [invoices, selectedMerchant?.id]
  );

  async function refreshData(merchantId = selectedMerchant?.id) {
    const [merchantResponse, invoiceResponse] = await Promise.all([
      fetch("/api/merchants", { cache: "no-store" }),
      fetch(merchantId ? `/api/invoices?merchantId=${merchantId}` : "/api/invoices", {
        cache: "no-store"
      })
    ]);
    const merchantBody = (await merchantResponse.json()) as MerchantsPayload;
    const invoiceBody = (await invoiceResponse.json()) as InvoicesPayload;
    setMerchants(merchantBody.merchants);
    setInvoices(invoiceBody.invoices);
  }

  async function createMerchantProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingMerchant(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/merchants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dynamicUserId: wallet.userId,
          ownerAddress: wallet.address,
          ensName: merchantForm.ensName,
          settlementAddress: merchantForm.settlementAddress
        })
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.error || "Could not create merchant");
      }
      setMerchants((current) => [body.merchant, ...current]);
      setSelectedMerchantId(body.merchant.id);
      setMessage("Merchant checkout profile created.");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Could not create merchant");
    } finally {
      setSavingMerchant(false);
    }
  }

  async function createInvoiceLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedMerchant) {
      return;
    }
    setSavingInvoice(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          merchantId: selectedMerchant.id,
          title: invoiceForm.title,
          amountUsd: invoiceForm.amountUsd,
          description: invoiceForm.description
        })
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.error || "Could not create invoice");
      }
      setInvoices((current) => [body.invoice, ...current]);
      setMessage(`Checkout created: ${body.checkoutUrl}`);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Could not create invoice");
    } finally {
      setSavingInvoice(false);
    }
  }

  async function copyLink(path: string) {
    await navigator.clipboard.writeText(`${APP_URL}${path}`);
    setMessage("Checkout link copied.");
  }

  return (
    <div className="dashboard-layout">
      <aside className="stack-lg">
        {hasDynamicEnv ? (
          <DynamicWalletPanel onWallet={setWallet} />
        ) : (
          <DemoWalletPanel onWallet={setWallet} />
        )}

        <form className="form-card" onSubmit={createMerchantProfile}>
          <div className="invoice-title">
            <div>
              <p className="muted">Merchant setup</p>
              <h3>Settlement profile</h3>
            </div>
            <Plus size={22} aria-hidden="true" />
          </div>
          <div className="field">
            <label htmlFor="ensName">ENS name</label>
            <input
              id="ensName"
              className="input"
              value={merchantForm.ensName}
              onChange={(event) =>
                setMerchantForm((current) => ({ ...current, ensName: event.target.value }))
              }
              placeholder="coffee.aiden.eth"
            />
          </div>
          <div className="field">
            <label htmlFor="settlementAddress">Arc settlement address</label>
            <input
              id="settlementAddress"
              className="input mono"
              value={merchantForm.settlementAddress}
              onChange={(event) =>
                setMerchantForm((current) => ({
                  ...current,
                  settlementAddress: event.target.value
                }))
              }
              placeholder="0x..."
            />
          </div>
          <button
            className="button"
            disabled={savingMerchant}
            type="submit"
            data-testid="create-merchant-button"
          >
            <Plus size={16} aria-hidden="true" />
            {savingMerchant ? "Creating..." : "Create merchant"}
          </button>
        </form>

        {selectedMerchant ? (
          <ArcBalanceCard address={selectedMerchant.settlementAddress} />
        ) : null}
      </aside>

      <main className="stack-lg">
        {error ? <div className="callout amber error">{error}</div> : null}
        {message ? <div className="callout success">{message}</div> : null}

        {selectedMerchant ? (
          <EnsProfileCard
            profile={selectedMerchant.ensProfile}
            fallbackName={selectedMerchant.ensName}
            settlementAddress={selectedMerchant.settlementAddress}
          />
        ) : null}

        <div className="cards-grid">
          <div className="stat-card">
            <p className="muted">Settlement rail</p>
            <h3>USDC on Arc Testnet</h3>
            <p className="muted">Token 0x3600...0000, 6-decimal ERC-20 interface.</p>
          </div>
          <div className="stat-card">
            <p className="muted">Flow checkout</p>
            <h3>
              {selectedMerchant?.dynamicCheckoutMode === "live"
                ? "Live Dynamic checkout"
                : "Demo checkout fallback"}
            </h3>
            <p className="muted address mono">
              {selectedMerchant?.dynamicCheckoutId || "Create a merchant to configure Flow."}
            </p>
          </div>
        </div>

        <form className="form-card" onSubmit={createInvoiceLink}>
          <div className="invoice-title">
            <div>
              <p className="muted">Checkout link</p>
              <h3>Create invoice</h3>
            </div>
            <ReceiptText size={22} aria-hidden="true" />
          </div>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="merchant">Merchant</label>
              <select
                id="merchant"
                className="select"
                value={selectedMerchantId}
                onChange={(event) => {
                  setSelectedMerchantId(event.target.value);
                  void refreshData(event.target.value);
                }}
              >
                {merchants.map((merchant) => (
                  <option key={merchant.id} value={merchant.id}>
                    {merchant.ensName || shortAddress(merchant.settlementAddress)}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="amountUsd">Amount</label>
              <input
                id="amountUsd"
                className="input"
                inputMode="decimal"
                value={invoiceForm.amountUsd}
                onChange={(event) =>
                  setInvoiceForm((current) => ({ ...current, amountUsd: event.target.value }))
                }
              />
            </div>
            <div className="field full">
              <label htmlFor="title">Title</label>
              <input
                id="title"
                className="input"
                value={invoiceForm.title}
                onChange={(event) =>
                  setInvoiceForm((current) => ({ ...current, title: event.target.value }))
                }
              />
            </div>
            <div className="field full">
              <label htmlFor="description">Description</label>
              <textarea
                id="description"
                className="textarea"
                value={invoiceForm.description}
                onChange={(event) =>
                  setInvoiceForm((current) => ({ ...current, description: event.target.value }))
                }
              />
            </div>
          </div>
          <button
            className="button"
            disabled={!selectedMerchant || savingInvoice}
            type="submit"
            data-testid="create-invoice-button"
          >
            <Link2 size={16} aria-hidden="true" />
            {savingInvoice ? "Creating..." : "Create checkout link"}
          </button>
        </form>

        <section className="form-card">
          <div className="invoice-title">
            <div>
              <p className="muted">Invoices</p>
              <h3>Payment links and receipts</h3>
            </div>
            <Check size={22} aria-hidden="true" />
          </div>

          {merchantInvoices.length ? (
            <div>
              {merchantInvoices.map((invoice) => {
                const path = `/checkout/${invoice.id}`;
                return (
                  <article className="invoice-row" key={invoice.id}>
                    <div className="stack">
                      <div>
                        <h3>{invoice.title}</h3>
                        <p className="muted">
                          {formatUsd(invoice.amountUsd)} · memo{" "}
                          <span className="mono">{invoice.memo}</span>
                        </p>
                      </div>
                      <PaymentStatusTimeline status={invoice.status} />
                    </div>
                    <div className="stack">
                      <span className={`status-${invoice.status}`}>
                        {statusLabel(invoice.status)}
                      </span>
                      <Link className="button secondary" href={path}>
                        <ExternalLink size={16} aria-hidden="true" />
                        Open
                      </Link>
                      <button className="button ghost" type="button" onClick={() => copyLink(path)}>
                        <Copy size={16} aria-hidden="true" />
                        Copy
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="empty-state">Create the first invoice for this merchant.</div>
          )}
        </section>
      </main>
    </div>
  );
}
