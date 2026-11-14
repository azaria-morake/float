import { useEffect } from "react";
import { useMandateStore } from "@/stores/mandateStore";

export function useMandate() {
  const {
    mandate,
    fetchMandate,
    updateDailyBudget,
    toggleKillSwitch,
    updateRule,
    addRule,
    recordSpend,
  } = useMandateStore();

  useEffect(() => {
    fetchMandate();
  }, [fetchMandate]);

  const remainingDailyZAR = mandate.totalDailyBudgetZAR - mandate.usedTodayZAR;
  const percentUsed = Math.min(
    100,
    Math.round((mandate.usedTodayZAR / mandate.totalDailyBudgetZAR) * 100)
  );

  return {
    mandate,
    fetchMandate,
    remainingDailyZAR,
    percentUsed,
    updateDailyBudget,
    toggleKillSwitch,
    updateRule,
    addRule,
    recordSpend,
  };
}
