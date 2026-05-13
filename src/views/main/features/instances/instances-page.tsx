import { AlertTriangleIcon, PlusIcon } from "lucide-react";
import { useMemo, useState } from "react";
import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from "@/views/main/components/ui/alert";
import { Button } from "@/views/main/components/ui/button";
import { useDownloadQueueStore } from "@/views/main/features/downloads/download-queue-store";
import { FeaturedInstancePanel } from "@/views/main/features/instances/components/featured-instance-panel";
import { InstanceCollection } from "@/views/main/features/instances/components/instance-collection";
import { LaunchPlanSheet } from "@/views/main/features/instances/components/launch-plan-sheet";
import { NewInstanceDialog } from "@/views/main/features/instances/components/new-instance-dialog";
import { useLaunchPlan } from "@/views/main/features/instances/hooks/use-launch-plan";
import { useInstances } from "@/views/main/hooks/use-instances";

export function InstancesPage() {
  const instancesHook = useInstances();
  const launchPlan = useLaunchPlan();
  const downloadJobs = useDownloadQueueStore((state) => state.jobs);
  const [dialogOpen, setDialogOpen] = useState(false);

  const instances = instancesHook.data ?? [];
  const loading = instancesHook.loading && instancesHook.data === null;

  const featuredInstance = useMemo(() => {
    return (
      [...instances]
        .filter((i) => i.lastLaunchedAt)
        .sort(
          (a, b) =>
            new Date(b.lastLaunchedAt ?? 0).getTime() -
            new Date(a.lastLaunchedAt ?? 0).getTime(),
        )[0] ??
      instances[0] ??
      null
    );
  }, [instances]);

  return (
    <div className="flex min-h-full w-full flex-col gap-5 p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-black leading-none">
            Library
          </h1>
          {!loading && (
            <p className="mt-1 text-sm text-muted-foreground">
              {instances.length === 0
                ? "No instances"
                : `${instances.length} instance${instances.length !== 1 ? "s" : ""}`}
            </p>
          )}
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <PlusIcon data-icon="inline-start" />
          New Instance
        </Button>
      </div>

      {/* Featured */}
      <FeaturedInstancePanel
        instance={featuredInstance}
        loading={loading}
        onCreateInstance={() => setDialogOpen(true)}
        onPlayInstance={(instanceId) => {
          void launchPlan.createLaunchPlan(instanceId);
        }}
      />

      {/* Error */}
      {instancesHook.error && (
        <Alert variant="destructive">
          <AlertTriangleIcon />
          <AlertTitle>Failed to load instances</AlertTitle>
          <AlertDescription>{instancesHook.error}</AlertDescription>
          <AlertAction>
            <Button size="xs" variant="outline" onClick={instancesHook.refresh}>
              Retry
            </Button>
          </AlertAction>
        </Alert>
      )}

      <InstanceCollection
        downloadJobs={downloadJobs}
        gridClassName="grid grid-cols-[repeat(auto-fill,minmax(17rem,1fr))] gap-3"
        hideWhenEmpty
        instances={instances}
        launchLoadingId={launchPlan.loadingInstanceId}
        loading={loading}
        onInstallCompleted={instancesHook.refresh}
        onPlayInstance={(instanceId) => {
          void launchPlan.createLaunchPlan(instanceId);
        }}
      />

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
