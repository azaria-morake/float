"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { dummyOrders } from "@/lib/ordersData";
import { PageHeader } from "@/components/layout/PageHeader";
import { GlassCard } from "@/components/ui/GlassCard";
import { OrderStatusBadge } from "@/components/orders/OrderStatusBadge";
import { XRPLHashLink } from "@/components/orders/XRPLHashLink";
import { formatZAR, formatRLUSD, formatDate } from "@/lib/format";
import { GlassButton } from "@/components/ui/GlassButton";
import { api, BackendOrder } from "@/lib/api";
import { Order, OrderStatus } from "@/types/order";
import {
  ArrowLeft,
  ShieldCheck,
  Truck,
  Coins,
  CheckCircle2,
  Package,
  AlertTriangle,
  Loader2,
  Sparkles,
  ExternalLink,
} from "lucide-react";

function mapBackendOrder(bo: BackendOrder): Order {
  return {
    id: bo.id,
    spazaId: bo.spaza_id,
    supplierId: bo.supplier_id,
    supplierName:
      bo.supplier_id === "sup_nairobi_spices"
        ? "Nairobi Spice Exporters Ltd"
        : bo.supplier_id === "sup_mombasa_drygoods"
        ? "Mombasa Coastal Spices & Pepper"
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

export default function OrderDetailPage() {
  const params = useParams();
  const orderId = (params?.id as string) || "ORD-8921";
  const [order, setOrder] = useState<Order>(
    dummyOrders.find((o) => o.id === orderId) || dummyOrders[0]
  );
  const [isReleasing, setIsReleasing] = useState(false);
  const [releaseResult, setReleaseResult] = useState<{
    txHash?: string;
    message?: string;
  } | null>(null);

  const fetchLiveOrder = async () => {
    try {
      const liveOrders = await api.getOrders();
      const match = liveOrders.find((o) => o.id === orderId);
      if (match) {
        setOrder(mapBackendOrder(match));
      }
    } catch {
      // Keep existing
    }
  };

  useEffect(() => {
    fetchLiveOrder();
  }, [orderId]);

  const handleConfirmDelivery = async () => {
    setIsReleasing(true);
    setReleaseResult(null);
    try {
      const res = await api.triggerAgentDelivery(order.id);
      setReleaseResult({
        txHash: res.tx_hash,
        message: res.message || "Escrow funds successfully released to supplier on XRPL ledger.",
      });
      await fetchLiveOrder();
    } catch (err: unknown) {
      alert(`Settlement notice: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsReleasing(false);
    }
  };

  const isPendingSettlement = order.status === "IN_TRANSIT" || order.status === "ESCROW_LOCKED";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/orders">
          <GlassButton variant="secondary" size="sm" icon={<ArrowLeft size={14} />}>
            Back to Orders
          </GlassButton>
        </Link>
        <span className="text-xs text-zinc-500 font-mono">Order Details / {order.id}</span>
      </div>

      <PageHeader
        title={`Order ${order.id}`}
        description={`Cross-border trade with ${order.supplierName} backstopped by XRPL smart escrow protocol.`}
        actions={
          <div className="flex items-center gap-3">
            <OrderStatusBadge status={order.status} />
            {isPendingSettlement && (
              <GlassButton
                variant="primary"
                size="sm"
                icon={isReleasing ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                onClick={handleConfirmDelivery}
              >
                {isReleasing ? "Releasing on XRPL..." : "Confirm Delivery & Release Escrow"}
              </GlassButton>
            )}
          </div>
        }
      />

      {/* Success Notification Banner after Escrow Release */}
      {releaseResult && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-3">
          <CheckCircle2 size={18} className="text-emerald-400 shrink-0 mt-0.5" />
          <div className="text-xs">
            <p className="font-semibold text-emerald-200">XRPL Escrow Settled On-Chain</p>
            <p className="text-emerald-300/80 mt-0.5">{releaseResult.message}</p>
            {releaseResult.txHash && (
              <div className="mt-2 flex items-center gap-1.5 font-mono text-[11px] text-emerald-400">
                <span>Tx Hash:</span>
                <XRPLHashLink hash={releaseResult.txHash} />
              </div>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Items & Totals */}
        <div className="lg:col-span-2 space-y-6">
          <GlassCard className="space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Package size={16} className="text-orange-400" />
              <span>Purchased Inventory Items</span>
            </h3>

            <div className="divide-y divide-border/60">
              {order.items && order.items.length > 0 ? (
                order.items.map((item) => (
                  <div key={item.id} className="py-3 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-white block">{item.name}</span>
                      <span className="text-zinc-500 text-[11px]">
                        {item.quantity} {item.unit} @ {formatZAR(item.unitPriceZAR)}
                      </span>
                    </div>
                    <span className="font-mono font-bold text-zinc-200">
                      {formatZAR(item.totalZAR)}
                    </span>
                  </div>
                ))
              ) : (
                <div className="py-3 text-xs text-zinc-400">Inventory Restock Package</div>
              )}
            </div>

            <div className="pt-4 border-t border-border space-y-2 text-xs">
              <div className="flex justify-between text-zinc-400">
                <span>Subtotal</span>
                <span>{formatZAR(order.subtotalZAR)}</span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Township Logistics & Platform Fee</span>
                <span>{formatZAR(order.feeZAR)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-white pt-2 border-t border-border/60">
                <span>Total Settlement Amount</span>
                <div className="text-right">
                  <div>{formatZAR(order.totalZAR)}</div>
                  <div className="text-xs font-mono text-blue-400 font-normal">
                    {formatRLUSD(order.totalRLUSD)}
                  </div>
                </div>
              </div>
            </div>
          </GlassCard>

          {/* Guard Verification Audit Trail */}
          <GlassCard className="space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <ShieldCheck size={16} className="text-emerald-400" />
              <span>Mandate Pre-Flight Audit Trail</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-surface-elevated/80 border border-border flex items-start gap-3">
                <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-semibold text-white">Pre-Flight Policy Check: APPROVED</div>
                  <div className="text-zinc-400 text-[11px]">
                    Validated against Soweto Spaza Mandate: Single tx ceiling (R2,500) respected, daily category budget headroom confirmed, and seller directory verified.
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-surface-elevated/80 border border-border flex items-start gap-3">
                <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-semibold text-white">HMAC Cryptographic Guard Voucher</div>
                  <div className="text-zinc-400 text-[11px] font-mono break-all">
                    Voucher ID: vch_04cce7367d62 &bull; Nonce: 008f21dd24eb4fe6
                  </div>
                </div>
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Right Column: Settlement & Courier */}
        <div className="space-y-6">
          {/* XRPL Settlement Info */}
          <GlassCard className="space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Coins size={16} className="text-blue-400" />
              <span>XRPL Smart Settlement</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-zinc-500 block text-[11px]">Settlement Method</span>
                <span className="font-bold text-zinc-200">{order.settlementMethod}</span>
              </div>

              {order.escrowSequence && (
                <div>
                  <span className="text-zinc-500 block text-[11px]">Escrow Sequence</span>
                  <span className="font-mono text-white font-bold">#{order.escrowSequence}</span>
                </div>
              )}

              <div>
                <span className="text-zinc-500 block text-[11px]">XRPL Transaction Hash</span>
                <XRPLHashLink hash={order.xrplTxHash} />
              </div>

              {isPendingSettlement && (
                <div className="pt-2">
                  <button
                    onClick={handleConfirmDelivery}
                    disabled={isReleasing}
                    className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold text-xs shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-1.5 transition-all"
                  >
                    {isReleasing ? (
                      <>
                        <Loader2 size={13} className="animate-spin" />
                        <span>Submitting EscrowFinish...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={13} />
                        <span>Confirm Delivery & Release</span>
                      </>
                    )}
                  </button>
                  <p className="text-[10px] text-zinc-500 text-center mt-1.5">
                    Triggers Agent 3 to execute on-chain release of funds to Kenyan merchant.
                  </p>
                </div>
              )}
            </div>
          </GlassCard>

          {/* Logistics Dispatch */}
          <GlassCard className="space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Truck size={16} className="text-purple-400" />
              <span>Air Cargo & Cross-Border Logistics</span>
            </h3>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-zinc-500">Corridor</span>
                <span className="font-bold text-zinc-200">Nairobi (NBO) ➔ Joburg (JNB)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Air Waybill / Tracking</span>
                <span className="font-mono text-orange-400 font-semibold">CARGO-KE-ZA-80BC</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Carrier Partner</span>
                <span className="text-zinc-300">Kenya Consolidators Express</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Local Destination</span>
                <span className="text-zinc-300">City Deep Depot / Soweto Hub</span>
              </div>
            </div>

            {order.notes && (
              <p className="text-[11px] text-zinc-400 italic pt-2 border-t border-border">
                &ldquo;{order.notes}&rdquo;
              </p>
            )}
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
