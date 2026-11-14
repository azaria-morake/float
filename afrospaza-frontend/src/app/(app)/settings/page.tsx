"use client";

import React, { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlassButton } from "@/components/ui/GlassButton";
import { GlassInput } from "@/components/ui/GlassInput";
import { Toggle } from "@/components/ui/Toggle";
import { useMandate } from "@/hooks/useMandate";
import { useToast } from "@/hooks/useToast";
import { formatZAR } from "@/lib/format";
import { Sliders, ShieldAlert, Power, Save, Plus, Trash2, CheckCircle2 } from "lucide-react";

export default function SettingsPage() {
  const { mandate, updateDailyBudget, toggleKillSwitch, updateRule } = useMandate();
  const { toast } = useToast();

  const [dailyBudgetInput, setDailyBudgetInput] = useState(mandate.totalDailyBudgetZAR.toString());
  const [minReserveInput, setMinReserveInput] = useState(mandate.minSafetyReserveZAR.toString());

  const handleSaveGeneral = (e: React.FormEvent) => {
    e.preventDefault();
    const newBudget = Number(dailyBudgetInput);
    if (isNaN(newBudget) || newBudget <= 0) {
      toast.error("Invalid Budget", "Please enter a valid positive number.");
      return;
    }
    updateDailyBudget(newBudget);
    toast.success("Mandate Updated", "Daily autonomous budget updated successfully.");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mandate & Policy Editor"
        description="Fine-tune autonomous agent spending authorities, category limits, safety reserves, and emergency override switches."
        badge="Autonomous Boundary Configuration"
      />

      {/* Emergency Freeze Control */}
      <GlassCard
        variant={mandate.killSwitchActive ? "dangerGlow" : "default"}
        className="space-y-4"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Power
              size={20}
              className={mandate.killSwitchActive ? "text-red-500 animate-pulse" : "text-slate-400"}
            />
            <div>
              <h3 className="text-base font-bold text-slate-900">Emergency Kill Switch</h3>
              <p className="text-xs text-slate-500">
                Immediately block all agent micro-transactions and pause XRPL payment channel claims.
              </p>
            </div>
          </div>
          <Toggle
            checked={mandate.killSwitchActive}
            onChange={() => {
              toggleKillSwitch();
              if (!mandate.killSwitchActive) {
                toast.error("Kill Switch Activated", "All agent operations paused.");
              } else {
                toast.success("Kill Switch Deactivated", "Operations resumed.");
              }
            }}
          />
        </div>
      </GlassCard>

      {/* Daily Limits & Safety Floor */}
      <GlassCard className="space-y-6">
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
          <Sliders size={16} className="text-emerald-700" />
          <span>Global Spending Ceilings</span>
        </h3>

        <form onSubmit={handleSaveGeneral} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <GlassInput
            label="Total Daily Autonomous Budget (ZAR)"
            value={dailyBudgetInput}
            onChange={(e) => setDailyBudgetInput(e.target.value)}
            helperText="Maximum cumulative spend allowed per 24h rolling cycle."
          />

          <GlassInput
            label="Minimum Treasury Safety Reserve (ZAR)"
            value={minReserveInput}
            onChange={(e) => setMinReserveInput(e.target.value)}
            helperText="Agents will never deplete wallet balance below this emergency floor."
          />

          <div className="md:col-span-2 flex justify-end">
            <GlassButton variant="primary" size="md" icon={<Save size={15} />} type="submit">
              Save Global Limits
            </GlassButton>
          </div>
        </form>
      </GlassCard>

      {/* Category-Level Spending Rules */}
      <GlassCard className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Category Rules & Caps ({mandate.rules.length})
            </h3>
            <p className="text-xs text-slate-500">
              Granular policies governing each product replenishment vertical.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {mandate.rules.map((rule) => (
            <div
              key={rule.id}
              className="p-4 rounded-xl bg-slate-50/80 border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 text-sm">{rule.category}</span>
                  {rule.enabled ? (
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold border border-emerald-200">
                      Active
                    </span>
                  ) : (
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-500 font-semibold border border-slate-200">
                      Disabled
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                  <span>Single Tx Cap: <strong className="text-slate-800">{formatZAR(rule.maxSingleTxZAR)}</strong></span>
                  <span>•</span>
                  <span>Daily Cap: <strong className="text-slate-800">{formatZAR(rule.dailyCapZAR)}</strong></span>
                  <span>•</span>
                  <span>Vetted Whitelist: <strong className="text-emerald-700">{rule.allowedSellers.length} suppliers</strong></span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Toggle
                  checked={rule.enabled}
                  onChange={(val) => {
                    updateRule(rule.id, { enabled: val });
                    toast.info(
                      val ? "Rule Enabled" : "Rule Disabled",
                      `${rule.category} policy updated.`
                    );
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}
