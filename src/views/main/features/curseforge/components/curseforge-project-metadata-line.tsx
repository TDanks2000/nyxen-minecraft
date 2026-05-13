import { CalendarDaysIcon, DownloadIcon, UserRoundIcon } from "lucide-react";
import type { CurseForgeProjectSummary } from "@/shared/types";
import {
  formatCurseForgeDate,
  formatCurseForgeDownloads,
  getAuthorLine,
} from "@/views/main/features/curseforge/curseforge-browser-model";

export function CurseForgeProjectMetadataLine({
  item,
}: {
  item: CurseForgeProjectSummary;
}) {
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-muted-foreground text-xs">
      <span className="inline-flex min-w-0 items-center gap-1">
        <UserRoundIcon className="size-3.5 shrink-0" />
        <span className="truncate">{getAuthorLine(item)}</span>
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
