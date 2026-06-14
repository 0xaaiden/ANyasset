import type { Chain } from "viem";

export const ARC_TESTNET_CHAIN_ID = "5042002" as const;
export const ARC_CCTP_DOMAIN = 26;
export const ARC_USDC_ADDRESS = "0x3600000000000000000000000000000000000000" as const;
export const ARC_USDC_DECIMALS = 6;
export const ARC_RPC_URL = process.env.ARC_TESTNET_RPC_URL || "https://rpc.testnet.arc.network";
export const ARC_EXPLORER_URL = "https://testnet.arcscan.app";
export const CCTP_TESTNET_TOKEN_MESSENGER_V2 =
  "0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA" as const;
export const CCTP_TESTNET_MESSAGE_TRANSMITTER_V2 =
  "0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275" as const;

export const arcTestnet = {
  id: 5042002,
  name: "Arc Testnet",
  nativeCurrency: {
    name: "USDC",
    symbol: "USDC",
    decimals: 18
  },
  rpcUrls: {
    default: { http: [ARC_RPC_URL] },
    public: { http: [ARC_RPC_URL] }
  },
  blockExplorers: {
    default: { name: "Arcscan", url: ARC_EXPLORER_URL }
  },
  testnet: true
} as const satisfies Chain;

export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export function isDynamicFlowConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID && process.env.DYNAMIC_API_TOKEN);
}

export function arcscanAddressUrl(address: string) {
  return `${ARC_EXPLORER_URL}/address/${address}`;
}

export function arcscanTxUrl(hash: string) {
  return `${ARC_EXPLORER_URL}/tx/${hash}`;
}
