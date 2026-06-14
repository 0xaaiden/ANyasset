import { NextResponse } from "next/server";
import { isAddress } from "viem";
import { z } from "zod";
import { createMerchant, listMerchants } from "@/lib/db";
import { createDynamicCheckout } from "@/lib/dynamic";
import { resolveEnsProfile } from "@/lib/ens";

const createMerchantSchema = z.object({
  dynamicUserId: z.string().min(1).default("demo-user"),
  ownerAddress: z.string().refine(isAddress, "Owner address must be a valid EVM address"),
  ensName: z.string().trim().optional().or(z.literal("")),
  settlementAddress: z
    .string()
    .refine(isAddress, "Settlement address must be a valid EVM address")
});

export async function GET() {
  const merchants = await listMerchants();
  return NextResponse.json({ merchants });
}

export async function POST(request: Request) {
  try {
    const input = createMerchantSchema.parse(await request.json());
    const ensName = input.ensName ? input.ensName.trim().toLowerCase() : undefined;
    const [ensProfile, checkout] = await Promise.all([
      resolveEnsProfile(ensName),
      createDynamicCheckout(input.settlementAddress)
    ]);

    const merchant = await createMerchant({
      dynamicUserId: input.dynamicUserId,
      ownerAddress: input.ownerAddress,
      ensName,
      ensProfile,
      settlementAddress: input.settlementAddress,
      dynamicCheckoutId: checkout.checkoutId,
      dynamicCheckoutMode: checkout.mode
    });

    return NextResponse.json({ merchant }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not create merchant" },
      { status: 400 }
    );
  }
}
