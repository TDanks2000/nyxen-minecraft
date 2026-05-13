import { AlertCircleIcon, RefreshCcwIcon, SearchIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type {
  CurseForgeCategory,
  CurseForgeProjectSummary,
  CurseForgeSortField,
  ModrinthCategory,
  ModrinthProjectSummary,
  ModrinthSortField,
} from "@/shared/types";
import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from "@/views/main/components/ui/alert";
import { Button } from "@/views/main/components/ui/button";
import { Dialog, DialogContent } from "@/views/main/components/ui/dialog";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/views/main/components/ui/empty";
import { ScrollArea } from "@/views/main/components/ui/scroll-area";
import { ContentBrowserCategoryRail } from "@/views/main/features/curseforge/components/content-browser-category-rail";
import {
  type BrowserCategory,
  getDisabledReason,
  type LoaderFilter,
  type ManualInstallRequest,
  type SelectedProject,
} from "@/views/main/features/curseforge/components/content-browser-dialog-model";
import { ContentBrowserFilterBar } from "@/views/main/features/curseforge/components/content-browser-filter-bar";
import { ContentBrowserHeader } from "@/views/main/features/curseforge/components/content-browser-header";
import { ContentBrowserManualInstallPanel } from "@/views/main/features/curseforge/components/content-browser-manual-install-panel";
import { ContentBrowserSelectedProjectSummary } from "@/views/main/features/curseforge/components/content-browser-selected-project-summary";
import { ContentBrowserSkeleton } from "@/views/main/features/curseforge/components/content-browser-skeleton";
import { CurseForgeResultCard } from "@/views/main/features/curseforge/components/curseforge-result-card";
import {
  CURSEFORGE_CATEGORIES,
  categoryRequiresInstanceTarget,
  categorySupportsLoaderFilter,
  DEFAULT_CURSEFORGE_CATEGORY,
  findInstalledCurseForgeItem,
  formatCurseForgeDownloads,
  getCurseForgeActionState,
  getCurseForgeItemKey,
  hasCurseForgeUpdateAvailable,
  isCurseForgeCategoryAvailable,
  requiresManualCurseForgeDownload,
} from "@/views/main/features/curseforge/curseforge-browser-model";
import type {
  ContentBrowserDialogProps,
  ContentBrowserSource,
  CurseForgeBrowserViewMode,
  InstalledCurseForgeItem,
  SelectedInstance,
} from "@/views/main/features/curseforge/curseforge-browser-types";
import { useCurseForgeBrowserSearch } from "@/views/main/features/curseforge/use-curseforge-browser-search";
import { ModrinthResultCard } from "@/views/main/features/modrinth/components/modrinth-result-card";
import {
  categorySupportsModrinthLoaderFilter,
  DEFAULT_MODRINTH_CATEGORY,
  findInstalledModrinthItem,
  getModrinthActionState,
  getModrinthItemKey,
  type InstalledModrinthItem,
  isModrinthCategoryAvailable,
  MODRINTH_CATEGORIES,
} from "@/views/main/features/modrinth/modrinth-browser-model";
import { useModrinthBrowserSearch } from "@/views/main/features/modrinth/use-modrinth-browser-search";
import { cn } from "@/views/main/lib/utils";

export function ContentBrowserDialog({
  availableInstances = [],
  initialCategory,
  initialSource,
  instanceContent,
  installedContent,
  onCompleteManualInstall,
  onInstall,
  onInstallModpack,
  onInstallModrinth,
  onInstallModrinthModpack,
  onOpenChange,
  onOpenDetails,
  onOpenModrinthDetails,
  onOpenManualDownload,
  onSelectInstance,
  onUninstall,
  onUpdate,
  open,
  selectedInstance,
}: ContentBrowserDialogProps) {
  const instanceControlled = selectedInstance !== undefined;
  const [localSelectedInstance, setLocalSelectedInstance] =
    useState<SelectedInstance | null>(selectedInstance ?? null);
  const activeInstance = instanceControlled
    ? (selectedInstance ?? null)
    : localSelectedInstance;
  const [activeSource, setActiveSource] = useState<ContentBrowserSource>(
    initialSource ?? "curseforge",
  );
  const [activeCategory, setActiveCategory] = useState<BrowserCategory>(
    initialCategory ?? DEFAULT_CURSEFORGE_CATEGORY,
  );
  const [query, setQuery] = useState("");
  const [minecraftVersion, setMinecraftVersion] = useState("");
  const [loader, setLoader] = useState<LoaderFilter>("all");
  const [curseForgeSortField, setCurseForgeSortField] =
    useState<CurseForgeSortField>("popularity");
  const [modrinthSortField, setModrinthSortField] =
    useState<ModrinthSortField>("relevance");
  const [installedOnly, setInstalledOnly] = useState(false);
  const [viewMode, setViewMode] = useState<CurseForgeBrowserViewMode>("grid");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedProject, setSelectedProject] =
    useState<SelectedProject | null>(null);
  const [manualInstallRequest, setManualInstallRequest] =
    useState<ManualInstallRequest | null>(null);
  const [pendingKeys, setPendingKeys] = useState<Set<string>>(() => new Set());
  const [failedKeys, setFailedKeys] = useState<Set<string>>(() => new Set());
  const curseForgeInstallActionsConfigured = Boolean(
    onInstall ||
      onUninstall ||
      onUpdate ||
      onOpenManualDownload ||
      onCompleteManualInstall,
  );
  const modrinthInstallActionsConfigured = Boolean(
    onInstallModrinth || onInstallModrinthModpack,
  );
  const canClearInstance = !instanceControlled || Boolean(onSelectInstance);
  const activeCategories =
    activeSource === "curseforge" ? CURSEFORGE_CATEGORIES : MODRINTH_CATEGORIES;
  const activeCategoryInfo = activeCategories.find(
    (category) => category.value === activeCategory,
  ) ?? {
    description:
      activeSource === "curseforge"
        ? "Minecraft content available on CurseForge."
        : "Minecraft content available on Modrinth.",
    label: "Minecraft Content",
    value:
      activeSource === "curseforge"
        ? DEFAULT_CURSEFORGE_CATEGORY
        : DEFAULT_MODRINTH_CATEGORY,
  };
  const activeSourceLabel =
    activeSource === "curseforge" ? "CurseForge" : "Modrinth";
  const activeInstallActionsConfigured =
    activeSource === "curseforge"
      ? activeCategory === "modpacks"
        ? Boolean(
            onInstallModpack ||
              (onOpenManualDownload && onCompleteManualInstall),
          )
        : curseForgeInstallActionsConfigured
      : activeCategory === "modpacks"
        ? Boolean(onInstallModrinthModpack)
        : modrinthInstallActionsConfigured;

  useEffect(() => {
    if (selectedInstance !== undefined) {
      setLocalSelectedInstance(selectedInstance);
    }
  }, [selectedInstance]);

  useEffect(() => {
    if (!open) return;

    setActiveSource(initialSource ?? "curseforge");
    setActiveCategory(initialCategory ?? DEFAULT_CURSEFORGE_CATEGORY);
    setSelectedProject(null);
    setManualInstallRequest(null);
  }, [initialCategory, initialSource, open]);

  useEffect(() => {
    if (!open || !activeInstance) return;

    setMinecraftVersion((current) =>
      current.trim() ? current : activeInstance.minecraftVersion,
    );
  }, [activeInstance, open]);

  useEffect(() => {
    if (!open) return;

    const available =
      activeSource === "curseforge"
        ? isCurseForgeCategoryAvailable(
            activeCategory as CurseForgeCategory,
            activeInstance,
          )
        : activeCategory !== "worlds" &&
          isModrinthCategoryAvailable(
            activeCategory as ModrinthCategory,
            activeInstance,
          );

    if (available) {
      return;
    }

    setActiveCategory(
      activeSource === "curseforge"
        ? DEFAULT_CURSEFORGE_CATEGORY
        : DEFAULT_MODRINTH_CATEGORY,
    );
    setSelectedProject(null);
    setManualInstallRequest(null);
  }, [activeCategory, activeInstance, activeSource, open]);

  const curseForgeCategory =
    activeCategory === "worlds"
      ? "worlds"
      : (activeCategory as CurseForgeCategory);
  const modrinthCategory =
    activeCategory === "worlds"
      ? DEFAULT_MODRINTH_CATEGORY
      : (activeCategory as ModrinthCategory);
  const curseForgeSearch = useCurseForgeBrowserSearch({
    category: curseForgeCategory,
    loader,
    minecraftVersion: minecraftVersion.trim() || null,
    open: open && activeSource === "curseforge",
    query,
    sortField: curseForgeSortField,
  });
  const modrinthSearch = useModrinthBrowserSearch({
    category: modrinthCategory,
    loader,
    minecraftVersion: minecraftVersion.trim() || null,
    open: open && activeSource === "modrinth",
    query,
    sortField: modrinthSortField,
  });

  const visibleCurseForgeProjects = useMemo(() => {
    if (!installedOnly || !activeInstance) return curseForgeSearch.projects;

    return curseForgeSearch.projects.filter((item) =>
      findInstalledCurseForgeItem(item, curseForgeCategory, installedContent),
    );
  }, [
    activeInstance,
    curseForgeCategory,
    curseForgeSearch.projects,
    installedContent,
    installedOnly,
  ]);

  const visibleModrinthProjects = useMemo(() => {
    if (!installedOnly || !activeInstance) return modrinthSearch.projects;

    return modrinthSearch.projects.filter((item) =>
      findInstalledModrinthItem(item, modrinthCategory, instanceContent),
    );
  }, [
    activeInstance,
    instanceContent,
    installedOnly,
    modrinthCategory,
    modrinthSearch.projects,
  ]);

  useEffect(() => {
    if (!open || !selectedProject) return;

    const projects =
      selectedProject.source === "curseforge"
        ? visibleCurseForgeProjects
        : visibleModrinthProjects;

    if (!projects.some((item) => item.id === selectedProject.item.id)) {
      setSelectedProject(null);
    }
  }, [
    open,
    selectedProject,
    visibleCurseForgeProjects,
    visibleModrinthProjects,
  ]);

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

  const runCurseForgeItemAction = async (
    item: CurseForgeProjectSummary,
    action: () => Promise<void> | void,
  ) => {
    const key = getCurseForgeItemKey(curseForgeCategory, item);
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

  const runModrinthItemAction = async (
    item: ModrinthProjectSummary,
    action: () => Promise<void> | void,
  ) => {
    const key = getModrinthItemKey(modrinthCategory, item);
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

  const handleCurseForgePrimaryAction = (
    item: CurseForgeProjectSummary,
    installedItem: InstalledCurseForgeItem | null,
  ) => {
    const manualDownloadRequired = requiresManualCurseForgeDownload(item);

    if (manualDownloadRequired) {
      setManualInstallRequest({ category: curseForgeCategory, item });

      if (!onOpenManualDownload) return;
      if (
        categoryRequiresInstanceTarget(curseForgeCategory) &&
        !activeInstance
      ) {
        return;
      }

      void runCurseForgeItemAction(item, () =>
        onOpenManualDownload({
          category: curseForgeCategory,
          instance: activeInstance,
          item,
        }),
      );
      return;
    }

    if (curseForgeCategory === "modpacks") {
      if (!activeInstance && onInstallModpack) {
        void runCurseForgeItemAction(item, () =>
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
      void runCurseForgeItemAction(item, () =>
        onUpdate({
          category: curseForgeCategory,
          installedItem,
          instance: activeInstance,
          item,
        }),
      );
      return;
    }

    if (!onInstall) return;

    void runCurseForgeItemAction(item, () =>
      onInstall({
        category: curseForgeCategory,
        instance: activeInstance,
        item,
      }),
    );
  };

  const handleModrinthPrimaryAction = (
    item: ModrinthProjectSummary,
    _installedItem: InstalledModrinthItem | null,
  ) => {
    if (modrinthCategory === "modpacks") {
      if (!activeInstance && onInstallModrinthModpack) {
        void runModrinthItemAction(item, () =>
          onInstallModrinthModpack({
            category: "modpacks",
            item,
          }),
        );
      }
      return;
    }

    if (!activeInstance || !onInstallModrinth) return;

    void runModrinthItemAction(item, () =>
      onInstallModrinth({
        category: modrinthCategory,
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

    void runCurseForgeItemAction(manualInstallRequest.item, () =>
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

    void runCurseForgeItemAction(manualInstallRequest.item, async () => {
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

    void runCurseForgeItemAction(item, () =>
      onUninstall({
        category: curseForgeCategory,
        instance: activeInstance,
        item: installedItem,
      }),
    );
  };

  const handleCurseForgeDetails = (item: CurseForgeProjectSummary) => {
    setSelectedProject({
      category: curseForgeCategory,
      item,
      source: "curseforge",
    });
    onOpenDetails?.(item, curseForgeCategory);
  };

  const handleModrinthDetails = (item: ModrinthProjectSummary) => {
    setSelectedProject({
      category: modrinthCategory,
      item,
      source: "modrinth",
    });
    onOpenModrinthDetails?.(item, modrinthCategory);
  };

  const loaderFilterEnabled = Boolean(
    (activeSource === "curseforge"
      ? categorySupportsLoaderFilter(curseForgeCategory)
      : categorySupportsModrinthLoaderFilter(modrinthCategory)) &&
      minecraftVersion.trim(),
  );
  const activeSearch =
    activeSource === "curseforge" ? curseForgeSearch : modrinthSearch;
  const activeVisibleCount =
    activeSource === "curseforge"
      ? visibleCurseForgeProjects.length
      : visibleModrinthProjects.length;
  const resultCountLabel = activeSearch.loading
    ? "Loading projects"
    : `${activeVisibleCount} shown${
        activeSearch.totalCount > activeVisibleCount
          ? ` from ${formatCurseForgeDownloads(activeSearch.totalCount)}`
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
  const handleCategoryChange = (category: BrowserCategory) => {
    const available =
      activeSource === "curseforge"
        ? isCurseForgeCategoryAvailable(category, activeInstance)
        : category !== "worlds" &&
          isModrinthCategoryAvailable(
            category as ModrinthCategory,
            activeInstance,
          );

    if (!available) {
      return;
    }

    setActiveCategory(category);
    setSelectedProject(null);
    setManualInstallRequest(null);
    if (
      activeSource === "curseforge"
        ? !categorySupportsLoaderFilter(category)
        : category === "resource-packs" || category === "shaders"
    ) {
      setLoader("all");
    }
  };

  const handleSourceChange = (source: ContentBrowserSource) => {
    setActiveSource(source);
    setSelectedProject(null);
    setManualInstallRequest(null);
    if (source === "modrinth" && activeCategory === "worlds") {
      setActiveCategory(DEFAULT_MODRINTH_CATEGORY);
    }
    if (source === "curseforge" && activeCategory === "worlds") {
      setLoader("all");
    }
  };

  const getInstalledCount = (category: BrowserCategory): number => {
    if (activeSource === "curseforge") {
      return installedContent?.[category as CurseForgeCategory]?.length ?? 0;
    }

    if (category === "modpacks") return 0;

    const modrinthCategoryForCount = category as ModrinthCategory;

    if (modrinthCategoryForCount === "mods") {
      return instanceContent?.mods.length ?? 0;
    }
    if (modrinthCategoryForCount === "resource-packs") {
      return instanceContent?.resourcePacks.length ?? 0;
    }
    if (modrinthCategoryForCount === "shaders") {
      return instanceContent?.shaderPacks.length ?? 0;
    }

    return 0;
  };

  const isActiveCategoryAvailable = (
    category: BrowserCategory,
    instance: SelectedInstance | null,
  ): boolean =>
    activeSource === "curseforge"
      ? isCurseForgeCategoryAvailable(category as CurseForgeCategory, instance)
      : category !== "worlds" &&
        isModrinthCategoryAvailable(category as ModrinthCategory, instance);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="!top-12 !right-2 !bottom-2 !left-2 !h-auto !w-auto !max-w-none !translate-x-0 !translate-y-0 grid min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-0 overflow-hidden rounded-lg bg-background p-0 text-foreground sm:!right-3 sm:!bottom-3 sm:!left-3 sm:!max-w-none"
        showCloseButton={false}
      >
        <ContentBrowserHeader
          activeInstallActionsConfigured={activeInstallActionsConfigured}
          activeInstance={activeInstance}
          activeSource={activeSource}
          activeSourceLabel={activeSourceLabel}
          availableInstances={availableInstances}
          canClearInstance={canClearInstance}
          onSelectInstance={handleSelectInstance}
          onSourceChange={handleSourceChange}
          resultCountLabel={resultCountLabel}
        />

        <div className="grid min-h-0 grid-cols-1 bg-background lg:grid-cols-[13rem_minmax(0,1fr)]">
          <aside className="hidden min-h-0 border-r border-border bg-sidebar/70 lg:flex lg:flex-col">
            <ContentBrowserCategoryRail
              activeCategory={activeCategory}
              categories={activeCategories}
              getInstalledCount={getInstalledCount}
              isCategoryAvailable={isActiveCategoryAvailable}
              selectedInstance={activeInstance}
              onCategoryChange={handleCategoryChange}
            />
          </aside>

          <div className="relative flex min-h-0 min-w-0 flex-col">
            <ContentBrowserFilterBar
              activeCategory={activeCategory}
              activeCategoryInfo={activeCategoryInfo}
              activeCategories={activeCategories}
              activeInstance={activeInstance}
              activeSource={activeSource}
              activeSourceLabel={activeSourceLabel}
              curseForgeSortField={curseForgeSortField}
              filtersOpen={filtersOpen}
              installedOnly={installedOnly}
              isActiveCategoryAvailable={isActiveCategoryAvailable}
              loader={loader}
              loaderFilterEnabled={loaderFilterEnabled}
              minecraftVersion={minecraftVersion}
              modrinthSortField={modrinthSortField}
              onCategoryChange={handleCategoryChange}
              onCurseForgeSortFieldChange={setCurseForgeSortField}
              onFiltersOpenChange={setFiltersOpen}
              onInstalledOnlyChange={setInstalledOnly}
              onLoaderChange={setLoader}
              onMinecraftVersionChange={setMinecraftVersion}
              onModrinthSortFieldChange={setModrinthSortField}
              onQueryChange={setQuery}
              onRefresh={activeSearch.refresh}
              onViewModeChange={setViewMode}
              query={query}
              viewMode={viewMode}
            />

            <ScrollArea className="min-h-0 flex-1">
              <div className={cn("p-4 sm:p-5", selectedProject && "pb-56")}>
                {manualInstallRequest ? (
                  <ContentBrowserManualInstallPanel
                    disabled={manualInstallDisabled}
                    item={manualInstallRequest.item}
                    onCancel={() => setManualInstallRequest(null)}
                    onOpenDownload={handleOpenManualDownload}
                    onScanDownloads={handleScanManualDownload}
                    pending={manualInstallPending}
                  />
                ) : null}
                {activeSearch.error ? (
                  <Alert variant="destructive">
                    <AlertCircleIcon />
                    <AlertTitle>
                      {activeSourceLabel} could not be loaded
                    </AlertTitle>
                    <AlertDescription>{activeSearch.error}</AlertDescription>
                    <AlertAction>
                      <Button
                        onClick={activeSearch.refresh}
                        size="sm"
                        variant="outline"
                      >
                        Retry
                      </Button>
                    </AlertAction>
                  </Alert>
                ) : activeSearch.loading ? (
                  <ContentBrowserSkeleton viewMode={viewMode} />
                ) : activeVisibleCount === 0 ? (
                  <Empty className="min-h-96 border border-dashed">
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        <SearchIcon />
                      </EmptyMedia>
                      <EmptyTitle>
                        No {activeSourceLabel} projects found
                      </EmptyTitle>
                      <EmptyDescription>
                        Adjust the search, category, version, or installed
                        filter.
                      </EmptyDescription>
                    </EmptyHeader>
                    <EmptyContent>
                      <Button onClick={activeSearch.refresh} variant="outline">
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
                    {activeSource === "curseforge"
                      ? visibleCurseForgeProjects.map((item) => {
                          const key = getCurseForgeItemKey(
                            curseForgeCategory,
                            item,
                          );
                          const installedItem = findInstalledCurseForgeItem(
                            item,
                            curseForgeCategory,
                            installedContent,
                          );
                          const actionState = getCurseForgeActionState({
                            category: curseForgeCategory,
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
                            category: curseForgeCategory,
                            hasFile: Boolean(item.latestFile),
                            hasInstallCallback:
                              curseForgeCategory === "modpacks"
                                ? Boolean(onInstallModpack)
                                : Boolean(onInstall),
                            hasManualInstallCallback: Boolean(
                              onOpenManualDownload && onCompleteManualInstall,
                            ),
                            hasUpdateCallback:
                              curseForgeCategory === "modpacks"
                                ? false
                                : Boolean(onUpdate),
                            manualDownloadRequired,
                            source: "curseforge",
                          });

                          return (
                            <CurseForgeResultCard
                              actionDisabledReason={actionDisabledReason}
                              actionState={actionState}
                              category={curseForgeCategory}
                              installActionsConfigured={
                                activeInstallActionsConfigured
                              }
                              installedItem={installedItem}
                              item={item}
                              key={key}
                              manualDownloadRequired={manualDownloadRequired}
                              onDetails={() => handleCurseForgeDetails(item)}
                              onPrimaryAction={() =>
                                handleCurseForgePrimaryAction(
                                  item,
                                  installedItem,
                                )
                              }
                              onSecondaryAction={
                                installedItem && onUninstall
                                  ? () => handleUninstall(item, installedItem)
                                  : undefined
                              }
                              selected={
                                selectedProject?.source === "curseforge" &&
                                selectedProject.item.id === item.id
                              }
                              viewMode={viewMode}
                            />
                          );
                        })
                      : visibleModrinthProjects.map((item) => {
                          const key = getModrinthItemKey(
                            modrinthCategory,
                            item,
                          );
                          const installedItem = findInstalledModrinthItem(
                            item,
                            modrinthCategory,
                            instanceContent,
                          );
                          const actionState = getModrinthActionState({
                            category: modrinthCategory,
                            failed: failedKeys.has(key),
                            installedItem,
                            item,
                            pending: pendingKeys.has(key),
                            selectedInstance: activeInstance,
                          });
                          const actionDisabledReason = getDisabledReason({
                            actionState,
                            category: modrinthCategory,
                            hasFile: Boolean(item.latestFile),
                            hasInstallCallback:
                              modrinthCategory === "modpacks"
                                ? Boolean(onInstallModrinthModpack)
                                : Boolean(onInstallModrinth),
                            hasManualInstallCallback: false,
                            hasUpdateCallback: false,
                            manualDownloadRequired: false,
                            source: "modrinth",
                          });

                          return (
                            <ModrinthResultCard
                              actionDisabledReason={actionDisabledReason}
                              actionState={actionState}
                              category={modrinthCategory}
                              installActionsConfigured={
                                activeInstallActionsConfigured
                              }
                              installedItem={installedItem}
                              item={item}
                              key={key}
                              onDetails={() => handleModrinthDetails(item)}
                              onPrimaryAction={() =>
                                handleModrinthPrimaryAction(item, installedItem)
                              }
                              selected={
                                selectedProject?.source === "modrinth" &&
                                selectedProject.item.id === item.id
                              }
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
                <ContentBrowserSelectedProjectSummary
                  category={selectedProject.category}
                  item={selectedProject.item}
                  onClear={() => setSelectedProject(null)}
                  selectedInstance={activeInstance}
                  source={selectedProject.source}
                />
              </div>
            ) : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export { ContentBrowserDialog as CurseForgeBrowserDialog };
