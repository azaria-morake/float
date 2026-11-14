# AfroSpaza Backend & Database Engine 🛒🤖

FastAPI backend, agent orchestration engine, and SQLite / PostgreSQL database for **AfroSpaza**.

---

## 🗄️ Database Architecture & Schema

The database model is designed to support the **two-layer enforcement model** (Control Plane + Guard + XRPL Settlement Rail), autonomous agent coordination, and Privy policy integration.

### Core Tables

| Table | Purpose | Key Attributes |
|---|---|---|
| `spaza_shops` | Business & store profile | `id`, `name`, `owner_name`, `privy_user_id`, `wallet_address` |
| `mandates` | Control Plane owner spending policy | `total_daily_budget_zar`, `used_today_zar`, `kill_switch_active`, `privy_policy_id` |
| `spending_rules` | Granular per-category limits | `category`, `max_single_tx_zar`, `daily_cap_zar`, `allowed_sellers` (JSON), `enabled` |
| `suppliers` | Vetted suppliers directory | `name`, `country` (Kenya/SA), `wallet_address`, `rating`, `verified_xrpl`, `trustline_active` |
| `products` | Supplier catalog & inventory | `name`, `category`, `unit`, `unit_price_zar`, `unit_price_rlusd`, `stock_quantity` |
| `orders` | Cross-border trade orders | `status`, `settlement_method`, `total_zar`, `total_rlusd`, `xrpl_tx_hash`, `escrow_sequence` |
| `order_items` | Line items per order | `order_id`, `product_id`, `name`, `quantity`, `unit_price_zar`, `total_zar` |
| `xrpl_transactions` | On-ledger settlement audit log | `tx_hash`, `tx_type`, `sender_address`, `destination_address`, `amount`, `result_code` |
| `agent_jobs` | Autonomous agent execution queue | `agent_type` (PROCUREMENT, TREASURY, LOGISTICS, GUARD), `status`, `payload`, `result` |
| `agent_logs` | Immutable audit feed of agent events | `agent_type`, `level` (INFO, WARN, ERROR, SUCCESS, SECURITY), `message`, `metadata_json` |
| `x402_payments` | Micro-payments for agent input APIs | `service_url`, `amount_rlusd`, `xrpl_tx_hash`, `facilitator` (t54), `status` |
| `simulation_logs` | Adversarial demo defense audit | `attack_type`, `intercepted`, `intercepting_layer`, `reason`, `action_taken`, `logs` |

---

## 🛡️ The Guard Service

The Guard is a **deterministic, rules-only (zero LLM)** pre-flight enforcement engine that executes semantic checks the ledger cannot perform:

1. **Emergency Kill Switch**: Immediate halt if owner has activated the kill switch.
2. **Budget & Buffer Headroom**: Enforces daily budget caps and preserves the minimum safety buffer reserve.
3. **Supplier Whitelisting & XRPL Verification**: Confirms seller is in the vetted directory, has active XRPL verification, and an active RLUSD trustline.
4. **Category Single-Transaction Ceilings**: Caps individual orders per commodity (e.g., max R2,500 for Spices).
5. **Double-Approval Mandate**: Blocks high-value categories (e.g., Cooking Oil) unless an authorized human token is provided.
6. **Duplicate Order Suppression**: Detects agent retry loops or duplicate orders placed within a 15-minute window.
7. **Adversarial & Prompt Injection Defense**: Screens raw text and descriptions for prompt injection or system override attempts with zero fund exposure.
8. **Cryptographic Guard Vouchers**: Approved proposals receive an HMAC-SHA256 signed voucher (`vch_...`) required by the Treasury Agent before on-chain escrow funding or payment channel claims.

### Running Guard Tests

```bash
cd backend
PYTHONPATH=. .venv/bin/pytest tests/test_guard.py -v
```

---

## 🤖 Multi-Agent Orchestration & x402 Micropayments

The system orchestrates three autonomous agents with strict separation of duties:

1. **Agent 1 — Procurement Agent (`openai/gpt-oss-120b` via Groq)**:
   - Scans inventory needs and analyzes landed cost vs seller rating across corridors.
   - **Pays for its own API inputs via x402**: Autonomously executes metered micro-payments (e.g. 0.05 RLUSD) settled through the **t54 facilitator** protocol for courier quotes and seller credential checks.
   - Proposes structured purchase proposals (`OrderPreFlightRequest`).
   - *Separation of duty*: Cannot create escrows or touch on-chain settlement funds.

2. **The Guard Service (Deterministic Pre-Flight Filter)**:
   - Non-LLM rule engine evaluating mandate limits, corridor rules, duplicate prevention, and safety reserves.
   - Issues HMAC-SHA256 signed `GuardVoucher`.

3. **Agent 2 — Treasury / Settlement Agent**:
   - Strictly verifies the `GuardVoucher` before touching the ledger.
   - Submits `EscrowCreate` on XRPL Testnet, locking funds per order.
   - *Separation of duty*: Cannot select sellers and cannot release escrow funds to the seller without Logistics delivery verification.

4. **Agent 3 — Logistics & Compliance Agent**:
   - Manages courier dispatch, cargo tracking (`CARGO-KE-ZA-...`), and customs check-ins along the corridor.
   - Verifies physical delivery confirmation and executes `EscrowFinish` on XRPL Testnet.

---

## ⚡ XRPL Settlement Service

The XRPL settlement layer ([app/services/xrpl_service.py](file:///home/azaria/ux-giants/float/backend/app/services/xrpl_service.py)) integrates with XRPL Testnet:

1. **Guard Voucher Requirement**: On-chain escrow creation explicitly checks the HMAC signature of the Guard voucher before creating any transaction.
2. **Native Escrow (`EscrowCreate` & `EscrowFinish`)**:
   - Locks XRP/RLUSD funds against an order until delivery confirmation.
   - Live settlement tested on testnet with real validated transaction hashes.
   - Premature or unauthorized release attempts are natively rejected on-ledger with `tecNO_PERMISSION`.
3. **Spending Ceilings (`PaymentChannelCreate` & `PaymentChannelClaim`)**:
   - Creates on-ledger Payment Channels defining an unbreachable financial ceiling for agents.
4. **Live Account Balances**:
   - Fetches on-ledger drops, RLUSD trustlines, and sequence numbers.

### Running All Tests

```bash
cd backend
PYTHONPATH=. .venv/bin/pytest tests/ -v
```

---

## 🚀 Quickstart

### 1. Setup Environment

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

### 2. Initialize and Seed Database

```bash
# Create all tables and stamp Alembic migration
PYTHONPATH=. python app/init_db.py
PYTHONPATH=. alembic stamp head

# Populate database with Zuri Eats, Kenyan spice suppliers, and sample orders
PYTHONPATH=. python app/seed.py
```

### 3. Run Development Server

```bash
PYTHONPATH=. uvicorn app.main:app --reload --port 8000
```

- API Docs: [http://localhost:8000/docs](http://localhost:8000/docs)
- Health check: [http://localhost:8000/health](http://localhost:8000/health)

---

## 🔄 Switching to PostgreSQL

By default, the backend runs on SQLite (`afrospaza.db`). To switch to PostgreSQL, simply set `DATABASE_URL` in `.env`:

```bash
DATABASE_URL=postgresql+psycopg2://postgres:password@localhost:5432/afrospaza
```

