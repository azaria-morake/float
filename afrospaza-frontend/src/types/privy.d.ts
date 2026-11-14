declare module "@privy-io/react-auth" {
  import React from "react";

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

  export interface PrivyConfig {
    loginMethods?: string[];
    appearance?: {
      theme?: "dark" | "light";
      accentColor?: string;
      logo?: string;
    };
    embeddedWallets?: {
      createOnLogin?: "users-without-wallets" | "all-users" | "off";
    };
  }

  export interface PrivyProviderProps {
    appId: string;
    config?: PrivyConfig;
    children: React.ReactNode;
  }

  export const PrivyProvider: React.FC<PrivyProviderProps>;

  export interface PrivyState {
    ready: boolean;
    authenticated: boolean;
    user: PrivyUser | null;
    login: (options?: any) => void;
    logout: () => Promise<void>;
    connectWallet: () => void;
  }

  export function usePrivy(): PrivyState;
  export function useWallets(): { wallets: any[] };
}

