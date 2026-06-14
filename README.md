# AnyAsset Checkout

AnyAsset Checkout is a crypto checkout-link app for merchants. A merchant creates an ENS-branded invoice, a customer pays from a supported source wallet/chain/token, and the merchant receives configured settlement in USDC on Arc Testnet.

## Demo Flow

1. Open `/merchant` and create or use the seeded `coffee.aiden.eth` merchant.
2. Confirm settlement is `USDC on Arc Testnet`.
3. Create a fixed-price checkout link.
4. Open `/checkout/<invoiceId>`.
5. With Dynamic credentials configured, pay through Dynamic Flow. Without credentials, use demo mode to exercise the same state machine.
6. Return to the merchant dashboard to see invoice status, settlement receipt, and Arc balance.

## Sponsor Integrations

### Dynamic

- Uses Dynamic React SDK for merchant and customer wallet UX when `NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID` is set.
- Creates a Dynamic Flow payment checkout config per merchant settlement address.
- Models the Flow lifecycle: create transaction, attach source, quote, submit, and poll/settle.
- Keeps invoice memo IDs for reconciliation and webhook updates.

### Arc

- Merchant settlement token is USDC on Arc Testnet.
- Uses Arc Testnet chain ID `5042002`.
- Uses Arc Testnet USDC token address `0x3600000000000000000000000000000000000000`.
- Reads Arc USDC balances with viem and links settlement receipts to Arcscan.

### ENS

- Merchant profiles use ENS names instead of raw addresses.
- Checkout and merchant profile pages display ENS identity.
- Reads ENS text records including `avatar`, `description`, `url`, `com.twitter`, `com.github`, `anyasset:checkout`, and `anyasset:settlement`.

## Environment

Copy `.env.example` to `.env.local` and fill the values you have:

```bash
NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID=
DYNAMIC_API_TOKEN=
ETHEREUM_RPC_URL=
ARC_TESTNET_RPC_URL=https://rpc.testnet.arc.network
DATABASE_FILE=
NEXT_PUBLIC_APP_URL=http://localhost:3000
FLOW_WEBHOOK_SECRET=
```

If Dynamic credentials are missing, the app runs in demo mode. That keeps the checkout UX testable while making the live sponsor path explicit.

## Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Notes

- Local persistence uses a JSON file under `data/` by default for hackathon speed. Set `DATABASE_FILE` to override it.
- For production, replace `lib/db.ts` with Supabase/Postgres while keeping the route handler contracts intact.
- Arc native gas display uses 18 decimals, while the USDC token interface used for balances and settlement is treated as 6 decimals.
