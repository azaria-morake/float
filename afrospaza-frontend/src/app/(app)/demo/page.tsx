"use client";

import React from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { SimulationControls } from "@/components/demo/SimulationControls";
import { AttackVisualizer } from "@/components/demo/AttackVisualizer";
import { TerminalLog } from "@/components/demo/TerminalLog";
import { useSimulation } from "@/hooks/useSimulation";
import { GlassCard } from "@/components/ui/GlassCard";
import { ShieldCheck, AlertOctagon, CheckCircle2 } from "lucide-react";

export default function AdversarialDemoPage() {
  const { layers, isRunning, results, activeLogs, runSimulation, resetLayers } =
    useSimulation();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Adversarial Attack Simulation"
        description="Verify how AfroSpaza's 4-layer defense matrix detects and neutralizes prompt injection, unvetted counterfeiters, and budget overspend exploits before any RLUSD is moved."
        badge="Zero-Trust Test Suite"
      />

      {/* Control Area */}
      <GlassCard className="space-y-6">
        <SimulationControls
          onRunAttack={runSimulation}
          onReset={resetLayers}
          isRunning={isRunning}
        />
      </GlassCard>

      {/* Middle Grid: Layers + Terminal */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GlassCard className="space-y-4">
          <AttackVisualizer layers={layers} />
        </GlassCard>

        <TerminalLog logs={activeLogs} />
      </div>

      {/* Interception History */}
      {results.length > 0 && (
        <GlassCard className="space-y-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} className="text-emerald-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Intercepted Attacks ({results.length})
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-500 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3">Attack Vector</th>
                  <th className="py-2.5 px-3">Intercepting Layer</th>
                  <th className="py-2.5 px-3">Reason</th>
                  <th className="py-2.5 px-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {results.map((res) => (
                  <tr key={res.id} className="text-slate-800">
                    <td className="py-2.5 px-3 font-mono text-slate-400">{res.timestamp}</td>
                    <td className="py-2.5 px-3 font-bold text-slate-900">{res.attackType}</td>
                    <td className="py-2.5 px-3 text-emerald-800 font-semibold">{res.interceptingLayer}</td>
                    <td className="py-2.5 px-3 text-slate-500 max-w-xs truncate">{res.reason}</td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-200">
                        {res.actionTaken}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>
      )}
    </div>
  );
}
