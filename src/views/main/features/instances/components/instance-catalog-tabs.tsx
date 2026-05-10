import { formatDistanceToNow } from "date-fns";
import {
  ArchiveIcon,
  CameraIcon,
  CheckCircle2Icon,
  FileTextIcon,
  FolderOpenIcon,
  GaugeIcon,
  HammerIcon,
  HardDriveIcon,
  PlugZapIcon,
  PuzzleIcon,
  RefreshCwIcon,
  SearchIcon,
  ServerIcon,
  Settings2Icon,
  ShieldAlertIcon,
  SlidersHorizontalIcon,
  TerminalSquareIcon,
  ZapIcon,
} from "lucide-react";
import { type ElementType, useMemo, useState } from "react";
import type {
  InstanceContent,
  InstanceFileEntry,
  LauncherInstance,
} from "@/shared/types";
import { Badge } from "@/views/main/components/ui/badge";
import { Button } from "@/views/main/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/views/main/components/ui/card";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/views/main/components/ui/input-group";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/views/main/components/ui/select";
import { Switch } from "@/views/main/components/ui/switch";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/views/main/components/ui/tabs";
import { InstanceLogsPanel } from "@/views/main/features/instances/components/instance-logs-panel";
import { InstanceSettingsPanel } from "@/views/main/features/instances/components/instance-settings-panel";
import { rpc } from "@/views/main/lib/rpc";
import { cn } from "@/views/main/lib/utils";

type InstanceTabValue =
  | "logs"
  | "mods"
  | "resource-packs"
  | "screenshots"
  | "servers"
  | "settings"
  | "shader-packs"
  | "versions"
  | "worlds";

type ModStatusFilter = "all" | "disabled" | "enabled";
type ModSortField = "modified" | "name" | "size";

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
  mutating: boolean;
  onInstanceDeleted: (instanceId: string) => void;
  onInstanceUpdated: (instance: LauncherInstance) => void;
  onRefreshContent: () => void;
  onSetActiveTab: (tab: string) => void;
  onSetAllModsEnabled: (enabled: boolean) => void;
  onToggleMod: (fileName: string, name: string, enabled: boolean) => void;
  resourcePacks: Array<InstanceFileEntry>;
  screenshots: Array<InstanceFileEntry>;
  serverList: InstanceFileEntry | null;
  shaderPacks: Array<InstanceFileEntry>;
  worlds: Array<InstanceFileEntry>;
};

const TAB_ITEMS: Array<{
  icon: ElementType;
  label: string;
  value: InstanceTabValue;
}> = [
  { icon: PuzzleIcon, label: "Mods", value: "mods" },
  { icon: ZapIcon, label: "Versions", value: "versions" },
  { icon: ArchiveIcon, label: "Resource Packs", value: "resource-packs" },
  { icon: GaugeIcon, label: "Shader Packs", value: "shader-packs" },
  { icon: ServerIcon, label: "Servers", value: "servers" },
  { icon: HardDriveIcon, label: "Worlds", value: "worlds" },
  { icon: CameraIcon, label: "Screenshots", value: "screenshots" },
  { icon: FileTextIcon, label: "Logs", value: "logs" },
  { icon: Settings2Icon, label: "Settings", value: "settings" },
];

const MOD_STATUS_FILTERS: Array<{ label: string; value: ModStatusFilter }> = [
  { label: "All mods", value: "all" },
  { label: "Enabled", value: "enabled" },
  { label: "Disabled", value: "disabled" },
];

const MOD_SORT_OPTIONS: Array<{ label: string; value: ModSortField }> = [
  { label: "Name", value: "name" },
  { label: "Recently modified", value: "modified" },
  { label: "Size", value: "size" },
];

const openExternalPath = (path: string) => {
  void rpc.requestProxy.openExternal({ url: `file://${path}` });
};

const formatBytes = (bytes: number): string => {
  if (bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"] as const;
  const index = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
};

const formatModified = (value: string): string =>
  formatDistanceToNow(new Date(value), { addSuffix: true });

function EmptyPanel({
  action,
  description,
  icon: Icon,
  title,
}: {
  action?: React.ReactNode;
  description: string;
  icon: ElementType;
  title: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-background/45 p-6 text-center">
      <Icon className="mx-auto size-8 text-muted-foreground" />
      <h3 className="mt-3 font-heading text-sm font-semibold">{title}</h3>
      <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
        {description}
      </p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

function StatusBadge({ enabled }: { enabled: boolean | null }) {
  if (enabled === null) return <Badge variant="outline">Local</Badge>;

  return (
    <Badge variant={enabled ? "default" : "outline"}>
      {enabled ? "Enabled" : "Disabled"}
    </Badge>
  );
}

function FileIcon({ entry }: { entry: InstanceFileEntry }) {
  const Icon =
    entry.kind === "screenshot"
      ? CameraIcon
      : entry.kind === "log"
        ? FileTextIcon
        : entry.kind === "serverList"
          ? ServerIcon
          : entry.kind === "shaderPack"
            ? GaugeIcon
            : entry.kind === "resourcePack"
              ? ArchiveIcon
              : entry.kind === "world"
                ? HardDriveIcon
                : PuzzleIcon;

  return (
    <div className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-muted/30 text-primary">
      <Icon className="size-4" />
    </div>
  );
}

function FileCard({
  action,
  entry,
}: {
  action?: React.ReactNode;
  entry: InstanceFileEntry;
}) {
  return (
    <article className="rounded-lg border border-border bg-background/45 p-3">
      <div className="flex items-start gap-3">
        <FileIcon entry={entry} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate font-heading text-sm font-semibold">
                {entry.displayName}
              </h3>
              <p className="mt-1 truncate font-mono text-xs text-muted-foreground">
                {entry.fileName}
              </p>
            </div>
            <Button
              aria-label={`Open ${entry.displayName}`}
              onClick={() => openExternalPath(entry.path)}
              size="icon-sm"
              variant="ghost"
            >
              <FolderOpenIcon />
            </Button>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <StatusBadge enabled={entry.enabled} />
            <Badge variant="secondary">
              {entry.isDirectory ? "Folder" : (entry.extension ?? "File")}
            </Badge>
            <Badge variant="ghost">{formatBytes(entry.sizeBytes)}</Badge>
          </div>
          <div className="mt-2 text-xs text-muted-foreground">
            Modified {formatModified(entry.modifiedAt)}
          </div>
          {action ? <div className="mt-3">{action}</div> : null}
        </div>
      </div>
    </article>
  );
}

function FileListPanel({
  emptyIcon,
  emptyText,
  emptyTitle,
  entries,
  folderPath,
  title,
}: {
  emptyIcon: ElementType;
  emptyText: string;
  emptyTitle: string;
  entries: Array<InstanceFileEntry>;
  folderPath: string;
  title: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardAction>
          <Button
            onClick={() => openExternalPath(folderPath)}
            size="sm"
            variant="outline"
          >
            <FolderOpenIcon data-icon="inline-start" />
            Open Folder
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <EmptyPanel
            action={
              <Button
                onClick={() => openExternalPath(folderPath)}
                size="sm"
                variant="outline"
              >
                <FolderOpenIcon data-icon="inline-start" />
                Open Folder
              </Button>
            }
            description={emptyText}
            icon={emptyIcon}
            title={emptyTitle}
          />
        ) : (
          <div className="grid gap-2 lg:grid-cols-2">
            {entries.map((entry) => (
              <FileCard entry={entry} key={entry.id} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ModIcon({ enabled }: { enabled: boolean }) {
  return (
    <div
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-md border border-border font-heading text-xs font-black",
        enabled
          ? "bg-primary/20 text-primary"
          : "bg-muted/40 text-muted-foreground",
      )}
      aria-hidden="true"
    >
      <PuzzleIcon className="size-4" />
    </div>
  );
}

function ModCard({
  entry,
  mutating,
  onToggleMod,
}: {
  entry: InstanceFileEntry;
  mutating: boolean;
  onToggleMod: (fileName: string, name: string, enabled: boolean) => void;
}) {
  const enabled = entry.enabled === true;

  return (
    <article
      className={cn(
        "group flex min-w-0 flex-col rounded-lg border bg-background/55 p-3 transition-colors",
        enabled
          ? "border-primary/25 hover:border-primary/55"
          : "border-border opacity-80 hover:border-muted-foreground/45 hover:opacity-100",
      )}
    >
      <div className="flex min-w-0 items-start gap-3">
        <ModIcon enabled={enabled} />
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-start gap-2">
            <div className="min-w-0 flex-1">
              <h3 className="truncate font-heading text-sm font-semibold leading-5">
                {entry.displayName}
              </h3>
              <p className="mt-1 line-clamp-2 break-all font-mono text-muted-foreground text-xs leading-5">
                {entry.fileName}
              </p>
            </div>
          </div>

          <div className="mt-3 flex min-w-0 flex-wrap gap-1.5">
            <StatusBadge enabled={entry.enabled} />
            <Badge variant="secondary">Local Jar</Badge>
            <Badge variant="ghost">{formatBytes(entry.sizeBytes)}</Badge>
          </div>

          <div className="mt-3 grid gap-2 text-xs [grid-template-columns:repeat(auto-fit,minmax(8rem,1fr))]">
            <div className="min-w-0 rounded-md bg-muted/30 px-2 py-1.5">
              <div className="text-muted-foreground">Modified</div>
              <div className="mt-0.5 truncate font-semibold">
                {formatModified(entry.modifiedAt)}
              </div>
            </div>
            <div className="min-w-0 rounded-md bg-muted/30 px-2 py-1.5">
              <div className="text-muted-foreground">Updater</div>
              <div className="mt-0.5 truncate font-semibold">Manual file</div>
            </div>
          </div>

          <div className="mt-3 flex min-w-0 flex-wrap items-center gap-2 border-border border-t pt-3">
            <div className="flex items-center gap-2">
              <Switch
                aria-label={`${enabled ? "Disable" : "Enable"} ${entry.displayName}`}
                checked={enabled}
                disabled={mutating}
                onCheckedChange={(checked) =>
                  onToggleMod(entry.fileName, entry.displayName, checked)
                }
                size="sm"
              />
              <span className="text-xs font-medium">
                {enabled ? "Enabled" : "Disabled"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

function QuickActions({
  latestLog,
  logsFolderPath,
  onRefreshContent,
  onSetActiveTab,
}: {
  latestLog: InstanceFileEntry | null;
  logsFolderPath: string;
  onRefreshContent: () => void;
  onSetActiveTab: (tab: string) => void;
}) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-2">
        <Button
          className="w-full"
          onClick={() => openExternalPath(latestLog?.path ?? logsFolderPath)}
          size="sm"
          variant="outline"
        >
          <FileTextIcon data-icon="inline-start" />
          Latest Log
        </Button>
        <Button
          className="w-full"
          onClick={onRefreshContent}
          size="sm"
          variant="outline"
        >
          <RefreshCwIcon data-icon="inline-start" />
          Refresh
        </Button>
        <Button
          className="w-full sm:col-span-2"
          onClick={() => onSetActiveTab("settings")}
          size="sm"
          variant="outline"
        >
          <Settings2Icon data-icon="inline-start" />
          Edit Configuration
        </Button>
      </CardContent>
    </Card>
  );
}

function LaunchConfiguration({ instance }: { instance: LauncherInstance }) {
  const rows = [
    {
      icon: HardDriveIcon,
      label: "Memory",
      value: `${instance.memoryMinMb} / ${instance.memoryMaxMb} MB`,
    },
    {
      icon: HammerIcon,
      label: "Java",
      value: instance.javaExecutable ? "Custom Java" : "Managed Java",
    },
    {
      icon: TerminalSquareIcon,
      label: "Arguments",
      value: `${instance.javaArgs.length + instance.gameArgs.length} custom args`,
    },
  ];

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>Launch Configuration</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {rows.map((row) => {
          const Icon = row.icon;
          return (
            <div key={row.label} className="flex items-center gap-2 text-xs">
              <Icon className="size-3.5 shrink-0 text-muted-foreground" />
              <span className="min-w-20 text-muted-foreground">
                {row.label}
              </span>
              <span className="ml-auto truncate font-semibold">
                {row.value}
              </span>
            </div>
          );
        })}
        <Button
          className="mt-2 w-full"
          onClick={() => openExternalPath(instance.metadataPath)}
          size="sm"
          variant="outline"
        >
          <SlidersHorizontalIcon data-icon="inline-start" />
          Open Metadata
        </Button>
      </CardContent>
    </Card>
  );
}

function WarningPanel({
  disabledModsCount,
  contentError,
  instance,
}: {
  contentError: string | null;
  disabledModsCount: number;
  instance: LauncherInstance;
}) {
  const warnings = [
    ...(contentError ? [contentError] : []),
    ...(disabledModsCount > 0
      ? [
          `${disabledModsCount} mod${disabledModsCount === 1 ? "" : "s"} disabled`,
        ]
      : []),
  ];

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldAlertIcon className="size-4 text-amber-400" />
          Warnings
        </CardTitle>
        <CardAction>
          <Badge variant={warnings.length > 0 ? "default" : "outline"}>
            {warnings.length}
          </Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {warnings.length === 0 ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <CheckCircle2Icon className="size-3.5 text-primary" />
            No local content warnings.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {warnings.map((warning) => (
              <div
                key={warning}
                className="flex items-start gap-2 text-xs text-muted-foreground"
              >
                <ShieldAlertIcon className="mt-0.5 size-3.5 shrink-0 text-amber-400" />
                <span>{warning}</span>
              </div>
            ))}
          </div>
        )}
        <Button
          onClick={() => openExternalPath(instance.folders.logs)}
          size="sm"
          variant="outline"
        >
          Open Logs
        </Button>
      </CardContent>
    </Card>
  );
}

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
  mutating,
  onInstanceDeleted,
  onInstanceUpdated,
  onRefreshContent,
  onSetActiveTab,
  onSetAllModsEnabled,
  onToggleMod,
  resourcePacks,
  screenshots,
  serverList,
  shaderPacks,
  worlds,
}: InstanceCatalogTabsProps) {
  const latestLog =
    logs.find((entry) => entry.fileName.toLowerCase() === "latest.log") ??
    logs[0] ??
    null;
  const [modQuery, setModQuery] = useState("");
  const [modStatusFilter, setModStatusFilter] =
    useState<ModStatusFilter>("all");
  const [modSortField, setModSortField] = useState<ModSortField>("name");
  const filteredMods = useMemo(() => {
    const query = modQuery.trim().toLowerCase();

    return [...mods]
      .filter((entry) => {
        const matchesStatus =
          modStatusFilter === "all" ||
          (modStatusFilter === "enabled" && entry.enabled === true) ||
          (modStatusFilter === "disabled" && entry.enabled === false);
        const matchesQuery =
          query.length === 0 ||
          [entry.displayName, entry.fileName, entry.path]
            .join(" ")
            .toLowerCase()
            .includes(query);

        return matchesStatus && matchesQuery;
      })
      .sort((a, b) => {
        if (modSortField === "modified") {
          return (
            new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime()
          );
        }

        if (modSortField === "size") {
          return b.sizeBytes - a.sizeBytes;
        }

        return a.displayName.localeCompare(b.displayName);
      });
  }, [modQuery, modSortField, modStatusFilter, mods]);
  const filteredEnabledCount = filteredMods.filter(
    (entry) => entry.enabled === true,
  ).length;
  const filteredDisabledCount = filteredMods.filter(
    (entry) => entry.enabled === false,
  ).length;
  const allModsEnabled = mods.length > 0 && disabledModsCount === 0;
  const allModsDisabled = mods.length > 0 && enabledModsCount === 0;

  return (
    <Tabs
      value={activeTab}
      onValueChange={onSetActiveTab}
      className="min-w-0 flex-col gap-3"
    >
      <div className="min-w-0 overflow-x-auto border-b border-border">
        <TabsList
          className="h-10 w-max gap-3 bg-transparent p-0"
          variant="line"
        >
          {TAB_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <TabsTrigger
                key={item.value}
                className="h-10 px-3 text-xs"
                value={item.value}
              >
                <Icon />
                {item.label}
              </TabsTrigger>
            );
          })}
        </TabsList>
      </div>

      <TabsContent value="mods" className="w-full min-w-0">
        <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="min-w-0 overflow-hidden rounded-lg border border-border bg-card/70 shadow-[0_22px_70px_-58px_black]">
            <div className="grid gap-2 border-b border-border bg-background/35 p-3 sm:grid-cols-3">
              {[
                ["Enabled", enabledModsCount],
                ["Disabled", disabledModsCount],
                ["Total", mods.length],
              ].map(([label, value]) => (
                <div
                  className="min-w-0 rounded-md border border-border bg-background/50 px-3 py-2"
                  key={label}
                >
                  <div className="text-muted-foreground text-xs">{label}</div>
                  <div className="mt-0.5 truncate font-heading font-semibold text-lg">
                    {value}
                  </div>
                </div>
              ))}
            </div>

            <div className="grid min-w-0 gap-2 border-b border-border bg-background/25 p-3 lg:grid-cols-[minmax(14rem,1fr)_10rem_11rem]">
              <InputGroup className="h-9 min-w-0">
                <InputGroupAddon>
                  <SearchIcon />
                </InputGroupAddon>
                <InputGroupInput
                  aria-label="Search mods"
                  onChange={(event) => setModQuery(event.target.value)}
                  placeholder="Search local mods"
                  value={modQuery}
                />
              </InputGroup>

              <Select
                onValueChange={(value) =>
                  setModStatusFilter(value as ModStatusFilter)
                }
                value={modStatusFilter}
              >
                <SelectTrigger className="h-9 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {MOD_STATUS_FILTERS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>

              <Select
                onValueChange={(value) =>
                  setModSortField(value as ModSortField)
                }
                value={modSortField}
              >
                <SelectTrigger className="h-9 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {MOD_SORT_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>

              <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2 lg:col-span-3 xl:grid-cols-4">
                <Button
                  className="w-full"
                  disabled={mutating || mods.length === 0 || allModsEnabled}
                  onClick={() => onSetAllModsEnabled(true)}
                  size="sm"
                  variant="outline"
                >
                  <PlugZapIcon data-icon="inline-start" />
                  Enable All
                </Button>
                <Button
                  className="w-full"
                  disabled={mutating || mods.length === 0 || allModsDisabled}
                  onClick={() => onSetAllModsEnabled(false)}
                  size="sm"
                  variant="outline"
                >
                  <CheckCircle2Icon data-icon="inline-start" />
                  Disable All
                </Button>
                <Button
                  className="w-full"
                  onClick={onRefreshContent}
                  size="sm"
                  variant="outline"
                >
                  <RefreshCwIcon data-icon="inline-start" />
                  Refresh
                </Button>
                <Button
                  className="w-full"
                  onClick={() => openExternalPath(instance.folders.mods)}
                  size="sm"
                >
                  <FolderOpenIcon data-icon="inline-start" />
                  Open Mods Folder
                </Button>
              </div>
            </div>

            {contentLoading ? (
              <div className="p-6 text-sm text-muted-foreground">
                Loading instance content...
              </div>
            ) : filteredMods.length === 0 ? (
              <div className="p-3">
                <EmptyPanel
                  action={
                    mods.length === 0 ? undefined : (
                      <Button
                        onClick={() => {
                          setModQuery("");
                          setModStatusFilter("all");
                        }}
                        size="sm"
                        variant="outline"
                      >
                        Clear Filters
                      </Button>
                    )
                  }
                  description={
                    mods.length === 0
                      ? "Drop .jar files into the instance mods folder and refresh this page."
                      : "No local mods match the current search and status filter."
                  }
                  icon={PuzzleIcon}
                  title={
                    mods.length === 0 ? "No local mods found" : "No mods match"
                  }
                />
              </div>
            ) : (
              <div className="grid gap-3 p-3 [grid-template-columns:repeat(auto-fit,minmax(min(100%,20rem),1fr))]">
                {filteredMods.map((entry) => (
                  <ModCard
                    entry={entry}
                    key={entry.id}
                    mutating={mutating}
                    onToggleMod={onToggleMod}
                  />
                ))}
              </div>
            )}

            <div className="flex flex-col gap-3 border-t border-border bg-background/35 px-3 py-3 text-xs text-muted-foreground sm:flex-row sm:flex-wrap sm:items-center">
              <span>
                Showing {filteredMods.length} of {mods.length} mods
              </span>
              <span>{filteredEnabledCount} enabled in view</span>
              <span>{filteredDisabledCount} disabled in view</span>
              <span className="sm:ml-auto">
                Sorted by{" "}
                {
                  MOD_SORT_OPTIONS.find(
                    (option) => option.value === modSortField,
                  )?.label
                }
              </span>
            </div>
          </div>

          <aside className="flex min-w-0 flex-col gap-3">
            <QuickActions
              latestLog={latestLog}
              logsFolderPath={instance.folders.logs}
              onRefreshContent={onRefreshContent}
              onSetActiveTab={onSetActiveTab}
            />
            <LaunchConfiguration instance={instance} />
            <WarningPanel
              contentError={contentError}
              disabledModsCount={disabledModsCount}
              instance={instance}
            />
          </aside>
        </div>
      </TabsContent>

      <TabsContent value="servers" className="w-full min-w-0">
        <Card>
          <CardHeader>
            <CardTitle>Servers</CardTitle>
            <CardAction>
              <Button
                onClick={() => openExternalPath(instance.gameDirectory)}
                size="sm"
                variant="outline"
              >
                <FolderOpenIcon data-icon="inline-start" />
                Open Game Folder
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            {serverList ? (
              <FileCard entry={serverList} />
            ) : (
              <EmptyPanel
                description="Minecraft stores saved multiplayer servers in servers.dat. This instance does not have one yet."
                icon={ServerIcon}
                title="No saved server list"
              />
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="versions" className="w-full min-w-0">
        <Card>
          <CardHeader>
            <CardTitle>Versions</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 lg:grid-cols-3">
            {[
              ["Minecraft", instance.versionId],
              ["Loader", instance.loader],
              ["Loader version", instance.loaderVersion ?? "Managed"],
              ["Created", formatModified(instance.createdAt)],
              ["Updated", formatModified(instance.updatedAt)],
              [
                "Content refreshed",
                content ? formatModified(content.refreshedAt) : "Not loaded",
              ],
            ].map(([label, value]) => (
              <div
                className="rounded-lg border border-border bg-background/45 p-3"
                key={label}
              >
                <div className="text-xs text-muted-foreground">{label}</div>
                <div className="mt-1 truncate font-semibold">{value}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="resource-packs" className="w-full min-w-0">
        <FileListPanel
          emptyIcon={ArchiveIcon}
          emptyText="Drop .zip resource packs into this folder and refresh the inventory."
          emptyTitle="No resource packs found"
          entries={resourcePacks}
          folderPath={instance.folders.resourcePacks}
          title="Resource Packs"
        />
      </TabsContent>

      <TabsContent value="shader-packs" className="w-full min-w-0">
        <FileListPanel
          emptyIcon={GaugeIcon}
          emptyText="Drop shader packs into this folder and refresh the inventory."
          emptyTitle="No shader packs found"
          entries={shaderPacks}
          folderPath={instance.folders.shaderPacks}
          title="Shader Packs"
        />
      </TabsContent>

      <TabsContent value="screenshots" className="w-full min-w-0">
        <FileListPanel
          emptyIcon={CameraIcon}
          emptyText="Screenshots created by Minecraft for this instance will appear here."
          emptyTitle="No screenshots found"
          entries={screenshots}
          folderPath={instance.folders.screenshots}
          title="Screenshots"
        />
      </TabsContent>

      <TabsContent value="worlds" className="w-full min-w-0">
        <FileListPanel
          emptyIcon={HardDriveIcon}
          emptyText="Single-player worlds saved by this instance will appear here."
          emptyTitle="No worlds found"
          entries={worlds}
          folderPath={instance.folders.saves}
          title="Worlds"
        />
      </TabsContent>

      <TabsContent value="logs" className="w-full min-w-0">
        <InstanceLogsPanel
          active={activeTab === "logs"}
          instance={instance}
          logFolders={content?.logFolders ?? []}
          logs={logs}
          onRefreshContent={onRefreshContent}
        />
      </TabsContent>

      <TabsContent value="settings" className="w-full min-w-0">
        <InstanceSettingsPanel
          instance={instance}
          mods={mods}
          onInstanceDeleted={onInstanceDeleted}
          onInstanceUpdated={onInstanceUpdated}
          onReviewMods={() => onSetActiveTab("mods")}
        />
      </TabsContent>
    </Tabs>
  );
}
