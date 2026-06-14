import { NextResponse } from "next/server";
import { z } from "zod";
import { addPaymentEvent, getInvoiceWithMerchant, updateInvoice } from "@/lib/db";

const statusByAction = {
  started: "quoted",
  quoted: "quoted",
  submitted: "submitted",
  settled: "settled",
  failed: "failed",
  cancelled: "cancelled"
} as const;

const schema = z.object({
  invoiceId: z.string().min(1),
  action: z.enum(["started", "quoted", "submitted", "settled", "failed", "cancelled"]),
  transactionId: z.string().optional(),
  payerAddress: z.string().optional(),
  sourceChain: z.string().optional(),
  sourceToken: z.string().optional(),
  cctpBurnTxHash: z.string().optional(),
  cctpMessageHash: z.string().optional(),
  cctpMessageBytes: z.string().optional(),
  cctpAttestation: z.string().optional(),
  cctpAttestationStatus: z.enum(["pending", "complete"]).optional(),
  cctpReceiveTxHash: z.string().optional(),
  settlementTxHash: z.string().optional(),
  raw: z.unknown().optional()
});

export async function POST(request: Request) {
  try {
    const input = schema.parse(await request.json());
    const record = await getInvoiceWithMerchant(input.invoiceId);
    if (!record) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    const invoice = await updateInvoice(input.invoiceId, {
      status: statusByAction[input.action],
      dynamicTransactionId:
        input.transactionId ||
        record.invoice.dynamicTransactionId ||
        `demo_tx_${crypto.randomUUID().slice(0, 10)}`,
      payerAddress: input.payerAddress || record.invoice.payerAddress,
      sourceChain: input.sourceChain || record.invoice.sourceChain,
      sourceToken: input.sourceToken || record.invoice.sourceToken,
      cctpBurnTxHash: input.cctpBurnTxHash || record.invoice.cctpBurnTxHash,
      cctpMessageHash: input.cctpMessageHash || record.invoice.cctpMessageHash,
      cctpMessageBytes: input.cctpMessageBytes || record.invoice.cctpMessageBytes,
      cctpAttestation: input.cctpAttestation || record.invoice.cctpAttestation,
      cctpAttestationStatus:
        input.cctpAttestationStatus || record.invoice.cctpAttestationStatus,
      cctpReceiveTxHash: input.cctpReceiveTxHash || record.invoice.cctpReceiveTxHash,
      settlementTxHash: input.settlementTxHash || record.invoice.settlementTxHash
    });

    await addPaymentEvent({
      invoiceId: input.invoiceId,
      type: input.action,
      raw: input.raw ?? input
    });

    return NextResponse.json({
      invoice,
      merchant: record.merchant
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not update transaction" },
      { status: 400 }
    );
  }
}
