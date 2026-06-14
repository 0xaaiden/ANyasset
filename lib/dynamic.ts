import "server-only";

import { ARC_TESTNET_CHAIN_ID, ARC_USDC_ADDRESS, ARC_USDC_DECIMALS } from "@/lib/config";

type CheckoutRequest = {
  mode: "payment";
  settlementConfig: {
    strategy: "cheapest";
    settlements: Array<{
      chainName: "EVM";
      tokenAddress: typeof ARC_USDC_ADDRESS;
      chainId: typeof ARC_TESTNET_CHAIN_ID;
      symbol: "USDC";
      tokenDecimals: typeof ARC_USDC_DECIMALS;
      isNative: false;
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

export function buildFlowCheckoutRequest(settlementAddress: string): CheckoutRequest {
  return {
    mode: "payment",
    settlementConfig: {
      strategy: "cheapest",
      settlements: [
        {
          chainName: "EVM",
          tokenAddress: ARC_USDC_ADDRESS,
          chainId: ARC_TESTNET_CHAIN_ID,
          symbol: "USDC",
          tokenDecimals: ARC_USDC_DECIMALS,
          isNative: false
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

export async function createDynamicCheckout(settlementAddress: string) {
  const environmentId = process.env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID;
  const apiToken = process.env.DYNAMIC_API_TOKEN;
  const request = buildFlowCheckoutRequest(settlementAddress);

  if (!environmentId || !apiToken) {
    return {
      checkoutId: `demo_checkout_${settlementAddress.slice(2, 10).toLowerCase()}`,
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
