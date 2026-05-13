import { CalendarDaysIcon, DownloadIcon, UserRoundIcon } from "lucide-react";
import type { ModrinthProjectSummary } from "@/shared/types";
import {
  formatCurseForgeDate,
  formatCurseForgeDownloads,
} from "@/views/main/features/curseforge/curseforge-browser-model";

export function ModrinthProjectMetadataLine({
  item,
}: {
  item: ModrinthProjectSummary;
}) {
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-muted-foreground text-xs">
      <span className="inline-flex min-w-0 items-center gap-1">
        <UserRoundIcon className="size-3.5 shrink-0" />
        <span className="truncate">
          {item.authors.length > 0 ? item.authors.join(", ") : "Unknown author"}
        </span>
      </span>
      <span className="inline-flex items-center gap-1">
        <DownloadIcon className="size-3.5 shrink-0" />
        {formatCurseForgeDownloads(item.downloadCount)}
      </span>
      <span className="inline-flex items-center gap-1">
        <CalendarDaysIcon className="size-3.5 shrink-0" />
        {formatCurseForgeDate(item.dateModified)}
      </span>
    </div>
  );
}
