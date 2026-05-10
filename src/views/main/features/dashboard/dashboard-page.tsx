import { useMemo, useState } from "react";
import { DashboardHero } from "@/views/main/features/dashboard/components/dashboard-hero";
import { DashboardInstanceGrid } from "@/views/main/features/dashboard/components/dashboard-instance-grid";
import { StatusStrip } from "@/views/main/features/dashboard/components/status-strip";
import { LaunchPlanSheet } from "@/views/main/features/instances/components/launch-plan-sheet";
import { NewInstanceDialog } from "@/views/main/features/instances/components/new-instance-dialog";
import { useLaunchPlan } from "@/views/main/features/instances/hooks/use-launch-plan";
import { useInstances } from "@/views/main/hooks/use-instances";
import { useLauncherStatus } from "@/views/main/hooks/use-launcher-status";

export function DashboardPage() {
  const instancesHook = useInstances();
  const launchPlan = useLaunchPlan();
  const statusHook = useLauncherStatus();
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
  const playInstance = (instanceId: string) => {
    void launchPlan.createLaunchPlan(instanceId);
  };
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

      <StatusStrip status={statusHook.data} loading={statusHook.loading} />

      <DashboardInstanceGrid
        featuredInstanceId={heroInstance?.id ?? null}
        instanceCount={statusHook.data?.counts.instances ?? instances.length}
        instances={instances}
        launchLoadingId={launchPlan.loadingInstanceId}
        loading={initialInstancesLoading}
        onCreateInstance={openNewInstanceDialog}
        onPlayInstance={playInstance}
      />

      <div className="h-2" />

      <NewInstanceDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onCreated={() => instancesHook.refresh()}
      />
      <LaunchPlanSheet
        open={launchPlan.sheetOpen}
        onOpenChange={launchPlan.setSheetOpen}
        plan={launchPlan.activePlan}
      />
    </div>
  );
}
