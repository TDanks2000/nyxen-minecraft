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
import type { LauncherInstance } from "@/shared/types";
import { Skeleton } from "@/views/main/components/ui/skeleton";
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
  return (
    <section className="px-5 pt-5 pb-4">
      <div className="mb-4 flex items-center gap-2.5">
        <h2 className="mr-auto font-bold text-foreground text-sm">
          My Instances{" "}
          <span className="font-normal text-muted-foreground">
            ({instanceCount ?? "..."})
          </span>
        </h2>

        <div className="flex h-8 w-44 shrink-0 items-center gap-2 rounded-md border border-border bg-background/60 px-3 text-muted-foreground text-xs">
          <SearchIcon className="size-3.5 shrink-0" />
          <span>Search instances...</span>
        </div>

        <div className="flex shrink-0 overflow-hidden rounded-md border border-border">
          <button
            type="button"
            className="flex size-8 items-center justify-center bg-accent text-accent-foreground transition-colors"
          >
            <LayoutGridIcon className="size-3.5" />
          </button>
          <button
            type="button"
            className="flex size-8 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
          >
            <ListIcon className="size-3.5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-3">
        {loading ? (
          SKELETON_IDS.map((key) => (
            <div
              key={key}
              className="overflow-hidden rounded-md border border-border"
            >
              <Skeleton className="h-28" />
              <div className="flex flex-col gap-1.5 bg-card px-2.5 pt-2.5 pb-2.5">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-2.5 w-16" />
                <Skeleton className="mt-1 h-5 w-full" />
              </div>
            </div>
          ))
        ) : instances.length === 0 ? (
          <div className="col-span-5 flex flex-col items-center justify-center gap-3 py-12 text-center">
            <p className="text-muted-foreground text-sm">No instances yet.</p>
            <button
              type="button"
              onClick={onCreateInstance}
              className="flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 font-semibold text-primary-foreground text-xs transition-colors hover:bg-primary/90"
            >
              <PlusIcon className="size-3.5" />
              New Instance
            </button>
          </div>
        ) : (
          instances.map((instance) => (
            <div
              key={instance.id}
              className={cn(
                "group relative flex cursor-pointer flex-col overflow-hidden rounded-md border transition-all hover:-translate-y-0.5",
                instance.id === featuredInstanceId
                  ? "border-primary/60 ring-1 ring-primary/30"
                  : "border-border hover:border-border/80",
              )}
            >
              <div className="relative flex h-28 shrink-0 items-center justify-center bg-gradient-to-br from-primary/80 to-primary/20">
                <span className="absolute inset-0 bg-[repeating-linear-gradient(90deg,color-mix(in_oklch,var(--foreground)_5%,transparent)_0_1px,transparent_1px_18px)]" />
                {instance.id === featuredInstanceId && (
                  <div className="pointer-events-none absolute inset-0 rounded-md ring-2 ring-primary/50 ring-inset" />
                )}
              </div>

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
                    <button
                      type="button"
                      className="flex size-5 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
                    >
                      <MoreHorizontalIcon className="size-3" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

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
