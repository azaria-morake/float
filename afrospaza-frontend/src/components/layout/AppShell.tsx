"use client";

import React from "react";
import { Navbar } from "./Navbar";
import { Sidebar } from "./Sidebar";
import { useUIStore } from "@/stores/uiStore";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { toasts, removeToast } = useUIStore();

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex">
      {/* Left Sidebar */}
      <Sidebar />

      {/* Main Column */}
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar />

        <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-7xl w-full mx-auto overflow-y-auto">
          {children}
        </main>
      </div>

      {/* Toast Notification Container */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm pointer-events-none">
        {toasts.map((toast) => {
          const icons = {
            success: <CheckCircle2 size={16} className="text-emerald-600" />,
            error: <AlertCircle size={16} className="text-red-600" />,
            warning: <AlertCircle size={16} className="text-amber-600" />,
            info: <Info size={16} className="text-blue-600" />,
          }[toast.type];

          return (
            <div
              key={toast.id}
              className="pointer-events-auto flex items-start gap-3 p-3.5 bg-white border border-slate-200 rounded-2xl shadow-xl text-xs text-slate-800 animate-fadeIn"
            >
              <span className="shrink-0 mt-0.5">{icons}</span>
              <div className="flex-1">
                <p className="font-bold text-slate-900">{toast.title}</p>
                {toast.description && (
                  <p className="text-slate-500 mt-0.5">{toast.description}</p>
                )}
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="text-slate-400 hover:text-slate-600 shrink-0"
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
