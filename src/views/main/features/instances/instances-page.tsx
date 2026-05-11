import { Link } from "@tanstack/react-router";
import {
  AlertTriangleIcon,
  BoxesIcon,
  InfoIcon,
  PlayIcon,
  PlusIcon,
  SearchIcon,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { DownloadQueueJob, LauncherInstance } from "@/shared/types";
import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from "@/views/main/components/ui/alert";
import { Badge } from "@/views/main/components/ui/badge";
import { Button, buttonVariants } from "@/views/main/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/views/main/components/ui/card";
import {
  Empty,
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
import { Skeleton } from "@/views/main/components/ui/skeleton";
import { useDownloadQueueStore } from "@/views/main/features/downloads/download-queue-store";
import {
  InstanceArtwork,
  InstanceIcon,
} from "@/views/main/features/instances/components/instance-artwork";
import { InstanceCard } from "@/views/main/features/instances/components/instance-card";
import {
  formatInstanceLastPlayed,
  LOADER_LABELS,
} from "@/views/main/features/instances/components/instance-format";
import { LaunchPlanSheet } from "@/views/main/features/instances/components/launch-plan-sheet";
import { NewInstanceDialog } from "@/views/main/features/instances/components/new-instance-dialog";
import { useLaunchPlan } from "@/views/main/features/instances/hooks/use-launch-plan";
import { useInstances } from "@/views/main/hooks/use-instances";

const isModpackDownloadJob = (job: DownloadQueueJob): boolean =>
  (job.metadata.kind === "curseForgeFile" ||
    job.metadata.kind === "modrinthFile") &&
  job.metadata.category === "modpacks";

const isActiveModpackDownloadJob = (job: DownloadQueueJob): boolean =>
  isModpackDownloadJob(job) &&
  (job.status === "queued" || job.status === "running");

const isCompletedModpackDownloadJob = (job: DownloadQueueJob): boolean =>
  isModpackDownloadJob(job) &&
  job.status === "completed" &&
  (job.result?.kind === "curseForgeFile" ||
    job.result?.kind === "modrinthFile") &&
  Boolean(job.result.result.instance);

const getActiveModpackJobInstanceId = (
  job: DownloadQueueJob,
  instances: Array<LauncherInstance>,
): string | null => {
  if (
    job.metadata.kind !== "curseForgeFile" &&
    job.metadata.kind !== "modrinthFile"
  ) {
    return null;
  }
  const metadata = job.metadata;

  if (
    metadata.targetInstanceId &&
    instances.some((instance) => instance.id === metadata.targetInstanceId)
  ) {
    return metadata.targetInstanceId;
  }

  const projectId = String(metadata.projectId);
  const projectMatch = instances.find(
    (instance) => instance.modpack?.projectId === projectId,
  );

  if (projectMatch) return projectMatch.id;

  const titleMatch = instances.find(
    (instance) =>
      instance.modpack?.name === job.title || instance.name === job.title,
  );

  return titleMatch?.id ?? null;
};

function FeaturedInstancePanel({
  instance,
  loading,
  onCreateInstance,
  onPlayInstance,
}: {
  instance: LauncherInstance | null;
  loading: boolean;
  onCreateInstance: () => void;
  onPlayInstance: (instanceId: string) => void;
}) {
  if (loading) {
    return <Skeleton className="h-56 w-full rounded-xl" />;
  }

  if (!instance) {
    return (
      <div className="flex min-h-52 flex-col items-center justify-center gap-4 rounded-xl border border-dashed bg-muted/10 p-8 text-center">
        <BoxesIcon className="size-10 text-muted-foreground/30" />
        <div>
          <p className="font-semibold">No instances yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Create a Minecraft instance to get started.
          </p>
        </div>
        <Button onClick={onCreateInstance}>
          <PlusIcon data-icon="inline-start" />
          New Instance
        </Button>
      </div>
    );
  }

  return (
    <div className="group relative min-h-52 overflow-hidden rounded-xl border border-border/60 bg-background shadow-[0_20px_80px_-50px_black]">
      <InstanceArtwork
        className="absolute inset-0 h-full opacity-90 transition-transform duration-700 group-hover:scale-[1.03]"
        instance={instance}
        showBadge={false}
        variant="hero"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-background via-background/82 to-background/10" />
      <div className="relative flex min-h-52 flex-col justify-between gap-8 p-5">
        <div className="flex items-center gap-2">
          <InstanceIcon instance={instance} className="size-8 rounded-md" />
          <Badge variant="secondary">{LOADER_LABELS[instance.loader]}</Badge>
          <span className="text-xs text-muted-foreground">
            Minecraft {instance.versionId}
          </span>
        </div>
        <div>
          <h2 className="text-balance font-heading text-3xl font-black leading-none sm:text-4xl">
            {instance.name}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {formatInstanceLastPlayed(instance.lastLaunchedAt, {
              prefix: true,
            })}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button onClick={() => onPlayInstance(instance.id)}>
              <PlayIcon data-icon="inline-start" className="fill-current" />
              Prepare Launch
            </Button>
            <Link
              to="/instances/$instanceId"
              params={{ instanceId: instance.id }}
              className={buttonVariants({ variant: "outline" })}
            >
              <InfoIcon data-icon="inline-start" />
              View Instance
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function LoadingGrid() {
  return (
    <>
      {["a", "b", "c", "d"].map((key) => (
        <Card key={key} className="pt-0">
          <Skeleton className="h-36 rounded-b-none rounded-t-[inherit]" />
          <CardHeader>
            <Skeleton className="h-4 w-28" />
            <Skeleton className="mt-1 h-3 w-20" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-3 w-24" />
          </CardContent>
          <CardFooter className="justify-between">
            <Skeleton className="h-5 w-16 rounded-md" />
            <Skeleton className="size-8 rounded-md" />
          </CardFooter>
        </Card>
      ))}
    </>
  );
}

export function InstancesPage() {
  const instancesHook = useInstances();
  const launchPlan = useLaunchPlan();
  const downloadJobs = useDownloadQueueStore((state) => state.jobs);
  const refreshedModpackJobsRef = useRef<Set<string>>(new Set());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [query, setQuery] = useState("");

  const instances = instancesHook.data ?? [];
  const loading = instancesHook.loading && instancesHook.data === null;
  const activeModpackJobs = useMemo(
    () => downloadJobs.filter(isActiveModpackDownloadJob),
    [downloadJobs],
  );
  const { activeModpackJobByInstanceId, matchedActiveModpackJobIds } =
    useMemo(() => {
      const byInstanceId = new Map<string, DownloadQueueJob>();
      const matchedJobIds = new Set<string>();

      for (const job of activeModpackJobs) {
        const instanceId = getActiveModpackJobInstanceId(job, instances);

        if (!instanceId) continue;

        const existing = byInstanceId.get(instanceId);
        if (
          !existing ||
          (existing.status === "queued" && job.status === "running")
        ) {
          byInstanceId.set(instanceId, job);
        }

        matchedJobIds.add(job.id);
      }

      return {
        activeModpackJobByInstanceId: byInstanceId,
        matchedActiveModpackJobIds: matchedJobIds,
      };
    }, [activeModpackJobs, instances]);
  const unmatchedActiveModpackJobs = useMemo(
    () =>
      activeModpackJobs.filter(
        (job) => !matchedActiveModpackJobIds.has(job.id),
      ),
    [activeModpackJobs, matchedActiveModpackJobIds],
  );

  const filteredInstances = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return instances;
    return instances.filter((instance) => {
      const installJob = activeModpackJobByInstanceId.get(instance.id);
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
        .includes(needle);
    });
  }, [activeModpackJobByInstanceId, instances, query]);

  const filteredActiveModpackJobs = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return unmatchedActiveModpackJobs;

    return unmatchedActiveModpackJobs.filter((job) =>
      [job.title, job.subtitle, job.activeLabel ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(needle),
    );
  }, [query, unmatchedActiveModpackJobs]);

  const featuredInstance = useMemo(() => {
    return (
      [...instances]
        .filter((i) => i.lastLaunchedAt)
        .sort(
          (a, b) =>
            new Date(b.lastLaunchedAt ?? 0).getTime() -
            new Date(a.lastLaunchedAt ?? 0).getTime(),
        )[0] ??
      instances[0] ??
      null
    );
  }, [instances]);

  useEffect(() => {
    let shouldRefresh = false;

    for (const job of downloadJobs) {
      if (
        !isCompletedModpackDownloadJob(job) ||
        refreshedModpackJobsRef.current.has(job.id)
      ) {
        continue;
      }

      refreshedModpackJobsRef.current.add(job.id);
      shouldRefresh = true;
    }

    if (shouldRefresh) {
      instancesHook.refresh();
    }
  }, [downloadJobs, instancesHook.refresh]);

  return (
    <div className="mx-auto flex max-w-[90rem] flex-col gap-5 p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-black leading-none">
            Library
          </h1>
          {!loading && (
            <p className="mt-1 text-sm text-muted-foreground">
              {instances.length === 0
                ? "No instances"
                : `${instances.length} instance${instances.length !== 1 ? "s" : ""}`}
            </p>
          )}
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <PlusIcon data-icon="inline-start" />
          New Instance
        </Button>
      </div>

      {/* Featured */}
      <FeaturedInstancePanel
        instance={featuredInstance}
        loading={loading}
        onCreateInstance={() => setDialogOpen(true)}
        onPlayInstance={(instanceId) => {
          void launchPlan.createLaunchPlan(instanceId);
        }}
      />

      {/* Error */}
      {instancesHook.error && (
        <Alert variant="destructive">
          <AlertTriangleIcon />
          <AlertTitle>Failed to load instances</AlertTitle>
          <AlertDescription>{instancesHook.error}</AlertDescription>
          <AlertAction>
            <Button size="xs" variant="outline" onClick={instancesHook.refresh}>
              Retry
            </Button>
          </AlertAction>
        </Alert>
      )}

      {/* Search */}
      {instances.length > 0 && (
        <div className="flex flex-wrap items-center gap-3">
          <InputGroup className="max-w-sm">
            <InputGroupAddon>
              <SearchIcon />
            </InputGroupAddon>
            <InputGroupInput
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search instances..."
            />
          </InputGroup>
          {query && (
            <span className="text-sm text-muted-foreground">
              {filteredInstances.length} of {instances.length} shown
            </span>
          )}
        </div>
      )}

      {/* Grid */}
      {(loading || instances.length > 0 || activeModpackJobs.length > 0) && (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(17rem,1fr))] gap-3">
          {loading ? (
            <LoadingGrid />
          ) : filteredInstances.length === 0 &&
            filteredActiveModpackJobs.length === 0 ? (
            <Empty className="col-span-full rounded-lg border border-dashed py-12">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <SearchIcon />
                </EmptyMedia>
                <EmptyTitle>No results for "{query}"</EmptyTitle>
                <EmptyDescription>
                  Try a different name, version, or loader.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <>
              {filteredActiveModpackJobs.map((job) => (
                <InstanceCard installJob={job} key={job.id} />
              ))}
              {filteredInstances.map((instance) => (
                <InstanceCard
                  key={instance.id}
                  installJob={activeModpackJobByInstanceId.get(instance.id)}
                  instance={instance}
                  launchDisabled={launchPlan.loadingInstanceId !== null}
                  launchLoading={launchPlan.loadingInstanceId === instance.id}
                  onPlay={() => void launchPlan.createLaunchPlan(instance.id)}
                />
              ))}
            </>
          )}
        </div>
      )}

      <NewInstanceDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onCreated={() => instancesHook.refresh()}
      />
      <LaunchPlanSheet
        open={launchPlan.sheetOpen}
        onOpenChange={launchPlan.setSheetOpen}
        plan={launchPlan.activePlan}
      />
    </div>
  );
}
