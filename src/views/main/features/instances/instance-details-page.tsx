import { useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import type { InstanceModpackUpdate, RunningLaunch } from "@/shared/types";
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
import { InstanceCatalogTabs } from "@/views/main/features/instances/components/instance-catalog-tabs";
import { InstanceDetailsHeader } from "@/views/main/features/instances/components/instance-details-header";
import {
  InstanceDetailsLoadingState,
  InstanceDetailsNotFoundState,
} from "@/views/main/features/instances/components/instance-details-states";
import { LaunchPlanSheet } from "@/views/main/features/instances/components/launch-plan-sheet";
import { useInstanceCatalog } from "@/views/main/features/instances/hooks/use-instance-catalog";
import { usePlayInstance } from "@/views/main/features/instances/hooks/use-play-instance";
import { useModrinthInstall } from "@/views/main/features/modrinth/use-modrinth-install";
import { useInstances } from "@/views/main/hooks/use-instances";
import { openLocalPath } from "@/views/main/lib/open-local-path";
import { rpc } from "@/views/main/lib/rpc";

export function InstanceDetailsPage({ instanceId }: { instanceId: string }) {
  const [activeTab, setActiveTab] = useState("mods");
  const [contentBrowserOpen, setContentBrowserOpen] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [modpackUpdate, setModpackUpdate] =
    useState<InstanceModpackUpdate | null>(null);
  const [modpackUpdateChecking, setModpackUpdateChecking] = useState(false);
  const [updatingModpack, setUpdatingModpack] = useState(false);
  const [exportingSupportBundle, setExportingSupportBundle] = useState(false);
  const [runningLaunches, setRunningLaunches] = useState<Array<RunningLaunch>>(
    [],
  );

  const navigate = useNavigate();
  const instancesHook = useInstances();
  const instance =
    instancesHook.data?.find((item) => item.id === instanceId) ?? null;

  const play = usePlayInstance({
    onLaunched: (launch) => {
      setRunningLaunches((current) => [
        launch,
        ...current.filter((item) => item.instanceId !== launch.instanceId),
      ]);
    },
    onInstancesChanged: instancesHook.refresh,
  });

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
      setRunningLaunches((current) => {
        if (
          launches.length === current.length &&
          launches.every(
            (l, i) =>
              l.instanceId === current[i]?.instanceId &&
              l.pid === current[i]?.pid,
          )
        ) {
          return current;
        }
        return launches;
      });
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

  if (instancesHook.loading && instancesHook.data === null) {
    return <InstanceDetailsLoadingState />;
  }
  if (!instance) return <InstanceDetailsNotFoundState />;

  const planLoading = play.loadingInstanceId === instance.id;
  const launchActionState = isStopping ? "stopping" : play.playActionState;

  const stopInstance = () => {
    if (!runningLaunch || isStopping) return;

    void (async () => {
      setIsStopping(true);

      try {
        const result = await rpc.requestProxy.stopLaunchInstance({
          instanceId: runningLaunch.instanceId,
        });
        setRunningLaunches((current) =>
          current.filter(
            (launch) => launch.instanceId !== runningLaunch.instanceId,
          ),
        );
        toast.message(
          result.stopped ? "Minecraft stopped" : "Minecraft is not running",
        );
      } catch (e) {
        toast.error(
          e instanceof Error ? e.message : "Failed to stop Minecraft",
        );
      } finally {
        setIsStopping(false);
        void refreshRunningLaunches();
      }
    })();
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

  const selectedContentInstance = toSelectedInstance(instance);

  const latestLaunchRepair =
    [...(catalog.content?.launchAttempts ?? [])]
      .reverse()
      .find((attempt) => attempt.outcome.status !== "started" && attempt.repair)
      ?.repair ?? null;
  const recipe = catalog.content?.recipe ?? null;
  const warningCount =
    (catalog.error ? 1 : 0) +
    (latestLaunchRepair ? 1 : 0) +
    (recipe?.status === "drifted" ? 1 : 0) +
    (recipe?.status === "incomplete" ? 1 : 0) +
    (catalog.disabledMods.length > 0 ? 1 : 0);

  return (
    <div className="min-h-full bg-background">
      <InstanceDetailsHeader
        enabledModsCount={catalog.enabledMods.length}
        instance={instance}
        isRunning={!!runningLaunch}
        launchActionState={launchActionState}
        modpackUpdateAvailable={modpackUpdate?.updateAvailable ?? false}
        onExportSupportBundle={exportSupportBundle}
        onPlay={() => play.playInstance(instance.id)}
        onStop={stopInstance}
        onViewLaunchPlan={() => play.viewLaunchPlan(instance.id)}
        planLoading={planLoading}
        resourcePackCount={catalog.resourcePacks.length}
        shaderPackCount={catalog.shaderPacks.length}
        supportBundleExporting={exportingSupportBundle}
        warningCount={warningCount}
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
          modpackUpdateAvailable={modpackUpdate?.updateAvailable ?? false}
          modpackUpdateChecking={modpackUpdateChecking}
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
          onInstanceServerCreated={catalog.replaceContent}
          onRefreshContent={() => {
            void catalog.refreshContent();
          }}
          onSetActiveTab={setActiveTab}
          onSetAllModsEnabled={(enabled) => {
            void catalog.setAllModsEnabled(enabled);
          }}
          onToggleMod={catalog.toggleMod}
          onUpdateModpack={updateModpack}
          resourcePacks={catalog.resourcePacks}
          screenshots={catalog.screenshots}
          serverList={catalog.serverList}
          shaderPacks={catalog.shaderPacks}
          logs={catalog.logs}
          updatingModpack={updatingModpack}
          worlds={catalog.worlds}
        />
      </div>

      <LaunchPlanSheet
        open={play.launchPlan.sheetOpen}
        onOpenChange={play.launchPlan.setSheetOpen}
        onLaunched={(launch) => {
          setRunningLaunches((current) => [
            launch,
            ...current.filter((item) => item.instanceId !== launch.instanceId),
          ]);
          instancesHook.refresh();
        }}
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
