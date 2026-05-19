import { Link } from "@tanstack/react-router";
import { AlertTriangleIcon, ShieldCheckIcon } from "lucide-react";
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
import { DashboardHero } from "@/views/main/features/dashboard/components/dashboard-hero";
import { DashboardInstanceGrid } from "@/views/main/features/dashboard/components/dashboard-instance-grid";
import { useDownloadQueueStore } from "@/views/main/features/downloads/download-queue-store";
import { LaunchPlanSheet } from "@/views/main/features/instances/components/launch-plan-sheet";
import { NewInstanceDialog } from "@/views/main/features/instances/components/new-instance-dialog";
import { usePlayInstance } from "@/views/main/features/instances/hooks/use-play-instance";
import { hasMinecraftOwnership } from "@/views/main/features/profiles/profile-health-model";
import { useInstances } from "@/views/main/hooks/use-instances";
import { useProfiles } from "@/views/main/hooks/use-profiles";

export function DashboardPage() {
  const instancesHook = useInstances();
  const profilesHook = useProfiles();
  const play = usePlayInstance({ onInstancesChanged: instancesHook.refresh });
  const downloadJobs = useDownloadQueueStore((state) => state.jobs);
  const [dialogOpen, setDialogOpen] = useState(false);

  const hasVerifiedProfile = useMemo(
    () => (profilesHook.data ?? []).some(hasMinecraftOwnership),
    [profilesHook.data],
  );
  const showProfileBanner =
    !profilesHook.loading && !profilesHook.error && !hasVerifiedProfile;

  const instances = instancesHook.data ?? [];
  const heroInstance = useMemo(() => {
    return (
      [...instances].sort((a, b) => {
        if (a.lastLaunchedAt && b.lastLaunchedAt) {
          return (
            new Date(b.lastLaunchedAt).getTime() -
            new Date(a.lastLaunchedAt).getTime()
          );
        }
        if (a.lastLaunchedAt) return -1;
        if (b.lastLaunchedAt) return 1;
        return (
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
      })[0] ?? null
    );
  }, [instances]);

  const openNewInstanceDialog = () => setDialogOpen(true);
  const playInstance = useCallback(
    (instanceId: string) => {
      play.playInstance(instanceId);
    },
    [play.playInstance],
  );
  const refreshDashboardData = useCallback(() => {
    instancesHook.refresh();
  }, [instancesHook.refresh]);
  const initialInstancesLoading =
    instancesHook.loading && instancesHook.data === null;

  return (
    <div className="flex flex-col">
      {instancesHook.error && (
        <Alert variant="destructive" className="mx-4 mt-4 sm:mx-6">
          <AlertTriangleIcon />
          <AlertTitle>Failed to load instances</AlertTitle>
          <AlertDescription>{instancesHook.error}</AlertDescription>
          <AlertAction>
            <Button onClick={instancesHook.refresh} size="xs" variant="outline">
              Retry
            </Button>
          </AlertAction>
        </Alert>
      )}
      {showProfileBanner && (
        <Alert className="mx-4 mt-4 sm:mx-6">
          <ShieldCheckIcon />
          <AlertTitle>Sign in to play</AlertTitle>
          <AlertDescription>
            Add a verified Microsoft profile that owns Minecraft to launch
            instances.
          </AlertDescription>
          <AlertAction>
            <Button
              nativeButton={false}
              render={<Link to="/profiles" />}
              size="xs"
              variant="outline"
            >
              Open Profiles
            </Button>
          </AlertAction>
        </Alert>
      )}
      <DashboardHero
        instance={heroInstance}
        launchDisabled={play.playActionState !== "idle"}
        launchState={
          heroInstance !== null && play.activeInstanceId === heroInstance.id
            ? play.playActionState
            : "idle"
        }
        loading={initialInstancesLoading}
        onCreateInstance={openNewInstanceDialog}
        onPlayInstance={playInstance}
      />

      <DashboardInstanceGrid
        downloadJobs={downloadJobs}
        featuredInstanceId={heroInstance?.id ?? null}
        instanceCount={instances.length}
        instances={instances}
        launchLoadingId={play.activeInstanceId}
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
