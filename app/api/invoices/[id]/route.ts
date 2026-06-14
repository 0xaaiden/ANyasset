import { NextResponse } from "next/server";
import { getInvoiceWithMerchant } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const record = await getInvoiceWithMerchant(id);
  if (!record) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }
  return NextResponse.json(record);
}
