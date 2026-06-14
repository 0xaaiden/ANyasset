import Link from "next/link";
import {
  ArrowRight,
  BadgeDollarSign,
  Blocks,
  CheckCircle2,
  Link2,
  ReceiptText,
  Route,
  WalletCards
} from "lucide-react";
import { AppHeader } from "@/components/AppHeader";

export default function Home() {
  return (
    <div className="site-shell">
      <AppHeader />
      <main>
        <section className="page hero">
          <div className="hero-copy">
            <span className="eyebrow">
              <Route size={15} aria-hidden="true" />
              Dynamic Flow · Arc settlement · ENS identity
            </span>
            <div className="stack">
              <h1>Accept any crypto. Settle in USDC on Arc.</h1>
              <p className="lede">
                AnyAsset Checkout gives merchants ENS-branded payment links while Dynamic Flow
                routes the customer&apos;s existing wallet, chain, and token into predictable Arc
                Testnet USDC settlement.
              </p>
            </div>
            <div className="button-row">
              <Link className="button" href="/merchant" data-testid="home-create-checkout">
                <Link2 size={16} aria-hidden="true" />
                Create checkout
              </Link>
              <Link
                className="button secondary"
                href="/checkout/inv_demo_latte"
                data-testid="home-pay-demo"
              >
                <ReceiptText size={16} aria-hidden="true" />
                Pay demo invoice
              </Link>
            </div>
          </div>

          <div className="product-preview">
            <div className="preview-header">
              <span className="merchant-chip">
                <Blocks size={15} aria-hidden="true" />
                <strong>coffee.aiden.eth</strong>
              </span>
              <span className="status-chip">
                <CheckCircle2 size={15} aria-hidden="true" />
                <strong>USDC on Arc</strong>
              </span>
            </div>
            <div className="preview-grid">
              <div className="checkout-card panel">
                <div className="invoice-title">
                  <div>
                    <p className="muted">Invoice</p>
                    <h2>Hackathon Latte</h2>
                  </div>
                  <span className="status-open">Open</span>
                </div>
                <div className="amount">$5.00</div>
                <p className="muted">Customer can pay from a supported wallet, exchange, chain, or token.</p>
                <div style={{ flex: 1 }} />
                <Link className="button" href="/checkout/inv_demo_latte">
                  Pay invoice
                  <ArrowRight size={16} aria-hidden="true" />
                </Link>
              </div>

              <div className="rail-visual panel-muted">
                <div className="rail-row">
                  <div className="rail-icon">
                    <WalletCards size={22} aria-hidden="true" />
                  </div>
                  <div>
                    <strong>Existing customer funds</strong>
                    <div className="rail-track" aria-hidden="true" />
                  </div>
                </div>
                <div className="rail-row">
                  <div className="rail-icon">
                    <Route size={22} aria-hidden="true" />
                  </div>
                  <div>
                    <strong>Dynamic Flow route</strong>
                    <div className="rail-track" aria-hidden="true" />
                  </div>
                </div>
                <div className="rail-row">
                  <div className="rail-icon">
                    <BadgeDollarSign size={22} aria-hidden="true" />
                  </div>
                  <div>
                    <strong>USDC settlement on Arc</strong>
                    <div className="rail-track" aria-hidden="true" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="section-band">
          <div className="section-inner">
            <div className="section-heading">
              <div>
                <p className="muted">Sponsor integrations</p>
                <h2>Built around the money movement</h2>
              </div>
            </div>
            <div className="grid-3">
              <div className="feature-card">
                <Route size={24} aria-hidden="true" />
                <h3>Dynamic Flow checkout</h3>
                <p className="muted">
                  Fixed-price payment mode creates a transaction, attaches the payer source,
                  gets a quote, submits, and polls through settlement.
                </p>
              </div>
              <div className="feature-card">
                <BadgeDollarSign size={24} aria-hidden="true" />
                <h3>Arc settlement rail</h3>
                <p className="muted">
                  Merchants configure USDC on Arc Testnet and the dashboard reads live Arc USDC
                  balances from the settlement address.
                </p>
              </div>
              <div className="feature-card">
                <Blocks size={24} aria-hidden="true" />
                <h3>ENS merchant profile</h3>
                <p className="muted">
                  Checkout links show a human merchant identity, read profile text records, and
                  expose merchant pages under ENS names.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
