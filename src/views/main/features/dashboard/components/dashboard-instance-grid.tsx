import { Link } from "@tanstack/react-router";
import { formatDistanceToNow } from "date-fns";
import {
  ChevronRightIcon,
  LayoutGridIcon,
  ListIcon,
  MoreHorizontalIcon,
  PlayIcon,
  PlusIcon,
  SearchIcon,
} from "lucide-react";
import { useState } from "react";
import type { LauncherInstance } from "@/shared/types";
import { Button } from "@/views/main/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/views/main/components/ui/input-group";
import { Skeleton } from "@/views/main/components/ui/skeleton";
import {
  InstanceArtwork,
  InstanceIcon,
} from "@/views/main/features/instances/components/instance-artwork";
import { cn } from "@/views/main/lib/utils";

type DashboardInstanceGridProps = {
  featuredInstanceId: string | null;
  instanceCount: number | undefined;
  instances: Array<LauncherInstance>;
  launchLoadingId: string | null;
  loading: boolean;
  onCreateInstance: () => void;
  onPlayInstance: (instanceId: string) => void;
};

const SKELETON_IDS = ["card-a", "card-b", "card-c", "card-d", "card-e"];

export function DashboardInstanceGrid({
  featuredInstanceId,
  instanceCount,
  instances,
  launchLoadingId,
  loading,
  onCreateInstance,
  onPlayInstance,
}: DashboardInstanceGridProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const filtered = searchQuery.trim()
    ? instances.filter(
        (i) =>
          i.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          i.versionId.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : instances;

  return (
    <section className="px-4 pt-5 pb-4 sm:px-5">
      <div className="mb-4 flex flex-wrap items-center gap-2.5">
        <h2 className="mr-auto font-bold text-foreground text-sm">
          My Instances{" "}
          <span className="font-normal text-muted-foreground">
            ({instanceCount ?? "..."})
          </span>
        </h2>

        <InputGroup className="w-full sm:w-56">
          <InputGroupAddon>
            <SearchIcon />
          </InputGroupAddon>
          <InputGroupInput
            placeholder="Search instances..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </InputGroup>

        <div className="flex shrink-0 overflow-hidden rounded-md border border-border bg-background/60">
          <button
            type="button"
            onClick={() => setViewMode("grid")}
            className={cn(
              "flex size-8 items-center justify-center transition-colors",
              viewMode === "grid"
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <LayoutGridIcon className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setViewMode("list")}
            className={cn(
              "flex size-8 items-center justify-center transition-colors",
              viewMode === "list"
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <ListIcon className="size-3.5" />
          </button>
        </div>
      </div>

      {loading ? (
        <div
          className={cn(
            viewMode === "grid"
              ? "grid grid-cols-[repeat(auto-fill,minmax(10.5rem,1fr))] gap-3"
              : "flex flex-col gap-2",
          )}
        >
          {SKELETON_IDS.map((key) =>
            viewMode === "grid" ? (
              <div
                key={key}
                className="overflow-hidden rounded-md border border-border bg-card"
              >
                <Skeleton className="h-28" />
                <div className="flex flex-col gap-1.5 bg-card px-2.5 pt-2.5 pb-2.5">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-2.5 w-16" />
                  <Skeleton className="mt-1 h-5 w-full" />
                </div>
              </div>
            ) : (
              <div
                key={key}
                className="flex items-center gap-3 rounded-md border border-border bg-card px-3 py-2.5"
              >
                <Skeleton className="size-8 shrink-0 rounded-sm" />
                <Skeleton className="h-3 w-32" />
                <Skeleton className="ml-auto h-3 w-16" />
              </div>
            ),
          )}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
          {instances.length === 0 ? (
            <>
              <p className="text-muted-foreground text-sm">No instances yet.</p>
              <Button size="sm" onClick={onCreateInstance}>
                <PlusIcon data-icon="inline-start" />
                New Instance
              </Button>
            </>
          ) : (
            <p className="text-muted-foreground text-sm">
              No instances match &ldquo;{searchQuery}&rdquo;.
            </p>
          )}
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(10.5rem,1fr))] gap-3">
          {filtered.map((instance) => (
            <div
              key={instance.id}
              className={cn(
                "group relative flex cursor-pointer flex-col overflow-hidden rounded-md border transition-all hover:-translate-y-0.5",
                instance.id === featuredInstanceId
                  ? "border-primary/60 ring-1 ring-primary/30"
                  : "border-border hover:border-border/80",
              )}
            >
              <Link
                to="/instances/$instanceId"
                params={{ instanceId: instance.id }}
                className="relative block h-28 shrink-0"
              >
                <InstanceArtwork
                  instance={instance}
                  showBadge={false}
                  className="h-full"
                />
                {instance.id === featuredInstanceId && (
                  <div className="pointer-events-none absolute inset-0 rounded-md ring-2 ring-primary/50 ring-inset" />
                )}
              </Link>

              <div className="bg-card px-2.5 pt-2.5 pb-2.5">
                <div className="truncate font-semibold text-foreground text-xs leading-none">
                  {instance.name}
                </div>
                <div className="mt-0.5 truncate text-[0.6rem] text-muted-foreground">
                  {instance.versionId} · {instance.loader}
                </div>

                <div className="mt-2 flex items-center justify-between">
                  <span className="text-[0.58rem] text-muted-foreground/60">
                    {instance.lastLaunchedAt
                      ? formatDistanceToNow(new Date(instance.lastLaunchedAt), {
                          addSuffix: true,
                        })
                      : "Never played"}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={launchLoadingId !== null}
                      onClick={() => onPlayInstance(instance.id)}
                      className={cn(
                        "flex size-5 items-center justify-center rounded-sm transition-colors",
                        launchLoadingId === instance.id
                          ? "cursor-wait bg-primary/50"
                          : "bg-primary hover:bg-primary/80",
                      )}
                    >
                      <PlayIcon className="size-2.5 fill-primary-foreground text-primary-foreground" />
                    </button>
                    <Link
                      to="/instances/$instanceId"
                      params={{ instanceId: instance.id }}
                      className="flex size-5 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
                    >
                      <MoreHorizontalIcon className="size-3" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          {filtered.map((instance) => (
            <div
              key={instance.id}
              className={cn(
                "flex items-center gap-3 rounded-md border px-3 py-2 transition-colors hover:bg-accent/40",
                instance.id === featuredInstanceId
                  ? "border-primary/40 bg-primary/5"
                  : "border-border bg-card",
              )}
            >
              <InstanceIcon instance={instance} className="size-8 rounded-sm" />
              <Link
                to="/instances/$instanceId"
                params={{ instanceId: instance.id }}
                className="min-w-0 flex-1"
              >
                <div className="truncate font-semibold text-foreground text-xs">
                  {instance.name}
                </div>
                <div className="truncate text-[0.6rem] text-muted-foreground">
                  {instance.versionId} · {instance.loader}
                </div>
              </Link>
              <span className="shrink-0 text-[0.58rem] text-muted-foreground/60">
                {instance.lastLaunchedAt
                  ? formatDistanceToNow(new Date(instance.lastLaunchedAt), {
                      addSuffix: true,
                    })
                  : "Never played"}
              </span>
              <button
                type="button"
                disabled={launchLoadingId !== null}
                onClick={() => onPlayInstance(instance.id)}
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded-sm transition-colors",
                  launchLoadingId === instance.id
                    ? "cursor-wait bg-primary/50"
                    : "bg-primary hover:bg-primary/80",
                )}
              >
                <PlayIcon className="size-3 fill-primary-foreground text-primary-foreground" />
              </button>
            </div>
          ))}
        </div>
      )}

      {instances.length > 5 && (
        <div className="mt-4 flex justify-center">
          <Link
            to="/instances"
            className="flex items-center gap-1 text-muted-foreground text-xs transition-colors hover:text-foreground"
          >
            View all instances
            <ChevronRightIcon className="size-3.5" />
          </Link>
        </div>
      )}
    </section>
  );
}
