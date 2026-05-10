import {
  AlertCircleIcon,
  BlocksIcon,
  BoxesIcon,
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
  categorySupportsLoaderFilter,
  DEFAULT_CURSEFORGE_CATEGORY,
  findInstalledCurseForgeItem,
  formatCurseForgeDate,
  formatCurseForgeDownloads,
  getCurseForgeActionState,
  getCurseForgeCategoryLabel,
  getCurseForgeItemKey,
  getVisibleMinecraftVersions,
  hasCurseForgeUpdateAvailable,
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
          Minecraft {instance.minecraftVersion}
          {instance.loader ? ` · ${instance.loader}` : ""}
        </div>
      </div>
    </div>
  );
}

function InstanceSelector({
  activeInstance,
  availableInstances,
  onSelectInstance,
}: {
  activeInstance: SelectedInstance | null;
  availableInstances: Array<SelectedInstance>;
  onSelectInstance: (instance: SelectedInstance) => void;
}) {
  return (
    <div className="grid min-w-0 gap-2 lg:grid-cols-[minmax(0,1fr)_12rem]">
      <InstanceBadge instance={activeInstance} />
      <Select
        disabled={availableInstances.length === 0}
        onValueChange={(value) => {
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
            <SelectItem value={NO_INSTANCE_VALUE} disabled>
              Select instance
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
        viewMode === "grid"
          ? "grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3"
          : "grid-cols-1",
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
  onCategoryChange,
}: {
  activeCategory: CurseForgeCategory;
  installedContent: CurseForgeBrowserDialogProps["installedContent"];
  onCategoryChange: (category: CurseForgeCategory) => void;
}) {
  return (
    <nav className="flex min-h-0 flex-col gap-1 p-3">
      <div className="px-2 pb-2">
        <div className="font-semibold text-foreground text-sm">Content</div>
        <div className="text-muted-foreground text-xs">
          Pick a CurseForge collection.
        </div>
      </div>
      {CURSEFORGE_CATEGORIES.map((category) => {
        const active = category.value === activeCategory;
        const installedCount = installedContent?.[category.value]?.length ?? 0;

        return (
          <button
            className={cn(
              "flex min-w-0 items-start gap-3 rounded-lg border border-transparent px-2.5 py-2.5 text-left transition-colors",
              active
                ? "border-primary/35 bg-primary/10 text-foreground"
                : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
            )}
            key={category.value}
            onClick={() => onCategoryChange(category.value)}
            type="button"
          >
            <span
              className={cn(
                "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground",
                active && "bg-primary text-primary-foreground",
              )}
            >
              <CategoryIcon category={category.value} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex min-w-0 items-center justify-between gap-2">
                <span className="truncate font-semibold text-sm">
                  {category.label}
                </span>
                {installedCount > 0 ? (
                  <Badge variant={active ? "default" : "outline"}>
                    {installedCount}
                  </Badge>
                ) : null}
              </span>
              <span className="mt-1 line-clamp-2 text-xs leading-5">
                {category.description}
              </span>
            </span>
          </button>
        );
      })}
    </nav>
  );
}

function BrowserModePanel({
  activeInstance,
  installActionsConfigured,
}: {
  activeInstance: SelectedInstance | null;
  installActionsConfigured: boolean;
}) {
  return (
    <div className="m-3 mt-auto rounded-lg border border-border bg-background/60 p-3">
      <div className="flex items-center gap-2">
        <div
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-md",
            installActionsConfigured
              ? "bg-primary/10 text-primary"
              : "bg-muted text-muted-foreground",
          )}
        >
          {installActionsConfigured ? <CheckCircle2Icon /> : <SearchIcon />}
        </div>
        <div className="min-w-0">
          <div className="font-semibold text-sm">
            {installActionsConfigured ? "Install Ready" : "Browse Only"}
          </div>
          <div className="text-muted-foreground text-xs">
            {activeInstance
              ? `Targeting ${activeInstance.name}`
              : "No install target selected"}
          </div>
        </div>
      </div>
      <p className="mt-3 text-muted-foreground text-xs leading-5">
        {installActionsConfigured
          ? "Compatible projects can run the supplied install callbacks."
          : "Install services are not connected here, so cards focus on discovery and details."}
      </p>
    </div>
  );
}

function DetailPreview({
  category,
  item,
}: {
  category: CurseForgeCategory;
  item: CurseForgeProjectSummary | null;
}) {
  if (!item) {
    return (
      <Empty className="h-full rounded-none border-0">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <BoxesIcon />
          </EmptyMedia>
          <EmptyTitle>Select a project</EmptyTitle>
          <EmptyDescription>
            Project metadata and compatibility details appear here.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  const versions = getVisibleMinecraftVersions(item, 8);

  return (
    <div className="flex h-full min-w-0 flex-col gap-4 p-4">
      <div className="flex min-w-0 gap-3">
        {item.logoUrl ? (
          <img
            alt=""
            className="size-14 rounded-md object-cover ring-1 ring-border"
            src={item.logoUrl}
          />
        ) : (
          <div className="flex size-14 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
            <BoxesIcon />
          </div>
        )}
        <div className="min-w-0">
          <div className="truncate font-heading font-semibold text-lg">
            {item.name}
          </div>
          <div className="text-muted-foreground text-xs">
            {getCurseForgeCategoryLabel(category)} ·{" "}
            {formatCurseForgeDownloads(item.downloadCount)} downloads
          </div>
        </div>
      </div>

      <p className="text-muted-foreground text-sm leading-6">
        {item.summary || "No CurseForge summary is available for this project."}
      </p>

      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-md border border-border bg-background/60 p-3">
          <div className="text-muted-foreground text-xs">Updated</div>
          <div className="mt-1 font-semibold">
            {formatCurseForgeDate(item.dateModified)}
          </div>
        </div>
        <div className="rounded-md border border-border bg-background/60 p-3">
          <div className="text-muted-foreground text-xs">Distribution</div>
          <div className="mt-1 font-semibold">
            {item.allowDistribution === false ? "Restricted" : "Available"}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="font-semibold text-sm">Version Support</div>
        <div className="flex flex-wrap gap-1.5">
          {versions.length > 0 ? (
            versions.map((version) => (
              <Badge key={version} variant="outline">
                {version}
              </Badge>
            ))
          ) : (
            <Badge variant="outline">Not specified</Badge>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="font-semibold text-sm">Loader Support</div>
        <div className="flex flex-wrap gap-1.5">
          {item.modLoaders.length > 0 ? (
            item.modLoaders.map((loader) => (
              <Badge key={loader} variant="outline">
                {loader}
              </Badge>
            ))
          ) : (
            <Badge variant="outline">Not specified</Badge>
          )}
        </div>
      </div>
    </div>
  );
}

function getDisabledReason({
  actionState,
  hasInstallCallback,
  hasUpdateCallback,
}: {
  actionState: CurseForgeBrowserActionState;
  hasInstallCallback: boolean;
  hasUpdateCallback: boolean;
}): string | null {
  if (actionState === "select-instance") {
    return "Select an instance to install content.";
  }

  if (actionState === "incompatible") {
    return "This project does not match the selected instance.";
  }

  if (actionState === "installing") {
    return "Action already in progress.";
  }

  if (actionState === "installed") {
    return "This project is already installed.";
  }

  if (actionState === "update-available" && !hasUpdateCallback) {
    return "Updates are not available from this view.";
  }

  if (
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
  onInstall,
  onOpenChange,
  onOpenDetails,
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
  const [selectedProject, setSelectedProject] =
    useState<CurseForgeProjectSummary | null>(null);
  const [pendingKeys, setPendingKeys] = useState<Set<string>>(() => new Set());
  const [failedKeys, setFailedKeys] = useState<Set<string>>(() => new Set());
  const installActionsConfigured = Boolean(
    onInstall || onUninstall || onUpdate,
  );

  useEffect(() => {
    if (selectedInstance !== undefined) {
      setLocalSelectedInstance(selectedInstance);
    }
  }, [selectedInstance]);

  useEffect(() => {
    if (!open) return;

    setActiveCategory(initialCategory ?? DEFAULT_CURSEFORGE_CATEGORY);
    setSelectedProject(null);
  }, [initialCategory, open]);

  useEffect(() => {
    if (!open || !activeInstance) return;

    setMinecraftVersion((current) =>
      current.trim() ? current : activeInstance.minecraftVersion,
    );
  }, [activeInstance, open]);

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
    if (!open) return;

    setSelectedProject((current) => {
      if (current && visibleProjects.some((item) => item.id === current.id)) {
        return current;
      }

      return visibleProjects[0] ?? null;
    });
  }, [open, visibleProjects]);

  const handleSelectInstance = (instance: SelectedInstance) => {
    if (!instanceControlled) {
      setLocalSelectedInstance(instance);
    }
    setMinecraftVersion(instance.minecraftVersion);
    if (instance.loader && instance.loader !== "vanilla") {
      setLoader(instance.loader);
    }
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
  const handleCategoryChange = (category: CurseForgeCategory) => {
    setActiveCategory(category);
    setSelectedProject(null);
    if (!categorySupportsLoaderFilter(category)) {
      setLoader("all");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="!top-12 !right-2 !bottom-2 !left-2 !h-auto !w-auto !max-w-none !translate-x-0 !translate-y-0 grid grid-rows-[auto_minmax(0,1fr)] gap-0 overflow-hidden rounded-lg bg-background p-0 text-foreground sm:!right-3 sm:!bottom-3 sm:!left-3 sm:!max-w-none"
        showCloseButton
      >
        <DialogHeader className="border-b border-border bg-card/80 px-4 py-3 sm:px-5">
          <div className="grid min-w-0 gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(22rem,30rem)]">
            <div className="min-w-0">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <Badge variant="secondary">CurseForge</Badge>
                <Badge
                  variant={installActionsConfigured ? "default" : "outline"}
                >
                  {installActionsConfigured ? "Install actions" : "Browse-only"}
                </Badge>
                <Badge variant="outline">{resultCountLabel}</Badge>
              </div>
              <DialogTitle className="font-heading text-2xl font-black leading-tight">
                CurseForge Marketplace
              </DialogTitle>
              <DialogDescription className="mt-1 max-w-3xl">
                Browse Minecraft content, inspect compatibility, and target an
                instance only when install actions are available.
              </DialogDescription>
            </div>

            <InstanceSelector
              activeInstance={activeInstance}
              availableInstances={availableInstances}
              onSelectInstance={handleSelectInstance}
            />
          </div>
        </DialogHeader>

        <div className="grid min-h-0 grid-cols-1 bg-background lg:grid-cols-[17rem_minmax(0,1fr)] xl:grid-cols-[17rem_minmax(0,1fr)_23rem]">
          <aside className="hidden min-h-0 border-r border-border bg-sidebar/70 lg:flex lg:flex-col">
            <CategoryRail
              activeCategory={activeCategory}
              installedContent={installedContent}
              onCategoryChange={handleCategoryChange}
            />
            <BrowserModePanel
              activeInstance={activeInstance}
              installActionsConfigured={installActionsConfigured}
            />
          </aside>

          <div className="flex min-h-0 min-w-0 flex-col">
            <div className="border-b border-border bg-background/95 px-4 py-3 sm:px-5">
              <Tabs
                className="lg:hidden"
                value={activeCategory}
                onValueChange={(value) =>
                  handleCategoryChange(value as CurseForgeCategory)
                }
              >
                <TabsList className="w-full justify-start overflow-x-auto">
                  {CURSEFORGE_CATEGORIES.map((category) => (
                    <TabsTrigger key={category.value} value={category.value}>
                      {category.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>

              <div className="mt-3 flex min-w-0 flex-col gap-1 lg:mt-0">
                <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate font-heading font-semibold text-lg">
                      {activeCategoryInfo.label}
                    </div>
                    <div className="truncate text-muted-foreground text-xs">
                      {activeCategoryInfo.description}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={search.refresh}
                      size="sm"
                      variant="outline"
                    >
                      <RefreshCcwIcon data-icon="inline-start" />
                      Refresh
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

                <div className="mt-2 grid gap-2 xl:grid-cols-[minmax(15rem,1fr)_9rem_9rem_10rem_auto]">
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
                    onValueChange={(value) => setLoader(value as LoaderFilter)}
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

                  <div className="flex min-w-0 items-center justify-between gap-2 rounded-lg border border-input px-2.5">
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

                <div className="flex flex-wrap items-center gap-2 pt-1 text-muted-foreground text-xs">
                  <span>
                    {activeInstance
                      ? `Target: ${activeInstance.name}`
                      : "Browsing without an instance"}
                  </span>
                  <span className="text-primary">•</span>
                  <span>
                    {installActionsConfigured
                      ? "Install callbacks connected"
                      : "Install actions hidden until a service is connected"}
                  </span>
                </div>
              </div>
            </div>

            <ScrollArea className="min-h-0 flex-1">
              <div className="p-4 sm:p-5">
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
                        ? "grid-cols-1 2xl:grid-cols-2"
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
                      const actionDisabledReason = getDisabledReason({
                        actionState,
                        hasInstallCallback: Boolean(onInstall),
                        hasUpdateCallback: Boolean(onUpdate),
                      });

                      return (
                        <CurseForgeResultCard
                          actionDisabledReason={actionDisabledReason}
                          actionState={actionState}
                          category={activeCategory}
                          installActionsConfigured={installActionsConfigured}
                          installedItem={installedItem}
                          item={item}
                          key={key}
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
          </div>

          <aside className="hidden min-h-0 border-l border-border bg-card/45 xl:block">
            <ScrollArea className="h-full">
              <DetailPreview category={activeCategory} item={selectedProject} />
            </ScrollArea>
          </aside>
        </div>
      </DialogContent>
    </Dialog>
  );
}
