import type { Metadata } from "next";
import "./globals.css";
import { siteConfig } from "@/config/site";
import { PrivyAuthProvider } from "@/providers/PrivyAuthProvider";

export const metadata: Metadata = {
  title: "AfroSpaza — Buy Local. Live Better. (Autonomous XRPL Trade)",
  description: "African cross-border trade marketplace for informal spaza merchants powered by XRPL and autonomous AI agents.",
  icons: {
    icon: "/icons/spaza.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-slate-50 text-slate-900 antialiased">
        <PrivyAuthProvider>{children}</PrivyAuthProvider>
      </body>
    </html>
  );
}
