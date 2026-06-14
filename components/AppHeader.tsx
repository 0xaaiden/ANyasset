import Link from "next/link";
import { ArrowRightLeft, LayoutDashboard, ReceiptText, Store } from "lucide-react";

export function AppHeader() {
  return (
    <header className="topbar">
      <div className="topbar-inner">
        <Link href="/" className="brand" aria-label="AnyAsset Checkout home">
          <span className="brand-mark">
            <ArrowRightLeft size={18} aria-hidden="true" />
          </span>
          <span>AnyAsset Checkout</span>
        </Link>
        <nav className="nav-actions" aria-label="Primary">
          <Link className="nav-link" href="/merchant" data-testid="nav-merchant">
            <LayoutDashboard size={16} aria-hidden="true" />
            Merchant
          </Link>
          <Link className="nav-link" href="/checkout/inv_demo_latte" data-testid="nav-pay-demo">
            <ReceiptText size={16} aria-hidden="true" />
            Pay demo
          </Link>
          <Link className="nav-link" href="/m/coffee.aiden.eth" data-testid="nav-ens-profile">
            <Store size={16} aria-hidden="true" />
            ENS profile
          </Link>
        </nav>
      </div>
    </header>
  );
}
