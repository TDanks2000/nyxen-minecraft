import { InstanceCatalogTabs } from "@/views/main/features/instances/components/instance-catalog-tabs";
import { InstanceDetailsHeader } from "@/views/main/features/instances/components/instance-details-header";
import {
  InstanceDetailsLoadingState,
  InstanceDetailsNotFoundState,
} from "@/views/main/features/instances/components/instance-details-states";
import { InstanceSummary } from "@/views/main/features/instances/components/instance-summary";
import { LaunchPlanSheet } from "@/views/main/features/instances/components/launch-plan-sheet";
import { useInstanceCatalog } from "@/views/main/features/instances/hooks/use-instance-catalog";
import { useLaunchPlan } from "@/views/main/features/instances/hooks/use-launch-plan";
import { useInstances } from "@/views/main/hooks/use-instances";

export function InstanceDetailsPage({ instanceId }: { instanceId: string }) {
  const instancesHook = useInstances();
  const launchPlan = useLaunchPlan();
  const instance =
    instancesHook.data?.find((item) => item.id === instanceId) ?? null;
  const catalog = useInstanceCatalog(instance);

  if (instancesHook.loading) return <InstanceDetailsLoadingState />;
  if (!instance) return <InstanceDetailsNotFoundState />;

  const planLoading = launchPlan.loadingInstanceId === instance.id;
  const playInstance = () => {
    void launchPlan.createLaunchPlan(instance.id);
  };

  return (
    <div className="flex flex-col">
      <InstanceDetailsHeader
        instance={instance}
        onPlay={playInstance}
        planLoading={planLoading}
      />

      <div className="mx-auto flex w-full max-w-7xl min-w-0 flex-col gap-5 px-4 pt-5 pb-8 sm:px-5">
        <InstanceSummary
          enabledModsCount={catalog.enabledMods.length}
          instance={instance}
        />

        <InstanceCatalogTabs
          enabled={catalog.enabled}
          favorites={catalog.favorites}
          instance={instance}
          mods={catalog.mods}
          onAddMod={catalog.addMod}
          onAddServer={catalog.addServer}
          onApplyUpdate={catalog.applyUpdate}
          onRefreshPings={catalog.refreshPings}
          onToggleFavorite={catalog.toggleFavorite}
          onToggleMod={catalog.toggleMod}
          servers={catalog.servers}
          updates={catalog.updates}
        />
      </div>

      <LaunchPlanSheet
        open={launchPlan.sheetOpen}
        onOpenChange={launchPlan.setSheetOpen}
        plan={launchPlan.activePlan}
      />
    </div>
  );
}
