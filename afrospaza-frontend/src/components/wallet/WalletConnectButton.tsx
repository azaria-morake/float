"use client";

import React, { useState, useEffect } from "react";
import { usePrivy } from "@/providers/PrivyAuthProvider";
import { useXRPLWallet } from "@/hooks/useXRPLWallet";
import { truncateHash, formatRLUSD, formatXRP } from "@/lib/format";
import { Wallet, LogOut, ChevronDown, RefreshCw, CheckCircle2, Shield } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { GlassButton } from "@/components/ui/GlassButton";

export function WalletConnectButton() {
  const { ready, authenticated, user, login, logout } = usePrivy();
  const {
    isConnected,
    address,
    rlusdBalance,
    xrpBalance,
    connect,
    disconnect,
    refreshBalances,
  } = useXRPLWallet();

  const [modalOpen, setModalOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Sync Privy authentication with XRPL wallet store
  useEffect(() => {
    if (authenticated && user) {
      const email = user.email?.address;
      connect(undefined, { userId: user.id, email });
    }
  }, [authenticated, user, connect]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshBalances();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleDisconnect = async () => {
    try {
      if (authenticated) {
        await logout();
      }
    } catch {
      // Continue disconnect even if Privy logout fails
    }
    disconnect();
    setModalOpen(false);
  };

  const handleConnect = () => {
    if (ready && !authenticated) {
      try {
        login();
      } catch {
        // Fallback to local connect if popup fails
        connect();
      }
    } else {
      connect();
    }
  };

  if (!isConnected && (!authenticated || !ready)) {
    return (
      <button
        onClick={handleConnect}
        className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs transition-all shadow-sm"
      >
        <Wallet size={14} />
        <span>Connect XRPL</span>
      </button>
    );
  }

  return (
    <>
      <button
        onClick={() => setModalOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200/80 border border-slate-200 text-xs font-medium text-slate-800 transition-all cursor-pointer"
      >
        <div className="w-2 h-2 rounded-full bg-emerald-500" />
        <span className="font-mono text-slate-700 font-semibold">
          {truncateHash(address || "rLsNM7Bw7SoibQrmosxdUyNYuA6EdCTYfu", 4, 4)}
        </span>
        <span className="text-emerald-700 font-bold hidden sm:inline">
          {formatRLUSD(rlusdBalance)}
        </span>
        <ChevronDown size={13} className="text-slate-400" />
      </button>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="XRPL Spaza Treasury Wallet"
        description="Privy-Secured Enclave & Ripple On-Chain Smart Settlement"
      >
        <div className="space-y-5">
          <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200 space-y-3">
            {authenticated && user && (
              <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-200/80">
                <span className="text-slate-500 flex items-center gap-1.5 font-medium">
                  <Shield size={13} className="text-emerald-600" />
                  Privy Identity
                </span>
                <span className="font-mono text-emerald-800 text-[11px] font-semibold">
                  {user.email?.address || truncateHash(user.id, 6, 4)}
                </span>
              </div>
            )}

            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">XRPL Account Address</span>
              <span className="font-mono text-slate-800 text-[11px] font-semibold">
                {address || "rLsNM7Bw7SoibQrmosxdUyNYuA6EdCTYfu"}
              </span>
            </div>

            <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-500 block">RLUSD Stablecoin</span>
                <span className="text-lg font-black text-slate-900">
                  {formatRLUSD(rlusdBalance)}
                </span>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-500 block">Native XRP Gas</span>
                <span className="text-lg font-black text-blue-600">
                  {formatXRP(xrpBalance)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2 text-[11px] text-emerald-700 font-semibold">
              <CheckCircle2 size={13} />
              <span>Trustline Active: Ripple USD (RLUSD) on Testnet</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <GlassButton
              variant="secondary"
              size="md"
              className="flex-1"
              icon={<RefreshCw size={14} className={isRefreshing ? "animate-spin" : ""} />}
              onClick={handleRefresh}
            >
              Refresh Balances
            </GlassButton>
            <GlassButton
              variant="danger"
              size="md"
              className="flex-1"
              icon={<LogOut size={14} />}
              onClick={handleDisconnect}
            >
              Disconnect
            </GlassButton>
          </div>
        </div>
      </Modal>
    </>
  );
}
