# AUTOPLAY

**Coins that play themselves.** Patch triggers to actions with cables, launch on pump.fun in one signature, and the coin runs the patch forever on its own creator fees.

## How it works

- **Patch:** triggers (creator fees arrive, every N hours, market cap crosses, price jumps/drops) wired to actions (buy back, burn, airdrop holders, pay a random holder, buy xStocks, pay the creator, keep). Each cable carries a share of the trigger's SOL.
- **Fingerprint:** the patch is canonicalized and SHA-256 hashed. The creator's funding transaction and the vault's own memo both carry it on Solana; `/verify/<mint>` recomputes it in the browser.
- **Vault:** every coin gets a fresh keypair that is its pump.fun creator, so creator fees land there. Keys are AES-256-GCM encrypted at rest.
- **Executor:** every `RUN_MIN` minutes per coin: simulate the creator-fee claim, send it if worth it, read the market, fire triggers, run actions. Every action, including failures, is a receipt with a Solscan link.

## Run

```bash
node server/index.js
```

No dependencies. Node 20+.

| env | default | |
|---|---|---|
| `PORT` | 8258 | |
| `DATA_PATH` | `./data` | db + key file; mount a persistent disk here |
| `MASTER_KEY` | generated into `DATA_PATH/.master` | 64 hex chars; encrypts vault keys |
| `SOL_RPC` | public endpoints | comma-separated; use a keyed RPC (e.g. Helius) in production |
| `SITE_URL` | `https://autoplay.fun` | used for self-hosted coin metadata when pump.fun IPFS is down |
| `RUN_MIN` | 10 | minutes between runs per coin |
| `PRIORITY_SOL` / `SLIPPAGE` | 0.0001 / 15 | |

## Tests

```bash
node _studio/e2e.cjs      # server + executor against an in-memory chain, plus real mainnet tx validation (38 checks)
node _studio/e2e-ui.cjs   # bench → launch modal → wallet signing request, decoded and checked (9 checks)
```

## Code

- `server/sol.js`: base58, ed25519 keys, legacy message compiler, v0 tx signing, RPC with fallbacks
- `server/chain.js`: PumpPortal create/buy/claim, burn, holders, SOL airdrops, Jupiter swaps, DexScreener market
- `server/rules.js`: module catalogue, validation, canonical hash, sentence → patch parser
- `server/index.js`: launch flow, executor, API
- `client/`: bench (patch editor), coin pages, verify, docs
