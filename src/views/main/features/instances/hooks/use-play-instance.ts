import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import type { LaunchPlan, RunningLaunch } from "@/shared/types";
import { useDownloadQueueStore } from "@/views/main/features/downloads/download-queue-store";
import { useLaunchPlan } from "@/views/main/features/instances/hooks/use-launch-plan";
import { rpc } from "@/views/main/lib/rpc";

export type PlayActionState =
  | "idle"
  | "preparing"
  | "downloading"
  | "launching";

type UsePlayInstanceOptions = {
  onLaunched?: (launch: RunningLaunch) => void;
  onInstancesChanged?: () => void;
};

export function usePlayInstance({
  onLaunched,
  onInstancesChanged,
}: UsePlayInstanceOptions = {}) {
  const launchPlan = useLaunchPlan();
  const enqueueDownloadJob = useDownloadQueueStore(
    (state) => state.enqueueDownloadJob,
  );
  const waitForDownloadJob = useDownloadQueueStore(
    (state) => state.waitForDownloadJob,
  );

  const [playActionState, setPlayActionState] =
    useState<PlayActionState>("idle");
  const [activeInstanceId, setActiveInstanceId] = useState<string | null>(null);
  const [missingArtifactsDialogOpen, setMissingArtifactsDialogOpen] =
    useState(false);
  const [pendingMissingPlan, setPendingMissingPlan] =
    useState<LaunchPlan | null>(null);

  const onLaunchedRef = useRef(onLaunched);
  const onInstancesChangedRef = useRef(onInstancesChanged);
  onLaunchedRef.current = onLaunched;
  onInstancesChangedRef.current = onInstancesChanged;

  const resetState = useCallback(() => {
    setActiveInstanceId(null);
    setPlayActionState("idle");
  }, []);

  const launchInstance = useCallback(
    async (instanceId: string) => {
      setPlayActionState("launching");
      try {
        const result = await rpc.requestProxy.launchInstance({ instanceId });
        onLaunchedRef.current?.(result);
        toast.success(`Minecraft started (PID ${result.pid})`);
        onInstancesChangedRef.current?.();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Launch failed");
      } finally {
        resetState();
      }
    },
    [resetState],
  );

  const downloadMissingArtifactsAndLaunch = useCallback(() => {
    const plan = pendingMissingPlan;
    setMissingArtifactsDialogOpen(false);
    setPendingMissingPlan(null);

    if (!plan) {
      resetState();
      return;
    }

    void (async () => {
      let shouldResetState = true;
      setPlayActionState("downloading");

      try {
        const job = await enqueueDownloadJob({
          input: { plan },
          kind: "launchArtifacts",
        });
        const finishedJob = await waitForDownloadJob(job.id);
        const result =
          finishedJob.result?.kind === "launchArtifacts"
            ? finishedJob.result.result
            : null;
        const failed =
          result?.failed ??
          finishedJob.items
            .filter((item) => item.status === "failed")
            .map((item) => ({
              error: item.error ?? "Download failed",
              id: item.id,
            }));

        if (finishedJob.status === "failed" || failed.length > 0) {
          toast.error(
            `${Math.max(1, failed.length)} artifact${failed.length === 1 ? "" : "s"} failed to download`,
          );
          return;
        }

        toast.success("All required files downloaded");
        shouldResetState = false;
        await launchInstance(plan.instance.id);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Download failed");
      } finally {
        if (shouldResetState) {
          resetState();
        }
      }
    })();
  }, [
    pendingMissingPlan,
    enqueueDownloadJob,
    waitForDownloadJob,
    launchInstance,
    resetState,
  ]);

  const closeMissingArtifactsDialog = useCallback(
    (open: boolean) => {
      setMissingArtifactsDialogOpen(open);
      if (!open) {
        setPendingMissingPlan(null);
        resetState();
      }
    },
    [resetState],
  );

  const playInstance = useCallback(
    (instanceId: string) => {
      if (playActionState !== "idle") return;

      setActiveInstanceId(instanceId);
      void (async () => {
        setPlayActionState("preparing");

        const plan = await launchPlan.createLaunchPlan(instanceId, {
          openSheet: false,
        });

        if (!plan) {
          resetState();
          return;
        }

        if (plan.missingArtifacts.length > 0) {
          setPendingMissingPlan(plan);
          setMissingArtifactsDialogOpen(true);
          setPlayActionState("idle");
          return;
        }

        await launchInstance(plan.instance.id);
      })();
    },
    [playActionState, launchPlan.createLaunchPlan, launchInstance, resetState],
  );

  const viewLaunchPlan = useCallback(
    (instanceId: string) => {
      void launchPlan.createLaunchPlan(instanceId, { openSheet: true });
    },
    [launchPlan.createLaunchPlan],
  );

  return {
    activeInstanceId,
    closeMissingArtifactsDialog,
    downloadMissingArtifactsAndLaunch,
    launchPlan,
    loadingInstanceId: launchPlan.loadingInstanceId,
    missingArtifactsDialogOpen,
    pendingMissingPlan,
    playActionState,
    playInstance,
    viewLaunchPlan,
  };
}
