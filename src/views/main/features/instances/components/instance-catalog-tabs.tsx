import {
  ArchiveIcon,
  CameraIcon,
  GaugeIcon,
  HardDriveIcon,
  SearchIcon,
} from "lucide-react";
import type {
  InstanceContent,
  InstanceFileEntry,
  LauncherInstance,
} from "@/shared/types";
import { Button } from "@/views/main/components/ui/button";
import { InstanceCatalogFileListPanel } from "@/views/main/features/instances/components/instance-catalog-file-list-panel";
import { INSTANCE_TAB_ITEMS } from "@/views/main/features/instances/components/instance-catalog-options";
import type { InstanceTabValue } from "@/views/main/features/instances/components/instance-catalog-types";
import { InstanceLogsPanel } from "@/views/main/features/instances/components/instance-logs-panel";
import { InstanceModpackPanel } from "@/views/main/features/instances/components/instance-modpack-panel";
import { InstanceModsPanel } from "@/views/main/features/instances/components/instance-mods-panel";
import { InstanceServerManagerPanel } from "@/views/main/features/instances/components/instance-server-manager-panel";
import { InstanceSettingsPanel } from "@/views/main/features/instances/components/instance-settings-panel";
import { InstanceVersionsPanel } from "@/views/main/features/instances/components/instance-versions-panel";
import { cn } from "@/views/main/lib/utils";

type InstanceCatalogTabsProps = {
  activeTab: string;
  content: InstanceContent | null;
  contentError: string | null;
  contentLoading: boolean;
  disabledModsCount: number;
  enabledModsCount: number;
  instance: LauncherInstance;
  logs: Array<InstanceFileEntry>;
  mods: Array<InstanceFileEntry>;
  modpackUpdateAvailable: boolean;
  modpackUpdateChecking: boolean;
  mutating: boolean;
  onInstanceDeleted: (instanceId: string) => void;
  onInstanceUpdated: (instance: LauncherInstance) => void;
  onInstanceServerCreated: (content: InstanceContent) => void;
  onBrowseContent: () => void;
  onRefreshContent: () => void;
  onSetActiveTab: (tab: string) => void;
  onSetAllModsEnabled: (enabled: boolean) => void;
  onToggleMod: (fileName: string, name: string, enabled: boolean) => void;
  onUpdateModpack: () => void;
  resourcePacks: Array<InstanceFileEntry>;
  screenshots: Array<InstanceFileEntry>;
  serverList: InstanceFileEntry | null;
  shaderPacks: Array<InstanceFileEntry>;
  updatingModpack: boolean;
  worlds: Array<InstanceFileEntry>;
};

export function InstanceCatalogTabs({
  activeTab,
  content,
  contentError,
  contentLoading,
  disabledModsCount,
  enabledModsCount,
  instance,
  logs,
  mods,
  modpackUpdateAvailable,
  modpackUpdateChecking,
  mutating,
  onBrowseContent,
  onInstanceDeleted,
  onInstanceServerCreated,
  onInstanceUpdated,
  onRefreshContent,
  onSetActiveTab,
  onSetAllModsEnabled,
  onToggleMod,
  onUpdateModpack,
  resourcePacks,
  screenshots,
  serverList,
  shaderPacks,
  updatingModpack,
  worlds,
}: InstanceCatalogTabsProps) {
  const latestLog =
    logs.find((entry) => entry.fileName.toLowerCase() === "latest.log") ??
    logs[0] ??
    null;
  const activePanelValue = INSTANCE_TAB_ITEMS.some(
    (item) => item.value === activeTab,
  )
    ? activeTab
    : "mods";

  const getTabCount = (value: InstanceTabValue): number | null => {
    switch (value) {
      case "mods":
        return enabledModsCount > 0 ? enabledModsCount : null;
      case "resource-packs":
        return resourcePacks.length > 0 ? resourcePacks.length : null;
      case "shader-packs":
        return shaderPacks.length > 0 ? shaderPacks.length : null;
      case "worlds":
        return worlds.length > 0 ? worlds.length : null;
      case "screenshots":
        return screenshots.length > 0 ? screenshots.length : null;
      default:
        return null;
    }
  };

  const activePanelContent = (() => {
    switch (activePanelValue) {
      case "servers":
        return (
          <InstanceServerManagerPanel
            content={content}
            instance={instance}
            onServerContentUpdated={onInstanceServerCreated}
            serverList={serverList}
          />
        );
      case "versions":
        return <InstanceVersionsPanel content={content} instance={instance} />;
      case "modpack":
        return (
          <InstanceModpackPanel
            content={content}
            instance={instance}
            modpackUpdateAvailable={modpackUpdateAvailable}
            modpackUpdateChecking={modpackUpdateChecking}
            onUpdateModpack={onUpdateModpack}
            updatingModpack={updatingModpack}
          />
        );
      case "resource-packs":
        return (
          <InstanceCatalogFileListPanel
            emptyIcon={ArchiveIcon}
            emptyText="Drop .zip resource packs into this folder and refresh the inventory."
            emptyTitle="No resource packs found"
            entries={resourcePacks}
            folderPath={instance.folders.resourcePacks}
            title="Resource Packs"
          />
        );
      case "shader-packs":
        return (
          <InstanceCatalogFileListPanel
            emptyIcon={GaugeIcon}
            emptyText="Drop shader packs into this folder and refresh the inventory."
            emptyTitle="No shader packs found"
            entries={shaderPacks}
            folderPath={instance.folders.shaderPacks}
            title="Shader Packs"
          />
        );
      case "screenshots":
        return (
          <InstanceCatalogFileListPanel
            emptyIcon={CameraIcon}
            emptyText="Screenshots created by Minecraft for this instance will appear here."
            emptyTitle="No screenshots found"
            entries={screenshots}
            folderPath={instance.folders.screenshots}
            title="Screenshots"
          />
        );
      case "worlds":
        return (
          <InstanceCatalogFileListPanel
            emptyIcon={HardDriveIcon}
            emptyText="Single-player worlds saved by this instance will appear here."
            emptyTitle="No worlds found"
            entries={worlds}
            folderPath={instance.folders.saves}
            title="Worlds"
          />
        );
      case "logs":
        return (
          <InstanceLogsPanel
            active
            instance={instance}
            logFolders={content?.logFolders ?? []}
            logs={logs}
            onRefreshContent={onRefreshContent}
          />
        );
      case "settings":
        return (
          <InstanceSettingsPanel
            instance={instance}
            mods={mods}
            onInstanceDeleted={onInstanceDeleted}
            onInstanceUpdated={onInstanceUpdated}
            onReviewMods={() => onSetActiveTab("mods")}
          />
        );
      default:
        return (
          <InstanceModsPanel
            content={content}
            contentError={contentError}
            contentLoading={contentLoading}
            disabledModsCount={disabledModsCount}
            enabledModsCount={enabledModsCount}
            instance={instance}
            latestLog={latestLog}
            mods={mods}
            modpackUpdateAvailable={modpackUpdateAvailable}
            mutating={mutating}
            onRefreshContent={onRefreshContent}
            onSetActiveTab={onSetActiveTab}
            onSetAllModsEnabled={onSetAllModsEnabled}
            onToggleMod={onToggleMod}
            onUpdateModpack={onUpdateModpack}
            updatingModpack={updatingModpack}
          />
        );
    }
  })();

  return (
    <div className="flex min-w-0 flex-col gap-4">
      {/* Tab bar — all tabs visible, horizontally scrollable */}
      <div className="flex min-w-0 items-end gap-2 border-b border-border px-1">
        <div className="min-w-0 flex-1 overflow-x-auto overflow-y-hidden">
          <div className="flex">
            {INSTANCE_TAB_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activePanelValue === item.value;
              const count = getTabCount(item.value as InstanceTabValue);

              return (
                <button
                  type="button"
                  key={item.value}
                  onClick={() => onSetActiveTab(item.value)}
                  className={cn(
                    "relative flex shrink-0 items-center gap-1.5 whitespace-nowrap border-none bg-transparent px-3.5 py-3 text-[12.5px] transition-colors focus-visible:outline-none",
                    isActive
                      ? "font-semibold text-primary"
                      : "font-medium text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icon className="size-3.5 shrink-0" />
                  {item.label}
                  {count !== null ? (
                    <span
                      className={cn(
                        "rounded-[3px] px-[5px] py-px font-mono text-[10px] font-semibold tabular-nums",
                        isActive
                          ? "bg-[oklch(0.25_0.08_145)] text-primary"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      {count}
                    </span>
                  ) : null}
                  {isActive ? (
                    <span className="absolute bottom-[-1px] left-2 right-2 h-0.5 rounded-sm bg-primary" />
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>

        {/* Browse Content — outside the scroll container */}
        <div className="mb-1.5 shrink-0">
          <Button size="sm" onClick={onBrowseContent}>
            <SearchIcon data-icon="inline-start" />
            Browse Content
          </Button>
        </div>
      </div>

      {/* Panel content */}
      <div className="w-full min-w-0">{activePanelContent}</div>
    </div>
  );
}
