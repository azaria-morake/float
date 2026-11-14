import { create } from "zustand";
import { AgentMandate, SpendingRule } from "@/types/mandate";
import { api, BackendMandate } from "@/lib/api";

const initialMandate: AgentMandate = {
  spazaId: "spaza_soweto_0042",
  spazaName: "Soweto Super Spaza & Wholesale",
  location: "Zone 6, Soweto, Gauteng",
  totalDailyBudgetZAR: 25000,
  usedTodayZAR: 14250,
  currency: "ZAR",
  exchangeRateRLUSDToZAR: 18.25,
  killSwitchActive: false,
  autoRebalanceEnabled: true,
  minSafetyReserveZAR: 4000,
  lastUpdated: new Date().toISOString(),
  rules: [
    {
      id: "rule_1",
      category: "Maize & Grains",
      maxSingleTxZAR: 8000,
      dailyCapZAR: 12000,
      allowedSellers: ["sup_khayelitsha_01", "sup_johannesburg_wholesalers"],
      requiresDoubleApproval: false,
      enabled: true,
    },
    {
      id: "rule_2",
      category: "Cooking Oil & Essentials",
      maxSingleTxZAR: 5000,
      dailyCapZAR: 8000,
      allowedSellers: ["sup_johannesburg_wholesalers"],
      requiresDoubleApproval: false,
      enabled: true,
    },
    {
      id: "rule_3",
      category: "Dairy & Perishables",
      maxSingleTxZAR: 3000,
      dailyCapZAR: 5000,
      allowedSellers: ["sup_soweto_dairy"],
      requiresDoubleApproval: true,
      enabled: true,
    },
    {
      id: "rule_4",
      category: "Beverages & Soft Drinks",
      maxSingleTxZAR: 4500,
      dailyCapZAR: 7000,
      allowedSellers: ["sup_amalgamated_bev"],
      requiresDoubleApproval: false,
      enabled: true,
    },
  ],
};

function mapBackendMandate(bm: BackendMandate): AgentMandate {
  return {
    spazaId: bm.spaza_id || "spaza_soweto_0042",
    spazaName: "Soweto Super Spaza & Wholesale",
    location: "Zone 6, Soweto, Gauteng",
    totalDailyBudgetZAR: bm.total_daily_budget_zar,
    usedTodayZAR: bm.used_today_zar,
    currency: (bm.currency as "ZAR" | "RLUSD" | "XRP") || "ZAR",
    exchangeRateRLUSDToZAR: bm.exchange_rate_rlusd_to_zar,
    killSwitchActive: bm.kill_switch_active,
    killSwitchTriggeredAt: bm.kill_switch_triggered_at || undefined,
    killSwitchReason: bm.kill_switch_reason || undefined,
    autoRebalanceEnabled: bm.auto_rebalance_enabled,
    minSafetyReserveZAR: bm.min_safety_reserve_zar,
    lastUpdated: bm.updated_at || new Date().toISOString(),
    rules: bm.rules?.map((r) => ({
      id: r.id,
      category: r.category,
      maxSingleTxZAR: r.max_single_tx_zar,
      dailyCapZAR: r.daily_cap_zar,
      allowedSellers: r.allowed_sellers || [],
      requiresDoubleApproval: r.requires_double_approval,
      enabled: r.enabled,
    })) || [],
  };
}

interface MandateStoreState {
  mandate: AgentMandate;
  fetchMandate: () => Promise<void>;
  setMandate: (mandate: AgentMandate) => void;
  updateDailyBudget: (newBudget: number) => Promise<void>;
  toggleKillSwitch: (reason?: string) => Promise<void>;
  updateRule: (ruleId: string, updates: Partial<SpendingRule>) => void;
  addRule: (rule: SpendingRule) => void;
  recordSpend: (amountZAR: number) => void;
}

export const useMandateStore = create<MandateStoreState>((set, get) => ({
  mandate: initialMandate,

  fetchMandate: async () => {
    try {
      const data = await api.getMandate();
      if (data) {
        set({ mandate: mapBackendMandate(data) });
      }
    } catch {
      // Fallback
    }
  },

  setMandate: (mandate) => set({ mandate }),

  updateDailyBudget: async (newBudget) => {
    set((state) => ({
      mandate: {
        ...state.mandate,
        totalDailyBudgetZAR: newBudget,
        lastUpdated: new Date().toISOString(),
      },
    }));
    try {
      await api.updateMandate({ total_daily_budget_zar: newBudget });
    } catch {
      // Offline fallback
    }
  },

  toggleKillSwitch: async (reason = "Manual operator toggle") => {
    const active = !get().mandate.killSwitchActive;
    set((state) => ({
      mandate: {
        ...state.mandate,
        killSwitchActive: active,
        killSwitchTriggeredAt: active ? new Date().toISOString() : undefined,
        killSwitchReason: active ? reason : undefined,
        lastUpdated: new Date().toISOString(),
      },
    }));
    try {
      await api.updateMandate({
        kill_switch_active: active,
        kill_switch_reason: active ? reason : null,
      });
    } catch {
      // Offline fallback
    }
  },

  updateRule: (ruleId, updates) =>
    set((state) => ({
      mandate: {
        ...state.mandate,
        rules: state.mandate.rules.map((r) => (r.id === ruleId ? { ...r, ...updates } : r)),
        lastUpdated: new Date().toISOString(),
      },
    })),

  addRule: (rule) =>
    set((state) => ({
      mandate: {
        ...state.mandate,
        rules: [...state.mandate.rules, rule],
        lastUpdated: new Date().toISOString(),
      },
    })),

  recordSpend: (amountZAR) =>
    set((state) => ({
      mandate: {
        ...state.mandate,
        usedTodayZAR: state.mandate.usedTodayZAR + amountZAR,
        lastUpdated: new Date().toISOString(),
      },
    })),
}));
