// Client for AfroSpaza FastAPI Backend

const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

async function fetchJson<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${BASE_URL}${endpoint}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers || {}),
    },
  });

  if (!res.ok) {
    let errorDetail = `Request failed: ${res.statusText} (${res.status})`;
    try {
      const err = await res.json();
      if (err.detail) {
        errorDetail = typeof err.detail === "string" ? err.detail : JSON.stringify(err.detail);
      }
    } catch {
      // ignore
    }
    throw new Error(errorDetail);
  }

  return res.json();
}

export interface BackendSpazaShop {
  id: string;
  name: string;
  owner_name: string;
  owner_phone?: string;
  owner_email?: string;
  location: string;
  privy_user_id?: string;
  wallet_address: string;
  created_at: string;
  updated_at: string;
}

export interface BackendSpendingRule {
  id: string;
  mandate_id?: string;
  category: string;
  max_single_tx_zar: number;
  daily_cap_zar: number;
  allowed_sellers: string[];
  requires_double_approval: boolean;
  enabled: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface BackendMandate {
  id: string;
  spaza_id: string;
  total_daily_budget_zar: number;
  used_today_zar: number;
  currency: string;
  exchange_rate_rlusd_to_zar: number;
  kill_switch_active: boolean;
  kill_switch_triggered_at?: string | null;
  kill_switch_reason?: string | null;
  auto_rebalance_enabled: boolean;
  min_safety_reserve_zar: number;
  privy_policy_id?: string;
  rules: BackendSpendingRule[];
  created_at: string;
  updated_at: string;
}

export interface BackendSupplier {
  id: string;
  name: string;
  country: string;
  location: string;
  wallet_address: string;
  categories: string[];
  rating: number;
  orders_fulfilled: number;
  delivery_time_est: string;
  verified_xrpl: boolean;
  trustline_active: boolean;
  min_order_zar: number;
  created_at: string;
  updated_at: string;
}

export interface BackendProduct {
  id: string;
  supplier_id: string;
  name: string;
  sku: string;
  category: string;
  unit: string;
  wholesale_price_zar: number;
  wholesale_price_rlusd: number;
  minimum_order_qty: number;
  in_stock: boolean;
  origin_country: string;
  created_at: string;
  updated_at: string;
}

export interface BackendOrderItem {
  id: string;
  order_id?: string;
  product_id?: string;
  name: string;
  quantity: number;
  unit: string;
  unit_price_zar: number;
  total_zar: number;
}

export interface BackendOrder {
  id: string;
  spaza_id: string;
  supplier_id: string;
  status: string;
  settlement_method: string;
  subtotal_zar: number;
  fee_zar: number;
  total_zar: number;
  total_rlusd: number;
  xrpl_tx_hash?: string | null;
  escrow_sequence?: number | null;
  payment_channel_id?: string | null;
  fulfillment_hash?: string | null;
  cancel_after?: string | null;
  notes?: string | null;
  items: BackendOrderItem[];
  created_at: string;
  updated_at: string;
  delivered_at?: string | null;
  settled_at?: string | null;
}

export interface BackendXRPLTransaction {
  id: string;
  order_id?: string | null;
  tx_hash: string;
  tx_type: string;
  account: string;
  destination: string;
  amount: number;
  currency: string;
  fee_drops?: number | null;
  ledger_index?: number | null;
  escrow_sequence?: number | null;
  status: string;
  created_at: string;
}

export interface BackendAgentLog {
  id: string;
  job_id?: string | null;
  agent_type?: string;
  agent_name?: string;
  stage?: string;
  level: string;
  message: string;
  metadata_json?: Record<string, unknown> | null;
  created_at: string;
}

export interface BackendSimulationLog {
  id: string;
  attack_type: string;
  intercepted: boolean;
  intercepting_layer?: string | null;
  reason?: string | null;
  action_taken?: string | null;
  logs_json?: string[] | null;
  created_at: string;
}

export interface PreFlightCheckResponse {
  allowed: boolean;
  code: string;
  reason: string;
  voucher?: {
    voucher_id: string;
    mandate_id: string;
    seller_address: string;
    amount_zar: number;
    amount_rlusd: number;
    category: string;
    expires_at: string;
    signature: string;
  } | null;
}

export interface XRPLAccountBalances {
  address: string;
  xrp_balance: number;
  rlusd_balance: number;
  sequence?: number | null;
  trustline_active: boolean;
  active_channels_count: number;
}

export const api = {
  // Spaza Shop
  getSpaza: () => fetchJson<BackendSpazaShop>("/api/spaza"),

  // Mandate & Spending Rules
  getMandate: () => fetchJson<BackendMandate>("/api/mandate"),
  updateMandate: (data: Partial<BackendMandate>) =>
    fetchJson<BackendMandate>("/api/mandate", {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  // Suppliers & Products
  getSuppliers: () => fetchJson<BackendSupplier[]>("/api/suppliers"),
  getProducts: () => fetchJson<BackendProduct[]>("/api/products"),

  // Orders Ledger
  getOrders: () => fetchJson<BackendOrder[]>("/api/orders"),

  // XRPL Ledger Transactions
  getXRPLTransactions: () => fetchJson<BackendXRPLTransaction[]>("/api/xrpl/transactions"),

  // Agent Telemetry & Logs
  getAgentLogs: (limit = 50) => fetchJson<BackendAgentLog[]>(`/api/agents/logs?limit=${limit}`),

  // Simulation Logs
  getSimulations: () => fetchJson<BackendSimulationLog[]>("/api/simulations"),

  // Guard Pre-flight Check
  guardPreFlight: (payload: {
    spaza_id?: string;
    seller_id?: string;
    seller_address?: string;
    supplier_id_or_address?: string;
    category: string;
    proposed_amount_zar?: number;
    subtotal_zar?: number;
    fee_zar?: number;
    total_zar?: number;
    agent_prompt_summary?: string;
    raw_prompt_or_context?: string;
    items?: Array<{ name?: string; product_name?: string; quantity: number; unit?: string; unit_price_zar: number; total_zar?: number }>;
  }) => {
    const total = payload.total_zar ?? payload.proposed_amount_zar ?? 0;
    const subtotal = payload.subtotal_zar ?? total;
    const fee = payload.fee_zar ?? 0;
    const supplier = payload.supplier_id_or_address || payload.seller_id || payload.seller_address || "sup_nairobi_spices";
    const prompt = payload.raw_prompt_or_context || payload.agent_prompt_summary || undefined;
    const items =
      payload.items && payload.items.length > 0
        ? payload.items.map((it) => ({
            name: it.name || it.product_name || "General Inventory Item",
            quantity: it.quantity || 1,
            unit: it.unit || "unit",
            unit_price_zar: it.unit_price_zar || subtotal,
            total_zar: it.total_zar || (it.quantity * it.unit_price_zar) || subtotal,
          }))
        : [
            {
              name: `${payload.category} Restock`,
              quantity: 1,
              unit: "batch",
              unit_price_zar: subtotal,
              total_zar: subtotal,
            },
          ];

    const body = {
      spaza_id: payload.spaza_id || "spaza_soweto_0042",
      supplier_id_or_address: supplier,
      category: payload.category,
      corridor: "Kenya -> South Africa",
      items,
      subtotal_zar: subtotal,
      fee_zar: fee,
      total_zar: total,
      raw_prompt_or_context: prompt,
    };

    return fetchJson<PreFlightCheckResponse>("/api/guard/pre-flight", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  // Live XRPL Balances
  getXRPLAccount: (address: string) =>
    fetchJson<XRPLAccountBalances>(`/api/xrpl/account/${encodeURIComponent(address)}`),

  // Autonomous Multi-Agent Replenishment Loop
  triggerAgentReplenishment: (payload: {
    spaza_id: string;
    item_keyword: string;
    quantity: number;
    unit?: string;
    auto_deliver?: boolean;
  }) =>
    fetchJson<{
      job_id: string;
      status: string;
      procurement: Record<string, unknown>;
      preflight: Record<string, unknown>;
      treasury: Record<string, unknown>;
      order_id?: string;
      escrow_tx_hash?: string;
      logistics?: Record<string, unknown>;
    }>("/api/agents/replenish", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  // Physical Delivery Confirmation & Escrow Release
  triggerAgentDelivery: (orderId: string) =>
    fetchJson<{
      status: string;
      order_id: string;
      tx_hash: string;
      message: string;
    }>(`/api/agents/deliver/${orderId}`, {
      method: "POST",
    }),
};
