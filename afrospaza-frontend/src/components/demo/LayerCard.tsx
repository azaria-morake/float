import React from "react";
import { DefenseLayer } from "@/types/simulation";
import { ShieldCheck, ShieldAlert, Loader2, CheckCircle2 } from "lucide-react";

interface LayerCardProps {
  layer: DefenseLayer;
  index: number;
}

export function LayerCard({ layer, index }: LayerCardProps) {
  const statusConfig = {
    ACTIVE: {
      badge: "ARMED",
      color: "text-emerald-700 bg-emerald-50 border-emerald-200",
      icon: <CheckCircle2 size={16} className="text-emerald-600" />,
      border: "border-slate-200 bg-slate-50/70",
    },
    INSPECTING: {
      badge: "EVALUATING",
      color: "text-blue-700 bg-blue-50 border-blue-200",
      icon: <Loader2 size={16} className="text-blue-600 animate-spin" />,
      border: "border-blue-400 bg-blue-50/30",
    },
    INTERCEPTED: {
      badge: "ATTACK BLOCKED",
      color: "text-red-700 bg-red-50 border-red-200",
      icon: <ShieldAlert size={16} className="text-red-600" />,
      border: "border-red-400 bg-red-50/30 shadow-md shadow-red-500/5",
    },
    PASSED: {
      badge: "PASSED",
      color: "text-slate-600 bg-slate-100 border-slate-200",
      icon: <CheckCircle2 size={16} className="text-emerald-600" />,
      border: "border-slate-200 bg-slate-50/70",
    },
  }[layer.status];

  return (
    <div
      className={`p-4 rounded-xl border ${statusConfig.border} transition-all duration-300 space-y-2`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-mono text-[10px] font-bold flex items-center justify-center">
            {index + 1}
          </span>
          <span className="text-xs font-bold text-slate-900">{layer.name}</span>
        </div>
        <span
          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1.5 ${statusConfig.color}`}
        >
          {statusConfig.icon}
          <span>{statusConfig.badge}</span>
        </span>
      </div>

      <p className="text-[11px] text-slate-500 leading-relaxed pl-7">
        {layer.description}
      </p>

      {layer.details && (
        <div className="mt-2 pl-7">
          <span className="text-[10px] font-mono text-red-700 bg-red-50 border border-red-200 px-2 py-1 rounded inline-block">
            Interceptor Output: {layer.details}
          </span>
        </div>
      )}
    </div>
  );
}
