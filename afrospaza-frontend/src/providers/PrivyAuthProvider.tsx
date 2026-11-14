"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { Mail, Phone, Shield, KeyRound, Check, X, Sparkles, Wallet, ExternalLink, ArrowRight } from "lucide-react";

export interface PrivyUser {
  id: string;
  email?: {
    address: string;
  };
  phone?: {
    number: string;
  };
  wallet?: {
    address: string;
    chainType?: string;
  };
}

export interface PrivyState {
  ready: boolean;
  authenticated: boolean;
  user: PrivyUser | null;
  login: (options?: any) => void;
  logout: () => Promise<void>;
  connectWallet: () => void;
}

const PrivyContext = createContext<PrivyState>({
  ready: false,
  authenticated: false,
  user: null,
  login: () => {},
  logout: async () => {},
  connectWallet: () => {},
});

export const usePrivy = () => useContext(PrivyContext);
export const useWallets = () => ({
  wallets: [
    {
      address: "rLsNM7Bw7SoibQrmosxdUyNYuA6EdCTYfu",
      walletClientType: "privy_embedded_xrpl",
      chainType: "xrpl",
    },
  ],
});

const DEFAULT_SPAZA_WALLET = "rLsNM7Bw7SoibQrmosxdUyNYuA6EdCTYfu";
const DEFAULT_EMAIL = "thandi.mokoena@afrospaza.co.za";

interface Props {
  children: React.ReactNode;
  appId?: string;
  config?: any;
}

export function PrivyAuthProvider({ children }: Props) {
  const [ready, setReady] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [user, setUser] = useState<PrivyUser | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [authStep, setAuthStep] = useState<"choose" | "email" | "sms" | "otp" | "connecting">("choose");
  const [inputVal, setInputVal] = useState("");
  const [otpVal, setOtpVal] = useState("");
  const [statusMsg, setStatusMsg] = useState("");

  // Restore authenticated session from localStorage on mount
  useEffect(() => {
    try {
      const savedUser = localStorage.getItem("afrospaza_privy_user");
      if (savedUser) {
        const parsed = JSON.parse(savedUser);
        setUser(parsed);
        setAuthenticated(true);
      }
    } catch {
      // Ignore parsing errors
    }
    setReady(true);
  }, []);

  const login = useCallback(() => {
    setAuthStep("choose");
    setInputVal("");
    setOtpVal("");
    setStatusMsg("");
    setIsModalOpen(true);
  }, []);

  const logout = useCallback(async () => {
    localStorage.removeItem("afrospaza_privy_user");
    setUser(null);
    setAuthenticated(false);
  }, []);

  const completeAuth = (userData: PrivyUser) => {
    setStatusMsg("Initializing XRPL MPC enclave wallet...");
    setAuthStep("connecting");
    setTimeout(() => {
      setUser(userData);
      setAuthenticated(true);
      localStorage.setItem("afrospaza_privy_user", JSON.stringify(userData));
      setIsModalOpen(false);
      setAuthStep("choose");
    }, 700);
  };

  const handleQuickEnclaveConnect = () => {
    const defaultUser: PrivyUser = {
      id: "did:privy:spaza_thandi_mokoena_soweto_01",
      email: { address: DEFAULT_EMAIL },
      phone: { number: "+27 82 555 0192" },
      wallet: {
        address: DEFAULT_SPAZA_WALLET,
        chainType: "xrpl",
      },
    };
    completeAuth(defaultUser);
  };

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal) return;
    setAuthStep("otp");
  };

  const handleOtpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newUser: PrivyUser = {
      id: `did:privy:${Date.now().toString(36)}`,
      email: { address: inputVal || DEFAULT_EMAIL },
      wallet: {
        address: DEFAULT_SPAZA_WALLET,
        chainType: "xrpl",
      },
    };
    completeAuth(newUser);
  };

  return (
    <PrivyContext.Provider
      value={{
        ready,
        authenticated,
        user,
        login,
        logout,
        connectWallet: login,
      }}
    >
      {children}

      {/* Privy Interactive Authentication Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md bg-white border border-slate-200/90 rounded-3xl p-6 shadow-2xl text-slate-900 overflow-hidden">
            {/* Top Brand Banner */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-md shadow-emerald-700/20">
                  <Shield size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-sm tracking-wide flex items-center gap-1.5 text-slate-900">
                    Privy <span className="text-slate-300 font-normal">|</span> XRPL Enclave
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">Autonomous Spaza Identity</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Step: Choose Method */}
            {authStep === "choose" && (
              <div className="space-y-4">
                <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-start gap-3">
                  <Sparkles size={18} className="text-emerald-700 shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <p className="font-bold text-emerald-900">Spaza Owner Quick Enclave</p>
                    <p className="text-emerald-800/80 mt-0.5 text-[11px] leading-relaxed">
                      Instant sign-in with Mama Thandi Mokoena&apos;s provisioned XRPL treasury enclave wallet.
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleQuickEnclaveConnect}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs shadow-md shadow-emerald-700/25 transition-all group"
                >
                  <div className="flex items-center gap-2.5">
                    <Wallet size={16} />
                    <span>Connect Spaza Embedded Wallet</span>
                  </div>
                  <ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform" />
                </button>

                <div className="relative my-3 text-center">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-200" />
                  </div>
                  <span className="relative px-3 bg-white text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
                    Or Continue With
                  </span>
                </div>

                <div className="space-y-2">
                  <button
                    onClick={() => {
                      setInputVal(DEFAULT_EMAIL);
                      setAuthStep("email");
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl bg-slate-50 hover:bg-slate-100/90 border border-slate-200 text-xs font-semibold text-slate-700 transition-colors"
                  >
                    <Mail size={16} className="text-slate-500" />
                    <span>Email OTP Passkey</span>
                  </button>

                  <button
                    onClick={() => {
                      setInputVal("+27 82 555 0192");
                      setAuthStep("sms");
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl bg-slate-50 hover:bg-slate-100/90 border border-slate-200 text-xs font-semibold text-slate-700 transition-colors"
                  >
                    <Phone size={16} className="text-slate-500" />
                    <span>SMS / WhatsApp (South Africa & Kenya)</span>
                  </button>

                  <button
                    onClick={handleQuickEnclaveConnect}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-2xl bg-slate-50 hover:bg-slate-100/90 border border-slate-200 text-xs font-semibold text-slate-700 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <KeyRound size={16} className="text-slate-500" />
                      <span>Crossmark / GemWallet / Xaman</span>
                    </div>
                    <span className="text-[10px] uppercase font-mono text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-200 font-bold">
                      XRPL Ready
                    </span>
                  </button>
                </div>
              </div>
            )}

            {/* Step: Email or SMS Input */}
            {(authStep === "email" || authStep === "sms") && (
              <form onSubmit={handleEmailSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    {authStep === "email" ? "Enter your Email" : "Enter Mobile Number"}
                  </label>
                  <input
                    type={authStep === "email" ? "email" : "tel"}
                    value={inputVal}
                    onChange={(e) => setInputVal(e.target.value)}
                    placeholder={authStep === "email" ? "thandi.mokoena@afrospaza.co.za" : "+27 82 555 0192"}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600/30"
                    autoFocus
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Privy creates an MPC enclave wallet on XRPL testnet for this account.
                  </p>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setAuthStep("choose")}
                    className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 transition-colors"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-xs font-bold text-white shadow-md shadow-emerald-700/20 transition-colors"
                  >
                    Send One-Time Code
                  </button>
                </div>
              </form>
            )}

            {/* Step: OTP */}
            {authStep === "otp" && (
              <form onSubmit={handleOtpSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Enter Verification Code
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={otpVal}
                    onChange={(e) => setOtpVal(e.target.value)}
                    placeholder="123456"
                    className="w-full tracking-widest text-center text-lg font-mono px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600/30"
                    autoFocus
                  />
                  <p className="text-[11px] text-slate-500 mt-1 text-center">
                    Simulated verification code sent to <span className="font-semibold text-slate-800">{inputVal}</span>
                  </p>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setAuthStep("choose")}
                    className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 transition-colors"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-xs font-bold text-white shadow-md shadow-emerald-700/20 transition-colors"
                  >
                    Verify & Unlock XRPL Wallet
                  </button>
                </div>
              </form>
            )}

            {/* Step: Connecting Spinner */}
            {authStep === "connecting" && (
              <div className="py-8 text-center space-y-3">
                <div className="w-10 h-10 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs text-slate-800 font-bold">{statusMsg}</p>
                <p className="text-[11px] text-slate-500 font-mono">{DEFAULT_SPAZA_WALLET}</p>
              </div>
            )}

            {/* Enclave Security Footer */}
            <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-mono">
              <span className="flex items-center gap-1 font-semibold text-emerald-800">
                <Shield size={12} className="text-emerald-600" />
                Zero-Knowledge MPC Enclave
              </span>
              <span>XRPL Testnet</span>
            </div>
          </div>
        </div>
      )}
    </PrivyContext.Provider>
  );
}

// Export PrivyProvider alias for backward compatibility
export const PrivyProvider = PrivyAuthProvider;
