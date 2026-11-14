"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Search, MapPin, Bell, ChevronDown, Menu, ShieldAlert, Sparkles, User } from "lucide-react";
import { useUIStore } from "@/stores/uiStore";
import { useMandateStore } from "@/stores/mandateStore";
import { WalletConnectButton } from "@/components/wallet/WalletConnectButton";
import { usePrivy } from "@/providers/PrivyAuthProvider";

export function Navbar() {
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const killSwitchActive = useMandateStore((s) => s.mandate.killSwitchActive);
  const [searchQuery, setSearchQuery] = useState("");
  const { user } = usePrivy();

  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 md:px-6">
      {killSwitchActive && (
        <div className="bg-red-50 border-b border-red-200 -mx-4 md:-mx-6 px-4 py-1.5 flex items-center justify-center gap-2 text-xs font-semibold text-red-700">
          <ShieldAlert size={14} className="text-red-600 animate-pulse" />
          <span>EMERGENCY KILL SWITCH ACTIVE — All autonomous agent spend paused.</span>
        </div>
      )}

      <div className="flex items-center justify-between h-16 gap-4">
        {/* Mobile menu trigger */}
        <button
          onClick={toggleSidebar}
          className="md:hidden p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100"
          aria-label="Toggle menu"
        >
          <Menu size={20} />
        </button>

        {/* Center/Left Search Bar */}
        <div className="flex-1 max-w-2xl">
          <div className="relative">
            <Search
              size={18}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for products or spazas..."
              className="w-full pl-10 pr-4 py-2 rounded-full bg-slate-100/90 hover:bg-slate-100 focus:bg-white border border-slate-200/80 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/10 text-xs text-slate-800 placeholder-slate-400 focus:outline-none transition-all shadow-inner"
            />
          </div>
        </div>

        {/* Right Action Icons & Profile */}
        <div className="flex items-center gap-3">
          {/* Location Picker */}
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-50 hover:bg-slate-100 border border-slate-200/80 text-xs font-medium text-slate-700 cursor-pointer transition-colors">
            <MapPin size={14} className="text-slate-500 shrink-0" />
            <span>Johannesburg, ZA</span>
            <ChevronDown size={13} className="text-slate-400" />
          </div>

          {/* Notifications Bell */}
          <Link
            href="/orders"
            className="relative p-2 rounded-full hover:bg-slate-100 text-slate-600 transition-colors"
            title="Notifications"
          >
            <Bell size={19} />
            <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white rounded-full text-[9px] font-bold flex items-center justify-center">
              3
            </span>
          </Link>

          {/* Privy XRPL Wallet Connect Button */}
          <div className="hidden md:block">
            <WalletConnectButton />
          </div>

          {/* User Profile Avatar */}
          <Link
            href="/settings"
            className="flex items-center gap-2 pl-1 group cursor-pointer"
            title="Thandi Mokoena (Zuri Eats & Spaza)"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-500 to-emerald-600 flex items-center justify-center text-white font-bold text-xs ring-2 ring-emerald-500/20 group-hover:ring-emerald-500/50 transition-all">
              TM
            </div>
          </Link>
        </div>
      </div>
    </header>
  );
}
