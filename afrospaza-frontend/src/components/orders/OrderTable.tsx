"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Order } from "@/types/order";
import { OrderStatusBadge } from "./OrderStatusBadge";
import { XRPLHashLink } from "./XRPLHashLink";
import { formatZAR, formatRLUSD, formatDate } from "@/lib/format";
import { ChevronRight, CheckCircle2, Loader2 } from "lucide-react";
import { api } from "@/lib/api";

interface OrderTableProps {
  orders: Order[];
  onOrderUpdated?: () => void;
}

export function OrderTable({ orders, onOrderUpdated }: OrderTableProps) {
  const [releasingId, setReleasingId] = useState<string | null>(null);

  const handleQuickRelease = async (e: React.MouseEvent, orderId: string) => {
    e.stopPropagation();
    e.preventDefault();
    setReleasingId(orderId);
    try {
      await api.triggerAgentDelivery(orderId);
      if (onOrderUpdated) {
        onOrderUpdated();
      }
    } catch (err: unknown) {
      alert(`Escrow release: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setReleasingId(null);
    }
  };

  return (
    <div className="w-full overflow-x-auto rounded-2xl border border-slate-200/90 bg-white shadow-sm">
      <table className="w-full text-left text-xs">
        <thead className="bg-slate-50/80 text-slate-500 font-bold border-b border-slate-200">
          <tr>
            <th className="py-3 px-4">Order ID</th>
            <th className="py-3 px-4">Supplier</th>
            <th className="py-3 px-4">Items Summary</th>
            <th className="py-3 px-4">Total (ZAR / RLUSD)</th>
            <th className="py-3 px-4">Status</th>
            <th className="py-3 px-4">XRPL Tx Hash</th>
            <th className="py-3 px-4">Created</th>
            <th className="py-3 px-4 text-right">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 text-slate-700">
          {orders.map((order) => (
            <tr
              key={order.id}
              className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
            >
              <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                <Link href={`/orders/${order.id}`} className="hover:text-emerald-700">
                  {order.id}
                </Link>
              </td>
              <td className="py-3.5 px-4">
                <div className="font-semibold text-slate-900">{order.supplierName}</div>
                <div className="text-[10px] text-slate-400 font-mono">
                  {order.supplierAddress ? `${order.supplierAddress.slice(0, 10)}...` : "XRPL Testnet"}
                </div>
              </td>
              <td className="py-3.5 px-4">
                <span className="text-slate-600">
                  {order.items && order.items.length > 0
                    ? order.items.map((i) => `${i.quantity}x ${i.name}`).join(", ")
                    : "Inventory Restock Batch"}
                </span>
              </td>
              <td className="py-3.5 px-4">
                <div className="font-bold text-slate-900">{formatZAR(order.totalZAR)}</div>
                <div className="text-[10px] text-blue-600 font-mono font-medium">
                  {formatRLUSD(order.totalRLUSD)}
                </div>
              </td>
              <td className="py-3.5 px-4">
                <OrderStatusBadge status={order.status} />
              </td>
              <td className="py-3.5 px-4">
                <XRPLHashLink hash={order.xrplTxHash} />
              </td>
              <td className="py-3.5 px-4 text-slate-500">
                {formatDate(order.createdAt)}
              </td>
              <td className="py-3.5 px-4 text-right">
                <div className="flex items-center justify-end gap-2">
                  {(order.status === "IN_TRANSIT" || order.status === "ESCROW_LOCKED") && (
                    <button
                      onClick={(e) => handleQuickRelease(e, order.id)}
                      disabled={releasingId === order.id}
                      title="Trigger Logistics delivery milestone & execute on-chain EscrowFinish"
                      className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer shadow-sm"
                    >
                      {releasingId === order.id ? (
                        <>
                          <Loader2 size={12} className="animate-spin text-emerald-700" />
                          <span>Settling...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 size={12} className="text-emerald-700" />
                          <span>Release Escrow</span>
                        </>
                      )}
                    </button>
                  )}
                  <Link
                    href={`/orders/${order.id}`}
                    className="p-1.5 rounded-lg bg-slate-100 hover:bg-emerald-100 text-slate-500 hover:text-emerald-800 inline-flex items-center transition-colors"
                  >
                    <ChevronRight size={15} />
                  </Link>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
