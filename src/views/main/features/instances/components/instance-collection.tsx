import {
  ChevronDownIcon,
  LayoutGridIcon,
  ListIcon,
  PlusIcon,
  SearchIcon,
} from "lucide-react";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DownloadQueueJob, LauncherInstance } from "@/shared/types";
import { Button } from "@/views/main/components/ui/button";
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
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/views/main/components/ui/toggle-group";
import {
  InstallingInstanceListItem,
  InstanceCard,
  type InstanceCardDensity,
  InstanceListItem,
} from "@/views/main/features/instances/components/instance-card";
import { InstanceCollectionLoading } from "@/views/main/features/instances/components/instance-collection-loading";
import type {
  InstanceCollectionSkeleton,
  InstanceCollectionViewMode,
} from "@/views/main/features/instances/components/instance-collection-types";
import {
  getInitialVisibleInstanceLimit,
  getNextVisibleInstanceLimit,
  getPreferredInstanceCollectionViewMode,
  LOW_END_INSTANCE_BATCH_SIZE,
} from "@/views/main/features/instances/instance-collection-model";
import {
  getActiveModpackInstallJobs,
  isCompletedModpackDownloadJob,
} from "@/views/main/features/instances/modpack-install-jobs";
import { cn } from "@/views/main/lib/utils";

type InstanceCardWrapperProps = {
  animationsDisabled: boolean;
  density: InstanceCardDensity;
  featured: boolean;
  installJob: DownloadQueueJob | undefined;
  instance: LauncherInstance;
  launchDisabled: boolean;
  launchLoading: boolean;
  onPlayInstance: (instanceId: string) => void;
  viewMode: InstanceCollectionViewMode;
};

const InstanceCardWrapper = memo(function InstanceCardWrapper({
  animationsDisabled,
  density,
  featured,
  installJob,
  instance,
  launchDisabled,
  launchLoading,
  onPlayInstance,
  viewMode,
}: InstanceCardWrapperProps) {
  const onPlay = useCallback(() => {
    onPlayInstance(instance.id);
  }, [onPlayInstance, instance.id]);

  if (viewMode === "list") {
    return (
      <InstanceListItem
        featured={featured}
        installJob={installJob}
        instance={instance}
        animationsDisabled={animationsDisabled}
        launchDisabled={launchDisabled}
        launchLoading={launchLoading}
        onPlay={onPlay}
      />
    );
  }

  return (
    <InstanceCard
      density={density}
      featured={featured}
      installJob={installJob}
      instance={instance}
      animationsDisabled={animationsDisabled}
      launchDisabled={launchDisabled}
      launchLoading={launchLoading}
      onPlay={onPlay}
    />
  );
});

type InstanceCollectionProps = {
  cardDensity?: InstanceCardDensity;
  className?: string;
  downloadJobs: Array<DownloadQueueJob>;
  emptyClassName?: string;
  featuredInstanceId?: string | null;
  gridClassName?: string;
  hideWhenEmpty?: boolean;
  instanceCount?: number;
  instances: Array<LauncherInstance>;
  launchLoadingId: string | null;
  listClassName?: string;
  loading: boolean;
  lowEndMode?: boolean;
  onCreateInstance?: () => void;
  onInstallCompleted?: () => void;
  onPlayInstance: (instanceId: string) => void;
  searchPlaceholder?: string;
  showSearch?: boolean;
  showViewToggle?: boolean;
  skeleton?: InstanceCollectionSkeleton;
  title?: string;
  viewModeDefault?: InstanceCollectionViewMode;
};

function matchesInstanceSearch({
  installJob,
  instance,
  query,
}: {
  installJob: DownloadQueueJob | undefined;
  instance: LauncherInstance;
  query: string;
}): boolean {
  return [
    instance.name,
    instance.versionId,
    instance.loader,
    instance.loaderVersion ?? "",
    installJob?.title ?? "",
    installJob?.subtitle ?? "",
    installJob?.activeLabel ?? "",
  ]
    .join(" ")
    .toLowerCase()
    .includes(query);
}

function matchesInstallJobSearch(
  job: DownloadQueueJob,
  query: string,
): boolean {
  return [job.title, job.subtitle, job.activeLabel ?? ""]
    .join(" ")
    .toLowerCase()
    .includes(query);
}

export function InstanceCollection({
  cardDensity = "standard",
  className,
  downloadJobs,
  emptyClassName,
  featuredInstanceId = null,
  gridClassName,
  hideWhenEmpty = false,
  instanceCount,
  instances,
  launchLoadingId,
  listClassName,
  loading,
  lowEndMode = false,
  onCreateInstance,
  onInstallCompleted,
  onPlayInstance,
  searchPlaceholder = "Search instances...",
  showSearch = true,
  showViewToggle = false,
  skeleton = cardDensity === "compact" ? "compact" : "standard",
  title,
  viewModeDefault = "grid",
}: InstanceCollectionProps) {
  const [query, setQuery] = useState("");
  const [viewMode, setViewMode] = useState<InstanceCollectionViewMode>(() =>
    getPreferredInstanceCollectionViewMode({ lowEndMode, viewModeDefault }),
  );
  const [visibleItemLimit, setVisibleItemLimit] = useState(0);
  const viewModeChangedRef = useRef(false);
  const refreshedInstallJobsRef = useRef<Set<string>>(new Set());
  const { byInstanceId: activeInstallJobByInstanceId, unmatchedJobs } = useMemo(
    () => getActiveModpackInstallJobs(downloadJobs, instances),
    [downloadJobs, instances],
  );
  const activeInstallCount =
    activeInstallJobByInstanceId.size + unmatchedJobs.length;
  const hasContent = instances.length > 0 || activeInstallCount > 0;
  const searchQuery = query.trim().toLowerCase();
  const filteredInstances = useMemo(() => {
    if (!searchQuery) return instances;

    return instances.filter((instance) =>
      matchesInstanceSearch({
        installJob: activeInstallJobByInstanceId.get(instance.id),
        instance,
        query: searchQuery,
      }),
    );
  }, [activeInstallJobByInstanceId, instances, searchQuery]);
  const filteredInstallJobs = useMemo(() => {
    if (!searchQuery) return unmatchedJobs;

    return unmatchedJobs.filter((job) =>
      matchesInstallJobSearch(job, searchQuery),
    );
  }, [searchQuery, unmatchedJobs]);
  const showToolbar =
    Boolean(title) ||
    (showSearch && hasContent) ||
    (showViewToggle && hasContent);
  const effectiveViewMode = viewModeChangedRef.current
    ? viewMode
    : getPreferredInstanceCollectionViewMode({ lowEndMode, viewModeDefault });
  const totalFilteredItems =
    filteredInstallJobs.length + filteredInstances.length;
  const visibleLimit = lowEndMode
    ? visibleItemLimit ||
      getInitialVisibleInstanceLimit({
        lowEndMode,
        totalItems: totalFilteredItems,
      })
    : totalFilteredItems;
  const visibleInstallJobs = lowEndMode
    ? filteredInstallJobs.slice(0, visibleLimit)
    : filteredInstallJobs;
  const visibleInstanceLimit = Math.max(
    0,
    visibleLimit - visibleInstallJobs.length,
  );
  const visibleInstances = lowEndMode
    ? filteredInstances.slice(0, visibleInstanceLimit)
    : filteredInstances;
  const hiddenItemCount =
    totalFilteredItems - visibleInstallJobs.length - visibleInstances.length;
  const showMoreItemCount = Math.min(
    hiddenItemCount,
    LOW_END_INSTANCE_BATCH_SIZE,
  );

  const showMoreItems = useCallback(() => {
    setVisibleItemLimit((currentLimit) =>
      getNextVisibleInstanceLimit({
        currentLimit: currentLimit || visibleLimit,
        totalItems: totalFilteredItems,
      }),
    );
  }, [totalFilteredItems, visibleLimit]);

  useEffect(() => {
    if (viewModeChangedRef.current) return;

    setViewMode(
      getPreferredInstanceCollectionViewMode({ lowEndMode, viewModeDefault }),
    );
  }, [lowEndMode, viewModeDefault]);

  useEffect(() => {
    setVisibleItemLimit(
      getInitialVisibleInstanceLimit({
        lowEndMode,
        totalItems: totalFilteredItems,
      }),
    );
  }, [lowEndMode, totalFilteredItems]);

  useEffect(() => {
    if (!onInstallCompleted) return;

    let shouldRefresh = false;

    for (const job of downloadJobs) {
      if (
        !isCompletedModpackDownloadJob(job) ||
        refreshedInstallJobsRef.current.has(job.id)
      ) {
        continue;
      }

      refreshedInstallJobsRef.current.add(job.id);
      shouldRefresh = true;
    }

    if (shouldRefresh) {
      onInstallCompleted();
    }
  }, [downloadJobs, onInstallCompleted]);

  if (!loading && hideWhenEmpty && !hasContent) {
    return null;
  }

  return (
    <section className={className}>
      {showToolbar ? (
        <div className="mb-4 flex flex-wrap items-center gap-2.5">
          {title ? (
            <h2 className="mr-auto font-bold text-foreground text-sm">
              {title}{" "}
              <span className="font-normal text-muted-foreground">
                ({instanceCount ?? instances.length})
              </span>
            </h2>
          ) : null}

          {showSearch && hasContent ? (
            <InputGroup className="w-full sm:w-56">
              <InputGroupAddon>
                <SearchIcon />
              </InputGroupAddon>
              <InputGroupInput
                onChange={(event) => setQuery(event.target.value)}
                placeholder={searchPlaceholder}
                value={query}
              />
            </InputGroup>
          ) : null}

          {showViewToggle && hasContent ? (
            <ToggleGroup
              aria-label="Instance view"
              className="shrink-0"
              onValueChange={(value) => {
                const nextMode = value[0];
                if (nextMode === "grid" || nextMode === "list") {
                  viewModeChangedRef.current = true;
                  setViewMode(nextMode);
                }
              }}
              size="sm"
              spacing={0}
              value={[effectiveViewMode]}
              variant="outline"
            >
              <ToggleGroupItem
                aria-label="Show instances as cards"
                className="bg-background/60"
                type="button"
                value="grid"
              >
                <LayoutGridIcon />
              </ToggleGroupItem>
              <ToggleGroupItem
                aria-label="Show instances as a list"
                className="bg-background/60"
                type="button"
                value="list"
              >
                <ListIcon />
              </ToggleGroupItem>
            </ToggleGroup>
          ) : null}
        </div>
      ) : null}

      {loading ? (
        <InstanceCollectionLoading
          skeleton={skeleton}
          viewMode={effectiveViewMode}
        />
      ) : filteredInstances.length === 0 && filteredInstallJobs.length === 0 ? (
        <Empty
          className={cn(
            "rounded-lg border border-dashed py-12",
            emptyClassName,
          )}
        >
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <SearchIcon />
            </EmptyMedia>
            <EmptyTitle>
              {searchQuery && hasContent
                ? `No results for "${query}"`
                : "No instances yet"}
            </EmptyTitle>
            <EmptyDescription>
              {searchQuery && hasContent
                ? "Try a different name, version, loader, or install status."
                : "Create a Minecraft instance to get started."}
            </EmptyDescription>
          </EmptyHeader>
          {!hasContent && onCreateInstance ? (
            <EmptyContent>
              <Button onClick={onCreateInstance} size="sm">
                <PlusIcon data-icon="inline-start" />
                New Instance
              </Button>
            </EmptyContent>
          ) : null}
        </Empty>
      ) : effectiveViewMode === "grid" ? (
        <>
          <div
            className={
              gridClassName ??
              "grid grid-cols-[repeat(auto-fill,minmax(17rem,1fr))] gap-3"
            }
          >
            {visibleInstallJobs.map((job) => (
              <InstanceCard
                animationsDisabled={lowEndMode}
                density={cardDensity}
                installJob={job}
                key={job.id}
              />
            ))}
            {visibleInstances.map((instance) => (
              <InstanceCardWrapper
                animationsDisabled={lowEndMode}
                density={cardDensity}
                featured={instance.id === featuredInstanceId}
                installJob={activeInstallJobByInstanceId.get(instance.id)}
                instance={instance}
                key={instance.id}
                launchDisabled={launchLoadingId !== null}
                launchLoading={launchLoadingId === instance.id}
                onPlayInstance={onPlayInstance}
                viewMode={effectiveViewMode}
              />
            ))}
          </div>
          {hiddenItemCount > 0 ? (
            <div className="mt-4 flex justify-center">
              <Button
                onClick={showMoreItems}
                size="sm"
                type="button"
                variant="outline"
              >
                <ChevronDownIcon data-icon="inline-start" />
                Show {showMoreItemCount} more
              </Button>
            </div>
          ) : null}
        </>
      ) : (
        <>
          <div className={listClassName ?? "flex flex-col gap-1"}>
            {visibleInstallJobs.map((job) => (
              <InstallingInstanceListItem installJob={job} key={job.id} />
            ))}
            {visibleInstances.map((instance) => (
              <InstanceCardWrapper
                animationsDisabled={lowEndMode}
                density={cardDensity}
                featured={instance.id === featuredInstanceId}
                installJob={activeInstallJobByInstanceId.get(instance.id)}
                instance={instance}
                key={instance.id}
                launchDisabled={launchLoadingId !== null}
                launchLoading={launchLoadingId === instance.id}
                onPlayInstance={onPlayInstance}
                viewMode={effectiveViewMode}
              />
            ))}
          </div>
          {hiddenItemCount > 0 ? (
            <div className="mt-4 flex justify-center">
              <Button
                onClick={showMoreItems}
                size="sm"
                type="button"
                variant="outline"
              >
                <ChevronDownIcon data-icon="inline-start" />
                Show {showMoreItemCount} more
              </Button>
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}
