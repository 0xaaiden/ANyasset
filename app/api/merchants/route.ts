import { NextResponse } from "next/server";
import { isAddress } from "viem";
import { z } from "zod";
import { DEFAULT_SETTLEMENT_ASSET_ID, getSettlementAsset } from "@/lib/assets";
import { createMerchant, listMerchants } from "@/lib/db";
import { createDynamicCheckout } from "@/lib/dynamic";
import { resolveEnsProfile } from "@/lib/ens";

const createMerchantSchema = z.object({
  dynamicUserId: z.string().min(1).default("demo-user"),
  ownerAddress: z.string().refine(isAddress, "Owner address must be a valid EVM address"),
  ensName: z.string().trim().optional().or(z.literal("")),
  settlementAssetId: z.string().min(1).default(DEFAULT_SETTLEMENT_ASSET_ID),
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
    const settlementAsset = getSettlementAsset(input.settlementAssetId);
    const [ensProfile, checkout] = await Promise.all([
      resolveEnsProfile(ensName),
      createDynamicCheckout(input.settlementAddress, settlementAsset)
    ]);

    const merchant = await createMerchant({
      dynamicUserId: input.dynamicUserId,
      ownerAddress: input.ownerAddress,
      ensName,
      ensProfile,
      settlementAsset,
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
