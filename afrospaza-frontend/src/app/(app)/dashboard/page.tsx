"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Store,
  Zap,
  Truck,
  Tag,
  Users,
  Star,
  ShoppingBag,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  ChevronRight,
  TrendingUp,
  Coins,
  LayoutGrid,
  HeartHandshake,
  Loader2,
  Package,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAgentStore } from "@/stores/agentStore";
import { useMandateStore } from "@/stores/mandateStore";
import { useBudget } from "@/hooks/useBudget";
import { formatZAR, formatRLUSD } from "@/lib/format";

// 8 Marketplace Categories matching mockup
const categories = [
  { name: "Groceries", count: "142 items", bg: "bg-amber-50 hover:bg-amber-100/80 border-amber-200/60", icon: "🧺", desc: "Flour, Rice & Staples" },
  { name: "Fresh Produce", count: "89 items", bg: "bg-emerald-50 hover:bg-emerald-100/80 border-emerald-200/60", icon: "🥦", desc: "Greens & Veggies" },
  { name: "Beverages", count: "64 items", bg: "bg-orange-50 hover:bg-orange-100/80 border-orange-200/60", icon: "🥤", desc: "Juices & Soft Drinks" },
  { name: "Snacks", count: "95 items", bg: "bg-rose-50 hover:bg-rose-100/80 border-rose-200/60", icon: "🍿", desc: "Chips & Confectionery" },
  { name: "Household", count: "48 items", bg: "bg-sky-50 hover:bg-sky-100/80 border-sky-200/60", icon: "🧴", desc: "Cleaners & Soaps" },
  { name: "Personal Care", count: "52 items", bg: "bg-purple-50 hover:bg-purple-100/80 border-purple-200/60", icon: "🧼", desc: "Hygiene & Toiletries" },
  { name: "Electronics", count: "31 items", bg: "bg-slate-100 hover:bg-slate-200/80 border-slate-200", icon: "🎧", desc: "Airtime & Accessories" },
  { name: "More", count: "View all", bg: "bg-teal-50 hover:bg-teal-100/80 border-teal-200/60", icon: "✨", desc: "Kenyan Spices & Grain" },
];

// Top Deals matching mockup
const topDeals = [
  {
    id: "deal_1",
    name: "Iwisa Maize Meal 5kg",
    price: 32.0,
    originalPrice: 40.0,
    discount: "-20%",
    category: "Maize & Grains",
    emoji: "🌽",
    rating: 4.9,
  },
  {
    id: "deal_2",
    name: "Sunfoil Cooking Oil 2L",
    price: 67.0,
    originalPrice: 79.0,
    discount: "-15%",
    category: "Cooking Oil",
    emoji: "🌻",
    rating: 4.8,
  },
  {
    id: "deal_3",
    name: "Selati Sugar 2.5kg",
    price: 39.0,
    originalPrice: 47.5,
    discount: "-18%",
    category: "Staples",
    emoji: "🌾",
    rating: 4.9,
  },
];

// Nearby Spazas & Wholesalers matching mockup
const nearbySpazas = [
  {
    name: "Thabo's Spaza",
    rating: 4.7,
    reviews: 320,
    distance: "0.8 km",
    status: "Open • Closes 21:00",
    corridor: "Soweto West",
  },
  {
    name: "Maponya's Mini Mart",
    rating: 4.6,
    reviews: 210,
    distance: "1.2 km",
    status: "Open • Closes 22:00",
    corridor: "Klipspruit, Soweto",
  },
  {
    name: "Nairobi Spice Exporters (Direct)",
    rating: 4.95,
    reviews: 420,
    distance: "Cross-Border (NBO ➔ JNB)",
    status: "XRPL Testnet Verified",
    corridor: "Air Cargo 3-5 days",
    isCrossBorder: true,
  },
];

export default function DashboardPage() {
  const [isRestocking, setIsRestocking] = useState(false);
  const [restockNotice, setRestockNotice] = useState<string | null>(null);
  const [showTelemetry, setShowTelemetry] = useState(false);
  const { addLog, logs } = useAgentStore();
  const { fetchMandate } = useMandateStore();
  const { availableBudgetZAR, rlusdBalance } = useBudget();

  const handleTriggerAIReplenish = async (itemKeyword = "maize") => {
    setIsRestocking(true);
    setRestockNotice(null);
    addLog({
      agentType: "PROCUREMENT",
      level: "INFO",
      message: `Mama Thandi initiated AI procurement for ${itemKeyword} essentials.`,
    });

    try {
      const res = await api.triggerAgentReplenishment({
        spaza_id: "spaza_soweto_0042",
        item_keyword: itemKeyword,
        quantity: 15,
        unit: "bags (25kg)",
        auto_deliver: false,
      });

      setRestockNotice(
        `AI Order ${res.order_id} secured on XRPL Escrow (Tx: ${res.escrow_tx_hash?.slice(0, 14)}...)`
      );
      addLog({
        agentType: "TREASURY",
        level: "SUCCESS",
        message: `Replenishment order ${res.order_id} locked into XRPL smart escrow.`,
        metadata: res,
      });
      await fetchMandate();
    } catch (err: unknown) {
      alert(`Replenishment note: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsRestocking(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Hero Banner Matching Mockup */}
      <div className="relative rounded-3xl overflow-hidden shadow-sm bg-gradient-to-r from-stone-900 via-stone-800 to-emerald-950 text-white min-h-[290px] flex flex-col justify-between p-6 sm:p-10 border border-stone-800">
        {/* Subtle patterned overlay */}
        <div className="absolute inset-0 opacity-15 pointer-events-none bg-[radial-gradient(#22c55e_1px,transparent_1px)] [background-size:16px_16px]" />

        {/* Top & Right Graphics */}
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="max-w-xl space-y-3">
            <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-none text-white">
              Afro<span className="text-[#eab308]">Spaza</span>
            </h1>
            <h2 className="text-xl sm:text-2xl font-bold text-emerald-400">
              Buy Local. Live Better.
            </h2>
            <p className="text-xs sm:text-sm text-stone-300 max-w-md leading-relaxed">
              Your African marketplace for everyday essentials, from your local spaza and beyond.
              Governed by autonomous AI agents & settled instantly on the XRP Ledger.
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-3">
              <button
                onClick={() => handleTriggerAIReplenish("maize")}
                disabled={isRestocking}
                className="px-6 py-2.5 rounded-full bg-[#eab308] hover:bg-[#ca8a04] text-stone-950 font-black text-xs transition-transform active:scale-95 shadow-md flex items-center gap-2 group cursor-pointer"
              >
                {isRestocking ? (
                  <>
                    <Loader2 size={15} className="animate-spin text-stone-900" />
                    <span>AI Agents Negotiating...</span>
                  </>
                ) : (
                  <>
                    <span>Shop Now</span>
                    <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>

              <button
                onClick={() => handleTriggerAIReplenish("spices")}
                disabled={isRestocking}
                className="px-4 py-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/20 font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Sparkles size={14} className="text-[#eab308]" />
                <span>Restock Kenyan Spices</span>
              </button>
            </div>
          </div>

          {/* Right Network Graphic Badge */}
          <div className="hidden lg:flex flex-col items-center justify-center p-5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center mb-2">
              <span className="text-2xl">🌍</span>
            </div>
            <p className="font-bold text-sm text-white">Across Africa.</p>
            <p className="text-xs text-[#eab308] font-medium">In Your Community.</p>
            <div className="mt-3 flex items-center gap-1.5 text-[10px] font-mono text-emerald-300 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-700/40">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>XRPL Rail Active</span>
            </div>
          </div>
        </div>

        {/* Carousel indicators */}
        <div className="relative z-10 flex items-center justify-center gap-1.5 pt-4">
          <span className="w-6 h-1.5 rounded-full bg-[#eab308]" />
          <span className="w-1.5 h-1.5 rounded-full bg-white/40" />
          <span className="w-1.5 h-1.5 rounded-full bg-white/40" />
          <span className="w-1.5 h-1.5 rounded-full bg-white/40" />
        </div>
      </div>

      {/* Restock Notification Alert */}
      {restockNotice && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs text-emerald-800">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
            <span className="font-medium">{restockNotice}</span>
          </div>
          <Link href="/orders" className="font-bold text-emerald-700 hover:underline">
            View Ledger &rarr;
          </Link>
        </div>
      )}

      {/* 2. Feature Highlights Bar Matching Mockup */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm">
        <Link
          href="/sellers"
          className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-slate-50 transition-colors"
        >
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
            <Store size={18} />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-xs text-slate-800 leading-tight">Find Nearby</p>
            <p className="text-[11px] text-slate-500">Spazas & Sellers</p>
          </div>
        </Link>

        <div className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-slate-50 transition-colors">
          <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Zap size={18} />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-xs text-slate-800 leading-tight">Fast & Secure</p>
            <p className="text-[11px] text-slate-500">Payments (XRPL)</p>
          </div>
        </div>

        <Link
          href="/orders"
          className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-slate-50 transition-colors"
        >
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
            <Truck size={18} />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-xs text-slate-800 leading-tight">Track Your</p>
            <p className="text-[11px] text-slate-500">Order & Escrow</p>
          </div>
        </Link>

        <Link
          href="/settings"
          className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-slate-50 transition-colors"
        >
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
            <ShieldCheck size={18} />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-xs text-slate-800 leading-tight">Mandate Guard</p>
            <p className="text-[11px] text-slate-500">Zero-LLM Filter</p>
          </div>
        </Link>

        <div className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-slate-50 transition-colors">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
            <Users size={18} />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-xs text-slate-800 leading-tight">Support Local</p>
            <p className="text-[11px] text-slate-500">Township Trade</p>
          </div>
        </div>
      </div>

      {/* 3. Shop by Category Matching Mockup */}
      <div className="space-y-3.5">
        <div className="flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-black text-slate-900">Shop by Category</h2>
          <Link
            href="/sellers"
            className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
          >
            <span>See All</span>
            <ArrowRight size={13} />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {categories.map((cat) => (
            <div
              key={cat.name}
              onClick={() => handleTriggerAIReplenish(cat.name.toLowerCase())}
              className={`p-3.5 rounded-2xl border text-center transition-all hover:-translate-y-1 hover:shadow-md cursor-pointer flex flex-col items-center justify-between min-h-[115px] ${cat.bg}`}
            >
              <div className="text-2xl mb-1">{cat.icon}</div>
              <div>
                <p className="font-bold text-xs text-slate-900 leading-tight">{cat.name}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">{cat.count}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Bottom 3-Column Section Matching Mockup */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Nearby Spazas (Left 4 cols) */}
        <div className="lg:col-span-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-900">Nearby Spazas</h3>
            <Link href="/sellers" className="text-xs font-bold text-emerald-700 hover:underline">
              See All &rarr;
            </Link>
          </div>

          <div className="space-y-3">
            {nearbySpazas.map((spaza) => (
              <div
                key={spaza.name}
                className="p-3 rounded-xl border border-slate-100 hover:border-emerald-200 hover:bg-slate-50/80 transition-all flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="font-bold text-xs text-slate-900 truncate">{spaza.name}</p>
                    {spaza.isCrossBorder && (
                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800">
                        KE ➔ SA
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500">
                    <span className="flex items-center text-amber-500 font-bold">
                      <Star size={11} className="fill-amber-400 stroke-amber-500 inline mr-0.5" />
                      {spaza.rating}
                    </span>
                    <span>&bull;</span>
                    <span>{spaza.distance}</span>
                  </div>
                  <p className="text-[10px] text-emerald-700 font-medium mt-0.5">{spaza.status}</p>
                </div>

                <Link
                  href="/sellers"
                  className="px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[11px] font-bold shrink-0 transition-colors"
                >
                  Visit &rarr;
                </Link>
              </div>
            ))}
          </div>
        </div>

        {/* Top Deals (Middle 5 cols) */}
        <div className="lg:col-span-5 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-900">Top Deals</h3>
            <Link href="/orders" className="text-xs font-bold text-emerald-700 hover:underline">
              See All &rarr;
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {topDeals.map((deal) => (
              <div
                key={deal.id}
                className="p-3 rounded-2xl border border-slate-100 hover:border-emerald-300 hover:shadow-sm transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <span className="px-1.5 py-0.5 rounded-md bg-red-500 text-white font-black text-[10px]">
                      {deal.discount}
                    </span>
                    <span className="text-2xl">{deal.emoji}</span>
                  </div>
                  <p className="font-bold text-xs text-slate-900 leading-snug line-clamp-2">
                    {deal.name}
                  </p>
                  <div className="mt-2 flex items-baseline gap-1.5">
                    <span className="font-black text-sm text-slate-900">
                      R{deal.price.toFixed(2)}
                    </span>
                    <span className="text-[10px] text-slate-400 line-through">
                      R{deal.originalPrice.toFixed(2)}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => handleTriggerAIReplenish(deal.name)}
                  disabled={isRestocking}
                  className="mt-3 w-full py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-[11px] flex items-center justify-center gap-1 transition-colors cursor-pointer"
                >
                  <ShoppingBag size={12} />
                  <span>+ Add to Cart</span>
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Community Promo & AI Swarm Toggle (Right 3 cols) */}
        <div className="lg:col-span-3 space-y-4">
          <div className="rounded-2xl p-5 bg-gradient-to-br from-[#166534] via-[#15803d] to-[#14532d] text-white space-y-3 relative overflow-hidden shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center text-[#facc15]">
              <HeartHandshake size={22} />
            </div>
            <div>
              <h4 className="font-black text-sm text-white leading-tight">
                Empowering African Communities
              </h4>
              <p className="text-[11px] text-emerald-100 mt-1 leading-relaxed">
                A stronger Africa through local cross-border trade, secured by XRPL testnet smart settlement.
              </p>
            </div>
            <Link
              href="/demo"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#facc15] hover:bg-[#eab308] text-stone-900 font-bold text-[11px] transition-colors shadow"
            >
              <span>Adversarial Demo</span>
              <ArrowRight size={12} />
            </Link>
          </div>

          {/* Quick Mandate Budget Meter */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-sm space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-700">Autonomous Mandate</span>
              <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full text-[10px]">
                Enforced
              </span>
            </div>
            <div>
              <p className="text-xl font-black text-slate-900">{formatZAR(availableBudgetZAR)}</p>
              <p className="text-[10px] text-slate-500">Remaining daily buffer (5,000 ZAR cap)</p>
            </div>
            <div className="pt-1 flex items-center justify-between text-[11px] font-mono text-slate-600 border-t border-slate-100">
              <span>XRPL Treasury</span>
              <span className="font-bold text-emerald-700">{formatRLUSD(rlusdBalance)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Real-Time Swarm Telemetry Drawer Toggle */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <h3 className="font-bold text-xs text-slate-900">
              Autonomous Agent Swarm Telemetry (Groq + Guard + XRPL)
            </h3>
          </div>
          <button
            onClick={() => setShowTelemetry(!showTelemetry)}
            className="text-xs font-bold text-emerald-700 hover:text-emerald-800"
          >
            {showTelemetry ? "Hide Logs ▲" : "View Live Swarm Logs ▼"}
          </button>
        </div>

        {showTelemetry && (
          <div className="mt-3 divide-y divide-slate-100 max-h-56 overflow-y-auto text-xs">
            {logs && logs.length > 0 ? (
              logs.slice(0, 8).map((log) => (
                <div key={log.id} className="py-2 flex items-start gap-2">
                  <span
                    className={`font-mono font-bold text-[10px] px-1.5 py-0.5 rounded shrink-0 ${
                      log.agentType === "PROCUREMENT"
                        ? "bg-amber-100 text-amber-800"
                        : log.agentType === "TREASURY"
                        ? "bg-blue-100 text-blue-800"
                        : log.agentType === "LOGISTICS"
                        ? "bg-purple-100 text-purple-800"
                        : "bg-emerald-100 text-emerald-800"
                    }`}
                  >
                    {log.agentType}
                  </span>
                  <p className="text-slate-600 text-[11px] flex-1">{log.message}</p>
                </div>
              ))
            ) : (
              <p className="text-slate-400 py-2 text-[11px]">No recent agent transactions.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
