"use client";

import React from "react";
import { DefenseLayer } from "@/types/simulation";
import { LayerCard } from "./LayerCard";
import { Shield } from "lucide-react";

interface AttackVisualizerProps {
  layers: DefenseLayer[];
}

export function AttackVisualizer({ layers }: AttackVisualizerProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield size={16} className="text-emerald-600" />
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Active Defense Pipeline (4 Layers)
          </h3>
        </div>
        <span className="text-[11px] text-slate-400 font-mono">Defense in Depth</span>
      </div>

      <div className="space-y-2.5">
        {layers.map((layer, idx) => (
          <LayerCard key={layer.id} layer={layer} index={idx} />
        ))}
      </div>
    </div>
  );
}
