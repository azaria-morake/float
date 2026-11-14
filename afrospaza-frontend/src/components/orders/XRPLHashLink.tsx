import React from "react";
import { truncateHash } from "@/lib/format";
import { getTxExplorerUrl } from "@/lib/xrpl/explorer";
import { ExternalLink } from "lucide-react";

interface XRPLHashLinkProps {
  hash?: string;
  network?: "mainnet" | "testnet" | "devnet";
  className?: string;
}

export function XRPLHashLink({
  hash,
  network = "testnet",
  className = "",
}: XRPLHashLinkProps) {
  if (!hash) {
    return <span className="text-zinc-600 text-xs font-mono">—</span>;
  }

  const url = getTxExplorerUrl(hash, network);

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-1.5 font-mono text-xs text-blue-600 hover:text-blue-800 transition-colors underline decoration-blue-400/50 underline-offset-2 ${className}`}
    >
      <span>{truncateHash(hash, 6, 6)}</span>
      <ExternalLink size={12} className="shrink-0 opacity-70" />
    </a>
  );
}
