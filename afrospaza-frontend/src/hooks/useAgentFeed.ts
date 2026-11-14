import { useEffect } from "react";
import { useAgentStore } from "@/stores/agentStore";
import { api, BackendAgentLog } from "@/lib/api";
import { AgentLog } from "@/types/agent";

export function useAgentFeed(autoSimulate = true) {
  const { agents, logs, addLog, updateAgentStatus, clearLogs } = useAgentStore();

  useEffect(() => {
    // Initial fetch of real backend logs
    const fetchBackendLogs = async () => {
      try {
        const backendLogs = await api.getAgentLogs(20);
        if (backendLogs && backendLogs.length > 0) {
          backendLogs.forEach((blog) => {
            const rawName = (blog.agent_type || blog.agent_name || "GUARD").toUpperCase();
            const agentType = rawName.includes("PROCUREMENT")
              ? ("PROCUREMENT" as const)
              : rawName.includes("TREASURY")
              ? ("TREASURY" as const)
              : rawName.includes("LOGISTICS")
              ? ("LOGISTICS" as const)
              : ("GUARD" as const);

            addLog({
              agentType,
              level: (blog.level as "INFO" | "SUCCESS" | "WARN" | "ERROR" | "SECURITY") || "INFO",
              message: blog.message,
              metadata: blog.metadata_json || undefined,
            });
          });
        }
      } catch {
        // Use initial logs
      }
    };

    fetchBackendLogs();

    if (!autoSimulate) return;

    // Periodic heartbeat sync
    const interval = setInterval(async () => {
      try {
        const backendLogs = await api.getAgentLogs(5);
        if (backendLogs && backendLogs.length > 0) {
          const latest = backendLogs[0];
          const rawName = (latest.agent_type || latest.agent_name || "GUARD").toUpperCase();
          const agentType = rawName.includes("PROCUREMENT")
            ? ("PROCUREMENT" as const)
            : rawName.includes("TREASURY")
            ? ("TREASURY" as const)
            : rawName.includes("LOGISTICS")
            ? ("LOGISTICS" as const)
            : ("GUARD" as const);

          addLog({
            agentType,
            level: (latest.level as "INFO" | "SUCCESS" | "WARN" | "ERROR" | "SECURITY") || "INFO",
            message: latest.message,
            metadata: latest.metadata_json || undefined,
          });
        }
      } catch {
        // Fallback simulation
      }
    }, 15000);

    return () => clearInterval(interval);
  }, [autoSimulate, addLog]);

  return {
    agents,
    logs,
    addLog,
    updateAgentStatus,
    clearLogs,
  };
}
