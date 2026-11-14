# AfroSpaza 🛒🤖

**An agentic B2B marketplace for African cross-border trade, where AI agents source and settle orders on the XRP Ledger — and the ledger itself enforces the CFO's spending mandate.**

> *"A buyer that can't steal, can't overspend, and leaves an audit trail."*

---
## Demo Video with Audio

[▶ Watch Demo Video](https://youtu.be/PPIUV3PQBo0)

## 📖 Table of Contents

- [The Problem](#-the-problem)
- [The Solution](#-the-solution)
- [Architecture & Enforcement Model](#-architecture--enforcement-model)
- [The Three Agents](#-the-three-agents)
- [Settlement Asset & Network Strategy](#-settlement-asset--network-strategy)
- [Adversarial Demo Mode](#-adversarial-demo-mode)
- [MVP Scope](#-mvp-scope)
- [Repository Structure](#-repository-structure)
- [Getting Started](#-getting-started)
- [XRPL Transaction Map](#-xrpl-transaction-map)
- [Go-To-Market](#-go-to-market)
- [Why XRPL](#-why-xrpl)
- [Roadmap](#-roadmap)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🧩 The Problem

Small African businesses need goods from other African countries, but cross-border trade is broken:

- **Payment friction:** ZAR → USD → KES takes 3–5 days, with high SWIFT fees and double FX conversion.
- **Trust friction:** Pay a stranger in Nairobi and hope the goods arrive.
- **Control friction:** An owner cannot delegate buying without risking overspend, fraud, or losing the audit trail.

**Example:** Thandi Mokoena, owner of Zuri Eats in Johannesburg, needs Kenyan pilipili spice monthly. Today she relies on WhatsApp, friends travelling, and hope.

---

## 💡 The Solution

**AfroSpaza** — A spaza for the continent, run by agents, governed by XRPL.

The human sets the policy once. Agents execute. The ledger enforces.

Thandi sets her mandate:
> *"Max R2,500 per order, max R5,000 per month, only sellers rated 4.5+, only Kenya → SA, auto-approve under R2,500."*

Then agents do the buying, paying, tracking, and releasing — autonomously, within the rules.

---

## 🏗 Architecture & Enforcement Model

The core innovation is a **two-layer enforcement model** with distinct jobs, not three overlapping ones.

| Layer | Job | Authority |
|---|---|---|
| **Control Plane** (human-only dashboard) | Owner signs a *mandate*: per-order cap, monthly budget, seller whitelist, corridor, kill switch | Source of truth for *intent* |
| **Guard** (rules-only, no AI) | Pre-flight *semantic* checks the ledger cannot do: duplicate orders, seller category match, mandate expiry | **Advisory** — blocks bad vouchers before signing |
| **XRPL** (Escrow + Payment Channel) | Hard financial limits: channel cannot settle above deposit; escrow releases only on delivery proof or expiry | **Authoritative** — final arbiter |

**Why this split matters:**
- A compromised Guard cannot drain the business, because the channel's on-ledger deposit is the ceiling.
- A hallucinating agent cannot overdraw, because the ledger rejects the claim at settlement time.
- The Guard is a *filter*; the ledger is the *judge*.

---

## 🤖 The Three Agents

### Agent 1 — Procurement
Detects low stock, finds the best vetted seller, compares landed cost, drafts a purchase proposal *inside* the mandate.
**Pays for its own inputs via x402** — seller-verification API, courier-quote API — each a metered micro-payment settled on XRPL Testnet through the t54 facilitator.

### Agent 2 — Treasury / Settlement
Executes the XRPL leg: opens or tops up the payment channel, funds escrow per order, releases on delivery confirmation, logs every hash.

### Agent 3 — Logistics & Compliance
Books the courier, tracks the parcel, confirms delivery, triggers escrow release or a dispute hold on expiry.

**Separation of duties is non-negotiable:** the agent that picks the seller cannot release the money. Agents coordinate via a shared job queue, and each ships independently.

---

## 💰 Settlement Asset & Network Strategy

This is the decision most agentic-finance pitches duck — and the first thing an XRPL judge will ask.

### MVP: RLUSD (IOU) on XRPL Testnet
- Funded via the [tryrlusd.com](https://tryrlusd.com) faucet.
- **Why:** RLUSD has DEX and AMM support today. MPTs are flagged "on the roadmap" for DEX/AMM in XRPL documentation.
- Sellers need a trustline to the RLUSD issuer — acceptable for a **closed, vetted** seller set.

### Phase 2: MPT (XLS-33) + TokenEscrow (XLS-85)
- Issue a corridor-specific MPT with enforced max supply, transfer fees, and clawback for regulated sellers.
- Use TokenEscrow for per-order locks.
- **Wait** until MPT DEX/AMM support ships — and say so honestly.

### Network
- **MVP:** Testnet (mirrors mainnet amendments).
- **Devnet branch:** Reserved for **Confidential Transfer (XLS-96)** of seller pricing in Phase 2 — B2B margins should not be public.

---

## 🛡 Adversarial Demo Mode

This is the headline feature — the proof, not the promise. A scripted sequence where a deliberately misbehaving agent is stopped at **three layers in order**:

1. **Guard blocks:** Agent tries a R3,500 order → Guard rejects (over per-order cap).
2. **Ledger blocks:** Guard is bypassed; agent tries to sign a voucher above the channel deposit → ledger rejects at claim time.
3. **Escrow blocks:** Agent tries to release escrow without delivery proof → escrow condition fails.

**A CFO buys this, not promises.** This runs on slide 2 of the pitch.

---

## 📦 MVP Scope

| Dimension | Detail |
|---|---|
| **Corridor** | Kenya → South Africa |
| **Category** | Spices / dry food ingredients |
| **Customers** | 5 Johannesburg food businesses, starting with Zuri Eats |
| **Rail** | XRPL Testnet |
| **Money** | Fiat in/out for users; XRPL is the settlement rail underneath |

### In Scope
- Mobile-first web app
- 10–20 vetted Kenyan sellers, 2–3 consolidators
- 3 agents + Control Plane + Guard
- Escrow + Payment Channel
- **At least one autonomous x402 micro-payment**
- **Adversarial Demo Mode**

### Out of Scope (Phase 2+)
- Reverse corridor
- Other categories
- Multi-rail
- Crypto checkout for end users
- Native mobile apps
- MPT migration

### Build Order (incremental, one transaction at a time)

1. **Agent 1 + Control Plane + Guard** — No real money. Prove policy enforcement and the Guard's advisory rejection.
2. **Agent 2 + one Escrow transaction on Testnet** — Prove autonomous payment and on-ledger limits.
3. **Agent 3 + end-to-end** — Prove delivery → release loop.
4. **x402 micro-payment** — Prove the agents pay for their own inputs.

Each step ships independently.

---

## 📂 Repository Structure

```
afrospaza/
├── apps/
│   ├── control-plane/       # Next.js human-only dashboard (mandate setup, kill switch)
│   ├── web/                 # Next.js mobile-first customer app
│   └── api/                 # FastAPI backend (job queue, Guard, agent orchestrator)
├── agents/
│   ├── procurement/         # Agent 1: sourcing + x402 API payments
│   ├── treasury/            # Agent 2: XRPL escrow + payment channel execution
│   └── logistics/           # Agent 3: courier + delivery confirmation
├── packages/
│   ├── guard/               # Rules-only pre-flight validation engine
│   ├── xrpl-client/         # Wrapper around xrpl.js (connect, escrow, channel)
│   ├── x402-client/         # x402 + t54 facilitator integration
│   └── shared-types/        # TypeScript types shared across services
├── contracts/               # XRPL transaction builders & validators
├── demo/
│   └── adversarial/         # Scripted Adversarial Demo Mode sequence
├── docs/
│   ├── ARCHITECTURE.md
│   ├── MANDATE_SPEC.md
│   └── XRPL_FLOW.md
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 20+
- Python 3.11+
- An XRPL Testnet wallet (funded via [faucet](https://xrpl.org/resources/dev-tools/xrp-faucets))
- Test RLUSD via [tryrlusd.com](https://tryrlusd.com)

### Installation

```bash
# Clone the repo
git clone https://github.com/your-org/afrospaza.git
cd afrospaza

# Install JS/TS dependencies
pnpm install

# Install Python dependencies for the API
cd apps/api
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### Environment Variables

```bash
# .env.local
XRPL_NETWORK=testnet
XRPL_WS_URL=wss://s.altnet.rippletest.net:51233
RLUSD_ISSUER=rLUSD... # RLUSD Testnet issuer
T54_FACILITATOR_URL=https://xrpl-facilitator-testnet.t54.ai
GUARD_API_KEY=...
CONTROL_PLANE_SECRET=...
```

### Run the Stack

```bash
# Terminal 1: Control Plane
pnpm --filter control-plane dev

# Terminal 2: Customer Web App
pnpm --filter web dev

# Terminal 3: API + Agents
pnpm --filter api dev

# Terminal 4: Run Adversarial Demo
pnpm --filter demo adversarial
```

### First Transaction (4 Steps)

```javascript
import { Client, Wallet, xrpToDrops } from "xrpl";

const client = new Client("wss://s.altnet.rippletest.net:51233");
await client.connect();

// 1. Create and fund a wallet
const { wallet } = await client.fundWallet();

// 2. Set trustline to RLUSD issuer
await client.submitAndWait({
  TransactionType: "TrustSet",
  Account: wallet.address,
  LimitAmount: {
    currency: "RLUSD",
    issuer: "rLUSD_ISSUER_ADDRESS",
    value: "1000000",
  },
}, { autofill: true, wallet });

// 3. Send a payment
const result = await client.submitAndWait({
  TransactionType: "Payment",
  Account: wallet.address,
  Destination: "rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe",
  Amount: xrpToDrops("10"),
}, { autofill: true, wallet });

console.log(result.result.meta.TransactionResult); // "tesSUCCESS"
await client.disconnect();
```

---

## 🔗 XRPL Transaction Map

Every agent action maps to a native XRPL transaction — no smart contracts.

| Agent Action | XRPL Transaction | Purpose |
|---|---|---|
| Seller opts into marketplace | `TrustSet` (RLUSD) | Establish IOU trustline |
| Owner deposits agent allowance | `PaymentChannelCreate` | On-ledger spending ceiling |
| Agent signs off-chain voucher | *(off-chain)* | Pre-screened by Guard |
| Owner releases channel funds | `PaymentChannelClaim` | Settle at claim time |
| Per-order fund lock | `EscrowCreate` | Lock funds against specific order |
| Delivery confirmed | `EscrowFinish` | Release funds to seller |
| Delivery fails / expires | `EscrowCancel` | Return funds to owner |
| MPT migration (Phase 2) | `MPTokenIssuanceCreate` + `MPTokenAuthorize` | Issuer-controlled supply |
| Confidential pricing (Phase 2, Devnet) | `ConfidentialTransfer` (XLS-96) | Shielded MPT amounts |

---

## 📈 Go-To-Market

### Phase 1 — Prove (0–90 days)
1 corridor, 5 businesses, 20 orders. Hand-hold. Measure settlement time, cost vs SWIFT, dispute rate.

### Phase 2 — Sell to the CFO
The pitch is **control**, not convenience:
> *"A buyer that can't steal, can't overspend, and leaves an audit trail."*

### Phase 3 — Expand
ZA → KE, then NG → ZA, GH → ZA. Same agents, new Payment Channels per corridor.

### Revenue
- 2–3% transaction fee
- Transparent FX spread
- SaaS for the Control Plane (multi-user approvals, reports)

---

## ⚡ Why XRPL

- **3–5 second finality, sub-cent fees** vs SWIFT's 3–5 days and $26–$50.
- **Native Escrow + Payment Channels** — purpose-built for agentic spending limits. No smart contract needed.
- **One API, one endpoint** — every feature sits behind the same JSON-RPC/WebSocket interface, so the three agents share one integration.
- **The agentic stack exists today** — x402, MPP, and the XRPL AI Hub give the agents a payments vocabulary. The AI Hub even indexes live paid services the Procurement Agent can consume.
- **Named African corridors** — Ripple's partner network includes African fintechs (AZA Finance, Onafriq). *A specific current case study will be cited in the pitch deck before publication.*

---

## 🗺 Roadmap

| Quarter | Milestone |
|---|---|
| **Q1** | Agent 1 + Control Plane + Guard (no money) |
| **Q2** | Agent 2 + first Escrow transaction on Testnet |
| **Q3** | Agent 3 end-to-end + Adversarial Demo Mode |
| **Q4** | x402 micro-payments live in Procurement Agent |
| **Year 2 Q1** | Fiat off-ramp integration (named partner) |
| **Year 2 Q2** | MPT migration (XLS-33) + TokenEscrow (XLS-85) |
| **Year 2 Q3** | Devnet branch: Confidential Transfer (XLS-96) |
| **Year 2 Q4** | Reverse corridor + second category |

---

## 🤝 Contributing

AfroSpaza is built in the open. We welcome contributions from builders across the African continent and beyond.

- Read `docs/ARCHITECTURE.md` before opening a PR.
- Follow the **separation of duties** principle — never merge agent responsibilities that the ledger is meant to keep separate.
- The Guard Service must remain **AI-free** and **rules-only**. A PR that adds an LLM call to the Guard will be rejected.

---

## 📜 License

MIT License. See [LICENSE](./LICENSE) for details.

---

## 🙏 Acknowledgements

- [XRPL Workshop](https://xrpl.org/docs) — Maxime Dienger & Pamphile Tupui Roy
- [t54](https://t54.ai) — x402 facilitator and Trustline risk tooling
- [XRPL AI Hub](https://xrpl-ai.org) — agent service directory
- [tryrlusd.com](https://tryrlusd.com) — Testnet RLUSD faucet
- The spaza shops of South Africa, who taught us that a business can run on trust — we're just putting the trust on a ledger.

---

> *"From a spaza on a street corner to a spaza for the continent."*
