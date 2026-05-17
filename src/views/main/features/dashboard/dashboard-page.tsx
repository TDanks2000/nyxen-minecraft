import { useCallback, useMemo, useState } from "react";
import { DashboardHero } from "@/views/main/features/dashboard/components/dashboard-hero";
import { DashboardInstanceGrid } from "@/views/main/features/dashboard/components/dashboard-instance-grid";
import { useDownloadQueueStore } from "@/views/main/features/downloads/download-queue-store";
import { LaunchPlanSheet } from "@/views/main/features/instances/components/launch-plan-sheet";
import { NewInstanceDialog } from "@/views/main/features/instances/components/new-instance-dialog";
import { useLaunchPlan } from "@/views/main/features/instances/hooks/use-launch-plan";
import { useInstances } from "@/views/main/hooks/use-instances";

export function DashboardPage() {
  const instancesHook = useInstances();
  const launchPlan = useLaunchPlan();
  const downloadJobs = useDownloadQueueStore((state) => state.jobs);
  const [dialogOpen, setDialogOpen] = useState(false);

  const instances = instancesHook.data ?? [];
  const heroInstance = useMemo(() => {
    return (
      [...instances].sort((a, b) => {
        if (!a.lastLaunchedAt && !b.lastLaunchedAt) return 0;
        if (!a.lastLaunchedAt) return 1;
        if (!b.lastLaunchedAt) return -1;

        return (
          new Date(b.lastLaunchedAt).getTime() -
          new Date(a.lastLaunchedAt).getTime()
        );
      })[0] ?? null
    );
  }, [instances]);

  const openNewInstanceDialog = () => setDialogOpen(true);
  const playInstance = useCallback(
    (instanceId: string) => {
      void launchPlan.createLaunchPlan(instanceId);
    },
    [launchPlan.createLaunchPlan],
  );
  const refreshDashboardData = useCallback(() => {
    instancesHook.refresh();
  }, [instancesHook.refresh]);
  const initialInstancesLoading =
    instancesHook.loading && instancesHook.data === null;

  return (
    <div className="flex flex-col">
      <DashboardHero
        instance={heroInstance}
        launchDisabled={launchPlan.loadingInstanceId !== null}
        loading={initialInstancesLoading}
        onCreateInstance={openNewInstanceDialog}
        onPlayInstance={playInstance}
      />

      <DashboardInstanceGrid
        downloadJobs={downloadJobs}
        featuredInstanceId={heroInstance?.id ?? null}
        instanceCount={instances.length}
        instances={instances}
        launchLoadingId={launchPlan.loadingInstanceId}
        loading={initialInstancesLoading}
        onCreateInstance={openNewInstanceDialog}
        onInstallCompleted={refreshDashboardData}
        onPlayInstance={playInstance}
      />

      <div className="h-2" />

      <NewInstanceDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onCreated={refreshDashboardData}
      />
      <LaunchPlanSheet
        open={launchPlan.sheetOpen}
        onOpenChange={launchPlan.setSheetOpen}
        plan={launchPlan.activePlan}
      />
    </div>
  );
}
