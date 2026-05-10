import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { CurseForgeBrowserDialog } from "@/views/main/features/curseforge/components/curseforge-browser-dialog";
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
import { useLaunchPlan } from "@/views/main/features/instances/hooks/use-launch-plan";
import { useInstances } from "@/views/main/hooks/use-instances";

export function InstanceDetailsPage({ instanceId }: { instanceId: string }) {
  const [activeTab, setActiveTab] = useState("mods");
  const [curseForgeOpen, setCurseForgeOpen] = useState(false);
  const navigate = useNavigate();
  const instancesHook = useInstances();
  const launchPlan = useLaunchPlan();
  const instance =
    instancesHook.data?.find((item) => item.id === instanceId) ?? null;
  const catalog = useInstanceCatalog(instance);
  const curseForgeInstall = useCurseForgeInstall({
    onContentUpdated: catalog.replaceContent,
  });

  if (instancesHook.loading) return <InstanceDetailsLoadingState />;
  if (!instance) return <InstanceDetailsNotFoundState />;

  const planLoading = launchPlan.loadingInstanceId === instance.id;
  const playInstance = () => {
    void launchPlan.createLaunchPlan(instance.id);
  };
  const openSettings = () => setActiveTab("settings");
  const selectedCurseForgeInstance = toSelectedInstance(instance);

  return (
    <div className="min-h-full bg-background">
      <InstanceDetailsHeader
        enabledModsCount={catalog.enabledMods.length}
        instance={instance}
        onBrowseCurseForge={() => setCurseForgeOpen(true)}
        onOpenSettings={openSettings}
        onPlay={playInstance}
        planLoading={planLoading}
        resourcePackCount={catalog.resourcePacks.length}
        shaderPackCount={catalog.shaderPacks.length}
        warningCount={catalog.disabledMods.length}
      />

      <div className="mx-auto flex w-full max-w-[90rem] min-w-0 flex-col gap-4 px-4 pt-4 pb-8 sm:px-5">
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
          onCreateLaunchPlan={playInstance}
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
        onLaunched={instancesHook.refresh}
        plan={launchPlan.activePlan}
      />
      <CurseForgeBrowserDialog
        availableInstances={[selectedCurseForgeInstance]}
        installedContent={catalog.content?.curseForge}
        initialCategory="mods"
        onCompleteManualInstall={curseForgeInstall.completeManualInstall}
        onInstall={curseForgeInstall.install}
        onOpenManualDownload={curseForgeInstall.openManualDownload}
        open={curseForgeOpen}
        onOpenChange={setCurseForgeOpen}
        onUpdate={curseForgeInstall.update}
        selectedInstance={selectedCurseForgeInstance}
      />
    </div>
  );
}
