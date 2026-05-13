import { Skeleton } from "@/views/main/components/ui/skeleton";
import type {
  InstanceCollectionSkeleton,
  InstanceCollectionViewMode,
} from "@/views/main/features/instances/components/instance-collection-types";
import { cn } from "@/views/main/lib/utils";

const COMPACT_SKELETON_IDS = [
  "compact-card-a",
  "compact-card-b",
  "compact-card-c",
  "compact-card-d",
  "compact-card-e",
];
const STANDARD_SKELETON_IDS = [
  "standard-card-a",
  "standard-card-b",
  "standard-card-c",
  "standard-card-d",
];

export function InstanceCollectionLoading({
  skeleton,
  viewMode,
}: {
  skeleton: InstanceCollectionSkeleton;
  viewMode: InstanceCollectionViewMode;
}) {
  if (skeleton === "compact") {
    return (
      <div
        className={cn(
          viewMode === "grid"
            ? "grid grid-cols-[repeat(auto-fill,minmax(10.5rem,1fr))] gap-3"
            : "flex flex-col gap-2",
        )}
      >
        {COMPACT_SKELETON_IDS.map((key) =>
          viewMode === "grid" ? (
            <div
              className="overflow-hidden rounded-md border border-border bg-card"
              key={key}
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
              className="flex items-center gap-3 rounded-md border border-border bg-card px-3 py-2.5"
              key={key}
            >
              <Skeleton className="size-8 shrink-0 rounded-sm" />
              <Skeleton className="h-3 w-32" />
              <Skeleton className="ml-auto h-3 w-16" />
            </div>
          ),
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(17rem,1fr))] gap-3">
      {STANDARD_SKELETON_IDS.map((key) => (
        <div
          className="overflow-hidden rounded-lg border border-border bg-card"
          key={key}
        >
          <Skeleton className="h-36 rounded-b-none rounded-t-[inherit]" />
          <div className="flex flex-col gap-3 p-4">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-24" />
            <div className="flex justify-between gap-3">
              <Skeleton className="h-5 w-16 rounded-md" />
              <Skeleton className="size-8 rounded-md" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
