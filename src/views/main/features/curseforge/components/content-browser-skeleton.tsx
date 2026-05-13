import { Skeleton } from "@/views/main/components/ui/skeleton";
import {
  GRID_SKELETON_KEYS,
  LIST_SKELETON_KEYS,
} from "@/views/main/features/curseforge/components/content-browser-dialog-model";
import type { CurseForgeBrowserViewMode } from "@/views/main/features/curseforge/curseforge-browser-types";
import { cn } from "@/views/main/lib/utils";

export function ContentBrowserSkeleton({
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
