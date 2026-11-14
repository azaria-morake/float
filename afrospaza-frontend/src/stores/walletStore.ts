import { create } from "zustand";
import { XRPLWalletState } from "@/types/xrpl";
import { api } from "@/lib/api";

const DEFAULT_TREASURY_ADDRESS = "rLsNM7Bw7SoibQrmosxdUyNYuA6EdCTYfu";

interface WalletStoreState extends XRPLWalletState {
  privyUserId: string | null;
  privyEmail: string | null;
  connect: (address?: string, privyData?: { userId?: string; email?: string }) => void;
  disconnect: () => void;
  setNetwork: (network: "mainnet" | "testnet" | "devnet") => void;
  refreshBalances: () => Promise<void>;
}

export const useWalletStore = create<WalletStoreState>((set, get) => ({
  address: DEFAULT_TREASURY_ADDRESS,
  network: "testnet",
  isConnected: true,
  xrpBalance: 980.5,
  rlusdBalance: 5120.45,
  trustlineActive: true,
  activeChannelsCount: 1,
  privyUserId: null,
  privyEmail: null,

  connect: (
    address = DEFAULT_TREASURY_ADDRESS,
    privyData?: { userId?: string; email?: string }
  ) => {
    set({
      address,
      isConnected: true,
      privyUserId: privyData?.userId || null,
      privyEmail: privyData?.email || null,
    });
    // Trigger async balance refresh from live XRPL testnet
    get().refreshBalances();
  },

  disconnect: () =>
    set({
      address: null,
      isConnected: false,
      xrpBalance: 0,
      rlusdBalance: 0,
      trustlineActive: false,
      activeChannelsCount: 0,
      privyUserId: null,
      privyEmail: null,
    }),

  setNetwork: (network) => set({ network }),

  refreshBalances: async () => {
    const addr = get().address;
    if (!addr) return;
    try {
      const data = await api.getXRPLAccount(addr);
      set({
        xrpBalance: data.xrp_balance,
        rlusdBalance: data.rlusd_balance,
        trustlineActive: data.trustline_active,
        activeChannelsCount: data.active_channels_count,
      });
    } catch {
      // Keep existing balance if backend is booting
    }
  },
}));
