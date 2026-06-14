"use client";

import { useCallback, useEffect, useState } from "react";
import { ExternalLink, RefreshCw, WalletCards } from "lucide-react";
import { arcscanAddressUrl } from "@/lib/config";
import { shortAddress } from "@/lib/format";

type BalanceState =
  | { status: "idle" | "loading"; value?: never; error?: never }
  | { status: "ready"; value: string; error?: never }
  | { status: "error"; value?: never; error: string };

export function ArcBalanceCard({ address }: { address: string }) {
  const [balance, setBalance] = useState<BalanceState>({ status: "idle" });

  const loadBalance = useCallback(async () => {
    setBalance({ status: "loading" });
    try {
      const response = await fetch(`/api/arc/balance?address=${address}`, {
        cache: "no-store"
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.error || "Arc balance unavailable");
      }
      setBalance({ status: "ready", value: body.balance.formatted });
    } catch (error) {
      setBalance({
        status: "error",
        error: error instanceof Error ? error.message : "Arc balance unavailable"
      });
    }
  }, [address]);

  useEffect(() => {
    if (address) {
      const timer = window.setTimeout(() => void loadBalance(), 0);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [address, loadBalance]);

  return (
    <div className="form-card">
      <div className="invoice-title">
        <div>
          <p className="muted">Arc settlement balance</p>
          <h3>
            {balance.status === "ready"
              ? `${Number(balance.value).toLocaleString(undefined, {
                  maximumFractionDigits: 6
                })} USDC`
              : balance.status === "loading"
                ? "Reading Arc..."
                : "USDC on Arc"}
          </h3>
        </div>
        <WalletCards size={22} aria-hidden="true" />
      </div>
      <p className="muted address mono">{shortAddress(address)}</p>
      {balance.status === "error" ? <p className="error">{balance.error}</p> : null}
      <div className="button-row">
        <button className="button secondary" type="button" onClick={loadBalance}>
          <RefreshCw size={16} aria-hidden="true" />
          Refresh
        </button>
        <a className="button ghost" href={arcscanAddressUrl(address)} target="_blank" rel="noreferrer">
          <ExternalLink size={16} aria-hidden="true" />
          Arcscan
        </a>
      </div>
    </div>
  );
}
