import { AppHeader } from "@/components/AppHeader";
import { MerchantDashboard } from "@/components/MerchantDashboard";
import { listInvoices, listMerchants } from "@/lib/db";

export default async function MerchantPage() {
  const merchants = await listMerchants();
  const invoices = await listInvoices(merchants[0]?.id);

  return (
    <div className="site-shell">
      <AppHeader />
      <main className="page stack-lg">
        <div className="section-heading">
          <div>
            <p className="muted">Merchant console</p>
            <h1>Checkout links that settle predictably.</h1>
          </div>
        </div>
        <MerchantDashboard initialMerchants={merchants} initialInvoices={invoices} />
      </main>
    </div>
  );
}
