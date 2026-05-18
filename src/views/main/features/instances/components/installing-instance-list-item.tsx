import { Loader2Icon } from "lucide-react";
import { Badge } from "@/views/main/components/ui/badge";
import { Progress } from "@/views/main/components/ui/progress";
import type { InstallingInstanceCardProps } from "@/views/main/features/instances/components/instance-card-types";
import {
  getCompletedInstallItems,
  getDownloadSourceLabel,
  getInstallProgress,
} from "@/views/main/features/instances/components/instance-install-progress";
import { cn } from "@/views/main/lib/utils";

export function InstallingInstanceListItem({
  className,
  installJob: job,
}: InstallingInstanceCardProps) {
  const progress = getInstallProgress(job);
  const totalItems = Math.max(1, job.totalItems, job.items.length);
  const completedItems = getCompletedInstallItems(job);

  return (
    <div
      className={cn(
        "flex min-h-14 items-center gap-3 rounded-md border border-primary/35 bg-primary/5 px-3 py-2 transition-colors hover:bg-primary/10",
        className,
      )}
    >
      <div className="flex size-8 shrink-0 items-center justify-center rounded-sm bg-primary/10 text-primary">
        <Loader2Icon className="animate-spin" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate font-semibold text-foreground text-xs">
          {job.title}
        </div>
        <div className="mt-0.5 truncate text-[11px] text-muted-foreground">
          {job.activeLabel ?? job.subtitle}
        </div>
        <Progress
          aria-label={`${job.title} install progress`}
          className="mt-1.5 [&_[data-slot=progress-track]]:h-1.5"
          value={progress}
        />
      </div>
      <div className="hidden shrink-0 flex-col items-end gap-0.5 sm:flex">
        <Badge variant="secondary">{getDownloadSourceLabel(job)}</Badge>
        <span className="text-[11px] text-muted-foreground tabular-nums">
          {completedItems}/{totalItems} files
        </span>
      </div>
      <span className="shrink-0 font-medium text-xs tabular-nums">
        {Math.round(progress)}%
      </span>
    </div>
  );
}
