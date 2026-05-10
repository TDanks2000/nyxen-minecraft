import {
  AlertCircleIcon,
  BlocksIcon,
  CheckCircle2Icon,
  Grid2X2Icon,
  ImageIcon,
  ListIcon,
  MapIcon,
  PackageIcon,
  RefreshCcwIcon,
  SearchIcon,
  ServerIcon,
  SlidersHorizontalIcon,
  SparklesIcon,
  XIcon,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type {
  CurseForgeCategory,
  CurseForgeProjectSummary,
  CurseForgeSortField,
  ModLoader,
} from "@/shared/types";
import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from "@/views/main/components/ui/alert";
import { Badge } from "@/views/main/components/ui/badge";
import { Button } from "@/views/main/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/views/main/components/ui/dialog";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/views/main/components/ui/empty";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/views/main/components/ui/input-group";
import { ScrollArea } from "@/views/main/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/views/main/components/ui/select";
import { Skeleton } from "@/views/main/components/ui/skeleton";
import { Switch } from "@/views/main/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/views/main/components/ui/tabs";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/views/main/components/ui/toggle-group";
import { CurseForgeResultCard } from "@/views/main/features/curseforge/components/curseforge-result-card";
import {
  CURSEFORGE_CATEGORIES,
  CURSEFORGE_LOADER_OPTIONS,
  CURSEFORGE_SORT_OPTIONS,
  categoryRequiresInstanceTarget,
  categorySupportsLoaderFilter,
  DEFAULT_CURSEFORGE_CATEGORY,
  findInstalledCurseForgeItem,
  formatCurseForgeDate,
  formatCurseForgeDownloads,
  getCurseForgeActionState,
  getCurseForgeCategoryLabel,
  getCurseForgeExpectedFileName,
  getCurseForgeItemKey,
  getVisibleMinecraftVersions,
  hasCurseForgeUpdateAvailable,
  isCurseForgeCategoryAvailable,
  requiresManualCurseForgeDownload,
} from "@/views/main/features/curseforge/curseforge-browser-model";
import type {
  CurseForgeBrowserActionState,
  CurseForgeBrowserDialogProps,
  CurseForgeBrowserViewMode,
  InstalledCurseForgeItem,
  SelectedInstance,
} from "@/views/main/features/curseforge/curseforge-browser-types";
import { useCurseForgeBrowserSearch } from "@/views/main/features/curseforge/use-curseforge-browser-search";
import { cn } from "@/views/main/lib/utils";

type LoaderFilter = Exclude<ModLoader, "vanilla"> | "all";

const NO_INSTANCE_VALUE = "none";
const GRID_SKELETON_KEYS = [
  "grid-loading-a",
  "grid-loading-b",
  "grid-loading-c",
  "grid-loading-d",
  "grid-loading-e",
  "grid-loading-f",
  "grid-loading-g",
  "grid-loading-h",
  "grid-loading-i",
];
const LIST_SKELETON_KEYS = [
  "list-loading-a",
  "list-loading-b",
  "list-loading-c",
  "list-loading-d",
  "list-loading-e",
  "list-loading-f",
];

function InstanceBadge({ instance }: { instance: SelectedInstance | null }) {
  if (!instance) {
    return (
      <div className="flex min-w-0 items-center gap-2 rounded-lg border border-border bg-background/70 px-3 py-2">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
          <ServerIcon />
        </div>
        <div className="min-w-0">
          <div className="truncate font-semibold text-sm">
            No instance selected
          </div>
          <div className="truncate text-muted-foreground text-xs">
            Select an instance to install content.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-w-0 items-center gap-2 rounded-lg border border-border bg-background/70 px-3 py-2">
      {instance.iconUrl ? (
        <img
          alt=""
          className="size-9 rounded-md object-cover ring-1 ring-border"
          src={instance.iconUrl}
        />
      ) : (
        <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
          <CheckCircle2Icon />
        </div>
      )}
      <div className="min-w-0">
        <div className="truncate font-semibold text-sm">{instance.name}</div>
        <div className="truncate text-muted-foreground text-xs">
          {instance.modpackLocked
            ? instance.modpackName
              ? `Managed by ${instance.modpackName}`
              : "Managed modpack instance"
            : `Minecraft ${instance.minecraftVersion}${
                instance.loader ? ` · ${instance.loader}` : ""
              }`}
        </div>
      </div>
    </div>
  );
}

function InstanceSelector({
  activeInstance,
  availableInstances,
  canClearInstance,
  onSelectInstance,
}: {
  activeInstance: SelectedInstance | null;
  availableInstances: Array<SelectedInstance>;
  canClearInstance: boolean;
  onSelectInstance: (instance: SelectedInstance | null) => void;
}) {
  return (
    <div className="grid min-w-0 gap-2 lg:grid-cols-[minmax(0,1fr)_12rem]">
      <InstanceBadge instance={activeInstance} />
      <Select
        disabled={availableInstances.length === 0 && !activeInstance}
        onValueChange={(value) => {
          if (value === NO_INSTANCE_VALUE) {
            if (canClearInstance) onSelectInstance(null);
            return;
          }

          const next = availableInstances.find(
            (instance) => instance.id === value,
          );
          if (next) onSelectInstance(next);
        }}
        value={activeInstance?.id ?? NO_INSTANCE_VALUE}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select instance" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectItem value={NO_INSTANCE_VALUE} disabled={!canClearInstance}>
              Browse without instance
            </SelectItem>
            {availableInstances.map((instance) => (
              <SelectItem key={instance.id} value={instance.id}>
                {instance.name}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
}

function BrowserSkeleton({
  viewMode,
}: {
  viewMode: CurseForgeBrowserViewMode;
}) {
  const skeletonKeys =
    viewMode === "grid" ? GRID_SKELETON_KEYS : LIST_SKELETON_KEYS;

  return (
    <div
      className={cn(
        "grid gap-3",
        viewMode === "grid" ? "grid-cols-1 xl:grid-cols-2" : "grid-cols-1",
      )}
    >
      {skeletonKeys.map((key) => (
        <div
          className="flex min-h-52 flex-col gap-4 rounded-lg border border-border bg-card/80 p-4"
          key={key}
        >
          <div className="flex gap-3">
            <Skeleton className="size-14" />
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-4/5" />
            </div>
          </div>
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-3/4" />
          <div className="mt-auto flex justify-end">
            <Skeleton className="h-8 w-24" />
          </div>
        </div>
      ))}
    </div>
  );
}

function CategoryIcon({ category }: { category: CurseForgeCategory }) {
  if (category === "mods") return <BlocksIcon />;
  if (category === "modpacks") return <PackageIcon />;
  if (category === "resource-packs") return <ImageIcon />;
  if (category === "shaders") return <SparklesIcon />;

  return <MapIcon />;
}

function CategoryRail({
  activeCategory,
  installedContent,
  selectedInstance,
  onCategoryChange,
}: {
  activeCategory: CurseForgeCategory;
  installedContent: CurseForgeBrowserDialogProps["installedContent"];
  selectedInstance: SelectedInstance | null;
  onCategoryChange: (category: CurseForgeCategory) => void;
}) {
  return (
    <nav className="flex min-h-0 flex-col gap-1 p-2">
      {CURSEFORGE_CATEGORIES.map((category) => {
        const active = category.value === activeCategory;
        const installedCount = installedContent?.[category.value]?.length ?? 0;
        const disabled = !isCurseForgeCategoryAvailable(
          category.value,
          selectedInstance,
        );

        return (
          <button
            aria-disabled={disabled}
            className={cn(
              "flex min-w-0 items-center gap-2 rounded-md border border-transparent px-2 py-2 text-left transition-colors",
              active
                ? "border-primary/35 bg-primary/10 text-foreground"
                : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
              disabled && "cursor-not-allowed opacity-45 hover:bg-transparent",
            )}
            disabled={disabled}
            key={category.value}
            onClick={() => onCategoryChange(category.value)}
            title={
              disabled
                ? "Modpacks create new instances and cannot be installed into the selected instance."
                : undefined
            }
            type="button"
          >
            <span
              className={cn(
                "flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground",
                active && "bg-primary text-primary-foreground",
              )}
            >
              <CategoryIcon category={category.value} />
            </span>
            <span className="flex min-w-0 flex-1 items-center justify-between gap-2">
              <span className="truncate font-semibold text-sm">
                {category.label}
              </span>
              {installedCount > 0 ? (
                <Badge variant={active ? "default" : "outline"}>
                  {installedCount}
                </Badge>
              ) : null}
            </span>
          </button>
        );
      })}
    </nav>
  );
}

function SelectedProjectSummary({
  category,
  item,
  onClear,
}: {
  category: CurseForgeCategory;
  item: CurseForgeProjectSummary;
  onClear: () => void;
}) {
  const versions = getVisibleMinecraftVersions(item, 4);

  return (
    <div
      className="flex min-w-0 gap-3 rounded-lg border border-border bg-card/70 p-3"
      data-slot="curseforge-selected-project"
    >
      {item.logoUrl ? (
        <img
          alt=""
          className="hidden size-12 shrink-0 rounded-md object-cover ring-1 ring-border sm:block"
          src={item.logoUrl}
        />
      ) : null}
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <div className="min-w-0 truncate font-heading font-semibold">
            {item.name}
          </div>
          <Badge variant="secondary">
            {getCurseForgeCategoryLabel(category)}
          </Badge>
          <span className="text-muted-foreground text-xs">
            {formatCurseForgeDownloads(item.downloadCount)} downloads
          </span>
        </div>
        <p className="mt-1 line-clamp-2 text-muted-foreground text-sm">
          {item.summary ||
            "No CurseForge summary is available for this project."}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <Badge variant="outline">
            {formatCurseForgeDate(item.dateModified)}
          </Badge>
          {(versions.length > 0 ? versions : ["Not specified"]).map(
            (version) => (
              <Badge key={version} variant="outline">
                {version}
              </Badge>
            ),
          )}
          {item.modLoaders.slice(0, 3).map((loader) => (
            <Badge key={loader} variant="outline">
              {loader}
            </Badge>
          ))}
          {item.allowDistribution === false ? (
            <Badge variant="outline">Restricted</Badge>
          ) : null}
        </div>
      </div>
      <Button
        aria-label="Close project details"
        className="shrink-0"
        onClick={onClear}
        size="icon-sm"
        variant="ghost"
      >
        <XIcon />
      </Button>
    </div>
  );
}

type ManualInstallRequest = {
  category: CurseForgeCategory;
  item: CurseForgeProjectSummary;
};

function ManualInstallPanel({
  disabled,
  item,
  onCancel,
  onOpenDownload,
  onScanDownloads,
  pending,
}: {
  disabled: boolean;
  item: CurseForgeProjectSummary;
  onCancel: () => void;
  onOpenDownload: () => void;
  onScanDownloads: () => void;
  pending: boolean;
}) {
  const fileName = getCurseForgeExpectedFileName(item) ?? "the CurseForge file";

  return (
    <Alert className="mb-3 border-primary/30 bg-primary/5">
      <AlertCircleIcon />
      <AlertTitle>Manual download required</AlertTitle>
      <AlertDescription>
        Open CurseForge, download {fileName} to your Downloads folder, then scan
        Downloads to copy it into the selected launcher target.
      </AlertDescription>
      <div className="mt-2 flex flex-wrap gap-2 group-has-[>svg]/alert:col-start-2">
        <Button
          disabled={disabled || pending}
          onClick={onOpenDownload}
          size="sm"
          variant="outline"
        >
          <SearchIcon data-icon="inline-start" />
          Open CurseForge
        </Button>
        <Button
          disabled={disabled || pending}
          onClick={onScanDownloads}
          size="sm"
        >
          {pending ? (
            <RefreshCcwIcon className="animate-spin" data-icon="inline-start" />
          ) : (
            <CheckCircle2Icon data-icon="inline-start" />
          )}
          Scan Downloads
        </Button>
        <Button disabled={pending} onClick={onCancel} size="sm" variant="ghost">
          Cancel
        </Button>
      </div>
    </Alert>
  );
}

function getDisabledReason({
  actionState,
  category,
  hasFile,
  hasInstallCallback,
  hasManualInstallCallback,
  hasUpdateCallback,
  manualDownloadRequired,
}: {
  actionState: CurseForgeBrowserActionState;
  category: CurseForgeCategory;
  hasFile: boolean;
  hasInstallCallback: boolean;
  hasManualInstallCallback: boolean;
  hasUpdateCallback: boolean;
  manualDownloadRequired: boolean;
}): string | null {
  if (actionState === "select-instance") {
    return "Select an instance to install content.";
  }

  if (actionState === "incompatible") {
    if (category === "modpacks") {
      return "Modpacks create new instances and cannot be installed into the selected instance.";
    }

    return "This project does not match the selected instance.";
  }

  if (actionState === "installing") {
    return "Action already in progress.";
  }

  if (actionState === "installed") {
    return "This project is already installed.";
  }

  if (actionState === "managed") {
    return "Mods for this instance are managed by its linked modpack.";
  }

  if (
    !hasFile &&
    (actionState === "install" ||
      actionState === "failed" ||
      actionState === "update-available")
  ) {
    return "CurseForge did not provide file metadata for this project.";
  }

  if (
    actionState === "update-available" &&
    !hasUpdateCallback &&
    !manualDownloadRequired
  ) {
    return "Updates are not available from this view.";
  }

  if (
    manualDownloadRequired &&
    (actionState === "install" ||
      actionState === "failed" ||
      actionState === "update-available") &&
    !hasManualInstallCallback
  ) {
    return "Manual install scanning is not available from this view.";
  }

  if (
    !manualDownloadRequired &&
    (actionState === "install" || actionState === "failed") &&
    !hasInstallCallback
  ) {
    return "Installs are not available from this view.";
  }

  return null;
}

export function CurseForgeBrowserDialog({
  availableInstances = [],
  initialCategory,
  installedContent,
  onCompleteManualInstall,
  onInstall,
  onInstallModpack,
  onOpenChange,
  onOpenDetails,
  onOpenManualDownload,
  onSelectInstance,
  onUninstall,
  onUpdate,
  open,
  selectedInstance,
}: CurseForgeBrowserDialogProps) {
  const instanceControlled = selectedInstance !== undefined;
  const [localSelectedInstance, setLocalSelectedInstance] =
    useState<SelectedInstance | null>(selectedInstance ?? null);
  const activeInstance = instanceControlled
    ? (selectedInstance ?? null)
    : localSelectedInstance;
  const [activeCategory, setActiveCategory] = useState<CurseForgeCategory>(
    initialCategory ?? DEFAULT_CURSEFORGE_CATEGORY,
  );
  const [query, setQuery] = useState("");
  const [minecraftVersion, setMinecraftVersion] = useState("");
  const [loader, setLoader] = useState<LoaderFilter>("all");
  const [sortField, setSortField] = useState<CurseForgeSortField>("popularity");
  const [installedOnly, setInstalledOnly] = useState(false);
  const [viewMode, setViewMode] = useState<CurseForgeBrowserViewMode>("grid");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedProject, setSelectedProject] =
    useState<CurseForgeProjectSummary | null>(null);
  const [manualInstallRequest, setManualInstallRequest] =
    useState<ManualInstallRequest | null>(null);
  const [pendingKeys, setPendingKeys] = useState<Set<string>>(() => new Set());
  const [failedKeys, setFailedKeys] = useState<Set<string>>(() => new Set());
  const installActionsConfigured = Boolean(
    onInstall ||
      onUninstall ||
      onUpdate ||
      onOpenManualDownload ||
      onCompleteManualInstall,
  );
  const canClearInstance = !instanceControlled || Boolean(onSelectInstance);
  const activeInstallActionsConfigured =
    activeCategory === "modpacks"
      ? Boolean(
          onInstallModpack || (onOpenManualDownload && onCompleteManualInstall),
        )
      : installActionsConfigured;

  useEffect(() => {
    if (selectedInstance !== undefined) {
      setLocalSelectedInstance(selectedInstance);
    }
  }, [selectedInstance]);

  useEffect(() => {
    if (!open) return;

    setActiveCategory(initialCategory ?? DEFAULT_CURSEFORGE_CATEGORY);
    setSelectedProject(null);
    setManualInstallRequest(null);
  }, [initialCategory, open]);

  useEffect(() => {
    if (!open || !activeInstance) return;

    setMinecraftVersion((current) =>
      current.trim() ? current : activeInstance.minecraftVersion,
    );
  }, [activeInstance, open]);

  useEffect(() => {
    if (
      !open ||
      isCurseForgeCategoryAvailable(activeCategory, activeInstance)
    ) {
      return;
    }

    setActiveCategory(DEFAULT_CURSEFORGE_CATEGORY);
    setSelectedProject(null);
    setManualInstallRequest(null);
  }, [activeCategory, activeInstance, open]);

  const search = useCurseForgeBrowserSearch({
    category: activeCategory,
    loader,
    minecraftVersion: minecraftVersion.trim() || null,
    open,
    query,
    sortField,
  });

  const visibleProjects = useMemo(() => {
    if (!installedOnly || !activeInstance) return search.projects;

    return search.projects.filter((item) =>
      findInstalledCurseForgeItem(item, activeCategory, installedContent),
    );
  }, [
    activeCategory,
    activeInstance,
    installedContent,
    installedOnly,
    search.projects,
  ]);

  useEffect(() => {
    if (!open || !selectedProject) return;

    if (!visibleProjects.some((item) => item.id === selectedProject.id)) {
      setSelectedProject(null);
    }
  }, [open, selectedProject, visibleProjects]);

  const handleSelectInstance = (instance: SelectedInstance | null) => {
    if (!instance) {
      if (!instanceControlled) {
        setLocalSelectedInstance(null);
      }
      setMinecraftVersion("");
      setLoader("all");
      setInstalledOnly(false);
      setManualInstallRequest(null);
      onSelectInstance?.(null);
      return;
    }

    if (!instanceControlled) {
      setLocalSelectedInstance(instance);
    }
    setMinecraftVersion(instance.minecraftVersion);
    if (instance.loader && instance.loader !== "vanilla") {
      setLoader(instance.loader);
    }
    setManualInstallRequest(null);
    onSelectInstance?.(instance);
  };

  const runItemAction = async (
    item: CurseForgeProjectSummary,
    action: () => Promise<void> | void,
  ) => {
    const key = getCurseForgeItemKey(activeCategory, item);
    setPendingKeys((current) => new Set(current).add(key));
    setFailedKeys((current) => {
      const next = new Set(current);
      next.delete(key);
      return next;
    });

    try {
      await action();
    } catch {
      setFailedKeys((current) => new Set(current).add(key));
    } finally {
      setPendingKeys((current) => {
        const next = new Set(current);
        next.delete(key);
        return next;
      });
    }
  };

  const handlePrimaryAction = (
    item: CurseForgeProjectSummary,
    installedItem: InstalledCurseForgeItem | null,
  ) => {
    const manualDownloadRequired = requiresManualCurseForgeDownload(item);

    if (manualDownloadRequired) {
      setManualInstallRequest({ category: activeCategory, item });

      if (!onOpenManualDownload) return;
      if (categoryRequiresInstanceTarget(activeCategory) && !activeInstance) {
        return;
      }

      void runItemAction(item, () =>
        onOpenManualDownload({
          category: activeCategory,
          instance: activeInstance,
          item,
        }),
      );
      return;
    }

    if (activeCategory === "modpacks") {
      if (!activeInstance && onInstallModpack) {
        void runItemAction(item, () =>
          onInstallModpack({
            category: "modpacks",
            item,
          }),
        );
      }
      return;
    }

    if (!activeInstance) return;

    if (
      installedItem &&
      hasCurseForgeUpdateAvailable(item, installedItem) &&
      onUpdate
    ) {
      void runItemAction(item, () =>
        onUpdate({
          category: activeCategory,
          installedItem,
          instance: activeInstance,
          item,
        }),
      );
      return;
    }

    if (!onInstall) return;

    void runItemAction(item, () =>
      onInstall({
        category: activeCategory,
        instance: activeInstance,
        item,
      }),
    );
  };

  const handleOpenManualDownload = () => {
    if (!manualInstallRequest || !onOpenManualDownload) return;
    if (
      categoryRequiresInstanceTarget(manualInstallRequest.category) &&
      !activeInstance
    ) {
      return;
    }

    void runItemAction(manualInstallRequest.item, () =>
      onOpenManualDownload({
        category: manualInstallRequest.category,
        instance: activeInstance,
        item: manualInstallRequest.item,
      }),
    );
  };

  const handleScanManualDownload = () => {
    if (!manualInstallRequest || !onCompleteManualInstall) return;
    if (
      categoryRequiresInstanceTarget(manualInstallRequest.category) &&
      !activeInstance
    ) {
      return;
    }

    void runItemAction(manualInstallRequest.item, async () => {
      await onCompleteManualInstall({
        category: manualInstallRequest.category,
        instance: activeInstance,
        item: manualInstallRequest.item,
      });
      setManualInstallRequest(null);
    });
  };

  const handleUninstall = (
    item: CurseForgeProjectSummary,
    installedItem: InstalledCurseForgeItem,
  ) => {
    if (!activeInstance || !onUninstall) return;

    void runItemAction(item, () =>
      onUninstall({
        category: activeCategory,
        instance: activeInstance,
        item: installedItem,
      }),
    );
  };

  const handleDetails = (item: CurseForgeProjectSummary) => {
    setSelectedProject(item);
    onOpenDetails?.(item, activeCategory);
  };

  const loaderFilterEnabled = Boolean(
    categorySupportsLoaderFilter(activeCategory) && minecraftVersion.trim(),
  );
  const activeCategoryInfo = CURSEFORGE_CATEGORIES.find(
    (category) => category.value === activeCategory,
  ) ?? {
    description: "Minecraft content available on CurseForge.",
    label: "Minecraft Content",
    value: DEFAULT_CURSEFORGE_CATEGORY,
  };
  const resultCountLabel = search.loading
    ? "Loading projects"
    : `${visibleProjects.length} shown${
        search.totalCount > visibleProjects.length
          ? ` from ${formatCurseForgeDownloads(search.totalCount)}`
          : ""
      }`;
  const manualInstallPending = manualInstallRequest
    ? pendingKeys.has(
        getCurseForgeItemKey(
          manualInstallRequest.category,
          manualInstallRequest.item,
        ),
      )
    : false;
  const manualInstallDisabled =
    !onOpenManualDownload ||
    !onCompleteManualInstall ||
    (manualInstallRequest
      ? categoryRequiresInstanceTarget(manualInstallRequest.category) &&
        !activeInstance
      : true);
  const handleCategoryChange = (category: CurseForgeCategory) => {
    if (!isCurseForgeCategoryAvailable(category, activeInstance)) {
      return;
    }

    setActiveCategory(category);
    setSelectedProject(null);
    setManualInstallRequest(null);
    if (!categorySupportsLoaderFilter(category)) {
      setLoader("all");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="!top-12 !right-2 !bottom-2 !left-2 !h-auto !w-auto !max-w-none !translate-x-0 !translate-y-0 grid min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-0 overflow-hidden rounded-lg bg-background p-0 text-foreground sm:!right-3 sm:!bottom-3 sm:!left-3 sm:!max-w-none"
        showCloseButton={false}
      >
        <DialogHeader className="border-b border-border bg-card/80 px-4 py-3 sm:px-5">
          <div className="flex min-w-0 items-start gap-3">
            <div className="grid min-w-0 flex-1 gap-3 xl:grid-cols-[minmax(12rem,1fr)_minmax(20rem,28rem)]">
              <div className="min-w-0">
                <DialogTitle className="font-heading text-xl font-black leading-tight">
                  CurseForge
                </DialogTitle>
                <DialogDescription className="sr-only">
                  Browse CurseForge Minecraft content and choose an instance for
                  install actions.
                </DialogDescription>
                <div className="mt-1 flex min-w-0 flex-wrap items-center gap-2 text-muted-foreground text-xs">
                  <span>{resultCountLabel}</span>
                  <span className="text-primary">•</span>
                  <span>
                    {activeInstallActionsConfigured
                      ? "Install ready"
                      : "Browse only"}
                  </span>
                </div>
              </div>

              <InstanceSelector
                activeInstance={activeInstance}
                availableInstances={availableInstances}
                canClearInstance={canClearInstance}
                onSelectInstance={handleSelectInstance}
              />
            </div>

            <DialogClose
              render={
                <Button className="shrink-0" size="icon-sm" variant="ghost" />
              }
            >
              <XIcon />
              <span className="sr-only">Close</span>
            </DialogClose>
          </div>
        </DialogHeader>

        <div className="grid min-h-0 grid-cols-1 bg-background lg:grid-cols-[13rem_minmax(0,1fr)]">
          <aside className="hidden min-h-0 border-r border-border bg-sidebar/70 lg:flex lg:flex-col">
            <CategoryRail
              activeCategory={activeCategory}
              installedContent={installedContent}
              selectedInstance={activeInstance}
              onCategoryChange={handleCategoryChange}
            />
          </aside>

          <div className="relative flex min-h-0 min-w-0 flex-col">
            <div className="border-b border-border bg-background/95 px-4 py-3 sm:px-5">
              <Tabs
                className="lg:hidden"
                value={activeCategory}
                onValueChange={(value) =>
                  handleCategoryChange(value as CurseForgeCategory)
                }
              >
                <TabsList className="w-full justify-start overflow-x-auto">
                  {CURSEFORGE_CATEGORIES.map((category) => {
                    const disabled = !isCurseForgeCategoryAvailable(
                      category.value,
                      activeInstance,
                    );

                    return (
                      <TabsTrigger
                        disabled={disabled}
                        key={category.value}
                        title={
                          disabled
                            ? "Modpacks create new instances and cannot be installed into the selected instance."
                            : undefined
                        }
                        value={category.value}
                      >
                        {category.label}
                      </TabsTrigger>
                    );
                  })}
                </TabsList>
              </Tabs>

              <div className="mt-3 flex min-w-0 flex-col gap-2 lg:mt-0">
                <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate font-heading font-semibold">
                      {activeCategoryInfo.label}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Button
                      aria-expanded={filtersOpen}
                      onClick={() => setFiltersOpen((current) => !current)}
                      size="sm"
                      variant={filtersOpen ? "secondary" : "outline"}
                    >
                      <SlidersHorizontalIcon data-icon="inline-start" />
                      Filters
                    </Button>
                    <Button
                      aria-label="Refresh CurseForge results"
                      onClick={search.refresh}
                      size="icon-sm"
                      title="Refresh"
                      variant="outline"
                    >
                      <RefreshCcwIcon />
                    </Button>
                    <ToggleGroup
                      aria-label="View mode"
                      value={[viewMode]}
                      onValueChange={(value) => {
                        const nextMode = value[0] as
                          | CurseForgeBrowserViewMode
                          | undefined;
                        if (nextMode) setViewMode(nextMode);
                      }}
                    >
                      <ToggleGroupItem
                        aria-label="Grid view"
                        type="button"
                        value="grid"
                      >
                        <Grid2X2Icon />
                      </ToggleGroupItem>
                      <ToggleGroupItem
                        aria-label="List view"
                        type="button"
                        value="list"
                      >
                        <ListIcon />
                      </ToggleGroupItem>
                    </ToggleGroup>
                  </div>
                </div>

                <InputGroup className="h-9">
                  <InputGroupAddon>
                    <SearchIcon />
                  </InputGroupAddon>
                  <InputGroupInput
                    aria-label="Search CurseForge"
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search projects, authors, categories..."
                    value={query}
                  />
                </InputGroup>

                {filtersOpen ? (
                  <div className="grid min-w-0 gap-2 rounded-lg border border-border bg-card/45 p-2 md:grid-cols-2 xl:grid-cols-[9rem_9rem_10rem_12rem]">
                    <InputGroup className="h-9">
                      <InputGroupAddon>
                        <span className="text-xs">MC</span>
                      </InputGroupAddon>
                      <InputGroupInput
                        aria-label="Minecraft version"
                        onChange={(event) =>
                          setMinecraftVersion(event.target.value)
                        }
                        placeholder="All versions"
                        value={minecraftVersion}
                      />
                    </InputGroup>

                    <Select
                      disabled={!loaderFilterEnabled}
                      onValueChange={(value) =>
                        setLoader(value as LoaderFilter)
                      }
                      value={loader}
                    >
                      <SelectTrigger className="h-9 w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectItem value="all">All loaders</SelectItem>
                          {CURSEFORGE_LOADER_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>

                    <Select
                      onValueChange={(value) =>
                        setSortField(value as CurseForgeSortField)
                      }
                      value={sortField}
                    >
                      <SelectTrigger className="h-9 w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {CURSEFORGE_SORT_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>

                    <div className="flex h-9 min-w-0 items-center justify-between gap-2 rounded-lg border border-input px-2.5">
                      <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                        <SlidersHorizontalIcon className="size-3.5" />
                        Installed
                      </div>
                      <Switch
                        checked={installedOnly}
                        disabled={!activeInstance}
                        onCheckedChange={setInstalledOnly}
                        size="sm"
                      />
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            <ScrollArea className="min-h-0 flex-1">
              <div className={cn("p-4 sm:p-5", selectedProject && "pb-32")}>
                {manualInstallRequest ? (
                  <ManualInstallPanel
                    disabled={manualInstallDisabled}
                    item={manualInstallRequest.item}
                    onCancel={() => setManualInstallRequest(null)}
                    onOpenDownload={handleOpenManualDownload}
                    onScanDownloads={handleScanManualDownload}
                    pending={manualInstallPending}
                  />
                ) : null}
                {search.error ? (
                  <Alert variant="destructive">
                    <AlertCircleIcon />
                    <AlertTitle>CurseForge could not be loaded</AlertTitle>
                    <AlertDescription>{search.error}</AlertDescription>
                    <AlertAction>
                      <Button
                        onClick={search.refresh}
                        size="sm"
                        variant="outline"
                      >
                        Retry
                      </Button>
                    </AlertAction>
                  </Alert>
                ) : search.loading ? (
                  <BrowserSkeleton viewMode={viewMode} />
                ) : visibleProjects.length === 0 ? (
                  <Empty className="min-h-96 border border-dashed">
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        <SearchIcon />
                      </EmptyMedia>
                      <EmptyTitle>No CurseForge projects found</EmptyTitle>
                      <EmptyDescription>
                        Adjust the search, category, version, or installed
                        filter.
                      </EmptyDescription>
                    </EmptyHeader>
                    <EmptyContent>
                      <Button onClick={search.refresh} variant="outline">
                        <RefreshCcwIcon data-icon="inline-start" />
                        Refresh
                      </Button>
                    </EmptyContent>
                  </Empty>
                ) : (
                  <div
                    className={cn(
                      "grid gap-3",
                      viewMode === "grid"
                        ? "grid-cols-1 xl:grid-cols-2"
                        : "grid-cols-1",
                    )}
                  >
                    {visibleProjects.map((item) => {
                      const key = getCurseForgeItemKey(activeCategory, item);
                      const installedItem = findInstalledCurseForgeItem(
                        item,
                        activeCategory,
                        installedContent,
                      );
                      const actionState = getCurseForgeActionState({
                        category: activeCategory,
                        failed: failedKeys.has(key),
                        installedItem,
                        item,
                        pending: pendingKeys.has(key),
                        selectedInstance: activeInstance,
                      });
                      const manualDownloadRequired =
                        requiresManualCurseForgeDownload(item);
                      const actionDisabledReason = getDisabledReason({
                        actionState,
                        category: activeCategory,
                        hasFile: Boolean(item.latestFile),
                        hasInstallCallback:
                          activeCategory === "modpacks"
                            ? Boolean(onInstallModpack)
                            : Boolean(onInstall),
                        hasManualInstallCallback: Boolean(
                          onOpenManualDownload && onCompleteManualInstall,
                        ),
                        hasUpdateCallback:
                          activeCategory === "modpacks"
                            ? false
                            : Boolean(onUpdate),
                        manualDownloadRequired,
                      });

                      return (
                        <CurseForgeResultCard
                          actionDisabledReason={actionDisabledReason}
                          actionState={actionState}
                          category={activeCategory}
                          installActionsConfigured={
                            activeInstallActionsConfigured
                          }
                          installedItem={installedItem}
                          item={item}
                          key={key}
                          manualDownloadRequired={manualDownloadRequired}
                          onDetails={() => handleDetails(item)}
                          onPrimaryAction={() =>
                            handlePrimaryAction(item, installedItem)
                          }
                          onSecondaryAction={
                            installedItem && onUninstall
                              ? () => handleUninstall(item, installedItem)
                              : undefined
                          }
                          selected={selectedProject?.id === item.id}
                          viewMode={viewMode}
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            </ScrollArea>

            {selectedProject ? (
              <div className="absolute inset-x-0 bottom-0 z-20 border-t border-border bg-background/95 px-4 py-3 shadow-[0_-24px_48px_-36px_black] sm:px-5">
                <SelectedProjectSummary
                  category={activeCategory}
                  item={selectedProject}
                  onClear={() => setSelectedProject(null)}
                />
              </div>
            ) : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
