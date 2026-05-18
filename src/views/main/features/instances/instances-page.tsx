import { AlertTriangleIcon, PlusIcon } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from "@/views/main/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/views/main/components/ui/alert-dialog";
import { Button } from "@/views/main/components/ui/button";
import { useDownloadQueueStore } from "@/views/main/features/downloads/download-queue-store";
import { FeaturedInstancePanel } from "@/views/main/features/instances/components/featured-instance-panel";
import { InstanceCollection } from "@/views/main/features/instances/components/instance-collection";
import { LaunchPlanSheet } from "@/views/main/features/instances/components/launch-plan-sheet";
import { NewInstanceDialog } from "@/views/main/features/instances/components/new-instance-dialog";
import { usePlayInstance } from "@/views/main/features/instances/hooks/use-play-instance";
import { useInstances } from "@/views/main/hooks/use-instances";

export function InstancesPage() {
  const instancesHook = useInstances();
  const play = usePlayInstance({ onInstancesChanged: instancesHook.refresh });
  const downloadJobs = useDownloadQueueStore((state) => state.jobs);
  const [dialogOpen, setDialogOpen] = useState(false);

  const onPlayInstance = useCallback(
    (instanceId: string) => {
      play.playInstance(instanceId);
    },
    [play.playInstance],
  );

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
        onPlayInstance={onPlayInstance}
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
        launchLoadingId={play.activeInstanceId}
        loading={loading}
        onInstallCompleted={instancesHook.refresh}
        onPlayInstance={onPlayInstance}
      />

      <NewInstanceDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onCreated={() => instancesHook.refresh()}
      />
      <LaunchPlanSheet
        open={play.launchPlan.sheetOpen}
        onOpenChange={play.launchPlan.setSheetOpen}
        plan={play.launchPlan.activePlan}
      />
      <AlertDialog
        open={play.missingArtifactsDialogOpen}
        onOpenChange={play.closeMissingArtifactsDialog}
      >
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Download missing files?</AlertDialogTitle>
            <AlertDialogDescription>
              {play.pendingMissingPlan
                ? `${play.pendingMissingPlan.missingArtifacts.length} required file${
                    play.pendingMissingPlan.missingArtifacts.length === 1
                      ? ""
                      : "s"
                  } missing. Download now and start Minecraft?`
                : "Required files are missing. Download now and start Minecraft?"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No</AlertDialogCancel>
            <AlertDialogAction onClick={play.downloadMissingArtifactsAndLaunch}>
              Yes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
