import {
  ArchiveIcon,
  CameraIcon,
  GaugeIcon,
  HardDriveIcon,
  MoreHorizontalIcon,
  SearchIcon,
} from "lucide-react";
import type {
  InstanceContent,
  InstanceFileEntry,
  LauncherInstance,
} from "@/shared/types";
import { Button } from "@/views/main/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/views/main/components/ui/dropdown-menu";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/views/main/components/ui/tabs";
import { InstanceCatalogFileListPanel } from "@/views/main/features/instances/components/instance-catalog-file-list-panel";
import {
  INSTANCE_TAB_ITEMS,
  PRIMARY_INSTANCE_TAB_VALUES,
} from "@/views/main/features/instances/components/instance-catalog-options";
import { InstanceLogsPanel } from "@/views/main/features/instances/components/instance-logs-panel";
import { InstanceModpackPanel } from "@/views/main/features/instances/components/instance-modpack-panel";
import { InstanceModsPanel } from "@/views/main/features/instances/components/instance-mods-panel";
import { InstanceServerManagerPanel } from "@/views/main/features/instances/components/instance-server-manager-panel";
import { InstanceSettingsPanel } from "@/views/main/features/instances/components/instance-settings-panel";
import { InstanceVersionsPanel } from "@/views/main/features/instances/components/instance-versions-panel";

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
  const primaryTabs = INSTANCE_TAB_ITEMS.filter((item) =>
    PRIMARY_INSTANCE_TAB_VALUES.includes(item.value),
  );
  const moreTabs = INSTANCE_TAB_ITEMS.filter(
    (item) => !PRIMARY_INSTANCE_TAB_VALUES.includes(item.value),
  );
  const activeMoreTab = moreTabs.find(
    (item) => item.value === activePanelValue,
  );
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
            mutating={mutating}
            onRefreshContent={onRefreshContent}
            onSetActiveTab={onSetActiveTab}
            onSetAllModsEnabled={onSetAllModsEnabled}
            onToggleMod={onToggleMod}
          />
        );
    }
  })();

  return (
    <Tabs
      className="min-w-0 flex-col gap-3"
      onValueChange={onSetActiveTab}
      value={activeTab}
    >
      <div className="flex min-w-0 flex-col gap-2 border-border border-b pb-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 overflow-x-auto">
          <TabsList
            className="h-10 w-max gap-3 bg-transparent p-0"
            variant="line"
          >
            {primaryTabs.map((item) => {
              const Icon = item.icon;

              return (
                <TabsTrigger
                  className="h-10 px-3 text-xs"
                  key={item.value}
                  value={item.value}
                >
                  <Icon />
                  {item.label}
                </TabsTrigger>
              );
            })}
          </TabsList>
        </div>
        <div className="flex flex-wrap gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  className="w-full sm:w-auto"
                  size="sm"
                  variant={activeMoreTab ? "secondary" : "outline"}
                />
              }
            >
              <MoreHorizontalIcon data-icon="inline-start" />
              {activeMoreTab?.label ?? "More"}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {moreTabs.map((item) => {
                const Icon = item.icon;

                return (
                  <DropdownMenuItem
                    key={item.value}
                    onClick={() => onSetActiveTab(item.value)}
                  >
                    <Icon />
                    {item.label}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            className="w-full sm:w-auto"
            onClick={onBrowseContent}
            size="sm"
          >
            <SearchIcon data-icon="inline-start" />
            Browse Content
          </Button>
        </div>
      </div>

      <TabsContent className="w-full min-w-0" value={activePanelValue}>
        {activePanelContent}
      </TabsContent>
    </Tabs>
  );
}
