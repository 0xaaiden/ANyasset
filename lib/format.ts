import type { InvoiceStatus } from "@/lib/types";

export function formatUsd(value: string | number) {
  const amount = typeof value === "number" ? value : Number(value);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format(Number.isFinite(amount) ? amount : 0);
}

export function shortAddress(address?: string | null) {
  if (!address) {
    return "Not set";
  }
  if (address.length <= 12) {
    return address;
  }
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function statusLabel(status: InvoiceStatus) {
  const labels: Record<InvoiceStatus, string> = {
    draft: "Draft",
    open: "Open",
    quoted: "Quoted",
    submitted: "Submitted",
    settled: "Settled",
    failed: "Failed",
    cancelled: "Cancelled"
  };
  return labels[status];
}
