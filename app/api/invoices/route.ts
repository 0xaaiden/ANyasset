import { NextResponse } from "next/server";
import { z } from "zod";
import { createInvoice, listInvoices } from "@/lib/db";
import { APP_URL } from "@/lib/config";

const invoiceSchema = z.object({
  merchantId: z.string().min(1),
  title: z.string().trim().min(1).max(80),
  description: z.string().trim().max(240).optional().or(z.literal("")),
  amountUsd: z
    .string()
    .trim()
    .regex(/^\d+(\.\d{1,2})?$/, "Amount must be a dollar value")
    .refine((value) => Number(value) > 0, "Amount must be greater than zero")
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const merchantId = searchParams.get("merchantId") ?? undefined;
  const invoices = await listInvoices(merchantId);
  return NextResponse.json({ invoices });
}

export async function POST(request: Request) {
  try {
    const input = invoiceSchema.parse(await request.json());
    const invoice = await createInvoice({
      merchantId: input.merchantId,
      title: input.title,
      amountUsd: Number(input.amountUsd).toFixed(2),
      description: input.description || undefined
    });

    return NextResponse.json(
      {
        invoice,
        checkoutUrl: `${APP_URL}/checkout/${invoice.id}`
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not create invoice" },
      { status: 400 }
    );
  }
}
