import { formatDistanceToNow } from "date-fns";
import {
  ArchiveIcon,
  CameraIcon,
  CheckCircle2Icon,
  ChevronLeftIcon,
  ChevronRightIcon,
  FileTextIcon,
  FolderOpenIcon,
  GaugeIcon,
  HammerIcon,
  HardDriveIcon,
  MoreHorizontalIcon,
  PlugZapIcon,
  PuzzleIcon,
  RefreshCwIcon,
  SearchIcon,
  ServerIcon,
  Settings2Icon,
  ShieldAlertIcon,
  SlidersHorizontalIcon,
  TerminalSquareIcon,
  WrenchIcon,
  ZapIcon,
} from "lucide-react";
import type { ElementType } from "react";
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
import { Checkbox } from "@/views/main/components/ui/checkbox";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/views/main/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/views/main/components/ui/tabs";
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
  onCreateLaunchPlan: () => void;
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
    <article className="rounded-lg border border-border bg-background/45 p-3">
      <div className="flex items-start gap-3">
        <Checkbox aria-label={`Select ${entry.displayName}`} />
        <ModIcon enabled={enabled} />
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-start justify-between gap-2">
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
              <MoreHorizontalIcon />
            </Button>
          </div>

          <div className="mt-3 flex flex-wrap gap-1.5">
            <StatusBadge enabled={entry.enabled} />
            <Badge variant="secondary">Local Jar</Badge>
            <Badge variant="ghost">{formatBytes(entry.sizeBytes)}</Badge>
          </div>

          <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
            <div className="rounded-md bg-muted/30 px-2 py-1.5">
              <div className="text-muted-foreground">Modified</div>
              <div className="mt-0.5 font-semibold">
                {formatModified(entry.modifiedAt)}
              </div>
            </div>
            <div className="rounded-md bg-muted/30 px-2 py-1.5">
              <div className="text-muted-foreground">Updater</div>
              <div className="mt-0.5 font-semibold">Manual file</div>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
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
            <Button
              onClick={() => openExternalPath(entry.path)}
              size="sm"
              variant="outline"
            >
              <FolderOpenIcon data-icon="inline-start" />
              Open
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
}

function ModTableRow({
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
    <TableRow className="border-border/70 hover:bg-muted/35">
      <TableCell className="w-8">
        <Checkbox aria-label={`Select ${entry.displayName}`} />
      </TableCell>
      <TableCell className="min-w-48">
        <div className="flex min-w-0 items-center gap-3">
          <ModIcon enabled={enabled} />
          <div className="min-w-0">
            <div className="truncate font-semibold text-foreground">
              {entry.displayName}
            </div>
            <div className="mt-0.5 truncate font-mono text-xs text-muted-foreground">
              {entry.fileName}
            </div>
          </div>
        </div>
      </TableCell>
      <TableCell>
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
      </TableCell>
      <TableCell>{formatBytes(entry.sizeBytes)}</TableCell>
      <TableCell>{formatModified(entry.modifiedAt)}</TableCell>
      <TableCell>
        <Badge variant="secondary">Local Jar</Badge>
      </TableCell>
      <TableCell className="max-w-64 whitespace-normal text-xs leading-5 text-muted-foreground">
        {entry.path}
      </TableCell>
      <TableCell>
        <div className="flex justify-end gap-1.5">
          <Button
            onClick={() => openExternalPath(entry.path)}
            size="sm"
            variant="outline"
          >
            Open
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

function QuickActions({
  instance,
  latestLog,
  onCreateLaunchPlan,
  onRefreshContent,
  onSetActiveTab,
}: {
  instance: LauncherInstance;
  latestLog: InstanceFileEntry | null;
  onCreateLaunchPlan: () => void;
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
          onClick={() => openExternalPath(instance.folders.mods)}
          size="sm"
          variant="outline"
        >
          <FolderOpenIcon data-icon="inline-start" />
          Open Mods
        </Button>
        <Button
          className="w-full"
          onClick={() =>
            openExternalPath(latestLog?.path ?? instance.folders.logs)
          }
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
        <Button className="w-full" onClick={onCreateLaunchPlan} size="sm">
          <WrenchIcon data-icon="inline-start" />
          Launch Report
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
    ...(instance.profileId ? [] : ["Offline profile selected"]),
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

function SettingsGrid({ instance }: { instance: LauncherInstance }) {
  const paths: Array<[label: string, path: string]> = [
    ["Game directory", instance.gameDirectory],
    ["Mods", instance.folders.mods],
    ["Resource packs", instance.folders.resourcePacks],
    ["Shader packs", instance.folders.shaderPacks],
    ["Screenshots", instance.folders.screenshots],
    ["Logs", instance.folders.logs],
    ["Metadata", instance.metadataPath],
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Settings</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 lg:grid-cols-2">
        {paths.map(([label, path]) => (
          <div
            className="min-w-0 rounded-lg border border-border bg-background/45 p-3"
            key={label}
          >
            <div className="text-xs text-muted-foreground">{label}</div>
            <div className="mt-1 truncate font-mono text-xs">{path}</div>
            <Button
              className="mt-3"
              onClick={() => openExternalPath(path)}
              size="sm"
              variant="outline"
            >
              <FolderOpenIcon data-icon="inline-start" />
              Open
            </Button>
          </div>
        ))}
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
  onCreateLaunchPlan,
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
  const latestLog = logs[0] ?? null;
  const filteredMods = mods;

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
            <div className="flex flex-col gap-2 border-b border-border bg-background/35 p-3 md:flex-row md:flex-wrap md:items-center">
              <InputGroup className="w-full md:w-64">
                <InputGroupAddon>
                  <SearchIcon />
                </InputGroupAddon>
                <InputGroupInput
                  aria-label="Search mods"
                  disabled
                  placeholder="Local mod search is coming soon"
                />
              </InputGroup>

              <Select value="all">
                <SelectTrigger className="w-full md:w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="all">Filter: All</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>

              <Select value="name">
                <SelectTrigger className="w-full md:w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="name">Sort: File Name</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>

              <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-3 md:ml-auto md:w-auto md:flex md:flex-wrap">
                <Button
                  className="w-full md:w-auto"
                  disabled={mutating || mods.length === 0}
                  onClick={() => onSetAllModsEnabled(true)}
                  size="sm"
                  variant="outline"
                >
                  <PlugZapIcon data-icon="inline-start" />
                  Enable All
                </Button>
                <Button
                  className="w-full md:w-auto"
                  disabled={mutating || mods.length === 0}
                  onClick={() => onSetAllModsEnabled(false)}
                  size="sm"
                  variant="outline"
                >
                  <CheckCircle2Icon data-icon="inline-start" />
                  Disable All
                </Button>
                <Button
                  className="w-full md:w-auto"
                  onClick={onRefreshContent}
                  size="sm"
                >
                  <RefreshCwIcon data-icon="inline-start" />
                  Refresh
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
                    <Button
                      onClick={() => openExternalPath(instance.folders.mods)}
                      size="sm"
                      variant="outline"
                    >
                      <FolderOpenIcon data-icon="inline-start" />
                      Open Mods Folder
                    </Button>
                  }
                  description="Drop .jar files into the instance mods folder and refresh this page."
                  icon={PuzzleIcon}
                  title="No local mods found"
                />
              </div>
            ) : (
              <>
                <div className="flex flex-col gap-2 p-3 lg:hidden">
                  {filteredMods.map((entry) => (
                    <ModCard
                      entry={entry}
                      key={entry.id}
                      mutating={mutating}
                      onToggleMod={onToggleMod}
                    />
                  ))}
                </div>

                <div className="hidden lg:block">
                  <Table className="min-w-[920px]">
                    <TableHeader className="bg-muted/20">
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="w-8">
                          <Checkbox aria-label="Select all visible mods" />
                        </TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Size</TableHead>
                        <TableHead>Modified</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Path</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredMods.map((entry) => (
                        <ModTableRow
                          entry={entry}
                          key={entry.id}
                          mutating={mutating}
                          onToggleMod={onToggleMod}
                        />
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}

            <div className="flex flex-col gap-3 border-t border-border bg-background/35 px-3 py-3 text-xs text-muted-foreground sm:flex-row sm:flex-wrap sm:items-center">
              <span>
                Showing {filteredMods.length} of {mods.length} mods
              </span>
              <span>{enabledModsCount} enabled</span>
              <span>{disabledModsCount} disabled</span>
              <div className="flex items-center gap-1 sm:ml-auto">
                <Button
                  aria-label="Previous mod page"
                  disabled
                  size="icon-sm"
                  variant="outline"
                >
                  <ChevronLeftIcon />
                </Button>
                <Button size="sm">1</Button>
                <Button
                  aria-label="Next mod page"
                  disabled
                  size="icon-sm"
                  variant="outline"
                >
                  <ChevronRightIcon />
                </Button>
              </div>
            </div>
          </div>

          <aside className="flex min-w-0 flex-col gap-3">
            <QuickActions
              instance={instance}
              latestLog={latestLog}
              onCreateLaunchPlan={onCreateLaunchPlan}
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
        <FileListPanel
          emptyIcon={FileTextIcon}
          emptyText="Minecraft logs for this instance will appear here after the game runs."
          emptyTitle="No logs found"
          entries={logs}
          folderPath={instance.folders.logs}
          title="Logs"
        />
      </TabsContent>

      <TabsContent value="settings" className="w-full min-w-0">
        <SettingsGrid instance={instance} />
      </TabsContent>
    </Tabs>
  );
}
