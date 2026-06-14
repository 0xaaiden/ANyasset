"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  Loader2,
  ReceiptText,
  RefreshCw,
  Send,
  Wallet
} from "lucide-react";
import { DynamicWidget, useDynamicContext } from "@dynamic-labs/sdk-react-core";
import {
  createPublicClient,
  createWalletClient,
  custom,
  decodeEventLog,
  erc20Abi,
  http,
  keccak256,
  pad,
  parseUnits,
  type Address,
  type Hex
} from "viem";
import { getWalletProviderRegistry } from "@dynamic-labs-sdk/client/core";
import { EnsProfileCard } from "@/components/EnsProfileCard";
import { PaymentStatusTimeline } from "@/components/PaymentStatusTimeline";
import {
  ARC_SETTLEMENT_ASSET_ID,
  DEFAULT_SOURCE_ASSET_ID,
  SOURCE_ASSETS,
  getSourceAsset
} from "@/lib/assets";
import type { EvmTokenPreset } from "@/lib/assets";
import {
  ARC_CCTP_DOMAIN,
  ARC_RPC_URL,
  CCTP_TESTNET_MESSAGE_TRANSMITTER_V2,
  CCTP_TESTNET_TOKEN_MESSENGER_V2,
  arcTestnet,
  arcscanTxUrl
} from "@/lib/config";
import { ensureDynamicFlowClient } from "@/lib/dynamicClient";
import { formatUsd, shortAddress, statusLabel } from "@/lib/format";
import type { EnsProfile, Invoice, Merchant } from "@/lib/types";

const hasDynamicEnv = Boolean(process.env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID);
const CCTP_STANDARD_FINALITY_THRESHOLD = 2000;
const ZERO_BYTES_32 =
  "0x0000000000000000000000000000000000000000000000000000000000000000" as const;

type BrowserEthereumProvider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
};

const cctpDepositForBurnAbi = [
  {
    name: "depositForBurn",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "amount", type: "uint256" },
      { name: "destinationDomain", type: "uint32" },
      { name: "mintRecipient", type: "bytes32" },
      { name: "burnToken", type: "address" },
      { name: "destinationCaller", type: "bytes32" },
      { name: "maxFee", type: "uint256" },
      { name: "minFinalityThreshold", type: "uint32" }
    ],
    outputs: []
  }
] as const;

const cctpReceiveMessageAbi = [
  {
    name: "receiveMessage",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "message", type: "bytes" },
      { name: "attestation", type: "bytes" }
    ],
    outputs: [{ type: "bool" }]
  }
] as const;

type FlowAction = "started" | "quoted" | "submitted" | "settled" | "failed" | "cancelled";

async function markInvoice(
  invoiceId: string,
  action: FlowAction,
  payload: Record<string, unknown> = {}
) {
  const response = await fetch("/api/flow/transaction", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ invoiceId, action, ...payload })
  });
  const body = await response.json();
  if (!response.ok) {
    throw new Error(body.error || "Payment state update failed");
  }
  return body.invoice as Invoice;
}

function extractTransactionHash(value: unknown): string | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }
  const object = value as Record<string, unknown>;
  const keys = ["settlementTxHash", "transactionHash", "txHash", "hash"];
  for (const key of keys) {
    if (typeof object[key] === "string") {
      return object[key] as string;
    }
  }
  for (const nested of ["transaction", "result", "settlement"]) {
    const hash = extractTransactionHash(object[nested]);
    if (hash) {
      return hash;
    }
  }
  return undefined;
}

async function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function DynamicPaymentActions({
  invoice,
  merchant,
  onInvoice,
  onError,
  onBusy,
  busy
}: {
  invoice: Invoice;
  merchant: Merchant;
  onInvoice: (invoice: Invoice) => void;
  onError: (message: string) => void;
  onBusy: (busy: boolean) => void;
  busy: boolean;
}) {
  const { primaryWallet } = useDynamicContext();
  const [sourceAssetId, setSourceAssetId] = useState<string>(DEFAULT_SOURCE_ASSET_ID);
  const sourceAsset = getSourceAsset(sourceAssetId);
  const settlementLabel = `${merchant.settlementTokenSymbol} on ${
    merchant.settlementNetwork || `EVM ${merchant.settlementChainId}`
  }`;

  async function payWithDynamicFlow() {
    onBusy(true);
    onError("");
    try {
      if (!primaryWallet?.address) {
        throw new Error("Connect a wallet before paying.");
      }
      if (!merchant.dynamicCheckoutId || merchant.dynamicCheckoutMode !== "live") {
        throw new Error("Live Dynamic Flow checkout is not configured.");
      }

      const flowClient = await import("@dynamic-labs-sdk/client");
      const dynamicClient = ensureDynamicFlowClient(process.env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID);
      if (!dynamicClient) {
        throw new Error("Dynamic Flow client is not configured.");
      }

      const walletAccount = flowClient
        .getWalletAccounts(dynamicClient)
        .find(
          (account) => account.address.toLowerCase() === primaryWallet.address.toLowerCase()
        );

      if (!walletAccount) {
        throw new Error("Dynamic Flow could not find the connected wallet account. Reconnect your wallet and try again.");
      }
      if (!walletAccount.walletProviderKey) {
        throw new Error(
          "Dynamic Flow could not find a signing provider for this wallet. Reconnect your wallet in the Dynamic widget and try again."
        );
      }

      const { networkData } = await flowClient.getActiveNetworkData({ walletAccount }, dynamicClient);
      if (networkData?.networkId && networkData.networkId !== sourceAsset.chainId) {
        try {
          await flowClient.switchActiveNetwork({
            networkId: sourceAsset.chainId,
            walletAccount
          }, dynamicClient);
        } catch {
          throw new Error(`Switch your wallet to ${sourceAsset.network} before paying.`);
        }
      }

      const { transaction } = await flowClient.createCheckoutTransaction({
        amount: invoice.amountUsd,
        currency: "USD",
        checkoutId: merchant.dynamicCheckoutId
      }, dynamicClient);

      onInvoice(
        await markInvoice(invoice.id, "started", {
          transactionId: transaction.id,
          payerAddress: primaryWallet.address,
          sourceChain: sourceAsset.network,
          sourceToken: sourceAsset.label,
          raw: transaction
        })
      );

      await flowClient.attachCheckoutTransactionSource({
        transactionId: transaction.id,
        fromAddress: walletAccount.address,
        fromChainId: sourceAsset.chainId,
        fromChainName: walletAccount.chain
      }, dynamicClient);

      const quote = await flowClient.getCheckoutTransactionQuote({
        transactionId: transaction.id,
        fromTokenAddress: sourceAsset.tokenAddress
      }, dynamicClient);

      onInvoice(
        await markInvoice(invoice.id, "quoted", {
          transactionId: transaction.id,
          raw: quote
        })
      );

      const result = await flowClient.submitCheckoutTransaction({
        transactionId: transaction.id,
        walletAccount
      }, dynamicClient);

      onInvoice(
        await markInvoice(invoice.id, "submitted", {
          transactionId: transaction.id,
          raw: result
        })
      );

      let finalState: unknown = result;
      for (let attempt = 0; attempt < 12; attempt += 1) {
        await delay(3000);
        finalState = await flowClient.getCheckoutTransaction({
          transactionId: transaction.id
        }, dynamicClient);
        const state = finalState as Record<string, unknown>;
        if (
          ["completed", "failed"].includes(String(state.settlementState).toLowerCase()) ||
          ["cancelled", "expired", "failed"].includes(String(state.executionState).toLowerCase())
        ) {
          break;
        }
      }

      const final = finalState as Record<string, unknown>;
      const settled = String(final.settlementState).toLowerCase() === "completed";
      onInvoice(
        await markInvoice(invoice.id, settled ? "settled" : "submitted", {
          transactionId: transaction.id,
          settlementTxHash: extractTransactionHash(final),
          raw: final
        })
      );
    } catch (error) {
      onError(error instanceof Error ? error.message : "Dynamic Flow payment failed");
      try {
        onInvoice(await markInvoice(invoice.id, "failed", { raw: { error: String(error) } }));
      } catch {
        // The visible error above is more useful than a secondary state-sync failure.
      }
    } finally {
      onBusy(false);
    }
  }

  return (
    <div className="stack">
      <div className="form-card">
        <div className="invoice-title">
          <div>
            <p className="muted">Step 1 · Customer wallet</p>
            <h3>{primaryWallet?.address ? shortAddress(primaryWallet.address) : "Connect to pay"}</h3>
            <p className="muted">
              Dynamic keeps the wallet session separate from the merchant settlement profile.
            </p>
          </div>
          <Wallet size={22} aria-hidden="true" />
        </div>
        <DynamicWidget />
      </div>

      <div className="form-card payment-action-card">
        <div className="invoice-title">
          <div>
            <p className="muted">Step 2 · Pick route</p>
            <h3>Choose the source asset</h3>
            <p className="muted">We show the exact chain and token before Dynamic asks for a signature.</p>
          </div>
          <Send size={22} aria-hidden="true" />
        </div>
        <div className="field">
          <label htmlFor="sourceAsset">Customer pays with</label>
          <select
            id="sourceAsset"
            className="select"
            value={sourceAssetId}
            onChange={(event) => setSourceAssetId(event.target.value)}
          >
            {SOURCE_ASSETS.map((asset) => (
              <option key={asset.id} value={asset.id}>
                {asset.label} · {asset.network}
              </option>
            ))}
          </select>
        </div>
        <div className="asset-summary">
          <div>
            <p className="muted">Source route</p>
            <h3>{sourceAsset.label}</h3>
            <p className="muted">{sourceAsset.helperText}</p>
          </div>
          <span className="status-chip">{sourceAsset.badge || "Source"}</span>
        </div>
        <div className="asset-details">
          <div>
            <span className="muted">Chain ID</span>
            <strong className="mono">{sourceAsset.chainId}</strong>
          </div>
          <div>
            <span className="muted">Token</span>
            <strong className="mono">{sourceAsset.tokenAddress}</strong>
          </div>
          <div>
            <span className="muted">Merchant receives</span>
            <strong>{settlementLabel}</strong>
          </div>
        </div>
        {!merchant.settlementFlowSupported ? (
          <div className="callout amber">
            Experimental target: {settlementLabel} is saved as the merchant destination, but
            Dynamic Flow may not quote it live yet. Use a Base USDC merchant for the reliable live
            checkout path.
          </div>
        ) : null}
        <button
          className="button"
          type="button"
          onClick={payWithDynamicFlow}
          disabled={busy || invoice.status === "settled" || !primaryWallet?.address}
        >
          {busy ? <Loader2 size={16} aria-hidden="true" /> : <Send size={16} aria-hidden="true" />}
          {busy ? "Routing payment..." : "Pay with Dynamic Flow"}
        </button>
      </div>
    </div>
  );
}

function ExperimentalArcCctpActions({
  invoice,
  merchant,
  onInvoice,
  onError,
  onBusy,
  busy
}: {
  invoice: Invoice;
  merchant: Merchant;
  onInvoice: (invoice: Invoice) => void;
  onError: (message: string) => void;
  onBusy: (busy: boolean) => void;
  busy: boolean;
}) {
  const { primaryWallet } = useDynamicContext();
  const cctpSources = (SOURCE_ASSETS as readonly EvmTokenPreset[]).filter(
    (asset) => asset.symbol === "USDC" && typeof asset.cctpDomain === "number"
  );
  const [sourceAssetId, setSourceAssetId] = useState<string>(
    cctpSources[0]?.id ?? DEFAULT_SOURCE_ASSET_ID
  );
  const sourceAsset = getSourceAsset(sourceAssetId);

  async function getWalletAccountAndProvider() {
    if (!primaryWallet?.address) {
      throw new Error("Connect a wallet before paying.");
    }

    const flowClient = await import("@dynamic-labs-sdk/client");
    const dynamicClient = ensureDynamicFlowClient(process.env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID);
    if (!dynamicClient) {
      throw new Error("Dynamic Flow client is not configured.");
    }

    const walletAccount = flowClient
      .getWalletAccounts(dynamicClient)
      .find((account) => account.address.toLowerCase() === primaryWallet.address.toLowerCase());

    if (!walletAccount?.walletProviderKey) {
      throw new Error("Reconnect your wallet in the Dynamic widget before using Arc CCTP.");
    }

    const provider = getWalletProviderRegistry(dynamicClient).getByKey(
      walletAccount.walletProviderKey
    ) as BrowserEthereumProvider | undefined;

    if (!provider?.request) {
      throw new Error(
        `No EVM provider is registered for ${walletAccount.walletProviderKey}. Reconnect the wallet and refresh.`
      );
    }

    return { dynamicClient, flowClient, provider, walletAccount };
  }

  async function burnToArc() {
    onBusy(true);
    onError("");
    try {
      if (typeof sourceAsset.cctpDomain !== "number") {
        throw new Error("Choose a testnet USDC source with CCTP support.");
      }
      const { dynamicClient, flowClient, provider, walletAccount } =
        await getWalletAccountAndProvider();

      const { networkData } = await flowClient.getActiveNetworkData(
        { walletAccount },
        dynamicClient
      );
      if (networkData?.networkId && networkData.networkId !== sourceAsset.chainId) {
        await flowClient.switchActiveNetwork(
          { networkId: sourceAsset.chainId, walletAccount },
          dynamicClient
        );
      }

      const transport = custom(provider);
      const walletClient = createWalletClient({
        account: walletAccount.address as Address,
        transport
      });
      const sourcePublicClient = createPublicClient({ transport });
      const amount = parseUnits(invoice.amountUsd, sourceAsset.tokenDecimals);
      const mintRecipient = pad(merchant.settlementAddress as Address, { size: 32 });

      const approvalHash = await walletClient.writeContract({
        chain: null,
        address: sourceAsset.tokenAddress as Address,
        abi: erc20Abi,
        functionName: "approve",
        args: [CCTP_TESTNET_TOKEN_MESSENGER_V2, amount]
      });
      await sourcePublicClient.waitForTransactionReceipt({ hash: approvalHash });

      const burnTxHash = await walletClient.writeContract({
        chain: null,
        address: CCTP_TESTNET_TOKEN_MESSENGER_V2,
        abi: cctpDepositForBurnAbi,
        functionName: "depositForBurn",
        args: [
          amount,
          ARC_CCTP_DOMAIN,
          mintRecipient,
          sourceAsset.tokenAddress as Address,
          ZERO_BYTES_32,
          BigInt(0),
          CCTP_STANDARD_FINALITY_THRESHOLD
        ]
      });
      const burnReceipt = await sourcePublicClient.waitForTransactionReceipt({
        hash: burnTxHash
      });

      const messageBytes = burnReceipt.logs.flatMap((log) => {
        try {
          const decoded = decodeEventLog({
            abi: [
              {
                type: "event",
                name: "MessageSent",
                inputs: [{ name: "message", type: "bytes", indexed: false }]
              }
            ],
            data: log.data,
            topics: log.topics
          });
          return decoded.eventName === "MessageSent" ? [decoded.args.message as Hex] : [];
        } catch {
          return [];
        }
      })[0];

      if (!messageBytes) {
        throw new Error("CCTP burn succeeded, but the MessageSent event was not found.");
      }

      const messageHash = keccak256(messageBytes);
      onInvoice(
        await markInvoice(invoice.id, "submitted", {
          transactionId: `cctp_${burnTxHash.slice(2, 12)}`,
          payerAddress: walletAccount.address,
          sourceChain: sourceAsset.network,
          sourceToken: sourceAsset.label,
          cctpBurnTxHash: burnTxHash,
          cctpMessageHash: messageHash,
          cctpMessageBytes: messageBytes,
          cctpAttestationStatus: "pending",
          raw: { approvalHash, burnTxHash, messageHash, messageBytes }
        })
      );
    } catch (error) {
      onError(error instanceof Error ? error.message : "Arc CCTP burn failed");
      try {
        onInvoice(await markInvoice(invoice.id, "failed", { raw: { error: String(error) } }));
      } catch {
        // Keep the primary wallet/CCTP error visible.
      }
    } finally {
      onBusy(false);
    }
  }

  async function refreshAttestation() {
    if (!invoice.cctpMessageHash) {
      return;
    }
    onBusy(true);
    onError("");
    try {
      const response = await fetch(
        `/api/cctp/attestation?messageHash=${invoice.cctpMessageHash}`,
        { cache: "no-store" }
      );
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.error || "Could not refresh CCTP attestation");
      }
      onInvoice(
        await markInvoice(invoice.id, "submitted", {
          cctpAttestationStatus: body.status,
          cctpAttestation: body.attestation,
          raw: body
        })
      );
    } catch (error) {
      onError(error instanceof Error ? error.message : "CCTP attestation refresh failed");
    } finally {
      onBusy(false);
    }
  }

  async function receiveOnArc() {
    onBusy(true);
    onError("");
    try {
      if (!invoice.cctpMessageBytes || !invoice.cctpAttestation) {
        throw new Error("Wait for the CCTP attestation before receiving on Arc.");
      }
      const { provider } = await getWalletAccountAndProvider();
      const transport = custom(provider);
      const walletClient = createWalletClient({ transport });
      const arcPublicClient = createPublicClient({
        chain: arcTestnet,
        transport: http(ARC_RPC_URL)
      });

      try {
        await provider.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: `0x${Number(arcTestnet.id).toString(16)}` }]
        });
      } catch (switchError) {
        const code = (switchError as { code?: number }).code;
        if (code !== 4902) {
          throw switchError;
        }
        await provider.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: `0x${Number(arcTestnet.id).toString(16)}`,
              chainName: arcTestnet.name,
              nativeCurrency: arcTestnet.nativeCurrency,
              rpcUrls: [ARC_RPC_URL],
              blockExplorerUrls: [arcTestnet.blockExplorers.default.url]
            }
          ]
        });
      }

      await provider.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: `0x${Number(arcTestnet.id).toString(16)}` }]
      });

      const [account] = (await provider.request({
        method: "eth_requestAccounts"
      })) as Address[];

      const receiveTxHash = await walletClient.writeContract({
        chain: null,
        account,
        address: CCTP_TESTNET_MESSAGE_TRANSMITTER_V2,
        abi: cctpReceiveMessageAbi,
        functionName: "receiveMessage",
        args: [invoice.cctpMessageBytes as Hex, invoice.cctpAttestation as Hex]
      });
      await arcPublicClient.waitForTransactionReceipt({ hash: receiveTxHash });

      onInvoice(
        await markInvoice(invoice.id, "settled", {
          cctpReceiveTxHash: receiveTxHash,
          settlementTxHash: receiveTxHash,
          raw: { receiveTxHash }
        })
      );
    } catch (error) {
      onError(error instanceof Error ? error.message : "Arc receiveMessage failed");
    } finally {
      onBusy(false);
    }
  }

  return (
    <div className="stack">
      <div className="form-card">
        <div className="invoice-title">
          <div>
            <p className="muted">Step 1 · Customer wallet</p>
            <h3>{primaryWallet?.address ? shortAddress(primaryWallet.address) : "Connect to pay"}</h3>
            <p className="muted">Connect an EVM wallet holding testnet USDC on the source chain.</p>
          </div>
          <Wallet size={22} aria-hidden="true" />
        </div>
        <DynamicWidget />
      </div>

      <div className="form-card payment-action-card">
        <div className="invoice-title">
          <div>
            <p className="muted">Experimental Arc CCTP</p>
            <h3>Burn USDC, mint on Arc</h3>
            <p className="muted">
              CCTP burns source-chain USDC and mints native Arc USDC to the merchant.
            </p>
          </div>
          <Send size={22} aria-hidden="true" />
        </div>
        <div className="field">
          <label htmlFor="cctpSourceAsset">Source testnet USDC</label>
          <select
            id="cctpSourceAsset"
            className="select"
            value={sourceAssetId}
            onChange={(event) => setSourceAssetId(event.target.value)}
          >
            {cctpSources.map((asset) => (
              <option key={asset.id} value={asset.id}>
                {asset.label} · CCTP domain {asset.cctpDomain}
              </option>
            ))}
          </select>
        </div>
        <div className="asset-details">
          <div>
            <span className="muted">Destination domain</span>
            <strong className="mono">{ARC_CCTP_DOMAIN}</strong>
          </div>
          <div>
            <span className="muted">Merchant receives</span>
            <strong>Arc Testnet USDC</strong>
          </div>
          <div>
            <span className="muted">Amount</span>
            <strong>{formatUsd(invoice.amountUsd)}</strong>
          </div>
        </div>
        <button
          className="button"
          type="button"
          onClick={burnToArc}
          disabled={busy || invoice.status === "settled" || !primaryWallet?.address}
        >
          {busy ? <Loader2 size={16} aria-hidden="true" /> : <Send size={16} aria-hidden="true" />}
          {busy ? "Submitting CCTP..." : "Burn USDC to Arc"}
        </button>
      </div>

      {invoice.cctpBurnTxHash ? (
        <div className="form-card">
          <div className="invoice-title">
            <div>
              <p className="muted">CCTP status</p>
              <h3>{invoice.cctpAttestationStatus === "complete" ? "Attestation ready" : "Waiting for Circle"}</h3>
            </div>
            <RefreshCw size={22} aria-hidden="true" />
          </div>
          <div className="receipt-grid">
            <div className="receipt-item">
              <p className="muted">Burn transaction</p>
              <strong className="address mono">{invoice.cctpBurnTxHash}</strong>
            </div>
            <div className="receipt-item">
              <p className="muted">Message hash</p>
              <strong className="address mono">{invoice.cctpMessageHash}</strong>
            </div>
          </div>
          <div className="button-row">
            <button className="button secondary" type="button" onClick={refreshAttestation}>
              <RefreshCw size={16} aria-hidden="true" />
              Refresh attestation
            </button>
            <button
              className="button"
              type="button"
              onClick={receiveOnArc}
              disabled={busy || invoice.cctpAttestationStatus !== "complete" || invoice.status === "settled"}
            >
              Receive on Arc
            </button>
          </div>
          <p className="muted">
            The receive step submits Circle&apos;s attestation to Arc. The caller pays Arc gas in
            USDC, while the merchant receives the minted USDC.
          </p>
        </div>
      ) : null}
    </div>
  );
}

export function CheckoutFlow({
  initialInvoice,
  merchant,
  ensProfile
}: {
  initialInvoice: Invoice;
  merchant: Merchant;
  ensProfile?: EnsProfile;
}) {
  const [invoice, setInvoice] = useState(initialInvoice);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [demoSource, setDemoSource] = useState("Base Sepolia USDC");
  const settlementLabel = `${merchant.settlementTokenSymbol} on ${
    merchant.settlementNetwork || `EVM ${merchant.settlementChainId}`
  }`;
  const isArcSettlement = merchant.settlementAssetId === ARC_SETTLEMENT_ASSET_ID;

  const receiptItems = useMemo(
    () => [
      ["Invoice memo", invoice.memo],
      ["Merchant receives", settlementLabel],
      ["Settlement address", merchant.settlementAddress],
      ["Source asset", invoice.sourceToken || demoSource]
    ],
    [demoSource, invoice.memo, invoice.sourceToken, merchant.settlementAddress, settlementLabel]
  );

  const refreshInvoice = useCallback(async () => {
    const response = await fetch(`/api/invoices/${invoice.id}`, { cache: "no-store" });
    const body = await response.json();
    if (response.ok) {
      setInvoice(body.invoice);
    }
  }, [invoice.id]);

  useEffect(() => {
    if (invoice.status === "submitted" || invoice.status === "quoted") {
      const timer = setInterval(() => void refreshInvoice(), 3000);
      return () => clearInterval(timer);
    }
    return undefined;
  }, [invoice.status, refreshInvoice]);

  async function runDemoPayment() {
    setBusy(true);
    setError("");
    try {
      setInvoice(
        await markInvoice(invoice.id, "started", {
          payerAddress: "0x2222222222222222222222222222222222222222",
          sourceChain: "Base Sepolia",
          sourceToken: demoSource
        })
      );
      await delay(700);
      setInvoice(await markInvoice(invoice.id, "quoted", { sourceToken: demoSource }));
      await delay(800);
      setInvoice(await markInvoice(invoice.id, "submitted"));
      await delay(1000);
      setInvoice(
        await markInvoice(invoice.id, "settled", {
          settlementTxHash:
            "0x" + Array.from({ length: 64 }, (_, index) => ((index + 10) % 16).toString(16)).join("")
        })
      );
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Demo payment failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="checkout-layout">
      <aside className="stack-lg">
        <div className="flow-banner">
          <span className="step-number">PAY</span>
          <div>
            <strong>Review, connect, sign</strong>
            <p>One fixed-price invoice. Dynamic quotes the path before the wallet signs.</p>
          </div>
        </div>

        <EnsProfileCard
          profile={ensProfile || merchant.ensProfile}
          fallbackName={merchant.ensName}
          settlementAddress={merchant.settlementAddress}
          settlementPreference={settlementLabel}
        />

        <div className="form-card featured">
          <div className="invoice-title">
            <div>
              <p className="muted">Hosted checkout</p>
              <h2>{invoice.title}</h2>
            </div>
            <span className={`status-${invoice.status}`}>{statusLabel(invoice.status)}</span>
          </div>
          <div className="amount">{formatUsd(invoice.amountUsd)}</div>
          {invoice.description ? <p className="lede">{invoice.description}</p> : null}
          <PaymentStatusTimeline status={invoice.status} />
        </div>

        <div className="form-card">
          <div className="invoice-title">
            <div>
              <p className="muted">Payment receipt</p>
              <h3>Source asset to {settlementLabel}</h3>
            </div>
            <ReceiptText size={22} aria-hidden="true" />
          </div>
          <div className="receipt-grid">
            {receiptItems.map(([label, value]) => (
              <div className="receipt-item" key={label}>
                <p className="muted">{label}</p>
                <strong className="address mono">{value}</strong>
              </div>
            ))}
          </div>
          {invoice.settlementTxHash && isArcSettlement ? (
            <a
              className="button secondary"
              href={arcscanTxUrl(invoice.settlementTxHash)}
              target="_blank"
              rel="noreferrer"
            >
              <ExternalLink size={16} aria-hidden="true" />
              View settlement
            </a>
          ) : invoice.settlementTxHash ? (
            <div className="receipt-item">
              <p className="muted">Settlement transaction</p>
              <strong className="address mono">{invoice.settlementTxHash}</strong>
            </div>
          ) : null}
        </div>
      </aside>

      <main className="stack-lg">
        <div className="rail-visual panel-muted route-board">
          <div className="rail-row">
            <div className="rail-icon">
              <Wallet size={22} aria-hidden="true" />
            </div>
            <div>
              <p className="muted">Step A</p>
              <strong>Customer pays from any supported source</strong>
              <div className="rail-track" aria-hidden="true" />
            </div>
          </div>
          <div className="rail-row">
            <div className="rail-icon">
              <ArrowRight size={22} aria-hidden="true" />
            </div>
            <div>
              <p className="muted">Step B</p>
              <strong>Dynamic Flow quotes, signs, and routes</strong>
              <div className="rail-track" aria-hidden="true" />
            </div>
          </div>
          <div className="rail-row">
            <div className="rail-icon">
              <CheckCircle2 size={22} aria-hidden="true" />
            </div>
            <div>
              <p className="muted">Step C</p>
              <strong>Merchant receives {settlementLabel}</strong>
              <div className="rail-track" aria-hidden="true" />
            </div>
          </div>
        </div>

        {error ? <div className="callout amber error">{error}</div> : null}

        {hasDynamicEnv ? (
          isArcSettlement ? (
            <ExperimentalArcCctpActions
              invoice={invoice}
              merchant={merchant}
              onInvoice={setInvoice}
              onError={setError}
              onBusy={setBusy}
              busy={busy}
            />
          ) : (
            <DynamicPaymentActions
              invoice={invoice}
              merchant={merchant}
              onInvoice={setInvoice}
              onError={setError}
              onBusy={setBusy}
              busy={busy}
            />
          )
        ) : (
          <div className="form-card">
            <div className="invoice-title">
              <div>
                <p className="muted">Demo payment route</p>
                <h3>Simulate Dynamic Flow lifecycle</h3>
              </div>
              {busy ? (
                <Loader2 size={22} aria-hidden="true" />
              ) : (
                <RefreshCw size={22} aria-hidden="true" />
              )}
            </div>
            <div className="field">
              <label htmlFor="demoSource">Source asset</label>
              <select
                id="demoSource"
                className="select"
                value={demoSource}
                onChange={(event) => setDemoSource(event.target.value)}
              >
                <option>Base Sepolia USDC</option>
                <option>Ethereum Sepolia ETH</option>
                <option>Solana Devnet SOL</option>
                <option>Bitcoin testnet BTC</option>
              </select>
            </div>
            <p className="muted">
              Set Dynamic API keys to run the live Flow SDK. Demo mode preserves the checkout,
              invoice memo, status polling, and settlement receipt UX for walkthroughs.
            </p>
            <button
              className="button"
              type="button"
              disabled={busy || invoice.status === "settled"}
              onClick={runDemoPayment}
              data-testid="pay-demo-invoice-button"
            >
              <Send size={16} aria-hidden="true" />
              {busy ? "Routing..." : "Pay demo invoice"}
            </button>
          </div>
        )}

        <div className="button-row">
          <button className="button secondary" type="button" onClick={refreshInvoice}>
            <RefreshCw size={16} aria-hidden="true" />
            Refresh status
          </button>
          <Link className="button ghost" href="/merchant">
            Merchant dashboard
          </Link>
        </div>
      </main>
    </div>
  );
}
