"use client";

import React, { useState, useEffect } from "react";
import { OrderTable } from "@/components/orders/OrderTable";
import { dummyOrders } from "@/lib/ordersData";
import { Order, OrderStatus } from "@/types/order";
import { RefreshCw, Sparkles, ShoppingBag, ArrowRight } from "lucide-react";
import { api, BackendOrder } from "@/lib/api";

function mapBackendOrder(bo: BackendOrder): Order {
  return {
    id: bo.id,
    spazaId: bo.spaza_id,
    supplierId: bo.supplier_id,
    supplierName:
      bo.supplier_id === "sup_nairobi_spices"
        ? "Nairobi Spice Exporters Ltd"
        : bo.supplier_id === "sup_mombasa_drygoods"
        ? "Mombasa Coastal Spices"
        : bo.supplier_id === "sup_khayelitsha_01"
        ? "Khayelitsha Bulk Traders"
        : "Vetted African Supplier",
    supplierAddress: "rHtCG4mnw7nqfzhF9hEazRuPYGusjRqjdj",
    status: bo.status as OrderStatus,
    items:
      bo.items?.map((it) => ({
        id: it.id,
        name: it.name,
        quantity: it.quantity,
        unit: it.unit,
        unitPriceZAR: it.unit_price_zar,
        totalZAR: it.total_zar,
      })) || [],
    subtotalZAR: bo.subtotal_zar,
    feeZAR: bo.fee_zar,
    totalZAR: bo.total_zar,
    totalRLUSD: bo.total_rlusd,
    xrplTxHash: bo.xrpl_tx_hash || undefined,
    escrowSequence: bo.escrow_sequence || undefined,
    settlementMethod: (bo.settlement_method as "ESCROW" | "PAYMENT_CHANNEL" | "DIRECT_RLUSD") || "ESCROW",
    createdAt: bo.created_at,
    deliveredAt: bo.delivered_at || undefined,
    notes: bo.notes || undefined,
  };
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>(dummyOrders);
  const [filter, setFilter] = useState<string>("ALL");
  const [isLoading, setIsLoading] = useState(false);
  const [isTriggering, setIsTriggering] = useState(false);

  const fetchOrders = async () => {
    setIsLoading(true);
    try {
      const data = await api.getOrders();
      if (data && data.length > 0) {
        const liveOrders = data.map(mapBackendOrder);
        setOrders(liveOrders);
      }
    } catch {
      // Keep existing dummy fallback
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleTriggerReplenishment = async () => {
    setIsTriggering(true);
    try {
      await api.triggerAgentReplenishment({
        spaza_id: "spaza_soweto_0042",
        item_keyword: "maize",
        quantity: 20,
        unit: "bags (25kg)",
        auto_deliver: false,
      });
      await fetchOrders();
    } catch (err: unknown) {
      alert(`Replenishment note: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsTriggering(false);
    }
  };

  const filteredOrders =
    filter === "ALL"
      ? orders
      : orders.filter((o) =>
          filter === "ACTIVE"
            ? o.status === "ESCROW_LOCKED" || o.status === "IN_TRANSIT"
            : o.status === filter
        );

  return (
    <div className="space-y-6 pb-12">
      {/* Marketplace Page Header */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold uppercase tracking-wider">
              On-Chain XRPL Ledger
            </span>
            <span className="text-xs text-slate-400">&bull;</span>
            <span className="text-xs text-slate-500 font-medium">Soweto Super Spaza</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Orders & Escrow Ledger</h1>
          <p className="text-xs text-slate-500 max-w-xl mt-1 leading-relaxed">
            Every cross-border purchase is negotiated by Groq AI procurement agents, screened by the Zero-LLM Guard, and locked into XRPL smart escrows in RLUSD until delivery verification.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={fetchOrders}
            disabled={isLoading}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RefreshCw size={13} className={isLoading ? "animate-spin text-slate-600" : ""} />
            <span>Refresh</span>
          </button>

          <button
            onClick={handleTriggerReplenishment}
            disabled={isTriggering}
            className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-1.5 transition-transform active:scale-95 shadow-sm cursor-pointer"
          >
            <Sparkles size={13} className={isTriggering ? "animate-spin" : "text-amber-300"} />
            <span>{isTriggering ? "Agents Negotiating..." : "+ New AI Replenish"}</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="inline-flex p-1 bg-white border border-slate-200 rounded-2xl shadow-sm">
          {["ALL", "ACTIVE", "DELIVERED", "SETTLED", "INTERCEPTED_REJECTED"].map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                filter === tab
                  ? "bg-emerald-700 text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              {tab === "INTERCEPTED_REJECTED" ? "Guard Blocked" : tab === "ACTIVE" ? "In Transit / Escrow" : tab}
            </button>
          ))}
        </div>

        <span className="text-xs text-slate-500 font-medium">
          Showing <strong className="text-slate-800">{filteredOrders.length}</strong> of {orders.length} transactions
        </span>
      </div>

      {/* Order Table */}
      <OrderTable orders={filteredOrders} onOrderUpdated={fetchOrders} />
    </div>
  );
}
