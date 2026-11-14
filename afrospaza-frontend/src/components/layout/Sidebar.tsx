"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Store,
  LayoutGrid,
  Tag,
  Award,
  ShoppingBag,
  Wallet,
  User,
  Sliders,
  ShieldAlert,
  HelpCircle,
  Globe,
  ChevronDown,
  ArrowRight,
  QrCode,
  Smartphone,
  X,
} from "lucide-react";
import { useUIStore } from "@/stores/uiStore";
import { usePrivy } from "@/providers/PrivyAuthProvider";

const navItems = [
  { label: "Home", href: "/dashboard", icon: Home },
  { label: "Nearby Spazas", href: "/sellers", icon: Store },
  { label: "Categories", href: "/dashboard#categories", icon: LayoutGrid },
  { label: "Deals", href: "/dashboard#deals", icon: Tag },
  { label: "Loyalty Rewards", href: "/dashboard#rewards", icon: Award },
  { label: "My Orders", href: "/orders", icon: ShoppingBag },
  { label: "Wallet (XRPL)", href: "#wallet", icon: Wallet, isWallet: true },
  { label: "Profile", href: "/settings#profile", icon: User },
  { label: "Mandate Rules", href: "/settings", icon: Sliders },
  { label: "Adversarial Demo", href: "/demo", icon: ShieldAlert, badge: "Guard" },
  { label: "Help & Support", href: "#support", icon: HelpCircle },
];

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarOpen, setSidebarOpen } = useUIStore();
  const { login } = usePrivy();

  return (
    <>
      {/* Mobile Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar Panel */}
      <aside
        className={`fixed md:sticky top-0 left-0 z-50 md:z-30 h-screen w-64 bg-white border-r border-slate-200/90 px-4 py-5 flex flex-col justify-between transition-transform duration-200 shadow-sm ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <div className="overflow-y-auto no-scrollbar space-y-6">
          {/* Brand Logo & Tagline */}
          <div className="flex items-center justify-between pb-2">
            <Link href="/dashboard" className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-black text-lg shadow-sm">
                <svg className="w-6 h-6 fill-white" viewBox="0 0 24 24">
                  <path d="M12 2C8.5 2 4.5 4 4 8c-.4 3.2 1.5 5.5 2 8 1 5 3.5 6 6 6s5-1 6-6c.5-2.5 2.4-4.8 2-8-.5-4-4.5-6-8-6zm-1 12H9v-2h2v2zm0-4H9V6h2v4zm4 4h-2v-2h2v2zm0-4h-2V6h2v4z"/>
                </svg>
              </div>
              <div className="flex flex-col">
                <span className="font-black text-lg text-slate-900 leading-none">
                  Afro<span className="text-emerald-700">Spaza</span>
                </span>
                <span className="text-[10px] text-slate-500 font-medium tracking-tight mt-0.5">
                  Buy Local. Live Better.
                </span>
              </div>
            </Link>

            <button
              onClick={() => setSidebarOpen(false)}
              className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
            >
              <X size={18} />
            </button>
          </div>

          {/* Navigation Items List */}
          <nav className="space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;

              if (item.isWallet) {
                return (
                  <button
                    key={item.label}
                    onClick={() => login()}
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Icon size={18} className="text-slate-400" />
                      <span>{item.label}</span>
                    </div>
                    <span className="text-[10px] font-mono text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded font-bold">
                      XRPL
                    </span>
                  </button>
                );
              }

              return (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? "bg-[#1b7a43] text-white shadow-sm shadow-emerald-700/20"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon size={18} className={isActive ? "text-white" : "text-slate-400"} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                        isActive
                          ? "bg-white/20 text-white"
                          : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom Promos & Language */}
        <div className="pt-4 border-t border-slate-100 space-y-3">
          {/* Green Phone Promo Card */}
          <div className="p-3.5 rounded-2xl bg-emerald-50/80 border border-emerald-100 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0 shadow-sm">
              <QrCode size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-xs text-slate-900 leading-tight">Pay Fast Anytime</p>
              <p className="text-[10px] text-slate-500">Anywhere in SA</p>
              <Link
                href="/demo"
                className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 hover:text-emerald-800 mt-1"
              >
                <span>Learn More</span>
                <ArrowRight size={10} />
              </Link>
            </div>
          </div>

          {/* Language Selector */}
          <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-600 cursor-pointer hover:bg-slate-100 transition-colors">
            <div className="flex items-center gap-2">
              <Globe size={14} className="text-slate-400" />
              <span className="font-medium text-xs">English</span>
            </div>
            <ChevronDown size={14} className="text-slate-400" />
          </div>
        </div>
      </aside>
    </>
  );
}
