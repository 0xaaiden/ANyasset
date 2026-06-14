"use client";

import { DynamicContextProvider } from "@dynamic-labs/sdk-react-core";
import { EthereumWalletConnectors } from "@dynamic-labs/ethereum";

export function DynamicProvider({ children }: { children: React.ReactNode }) {
  const environmentId = process.env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID;

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
