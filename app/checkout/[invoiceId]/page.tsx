import { notFound } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { CheckoutFlow } from "@/components/CheckoutFlow";
import { getInvoiceWithMerchant } from "@/lib/db";
import { mergeEnsProfiles, resolveEnsProfile } from "@/lib/ens";

export default async function CheckoutPage({
  params
}: {
  params: Promise<{ invoiceId: string }>;
}) {
  const { invoiceId } = await params;
  const record = await getInvoiceWithMerchant(invoiceId);
  if (!record) {
    notFound();
  }

  const liveEnsProfile = record.merchant.ensName
    ? await resolveEnsProfile(record.merchant.ensName)
    : record.merchant.ensProfile;
  const ensProfile = mergeEnsProfiles(liveEnsProfile, record.merchant.ensProfile);

  return (
    <div className="site-shell">
      <AppHeader />
      <main className="page">
        <CheckoutFlow
          initialInvoice={record.invoice}
          merchant={record.merchant}
          ensProfile={ensProfile}
        />
      </main>
    </div>
  );
}
