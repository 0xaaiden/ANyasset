import "server-only";

import { createPublicClient, erc20Abi, formatUnits, http, isAddress } from "viem";
import {
  ARC_RPC_URL,
  ARC_USDC_ADDRESS,
  ARC_USDC_DECIMALS,
  arcTestnet
} from "@/lib/config";

export async function getArcUsdcBalance(address: string) {
  if (!isAddress(address)) {
    throw new Error("Invalid Arc settlement address");
  }

  const client = createPublicClient({
    chain: arcTestnet,
    transport: http(ARC_RPC_URL)
  });

  const raw = await client.readContract({
    address: ARC_USDC_ADDRESS,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [address]
  });

  return {
    raw: raw.toString(),
    formatted: formatUnits(raw, ARC_USDC_DECIMALS),
    symbol: "USDC"
  };
}
