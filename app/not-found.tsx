import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";

export default function NotFound() {
  return (
    <div className="site-shell">
      <AppHeader />
      <main className="page stack">
        <p className="muted">Not found</p>
        <h1>That checkout link is not available.</h1>
        <p className="lede">Create a new merchant invoice or open the demo checkout.</p>
        <div className="button-row">
          <Link className="button" href="/merchant">
            Merchant dashboard
          </Link>
          <Link className="button secondary" href="/checkout/inv_demo_latte">
            Demo invoice
          </Link>
        </div>
      </main>
    </div>
  );
}
