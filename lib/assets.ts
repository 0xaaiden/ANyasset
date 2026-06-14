export type EvmTokenPreset = {
  id: string;
  label: string;
  chainName: "EVM";
  chainId: string;
  cctpDomain?: number;
  network: string;
  tokenAddress: string;
  symbol: "USDC" | "ETH";
  tokenDecimals: number;
  isNative: boolean;
  badge?: string;
  helperText: string;
  flowSupported: boolean;
};

export type SettlementTokenPreset = Omit<EvmTokenPreset, "symbol"> & {
  symbol: "USDC";
};

export const SOURCE_ASSETS = [
  {
    id: "ethereum-usdc",
    label: "Ethereum USDC",
    chainName: "EVM",
    chainId: "1",
    network: "Ethereum Mainnet",
    tokenAddress: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    symbol: "USDC",
    tokenDecimals: 6,
    isNative: false,
    badge: "Live",
    helperText: "Best first test when your wallet is connected to Ethereum.",
    flowSupported: true
  },
  {
    id: "base-usdc",
    label: "Base USDC",
    chainName: "EVM",
    chainId: "8453",
    network: "Base",
    tokenAddress: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    symbol: "USDC",
    tokenDecimals: 6,
    isNative: false,
    badge: "Recommended",
    helperText: "Low-cost mainnet route that Dynamic Flow commonly supports.",
    flowSupported: true
  },
  {
    id: "base-sepolia-usdc",
    label: "Base Sepolia USDC",
    chainName: "EVM",
    chainId: "84532",
    cctpDomain: 6,
    network: "Base Sepolia",
    tokenAddress: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
    symbol: "USDC",
    tokenDecimals: 6,
    isNative: false,
    badge: "Testnet",
    helperText: "Testnet USDC route for sponsor demos and wallet QA.",
    flowSupported: true
  },
  {
    id: "sepolia-usdc",
    label: "Sepolia USDC",
    chainName: "EVM",
    chainId: "11155111",
    cctpDomain: 0,
    network: "Sepolia",
    tokenAddress: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
    symbol: "USDC",
    tokenDecimals: 6,
    isNative: false,
    badge: "Testnet",
    helperText: "Ethereum testnet USDC for Flow compatibility checks.",
    flowSupported: true
  },
  {
    id: "ethereum-eth",
    label: "Ethereum ETH",
    chainName: "EVM",
    chainId: "1",
    network: "Ethereum Mainnet",
    tokenAddress: "0x0000000000000000000000000000000000000000",
    symbol: "ETH",
    tokenDecimals: 18,
    isNative: true,
    badge: "Native",
    helperText: "Native ETH source. Useful when the customer does not hold USDC.",
    flowSupported: true
  }
] as const satisfies readonly EvmTokenPreset[];

export const SETTLEMENT_ASSETS = [
  {
    id: "base-usdc",
    label: "Base USDC",
    chainName: "EVM",
    chainId: "8453",
    network: "Base",
    tokenAddress: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    symbol: "USDC",
    tokenDecimals: 6,
    isNative: false,
    badge: "Recommended",
    helperText: "Recommended for live Dynamic Flow quotes.",
    flowSupported: true
  },
  {
    id: "ethereum-usdc",
    label: "Ethereum USDC",
    chainName: "EVM",
    chainId: "1",
    network: "Ethereum Mainnet",
    tokenAddress: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    symbol: "USDC",
    tokenDecimals: 6,
    isNative: false,
    badge: "Live",
    helperText: "Likely supported by Flow, but mainnet gas costs apply.",
    flowSupported: true
  },
  {
    id: "arc-testnet-usdc",
    label: "Arc Testnet USDC (Experimental)",
    chainName: "EVM",
    chainId: "5042002",
    network: "Arc Testnet",
    tokenAddress: "0x3600000000000000000000000000000000000000",
    symbol: "USDC",
    tokenDecimals: 6,
    isNative: false,
    badge: "Experimental",
    helperText:
      "Experimental Arc testnet target. Select this to demo Arc settlement, but use live networks for reliable Flow quotes.",
    flowSupported: false
  }
] as const satisfies readonly SettlementTokenPreset[];

export type SourceAssetId = (typeof SOURCE_ASSETS)[number]["id"];
export type SettlementAssetId = (typeof SETTLEMENT_ASSETS)[number]["id"];

export const DEFAULT_SOURCE_ASSET_ID: SourceAssetId = "ethereum-usdc";
export const DEFAULT_SETTLEMENT_ASSET_ID: SettlementAssetId = "base-usdc";
export const ARC_SETTLEMENT_ASSET_ID: SettlementAssetId = "arc-testnet-usdc";

export function getSourceAsset(id: string | undefined): EvmTokenPreset {
  return SOURCE_ASSETS.find((asset) => asset.id === id) ?? SOURCE_ASSETS[0];
}

export function getSettlementAsset(id: string | undefined): SettlementTokenPreset {
  return SETTLEMENT_ASSETS.find((asset) => asset.id === id) ?? SETTLEMENT_ASSETS[0];
}

export function findSettlementAssetByChainAndToken(
  chainId: string,
  tokenAddress: string
): SettlementTokenPreset | undefined {
  return SETTLEMENT_ASSETS.find(
    (asset) =>
      asset.chainId === chainId && asset.tokenAddress.toLowerCase() === tokenAddress.toLowerCase()
  );
}
