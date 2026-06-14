"use client";

import { DynamicContextProvider } from "@dynamic-labs/sdk-react-core";
import { EthereumWalletConnectors } from "@dynamic-labs/ethereum";
import { ensureDynamicFlowClient } from "@/lib/dynamicClient";

const environmentId = process.env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID;

ensureDynamicFlowClient(environmentId);

export function DynamicProvider({ children }: { children: React.ReactNode }) {
  if (!environmentId) {
    return <>{children}</>;
  }

  return (
    <DynamicContextProvider
      settings={{
        environmentId,
        walletConnectors: [EthereumWalletConnectors],
        appName: "AnyAsset Checkout"
      }}
    >
      {children}
    </DynamicContextProvider>
  );
}
