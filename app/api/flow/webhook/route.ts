import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { addPaymentEvent, getInvoiceWithMerchant, updateInvoice } from "@/lib/db";
import type { InvoiceStatus } from "@/lib/types";

function verifySignature(raw: string, signature?: string | null) {
  const secret = process.env.FLOW_WEBHOOK_SECRET;
  if (!secret) {
    return true;
  }
  if (!signature) {
    return false;
  }

  const expected = createHmac("sha256", secret).update(raw).digest("hex");
  const normalized = signature.replace(/^sha256=/, "");
  const left = Buffer.from(expected);
  const right = Buffer.from(normalized);
  return left.length === right.length && timingSafeEqual(left, right);
}

function pickInvoiceId(event: Record<string, unknown>) {
  return (
    event.memo ||
    event.invoiceId ||
    event.checkoutMemo ||
    (event.data as Record<string, unknown> | undefined)?.memo ||
    (event.data as Record<string, unknown> | undefined)?.invoiceId
  );
}

function mapStatus(event: Record<string, unknown>): InvoiceStatus {
  const value = String(
    event.settlementState ||
      event.executionState ||
      event.status ||
      (event.data as Record<string, unknown> | undefined)?.settlementState ||
      ""
  ).toLowerCase();

  if (value.includes("complete") || value.includes("settled")) {
    return "settled";
  }
  if (value.includes("fail")) {
    return "failed";
  }
  if (value.includes("cancel")) {
    return "cancelled";
  }
  if (value.includes("submit") || value.includes("execute")) {
    return "submitted";
  }
  return "quoted";
}

export async function POST(request: Request) {
  const raw = await request.text();
  const signature =
    request.headers.get("x-dynamic-signature") ||
    request.headers.get("x-signature") ||
    request.headers.get("dynamic-signature");

  if (!verifySignature(raw, signature)) {
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
  }

  try {
    const event = JSON.parse(raw) as Record<string, unknown>;
    const invoiceId = pickInvoiceId(event);
    if (typeof invoiceId !== "string") {
      return NextResponse.json({ received: true, skipped: "No invoice memo" });
    }

    const record = await getInvoiceWithMerchant(invoiceId);
    if (!record) {
      return NextResponse.json({ received: true, skipped: "Unknown invoice" });
    }

    const data = (event.data as Record<string, unknown> | undefined) ?? event;
    const settlementTxHash =
      typeof data.settlementTxHash === "string"
        ? data.settlementTxHash
        : typeof data.transactionHash === "string"
          ? data.transactionHash
          : undefined;

    const invoice = await updateInvoice(invoiceId, {
      status: mapStatus(event),
      settlementTxHash
    });

    await addPaymentEvent({
      invoiceId,
      type: String(event.type || "flow.webhook"),
      raw: event
    });

    return NextResponse.json({ received: true, invoice });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Webhook processing failed" },
      { status: 400 }
    );
  }
}
