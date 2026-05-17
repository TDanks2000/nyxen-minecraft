import {
  CheckCircle2Icon,
  FolderOpenIcon,
  PlugZapIcon,
  PuzzleIcon,
  RefreshCwIcon,
  SearchIcon,
  ShieldAlertIcon,
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
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/views/main/components/ui/alert";
import { Button } from "@/views/main/components/ui/button";
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
import { InstanceCatalogEmptyPanel } from "@/views/main/features/instances/components/instance-catalog-empty-panel";
import { InstanceCatalogLaunchConfiguration } from "@/views/main/features/instances/components/instance-catalog-launch-configuration";
import { InstanceCatalogModCard } from "@/views/main/features/instances/components/instance-catalog-mod-card";
import {
  MOD_SORT_OPTIONS,
  MOD_STATUS_FILTERS,
} from "@/views/main/features/instances/components/instance-catalog-options";
import { InstanceCatalogQuickActions } from "@/views/main/features/instances/components/instance-catalog-quick-actions";
import type {
  ModSortField,
  ModStatusFilter,
} from "@/views/main/features/instances/components/instance-catalog-types";
import { openInstancePath } from "@/views/main/features/instances/components/instance-content-format";
import { InstanceWarningPanel } from "@/views/main/features/instances/components/instance-warning-panel";
import { getModManagementState } from "@/views/main/features/instances/instance-catalog-model";

type InstanceModsPanelProps = {
  content: InstanceContent | null;
  contentError: string | null;
  contentLoading: boolean;
  disabledModsCount: number;
  enabledModsCount: number;
  instance: LauncherInstance;
  latestLog: InstanceFileEntry | null;
  mods: Array<InstanceFileEntry>;
  mutating: boolean;
  onRefreshContent: () => void;
  onSetActiveTab: (tab: string) => void;
  onSetAllModsEnabled: (enabled: boolean) => void;
  onToggleMod: (
    fileName: string,
    name: string,
    enabled: boolean,
  ) => void | Promise<void>;
};

const MOD_RENDER_BATCH_SIZE = 96;

export function InstanceModsPanel({
  content,
  contentError,
  contentLoading,
  disabledModsCount,
  enabledModsCount,
  instance,
  latestLog,
  mods,
  mutating,
  onRefreshContent,
  onSetActiveTab,
  onSetAllModsEnabled,
  onToggleMod,
}: InstanceModsPanelProps) {
  const [modQuery, setModQuery] = useState("");
  const [modStatusFilter, setModStatusFilter] =
    useState<ModStatusFilter>("all");
  const [modSortField, setModSortField] = useState<ModSortField>("name");
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

      if (modSortField === "modified") {
        return b.modifiedTime - a.modifiedTime;
      }

      if (modSortField === "size") {
        return b.entry.sizeBytes - a.entry.sizeBytes;
      }

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
      if (selected) {
        next.add(fileName);
      } else {
        next.delete(fileName);
      }
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

  return (
    <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="min-w-0 overflow-hidden rounded-lg border border-border bg-card/70 shadow-[0_22px_70px_-58px_black]">
        {modpackLocked ? (
          <Alert className="m-3 mb-0 border-primary/30 bg-primary/5">
            <ShieldAlertIcon />
            <AlertTitle>Modpack Managed</AlertTitle>
            <AlertDescription>
              Mods are controlled by {modpackName ?? "the linked modpack"}. Use
              Update Modpack when the linked source has a newer pack version.
            </AlertDescription>
          </Alert>
        ) : null}

        <div className="grid gap-2 border-border border-b bg-background/35 p-3 sm:grid-cols-3">
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

        <div className="grid min-w-0 gap-2 border-border border-b bg-background/25 p-3 lg:grid-cols-[minmax(14rem,1fr)_10rem_11rem]">
          <InputGroup className="h-9 min-w-0">
            <InputGroupAddon>
              <SearchIcon />
            </InputGroupAddon>
            <InputGroupInput
              aria-label="Search mods"
              onChange={(event) => {
                setModQuery(event.target.value);
                setVisibleModCount(MOD_RENDER_BATCH_SIZE);
              }}
              placeholder="Search local mods"
              value={modQuery}
            />
          </InputGroup>

          <Select
            onValueChange={(value) => {
              setModStatusFilter(value as ModStatusFilter);
              setVisibleModCount(MOD_RENDER_BATCH_SIZE);
            }}
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
            onValueChange={(value) => {
              setModSortField(value as ModSortField);
              setVisibleModCount(MOD_RENDER_BATCH_SIZE);
            }}
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
              disabled={
                modManagement.controlsDisabled ||
                mutating ||
                mods.length === 0 ||
                allModsEnabled
              }
              onClick={() => onSetAllModsEnabled(true)}
              size="sm"
              variant="outline"
            >
              <PlugZapIcon data-icon="inline-start" />
              Enable All
            </Button>
            <Button
              className="w-full"
              disabled={
                modManagement.controlsDisabled ||
                mutating ||
                mods.length === 0 ||
                allModsDisabled
              }
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
              disabled={modpackLocked}
              onClick={() => openInstancePath(instance.folders.mods)}
              size="sm"
              title={
                modpackLocked
                  ? "Mods are managed by the linked modpack."
                  : undefined
              }
              variant="outline"
            >
              <FolderOpenIcon data-icon="inline-start" />
              Open Mods Folder
            </Button>
          </div>
        </div>

        {selectedMods.length > 0 ? (
          <div className="sticky top-0 z-10 flex flex-col gap-2 border-primary/25 border-y bg-background/95 px-3 py-2 shadow-[0_18px_45px_-38px_black] backdrop-blur sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1">
              <div className="truncate font-semibold text-sm">
                {selectedMods.length} selected
              </div>
              <div className="text-muted-foreground text-xs">
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
                Enable Selected
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
                Disable Selected
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

        {initialContentLoading ? (
          <div className="p-6 text-muted-foreground text-sm">
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
        ) : (
          <div className="grid gap-3 p-3 [grid-template-columns:repeat(auto-fit,minmax(min(100%,20rem),1fr))]">
            {visibleMods.map((entry, index) => {
              const previous = visibleMods[index - 1];
              const groupLabel =
                modpackLocked && index === 0
                  ? "Managed by modpack"
                  : !modpackLocked &&
                      entry.enabled === false &&
                      previous?.enabled !== false
                    ? "Disabled"
                    : !modpackLocked &&
                        entry.enabled !== false &&
                        (index === 0 || previous?.enabled === false)
                      ? "Added locally"
                      : null;

              return (
                <div className="contents" key={entry.id}>
                  {groupLabel ? (
                    <div className="col-span-full flex items-center gap-2 pt-1">
                      <span className="text-muted-foreground text-xs font-black uppercase tracking-widest">
                        {groupLabel}
                      </span>
                      <span className="h-px flex-1 bg-border" />
                    </div>
                  ) : null}
                  <InstanceCatalogModCard
                    entry={entry}
                    managedByModpack={modpackLocked}
                    mutating={mutating || modManagement.controlsDisabled}
                    onSelectedChange={setModSelected}
                    onToggleMod={onToggleMod}
                    selected={selectedModFileNames.has(entry.fileName)}
                  />
                </div>
              );
            })}
            {remainingModCount > 0 ? (
              <div className="col-span-full flex justify-center border-border border-t pt-3">
                <Button
                  onClick={() =>
                    setVisibleModCount((count) => count + MOD_RENDER_BATCH_SIZE)
                  }
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  Show next {Math.min(MOD_RENDER_BATCH_SIZE, remainingModCount)}{" "}
                  mods
                </Button>
              </div>
            ) : null}
          </div>
        )}

        <div className="flex flex-col gap-3 border-border border-t bg-background/35 px-3 py-3 text-muted-foreground text-xs sm:flex-row sm:flex-wrap sm:items-center">
          <span>
            Showing {visibleMods.length} of {filteredMods.length} matching mods
          </span>
          <span>{filteredModResult.enabledInView} enabled in results</span>
          <span>{filteredModResult.disabledInView} disabled in results</span>
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

      <aside className="flex min-w-0 flex-col gap-3">
        <InstanceCatalogQuickActions
          latestLog={latestLog}
          logsFolderPath={instance.folders.logs}
          onRefreshContent={onRefreshContent}
          onSetActiveTab={onSetActiveTab}
        />
        <InstanceCatalogLaunchConfiguration instance={instance} />
        <InstanceWarningPanel
          contentError={contentError}
          disabledModsCount={disabledModsCount}
          instance={instance}
          launchAttempts={content?.launchAttempts ?? []}
          recipe={content?.recipe ?? null}
        />
      </aside>
    </div>
  );
}
