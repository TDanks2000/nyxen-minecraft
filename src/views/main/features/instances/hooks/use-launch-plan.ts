import { useCallback, useState } from "react";
import { toast } from "sonner";
import type { LaunchPlan } from "@/shared/types";
import { rpc } from "@/views/main/lib/rpc";

type CreateLaunchPlanOptions = {
  openSheet?: boolean;
};

export function useLaunchPlan() {
  const [activePlan, setActivePlan] = useState<LaunchPlan | null>(null);
  const [loadingInstanceId, setLoadingInstanceId] = useState<string | null>(
    null,
  );
  const [sheetOpen, setSheetOpen] = useState(false);

  const createLaunchPlan = useCallback(
    async (instanceId: string, options: CreateLaunchPlanOptions = {}) => {
      setLoadingInstanceId(instanceId);

      try {
        const plan = await rpc.requestProxy.createLaunchPlan({ instanceId });
        setActivePlan(plan);
        setSheetOpen(options.openSheet ?? true);
        return plan;
      } catch (e) {
        toast.error(
          e instanceof Error ? e.message : "Failed to create launch plan",
        );
        return null;
      } finally {
        setLoadingInstanceId(null);
      }
    },
    [],
  );

  const resetLaunchPlan = useCallback(() => {
    setActivePlan(null);
    setSheetOpen(false);
    setLoadingInstanceId(null);
  }, []);

  return {
    activePlan,
    createLaunchPlan,
    loadingInstanceId,
    resetLaunchPlan,
    setSheetOpen,
    sheetOpen,
  };
}
