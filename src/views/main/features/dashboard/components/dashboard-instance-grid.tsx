import { Link } from "@tanstack/react-router";
import {
  ChevronRightIcon,
  LayoutGridIcon,
  ListIcon,
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
  ToggleGroup,
  ToggleGroupItem,
} from "@/views/main/components/ui/toggle-group";
import {
  InstanceCard,
  InstanceListItem,
} from "@/views/main/features/instances/components/instance-card";
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

        <ToggleGroup
          aria-label="Instance view"
          className="shrink-0"
          onValueChange={(value) => {
            const nextMode = value[0];
            if (nextMode === "grid" || nextMode === "list") {
              setViewMode(nextMode);
            }
          }}
          size="sm"
          spacing={0}
          value={[viewMode]}
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
            <InstanceCard
              key={instance.id}
              density="compact"
              featured={instance.id === featuredInstanceId}
              instance={instance}
              launchDisabled={launchLoadingId !== null}
              launchLoading={launchLoadingId === instance.id}
              onPlay={() => onPlayInstance(instance.id)}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          {filtered.map((instance) => (
            <InstanceListItem
              key={instance.id}
              featured={instance.id === featuredInstanceId}
              instance={instance}
              launchDisabled={launchLoadingId !== null}
              launchLoading={launchLoadingId === instance.id}
              onPlay={() => onPlayInstance(instance.id)}
            />
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
