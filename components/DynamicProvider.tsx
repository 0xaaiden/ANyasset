"use client";

import { DynamicContextProvider } from "@dynamic-labs/sdk-react-core";
import { EthereumWalletConnectors } from "@dynamic-labs/ethereum";
import { SolanaWalletConnectorsWithConfig } from "@dynamic-labs/solana";
import { ensureDynamicFlowClient } from "@/lib/dynamicClient";

const environmentId = process.env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID;
const solanaWalletConnectors = SolanaWalletConnectorsWithConfig({
  customRpcUrls: {
    solana: [process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com"]
  }
});

ensureDynamicFlowClient(environmentId);

export function DynamicProvider({ children }: { children: React.ReactNode }) {
  if (!environmentId) {
    return <>{children}</>;
  }

  return (
    <DynamicContextProvider
      settings={{
        environmentId,
        walletConnectors: [EthereumWalletConnectors, solanaWalletConnectors],
        appName: "AnyAsset Checkout"
      }}
    >
      {children}
    </DynamicContextProvider>
  );
}
