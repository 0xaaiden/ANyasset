"use client";

import { createDynamicClient, type DynamicClient } from "@dynamic-labs-sdk/client";
import { addEvmExtension } from "@dynamic-labs-sdk/evm";
import { addEvmWindowInjectedExtension } from "@dynamic-labs-sdk/evm/window-injected";

declare global {
  interface Window {
    __anyassetDynamicClient?: DynamicClient;
  }
}

export function ensureDynamicFlowClient(environmentId?: string): DynamicClient | null {
  if (typeof window === "undefined" || !environmentId) {
    return null;
  }

  if (window.__anyassetDynamicClient) {
    return window.__anyassetDynamicClient;
  }

  const client = createDynamicClient({
    environmentId,
    metadata: {
      name: "AnyAsset Checkout"
    }
  });

  addEvmExtension(client);
  addEvmWindowInjectedExtension(client);

  window.__anyassetDynamicClient = client;
  return client;
}
