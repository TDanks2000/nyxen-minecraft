import { useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import type {
  InstanceModpackUpdate,
  LaunchPlan,
  RunningLaunch,
} from "@/shared/types";
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
import { ContentBrowserDialog } from "@/views/main/features/curseforge/components/curseforge-browser-dialog";
import { toSelectedInstance } from "@/views/main/features/curseforge/curseforge-browser-model";
import { useCurseForgeInstall } from "@/views/main/features/curseforge/use-curseforge-install";
import { useDownloadQueueStore } from "@/views/main/features/downloads/download-queue-store";
import { InstanceCatalogTabs } from "@/views/main/features/instances/components/instance-catalog-tabs";
import { InstanceDetailsHeader } from "@/views/main/features/instances/components/instance-details-header";
import {
  InstanceDetailsLoadingState,
  InstanceDetailsNotFoundState,
} from "@/views/main/features/instances/components/instance-details-states";
import { LaunchPlanSheet } from "@/views/main/features/instances/components/launch-plan-sheet";
import { useInstanceCatalog } from "@/views/main/features/instances/hooks/use-instance-catalog";
import { useLaunchPlan } from "@/views/main/features/instances/hooks/use-launch-plan";
import { useModrinthInstall } from "@/views/main/features/modrinth/use-modrinth-install";
import { useInstances } from "@/views/main/hooks/use-instances";
import { openLocalPath } from "@/views/main/lib/open-local-path";
import { rpc } from "@/views/main/lib/rpc";

type LaunchActionState =
  | "idle"
  | "preparing"
  | "downloading"
  | "launching"
  | "stopping";

export function InstanceDetailsPage({ instanceId }: { instanceId: string }) {
  const [activeTab, setActiveTab] = useState("mods");
  const [contentBrowserOpen, setContentBrowserOpen] = useState(false);
  const [launchActionState, setLaunchActionState] =
    useState<LaunchActionState>("idle");
  const [modpackUpdate, setModpackUpdate] =
    useState<InstanceModpackUpdate | null>(null);
  const [modpackUpdateChecking, setModpackUpdateChecking] = useState(false);
  const [updatingModpack, setUpdatingModpack] = useState(false);
  const [exportingSupportBundle, setExportingSupportBundle] = useState(false);
  const [missingArtifactsDialogOpen, setMissingArtifactsDialogOpen] =
    useState(false);
  const [pendingMissingPlan, setPendingMissingPlan] =
    useState<LaunchPlan | null>(null);
  const [runningLaunches, setRunningLaunches] = useState<Array<RunningLaunch>>(
    [],
  );
  const navigate = useNavigate();
  const instancesHook = useInstances();
  const launchPlan = useLaunchPlan();
  const enqueueDownloadJob = useDownloadQueueStore(
    (state) => state.enqueueDownloadJob,
  );
  const waitForDownloadJob = useDownloadQueueStore(
    (state) => state.waitForDownloadJob,
  );
  const instance =
    instancesHook.data?.find((item) => item.id === instanceId) ?? null;
  const catalog = useInstanceCatalog(instance);
  const curseForgeInstall = useCurseForgeInstall({
    onContentUpdated: catalog.replaceContent,
  });
  const modrinthInstall = useModrinthInstall({
    onContentUpdated: catalog.replaceContent,
    onInstanceCreated: instancesHook.upsertInstance,
  });
  const runningLaunch = instance
    ? (runningLaunches.find((launch) => launch.instanceId === instance.id) ??
      null)
    : null;

  const refreshRunningLaunches = useCallback(async () => {
    try {
      const launches = await rpc.requestProxy.listRunningLaunches(null);
      setRunningLaunches(launches);
      return launches;
    } catch {
      return [];
    }
  }, []);

  useEffect(() => {
    void refreshRunningLaunches();

    const intervalId = window.setInterval(() => {
      void refreshRunningLaunches();
    }, 5_000);

    return () => window.clearInterval(intervalId);
  }, [refreshRunningLaunches]);

  useEffect(() => {
    if (!instance?.modpack?.locked) {
      setModpackUpdate(null);
      setModpackUpdateChecking(false);
      return;
    }

    let cancelled = false;
    setModpackUpdateChecking(true);

    rpc.requestProxy
      .getInstanceModpackUpdate({ instanceId: instance.id })
      .then((update) => {
        if (!cancelled) setModpackUpdate(update);
      })
      .catch(() => {
        if (!cancelled) setModpackUpdate(null);
      })
      .finally(() => {
        if (!cancelled) setModpackUpdateChecking(false);
      });

    return () => {
      cancelled = true;
    };
  }, [instance]);

  const rememberRunningLaunch = (launch: RunningLaunch) => {
    setRunningLaunches((current) => [
      launch,
      ...current.filter((item) => item.instanceId !== launch.instanceId),
    ]);
  };

  const forgetRunningLaunch = (runningInstanceId: string) => {
    setRunningLaunches((current) =>
      current.filter((launch) => launch.instanceId !== runningInstanceId),
    );
  };

  if (instancesHook.loading && instancesHook.data === null) {
    return <InstanceDetailsLoadingState />;
  }
  if (!instance) return <InstanceDetailsNotFoundState />;

  const planLoading = launchPlan.loadingInstanceId === instance.id;

  const launchInstance = async (launchInstanceId: string) => {
    setLaunchActionState("launching");

    try {
      const result = await rpc.requestProxy.launchInstance({
        instanceId: launchInstanceId,
      });
      rememberRunningLaunch(result);
      toast.success(`Minecraft started (PID ${result.pid})`);
      instancesHook.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Launch failed");
    } finally {
      setLaunchActionState("idle");
    }
  };

  const playInstance = () => {
    if (launchActionState !== "idle") return;

    void (async () => {
      setLaunchActionState("preparing");

      try {
        const plan = await launchPlan.createLaunchPlan(instance.id, {
          openSheet: false,
        });

        if (!plan) return;

        if (plan.missingArtifacts.length > 0) {
          setPendingMissingPlan(plan);
          setMissingArtifactsDialogOpen(true);
          return;
        }

        await launchInstance(plan.instance.id);
      } finally {
        setLaunchActionState((current) =>
          current === "preparing" ? "idle" : current,
        );
      }
    })();
  };

  const stopInstance = () => {
    if (!runningLaunch || launchActionState === "stopping") return;

    void (async () => {
      setLaunchActionState("stopping");

      try {
        const result = await rpc.requestProxy.stopLaunchInstance({
          instanceId: runningLaunch.instanceId,
        });
        forgetRunningLaunch(runningLaunch.instanceId);
        toast.message(
          result.stopped ? "Minecraft stopped" : "Minecraft is not running",
        );
      } catch (e) {
        toast.error(
          e instanceof Error ? e.message : "Failed to stop Minecraft",
        );
      } finally {
        setLaunchActionState("idle");
        void refreshRunningLaunches();
      }
    })();
  };

  const viewLaunchPlan = () => {
    void launchPlan.createLaunchPlan(instance.id, { openSheet: true });
  };

  const updateModpack = () => {
    if (!instance.modpack?.locked || updatingModpack) return;

    void (async () => {
      setUpdatingModpack(true);

      try {
        const result = await rpc.requestProxy.updateInstanceModpack({
          instanceId: instance.id,
        });

        instancesHook.upsertInstance(result.instance);
        catalog.replaceContent(result.content);
        setModpackUpdate(result.update);
        toast.success(`${result.instance.modpack?.name ?? "Modpack"} updated`);
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to update modpack",
        );
      } finally {
        setUpdatingModpack(false);
      }
    })();
  };

  const exportSupportBundle = () => {
    if (exportingSupportBundle) return;

    void (async () => {
      setExportingSupportBundle(true);

      try {
        const result = await rpc.requestProxy.exportInstanceSupportBundle({
          instanceId: instance.id,
        });

        await openLocalPath(result.path, {
          failureMessage:
            "Support bundle exported, but the file could not be opened.",
          successMessage: `Support bundle exported with ${result.bundle.redactions.count} redaction${
            result.bundle.redactions.count === 1 ? "" : "s"
          }`,
        });
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Failed to export support bundle",
        );
      } finally {
        setExportingSupportBundle(false);
      }
    })();
  };

  const downloadMissingArtifactsAndLaunch = () => {
    const plan = pendingMissingPlan;
    setMissingArtifactsDialogOpen(false);
    setPendingMissingPlan(null);

    if (!plan) return;

    void (async () => {
      let shouldResetState = true;
      setLaunchActionState("downloading");

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
          setLaunchActionState("idle");
        }
      }
    })();
  };

  const closeMissingArtifactsDialog = (open: boolean) => {
    setMissingArtifactsDialogOpen(open);

    if (!open) {
      setPendingMissingPlan(null);
    }
  };

  const openSettings = () => setActiveTab("settings");
  const selectedContentInstance = toSelectedInstance(instance);

  return (
    <div className="min-h-full bg-background">
      <InstanceDetailsHeader
        enabledModsCount={catalog.enabledMods.length}
        instance={instance}
        isRunning={!!runningLaunch}
        launchActionState={launchActionState}
        modpackUpdateAvailable={modpackUpdate?.updateAvailable ?? false}
        modpackUpdateChecking={modpackUpdateChecking}
        onExportSupportBundle={exportSupportBundle}
        onOpenSettings={openSettings}
        onPlay={playInstance}
        onStop={stopInstance}
        onUpdateModpack={updateModpack}
        onViewLaunchPlan={viewLaunchPlan}
        planLoading={planLoading}
        resourcePackCount={catalog.resourcePacks.length}
        shaderPackCount={catalog.shaderPacks.length}
        supportBundleExporting={exportingSupportBundle}
        updatingModpack={updatingModpack}
        warningCount={catalog.disabledMods.length}
      />

      <div className="flex w-full min-w-0 flex-col gap-4 px-4 pt-4 pb-8 sm:px-5">
        <InstanceCatalogTabs
          activeTab={activeTab}
          content={catalog.content}
          contentError={catalog.error}
          contentLoading={catalog.loading}
          disabledModsCount={catalog.disabledMods.length}
          enabledModsCount={catalog.enabledMods.length}
          instance={instance}
          mutating={catalog.mutating}
          mods={catalog.mods}
          onBrowseContent={() => setContentBrowserOpen(true)}
          onInstanceDeleted={(deletedInstanceId) => {
            instancesHook.removeInstance(deletedInstanceId);
            void navigate({ to: "/instances" });
          }}
          onInstanceUpdated={(updatedInstance) => {
            instancesHook.upsertInstance(updatedInstance);
          }}
          onRefreshContent={() => {
            void catalog.refreshContent();
          }}
          onSetActiveTab={setActiveTab}
          onSetAllModsEnabled={(enabled) => {
            void catalog.setAllModsEnabled(enabled);
          }}
          onToggleMod={catalog.toggleMod}
          resourcePacks={catalog.resourcePacks}
          screenshots={catalog.screenshots}
          serverList={catalog.serverList}
          shaderPacks={catalog.shaderPacks}
          logs={catalog.logs}
          worlds={catalog.worlds}
        />
      </div>

      <LaunchPlanSheet
        open={launchPlan.sheetOpen}
        onOpenChange={launchPlan.setSheetOpen}
        onLaunched={(launch) => {
          rememberRunningLaunch(launch);
          instancesHook.refresh();
        }}
        plan={launchPlan.activePlan}
      />
      <AlertDialog
        open={missingArtifactsDialogOpen}
        onOpenChange={closeMissingArtifactsDialog}
      >
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Download missing files?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingMissingPlan
                ? `${pendingMissingPlan.missingArtifacts.length} required file${
                    pendingMissingPlan.missingArtifacts.length === 1 ? "" : "s"
                  } missing. Download now and start Minecraft?`
                : "Required files are missing. Download now and start Minecraft?"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No</AlertDialogCancel>
            <AlertDialogAction onClick={downloadMissingArtifactsAndLaunch}>
              Yes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <ContentBrowserDialog
        availableInstances={[selectedContentInstance]}
        instanceContent={catalog.content}
        installedContent={catalog.content?.curseForge}
        initialCategory="mods"
        onCompleteManualInstall={curseForgeInstall.completeManualInstall}
        onInstall={curseForgeInstall.install}
        onInstallModrinth={modrinthInstall.install}
        onInstallModrinthModpack={modrinthInstall.installModpack}
        onOpenManualDownload={curseForgeInstall.openManualDownload}
        open={contentBrowserOpen}
        onOpenChange={setContentBrowserOpen}
        onUpdate={curseForgeInstall.update}
        selectedInstance={selectedContentInstance}
      />
    </div>
  );
}
