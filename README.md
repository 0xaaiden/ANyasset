<div align="center">
  <video src="recordings/anyasset-walkthrough.webm" controls width="100%" title="AnyAsset Checkout walkthrough"></video>
  <p><a href="recordings/anyasset-walkthrough.webm">Watch the walkthrough video</a></p>
</div>

# AnyAsset Checkout

AnyAsset Checkout is a crypto checkout-link app for merchants. A merchant creates an ENS-branded invoice, a customer pays from a supported source wallet/chain/token, and the merchant receives configured USDC settlement on the network they choose.

## Demo Flow

1. Open `/merchant` and create or use the seeded `coffee.aiden.eth` merchant.
2. Choose a settlement destination, such as Base USDC for live Flow testing or Arc Testnet USDC as an experimental target.
3. Create a fixed-price checkout link.
4. Open `/checkout/<invoiceId>`.
5. With Dynamic credentials configured, pay through Dynamic Flow. Without credentials, use demo mode to exercise the same state machine.
6. Return to the merchant dashboard to see invoice status, settlement receipt, and the selected settlement rail.

## Sponsor Integrations

### Dynamic

- Uses Dynamic React SDK for merchant and customer wallet UX when `NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID` is set.
- Creates a Dynamic Flow payment checkout config per merchant settlement address.
- Models the Flow lifecycle: create transaction, attach source, quote, submit, and poll/settle.
- Keeps invoice memo IDs for reconciliation and webhook updates.

### Settlement rails

- Merchants can select the USDC settlement network during setup.
- Base USDC is the recommended live Dynamic Flow route.
- Arc Testnet USDC remains available as an experimental target for Arc settlement demos.
- Arc Testnet uses chain ID `5042002` and USDC token address `0x3600000000000000000000000000000000000000`.

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

## Deploy

The app is a standard Next.js application and is ready for Vercel:

```bash
vercel deploy
```

Set the same environment keys in Vercel. If you do not have Dynamic Flow credentials yet, leave the Dynamic keys empty and the hosted app will use demo mode for the checkout lifecycle.

## Notes

- Local persistence uses a JSON file under `data/` by default for hackathon speed. Set `DATABASE_FILE` to override it.
- For production, replace `lib/db.ts` with Supabase/Postgres while keeping the route handler contracts intact.
- Arc native gas display uses 18 decimals, while the USDC token interface used for balances and settlement is treated as 6 decimals.
