import {
  CheckCircle2Icon,
  FolderOpenIcon,
  LayoutGridIcon,
  ListIcon,
  Loader2Icon,
  MoreHorizontalIcon,
  PlugZapIcon,
  PuzzleIcon,
  RefreshCwIcon,
  SearchIcon,
  ShieldIcon,
  XIcon,
} from "lucide-react";
import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from "react";
import type {
  InstanceContent,
  InstanceFileEntry,
  LauncherInstance,
} from "@/shared/types";
import { Button } from "@/views/main/components/ui/button";
import { Checkbox } from "@/views/main/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/views/main/components/ui/dropdown-menu";
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
import { InstanceCatalogEmptyPanel } from "@/views/main/features/instances/components/instance-catalog-empty-panel";
import { InstanceCatalogModCard } from "@/views/main/features/instances/components/instance-catalog-mod-card";
import { MOD_SORT_OPTIONS } from "@/views/main/features/instances/components/instance-catalog-options";
import type {
  ModSortField,
  ModStatusFilter,
} from "@/views/main/features/instances/components/instance-catalog-types";
import {
  formatContentBytes,
  openInstancePath,
} from "@/views/main/features/instances/components/instance-content-format";
import { InstanceWarningPanel } from "@/views/main/features/instances/components/instance-warning-panel";
import { getModManagementState } from "@/views/main/features/instances/instance-catalog-model";
import { cn } from "@/views/main/lib/utils";

type InstanceModsPanelProps = {
  content: InstanceContent | null;
  contentError: string | null;
  contentLoading: boolean;
  disabledModsCount: number;
  enabledModsCount: number;
  instance: LauncherInstance;
  latestLog: InstanceFileEntry | null;
  mods: Array<InstanceFileEntry>;
  modpackUpdateAvailable: boolean;
  mutating: boolean;
  onRefreshContent: () => void;
  onSetActiveTab: (tab: string) => void;
  onSetAllModsEnabled: (enabled: boolean) => void;
  onToggleMod: (
    fileName: string,
    name: string,
    enabled: boolean,
  ) => void | Promise<void>;
  onUpdateModpack: () => void;
  updatingModpack: boolean;
};

const MOD_RENDER_BATCH_SIZE = 96;

// Derive a stable hue from the mod name for icon coloring (matches design)
function getModHue(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % 360;
}

// Pull a version-looking token from a mod filename
function extractVersion(fileName: string): string | null {
  const stem = fileName.replace(/\.jar(\.disabled)?$/i, "");
  const matches = [
    ...stem.matchAll(/\b(\d+\.\d+(?:\.\d+)?(?:[-+][\w.]+)?)\b/g),
  ];
  const last = matches[matches.length - 1];
  return last ? (last[1] ?? null) : null;
}

type ViewMode = "list" | "grid";

export function InstanceModsPanel({
  content,
  contentError,
  contentLoading,
  disabledModsCount,
  enabledModsCount,
  instance,
  mods,
  modpackUpdateAvailable,
  mutating,
  onRefreshContent,
  onSetAllModsEnabled,
  onToggleMod,
  onUpdateModpack,
  updatingModpack,
}: InstanceModsPanelProps) {
  const [modQuery, setModQuery] = useState("");
  const [modStatusFilter, setModStatusFilter] =
    useState<ModStatusFilter>("all");
  const [modSortField, setModSortField] = useState<ModSortField>("name");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [selectedModFileNames, setSelectedModFileNames] = useState<Set<string>>(
    () => new Set(),
  );
  const [visibleModCount, setVisibleModCount] = useState(MOD_RENDER_BATCH_SIZE);
  const deferredModQuery = useDeferredValue(modQuery);

  const indexedMods = useMemo(
    () =>
      mods.map((entry) => ({
        entry,
        modifiedTime: new Date(entry.modifiedAt).getTime() || 0,
        searchText:
          `${entry.displayName} ${entry.fileName} ${entry.path}`.toLowerCase(),
      })),
    [mods],
  );

  const filteredModResult = useMemo(() => {
    const query = deferredModQuery.trim().toLowerCase();
    const filtered: Array<(typeof indexedMods)[number]> = [];
    let enabledInView = 0;
    let disabledInView = 0;

    for (const item of indexedMods) {
      const { entry } = item;
      const matchesStatus =
        modStatusFilter === "all" ||
        (modStatusFilter === "enabled" && entry.enabled === true) ||
        (modStatusFilter === "disabled" && entry.enabled === false);

      if (!matchesStatus) continue;
      if (query.length > 0 && !item.searchText.includes(query)) continue;

      if (entry.enabled === true) enabledInView += 1;
      if (entry.enabled === false) disabledInView += 1;
      filtered.push(item);
    }

    filtered.sort((a, b) => {
      const aEnabled = a.entry.enabled === true ? 0 : 1;
      const bEnabled = b.entry.enabled === true ? 0 : 1;
      if (aEnabled !== bEnabled) return aEnabled - bEnabled;
      if (modSortField === "modified") return b.modifiedTime - a.modifiedTime;
      if (modSortField === "size") return b.entry.sizeBytes - a.entry.sizeBytes;
      return a.entry.displayName.localeCompare(b.entry.displayName);
    });

    return {
      disabledInView,
      enabledInView,
      mods: filtered.map((item) => item.entry),
    };
  }, [deferredModQuery, indexedMods, modSortField, modStatusFilter]);

  const filteredMods = filteredModResult.mods;
  const visibleMods = useMemo(
    () => filteredMods.slice(0, visibleModCount),
    [filteredMods, visibleModCount],
  );
  const remainingModCount = Math.max(
    0,
    filteredMods.length - visibleMods.length,
  );

  const totalSize = useMemo(
    () => mods.reduce((sum, m) => sum + (m.sizeBytes || 0), 0),
    [mods],
  );
  const enabledSize = useMemo(
    () =>
      mods
        .filter((m) => m.enabled === true)
        .reduce((sum, m) => sum + (m.sizeBytes || 0), 0),
    [mods],
  );
  const sizeRatio = totalSize > 0 ? enabledSize / totalSize : 0;

  const allModsEnabled = mods.length > 0 && disabledModsCount === 0;
  const allModsDisabled = mods.length > 0 && enabledModsCount === 0;
  const modManagement = getModManagementState({
    content,
    contentLoading,
    instance,
  });
  const modpackLocked = modManagement.managedByModpack;
  const modpackName =
    instance.modpack?.name ?? content?.curseForge.modpacks?.[0]?.name;
  const initialContentLoading = contentLoading && !content;
  const filteringPending = deferredModQuery !== modQuery;

  const selectedMods = useMemo(
    () => mods.filter((mod) => selectedModFileNames.has(mod.fileName)),
    [mods, selectedModFileNames],
  );
  const selectedEnabledCount = selectedMods.filter(
    (mod) => mod.enabled === true,
  ).length;
  const selectedDisabledCount = selectedMods.filter(
    (mod) => mod.enabled === false,
  ).length;
  const canBulkChangeSelected =
    selectedMods.length > 0 && !modManagement.controlsDisabled && !mutating;

  useEffect(() => {
    setSelectedModFileNames((current) => {
      if (current.size === 0) return current;
      const available = new Set(mods.map((mod) => mod.fileName));
      const next = new Set(
        [...current].filter((fileName) => available.has(fileName)),
      );
      return next.size === current.size ? current : next;
    });
  }, [mods]);

  const setModSelected = useCallback((fileName: string, selected: boolean) => {
    setSelectedModFileNames((current) => {
      const next = new Set(current);
      if (selected) next.add(fileName);
      else next.delete(fileName);
      return next;
    });
  }, []);

  const setSelectedModsEnabled = async (enabled: boolean) => {
    if (!canBulkChangeSelected) return;
    const targets = selectedMods.filter((mod) => mod.enabled !== enabled);
    for (const mod of targets) {
      await onToggleMod(mod.fileName, mod.displayName, enabled);
    }
  };

  const statusFilters: Array<{
    id: ModStatusFilter;
    label: string;
    count: number;
  }> = [
    { id: "all", label: "All mods", count: mods.length },
    { id: "enabled", label: "Enabled", count: enabledModsCount },
    { id: "disabled", label: "Disabled", count: disabledModsCount },
  ];

  return (
    <div className="grid min-w-0 gap-3 lg:grid-cols-[230px_minmax(0,1fr)]">
      {/* ───────── Left Sidebar ───────── */}
      <aside className="flex flex-col gap-3">
        {/* Filter card (design: "Categories") */}
        <SidebarCard title="Filter">
          <div className="flex flex-col gap-px">
            {statusFilters.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => {
                  setModStatusFilter(f.id);
                  setVisibleModCount(MOD_RENDER_BATCH_SIZE);
                }}
                className={cn(
                  "flex items-center justify-between rounded px-2 py-1.5 text-left text-xs transition-colors",
                  modStatusFilter === f.id
                    ? "bg-[oklch(0.205_0.014_124)] font-semibold text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <span>{f.label}</span>
                <span className="font-mono text-[10px] text-muted-foreground tabular-nums">
                  {f.count}
                </span>
              </button>
            ))}
          </div>
        </SidebarCard>

        {/* Quick filter card */}
        <SidebarCard title="Quick filter">
          <div className="flex flex-col gap-1">
            <FilterRow
              label="Modpack-managed"
              count={modpackLocked ? mods.length : 0}
              disabled
            />
            <FilterRow
              label="Updates available"
              count={modpackUpdateAvailable ? 1 : 0}
              accent={modpackUpdateAvailable ? "text-amber-400" : undefined}
              disabled
            />
          </div>
        </SidebarCard>

        {/* Storage card */}
        <SidebarCard title="Storage">
          <div className="text-xs text-muted-foreground">
            <div className="mb-1 flex justify-between">
              <span>Mods folder</span>
              <span className="font-mono text-foreground">
                {formatContentBytes(totalSize)}
              </span>
            </div>
            <div className="h-1 overflow-hidden rounded-full bg-[oklch(0.205_0.014_124)]">
              <div
                className="h-full bg-primary transition-[width]"
                style={{ width: `${Math.round(sizeRatio * 100)}%` }}
              />
            </div>
            <div className="mt-1 font-mono text-[10px] text-muted-foreground">
              {formatContentBytes(enabledSize)} enabled ·{" "}
              {formatContentBytes(totalSize - enabledSize)} disabled
            </div>
          </div>
        </SidebarCard>

        {/* Warning panel — fold here when present */}
        <InstanceWarningPanel
          contentError={contentError}
          disabledModsCount={disabledModsCount}
          instance={instance}
          launchAttempts={content?.launchAttempts ?? []}
          recipe={content?.recipe ?? null}
        />
      </aside>

      {/* ───────── Main Content ───────── */}
      <div className="flex min-w-0 flex-col gap-2.5">
        {/* Modpack-managed banner (matches design exactly) */}
        {modpackLocked ? (
          <div className="flex items-center gap-2.5 rounded-lg border border-[oklch(0.32_0.1_145)] bg-[oklch(0.18_0.06_145_/_0.5)] px-3 py-2.5">
            <div className="flex size-7 shrink-0 items-center justify-center rounded bg-[oklch(0.32_0.1_145)] text-primary">
              <ShieldIcon className="size-3.5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold text-primary">
                Modpack-managed
              </div>
              <div className="truncate text-[11px] text-muted-foreground">
                Mods are controlled by {modpackName ?? "the linked modpack"}.
                Use Update Modpack when the linked source has a newer pack
                version.
              </div>
            </div>
            {modpackUpdateAvailable ? (
              <span className="whitespace-nowrap rounded border border-[oklch(0.4_0.14_80)] bg-[oklch(0.22_0.08_80)] px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.06em] text-[oklch(0.82_0.16_80)]">
                Updates available
              </span>
            ) : null}
            <button
              type="button"
              disabled={updatingModpack || !modpackUpdateAvailable}
              onClick={onUpdateModpack}
              className="inline-flex shrink-0 items-center gap-1.5 rounded bg-primary px-2.5 py-1.5 text-[11px] font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {updatingModpack ? (
                <Loader2Icon className="size-3 animate-spin" />
              ) : (
                <RefreshCwIcon className="size-3" />
              )}
              Update pack
            </button>
          </div>
        ) : null}

        {/* Toolbar (matches design exactly) */}
        <div className="flex items-center gap-2 rounded-lg border border-border bg-card/50 px-2.5 py-2">
          <InputGroup className="h-8 min-w-0 flex-1">
            <InputGroupAddon>
              <SearchIcon />
            </InputGroupAddon>
            <InputGroupInput
              aria-label="Search mods"
              onChange={(event) => {
                setModQuery(event.target.value);
                setVisibleModCount(MOD_RENDER_BATCH_SIZE);
              }}
              placeholder={`Search ${mods.length} mods, files…`}
              value={modQuery}
            />
          </InputGroup>

          <Select
            onValueChange={(value) => {
              setModSortField(value as ModSortField);
              setVisibleModCount(MOD_RENDER_BATCH_SIZE);
            }}
            value={modSortField}
          >
            <SelectTrigger className="h-8 w-36 shrink-0 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {MOD_SORT_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    Sort: {option.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>

          {/* List/Grid toggle */}
          <div className="flex shrink-0 gap-0.5 rounded border border-border bg-background/50 p-0.5">
            <button
              type="button"
              aria-label="List view"
              onClick={() => setViewMode("list")}
              className={cn(
                "flex size-7 items-center justify-center rounded transition-colors",
                viewMode === "list"
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <ListIcon className="size-3.5" />
            </button>
            <button
              type="button"
              aria-label="Grid view"
              onClick={() => setViewMode("grid")}
              className={cn(
                "flex size-7 items-center justify-center rounded transition-colors",
                viewMode === "grid"
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <LayoutGridIcon className="size-3.5" />
            </button>
          </div>

          <button
            type="button"
            disabled={modpackLocked}
            onClick={() => openInstancePath(instance.folders.mods)}
            className="inline-flex shrink-0 items-center gap-1.5 rounded border border-border bg-background/50 px-2.5 py-1.5 text-[11px] text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FolderOpenIcon className="size-3" />
            Open folder
          </button>

          <button
            type="button"
            onClick={onRefreshContent}
            className="inline-flex shrink-0 items-center gap-1.5 rounded border border-border bg-background/50 px-2.5 py-1.5 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
          >
            <RefreshCwIcon className="size-3" />
            Refresh
          </button>
        </div>

        {/* Bulk action bar (when mods selected) */}
        {selectedMods.length > 0 ? (
          <div className="sticky top-0 z-10 flex flex-col gap-2 rounded-lg border border-primary/25 bg-background/95 px-3 py-2 shadow-[0_18px_45px_-38px_black] backdrop-blur sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold">
                {selectedMods.length} selected
              </div>
              <div className="text-xs text-muted-foreground">
                {selectedEnabledCount} enabled · {selectedDisabledCount}{" "}
                disabled
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                disabled={
                  !canBulkChangeSelected ||
                  selectedEnabledCount === selectedMods.length
                }
                onClick={() => void setSelectedModsEnabled(true)}
                size="sm"
                variant="outline"
              >
                <PlugZapIcon data-icon="inline-start" />
                Enable
              </Button>
              <Button
                disabled={
                  !canBulkChangeSelected ||
                  selectedDisabledCount === selectedMods.length
                }
                onClick={() => void setSelectedModsEnabled(false)}
                size="sm"
                variant="outline"
              >
                <CheckCircle2Icon data-icon="inline-start" />
                Disable
              </Button>
              <Button
                disabled={
                  modManagement.controlsDisabled ||
                  mutating ||
                  mods.length === 0 ||
                  allModsEnabled
                }
                onClick={() => onSetAllModsEnabled(true)}
                size="sm"
                variant="ghost"
              >
                Enable all
              </Button>
              <Button
                disabled={
                  modManagement.controlsDisabled ||
                  mutating ||
                  mods.length === 0 ||
                  allModsDisabled
                }
                onClick={() => onSetAllModsEnabled(false)}
                size="sm"
                variant="ghost"
              >
                Disable all
              </Button>
              <Button
                onClick={() => setSelectedModFileNames(new Set())}
                size="sm"
                variant="ghost"
              >
                <XIcon data-icon="inline-start" />
                Clear
              </Button>
            </div>
          </div>
        ) : null}

        {/* Mod list/grid */}
        <div className="min-w-0">
          {initialContentLoading ? (
            <div className="p-6 text-sm text-muted-foreground">
              Loading instance content...
            </div>
          ) : filteredMods.length === 0 ? (
            <div className="p-3">
              <InstanceCatalogEmptyPanel
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
                    ? modpackLocked
                      ? "This linked modpack has not installed any mod files yet."
                      : "Drop .jar files into the instance mods folder and refresh this page."
                    : "No local mods match the current search and status filter."
                }
                icon={PuzzleIcon}
                title={
                  mods.length === 0 ? "No local mods found" : "No mods match"
                }
              />
            </div>
          ) : viewMode === "list" ? (
            <div className="flex flex-col gap-1.5">
              {visibleMods.map((entry) => (
                <ModListRow
                  entry={entry}
                  key={entry.id}
                  managedByModpack={modpackLocked}
                  mutating={mutating || modManagement.controlsDisabled}
                  onSelectedChange={setModSelected}
                  onToggleMod={onToggleMod}
                  selected={selectedModFileNames.has(entry.fileName)}
                />
              ))}
              {remainingModCount > 0 ? (
                <div className="flex justify-center border-t border-border pt-3">
                  <Button
                    onClick={() =>
                      setVisibleModCount(
                        (count) => count + MOD_RENDER_BATCH_SIZE,
                      )
                    }
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    Show next{" "}
                    {Math.min(MOD_RENDER_BATCH_SIZE, remainingModCount)} mods
                  </Button>
                </div>
              ) : (
                <div className="py-2 text-center font-mono text-[10px] text-muted-foreground">
                  ··· showing {visibleMods.length} of {filteredMods.length} mods
                  ···
                </div>
              )}
            </div>
          ) : (
            <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(100%,15rem),1fr))]">
              {visibleMods.map((entry) => (
                <InstanceCatalogModCard
                  entry={entry}
                  key={entry.id}
                  managedByModpack={modpackLocked}
                  mutating={mutating || modManagement.controlsDisabled}
                  onSelectedChange={setModSelected}
                  onToggleMod={onToggleMod}
                  selected={selectedModFileNames.has(entry.fileName)}
                />
              ))}
              {remainingModCount > 0 ? (
                <div className="col-span-full flex justify-center border-t border-border pt-3">
                  <Button
                    onClick={() =>
                      setVisibleModCount(
                        (count) => count + MOD_RENDER_BATCH_SIZE,
                      )
                    }
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    Show next{" "}
                    {Math.min(MOD_RENDER_BATCH_SIZE, remainingModCount)} mods
                  </Button>
                </div>
              ) : null}
            </div>
          )}
        </div>

        {/* Footer stats */}
        <div className="flex flex-col gap-3 border-t border-border px-1 py-2 text-xs text-muted-foreground sm:flex-row sm:flex-wrap sm:items-center">
          <span>
            Showing {visibleMods.length} of {filteredMods.length} matching mods
          </span>
          <span>{filteredModResult.enabledInView} enabled in view</span>
          <span>{filteredModResult.disabledInView} disabled in view</span>
          {filteringPending ? <span>Updating search...</span> : null}
          <span className="sm:ml-auto">
            Sorted by{" "}
            {
              MOD_SORT_OPTIONS.find((option) => option.value === modSortField)
                ?.label
            }
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Subcomponents ──

function SidebarCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-card/50 p-3">
      <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
        {title}
      </div>
      {children}
    </div>
  );
}

function FilterRow({
  label,
  count,
  accent,
  disabled,
}: {
  label: string;
  count: number;
  accent?: string;
  disabled?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between rounded px-2 py-1 text-xs",
        disabled && "opacity-60",
      )}
    >
      <span className="text-muted-foreground">{label}</span>
      <span
        className={cn(
          "font-mono text-[10px] tabular-nums",
          accent ?? "text-muted-foreground",
        )}
      >
        {count}
      </span>
    </div>
  );
}

// ── Mod list row ──
function ModListRow({
  entry,
  managedByModpack,
  mutating,
  onSelectedChange,
  onToggleMod,
  selected,
}: {
  entry: InstanceFileEntry;
  managedByModpack: boolean;
  mutating: boolean;
  onSelectedChange: (fileName: string, selected: boolean) => void;
  onToggleMod: (
    fileName: string,
    name: string,
    enabled: boolean,
  ) => void | Promise<void>;
  selected: boolean;
}) {
  const enabled = entry.enabled === true;
  const hue = getModHue(entry.displayName);
  const version = extractVersion(entry.fileName);
  const initials =
    entry.displayName
      .replace(/[^a-zA-Z0-9]/g, "")
      .slice(0, 2)
      .toUpperCase() || "M?";
  const sizeStr =
    entry.sizeBytes < 1024
      ? `${entry.sizeBytes} B`
      : entry.sizeBytes < 1024 * 1024
        ? `${(entry.sizeBytes / 1024).toFixed(1)} KB`
        : `${(entry.sizeBytes / (1024 * 1024)).toFixed(1)} MB`;

  return (
    <div
      className={cn(
        "grid grid-cols-[auto_minmax(0,1fr)_auto_auto_auto_auto] items-center gap-3 rounded-lg border border-border bg-card/60 px-3 py-2.5 transition-colors hover:border-border/80",
        !enabled && "opacity-70",
      )}
    >
      {/* Checkbox + Icon */}
      <div className="flex items-center gap-2.5">
        <Checkbox
          aria-label={`Select ${entry.displayName}`}
          checked={selected}
          onCheckedChange={(checked) =>
            onSelectedChange(entry.fileName, checked === true)
          }
        />
        <div
          className="flex size-9 shrink-0 items-center justify-center rounded border font-mono text-[13px] font-bold"
          style={{
            background: `oklch(0.35 0.12 ${hue})`,
            borderColor: `oklch(0.45 0.14 ${hue})`,
            color: `oklch(0.85 0.1 ${hue})`,
          }}
        >
          {initials}
        </div>
      </div>

      {/* Name + filename */}
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-[13.5px] font-semibold text-foreground">
            {entry.displayName}
          </span>
          {managedByModpack && (
            <span className="rounded border border-primary/30 bg-primary/10 px-1.5 font-mono text-[9px] font-semibold uppercase tracking-wide text-primary">
              MODPACK
            </span>
          )}
        </div>
        <div className="truncate font-mono text-[11px] text-muted-foreground">
          {entry.fileName}
        </div>
      </div>

      {/* Version */}
      <div className="flex flex-col items-end gap-0.5">
        {version ? (
          <span className="font-mono text-[11px] text-foreground">
            {version}
          </span>
        ) : (
          <span className="font-mono text-[10px] text-muted-foreground">—</span>
        )}
      </div>

      {/* Status badge */}
      <div className="flex flex-col items-end gap-0.5">
        {enabled ? (
          <span className="rounded border border-primary/40 bg-primary/10 px-1.5 py-px font-mono text-[9px] font-semibold uppercase tracking-wide text-primary">
            Enabled
          </span>
        ) : entry.enabled === false ? (
          <span className="rounded border border-border bg-muted/40 px-1.5 py-px font-mono text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
            Disabled
          </span>
        ) : (
          <span className="rounded border border-border bg-muted/40 px-1.5 py-px font-mono text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
            Unknown
          </span>
        )}
      </div>

      {/* Size */}
      <span className="min-w-[60px] text-right font-mono text-[11px] text-muted-foreground">
        {sizeStr}
      </span>

      {/* Toggle + more */}
      <div className="flex items-center gap-2">
        <Switch
          aria-label={enabled ? "Disable mod" : "Enable mod"}
          checked={enabled}
          disabled={mutating || entry.enabled === null}
          onCheckedChange={(checked) =>
            void onToggleMod(entry.fileName, entry.displayName, checked)
          }
        />
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button
                type="button"
                aria-label="More actions"
                className="flex size-7 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              />
            }
          >
            <MoreHorizontalIcon className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => openInstancePath(entry.path)}>
              <FolderOpenIcon />
              Reveal in folder
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
