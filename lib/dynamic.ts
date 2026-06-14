import "server-only";

import { getSettlementAsset, type SettlementTokenPreset } from "@/lib/assets";

type CheckoutRequest = {
  mode: "payment";
  settlementConfig: {
    strategy: "cheapest";
    settlements: Array<{
      chainName: "EVM";
      tokenAddress: string;
      chainId: string;
      symbol: string;
      tokenDecimals: number;
      isNative: boolean;
    }>;
  };
  destinationConfig: {
    destinations: Array<{
      chainName: "EVM";
      type: "address";
      identifier: string;
    }>;
  };
  enableOrchestration: true;
};

export function buildFlowCheckoutRequest(
  settlementAddress: string,
  settlementAsset: SettlementTokenPreset = getSettlementAsset(undefined)
): CheckoutRequest {
  return {
    mode: "payment",
    settlementConfig: {
      strategy: "cheapest",
      settlements: [
        {
          chainName: settlementAsset.chainName,
          tokenAddress: settlementAsset.tokenAddress,
          chainId: settlementAsset.chainId,
          symbol: settlementAsset.symbol,
          tokenDecimals: settlementAsset.tokenDecimals,
          isNative: settlementAsset.isNative
        }
      ]
    },
    destinationConfig: {
      destinations: [
        {
          chainName: "EVM",
          type: "address",
          identifier: settlementAddress
        }
      ]
    },
    enableOrchestration: true
  };
}

export async function createDynamicCheckout(
  settlementAddress: string,
  settlementAsset: SettlementTokenPreset = getSettlementAsset(undefined)
) {
  const environmentId = process.env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID;
  const apiToken = process.env.DYNAMIC_API_TOKEN;
  const request = buildFlowCheckoutRequest(settlementAddress, settlementAsset);

  if (!environmentId || !apiToken) {
    return {
      checkoutId: `demo_checkout_${settlementAsset.id}_${settlementAddress.slice(2, 10).toLowerCase()}`,
      mode: "demo" as const,
      raw: request
    };
  }

  const response = await fetch(
    `https://app.dynamic.xyz/api/v0/environments/${environmentId}/checkouts`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(request)
    }
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Dynamic checkout creation failed: ${response.status} ${body}`);
  }

  const body = (await response.json()) as { id?: string };
  if (!body.id) {
    throw new Error("Dynamic checkout response did not include an id");
  }

  return {
    checkoutId: body.id,
    mode: "live" as const,
    raw: body
  };
}
