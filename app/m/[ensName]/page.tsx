import Link from "next/link";
import { notFound } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { EnsProfileCard } from "@/components/EnsProfileCard";
import { PaymentStatusTimeline } from "@/components/PaymentStatusTimeline";
import { formatUsd, statusLabel } from "@/lib/format";
import { getMerchantByEns, listInvoices } from "@/lib/db";
import { mergeEnsProfiles, resolveEnsProfile } from "@/lib/ens";

export default async function MerchantProfilePage({
  params
}: {
  params: Promise<{ ensName: string }>;
}) {
  const { ensName: rawEnsName } = await params;
  const ensName = decodeURIComponent(rawEnsName).toLowerCase();
  const merchant = await getMerchantByEns(ensName);
  const profile = mergeEnsProfiles(await resolveEnsProfile(ensName), merchant?.ensProfile);
  const invoices = merchant ? await listInvoices(merchant.id) : [];
  const settlementLabel = merchant
    ? `${merchant.settlementTokenSymbol} on ${
        merchant.settlementNetwork || `EVM ${merchant.settlementChainId}`
      }`
    : "USDC settlement";

  if (!merchant && !profile) {
    notFound();
  }

  return (
    <div className="site-shell">
      <AppHeader />
      <main className="page stack-lg">
        <div className="section-heading">
          <div>
            <p className="muted">ENS checkout profile</p>
            <h1>{ensName}</h1>
          </div>
          <Link className="button secondary" href="/merchant">
            Create merchant profile
          </Link>
        </div>

        <div className="dashboard-layout">
          <aside className="stack-lg">
            <EnsProfileCard
              profile={profile}
              fallbackName={ensName}
              settlementAddress={merchant?.settlementAddress}
              settlementPreference={settlementLabel}
            />
            <div className="form-card">
              <p className="muted">Settlement</p>
              <h3>{settlementLabel}</h3>
              <p className="muted">
                This profile uses ENS as the public identity layer while checkout settlement is
                configured per merchant.
              </p>
            </div>
          </aside>

          <section className="form-card">
            <div>
              <p className="muted">Active checkout links</p>
              <h2>Invoices</h2>
            </div>
            {invoices.length ? (
              <div>
                {invoices.map((invoice) => (
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
                      <Link className="button secondary" href={`/checkout/${invoice.id}`}>
                        Pay
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                No local checkout links are attached to this ENS name yet.
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
