import { FilesIcon, XIcon } from "lucide-react";
import type { DownloadQueueJob } from "@/shared/types";
import { Button } from "@/views/main/components/ui/button";
import { Progress } from "@/views/main/components/ui/progress";
import { DownloadJobIcon } from "@/views/main/features/layout/download-job-icon";
import {
  formatProgressPercent,
  formatSidebarTime,
  groupDownloadItems,
} from "@/views/main/features/layout/download-job-model";
import { cn } from "@/views/main/lib/utils";

type DownloadJobCardProps = {
  job: DownloadQueueJob;
  onClear: (jobId: string) => void;
  targetInstanceName?: string | null;
};

export function DownloadJobCard({
  job,
  onClear,
  targetInstanceName,
}: DownloadJobCardProps) {
  const groups = groupDownloadItems(job);
  const targetInstanceId =
    "targetInstanceId" in job.metadata ? job.metadata.targetInstanceId : null;
  const visibleItems = job.items.slice(0, 3);
  const hiddenArtifactCount = Math.max(
    0,
    job.items.length - visibleItems.length,
  );
  const failedCount = job.items.filter(
    (item) => item.status === "failed",
  ).length;
  const completedCount = job.items.filter(
    (item) => item.status === "completed" || item.status === "skipped",
  ).length;
  const totalItems = Math.max(1, job.totalItems, job.items.length);
  const progressValue =
    job.progress ?? Math.min(100, (completedCount / totalItems) * 100);
  const statusLabel =
    job.status === "queued"
      ? "Queued"
      : job.status === "running"
        ? "Downloading"
        : job.status === "completed"
          ? "Ready"
          : "Needs attention";
  const detailLabel =
    job.status === "queued"
      ? `${job.totalItems} file${job.totalItems === 1 ? "" : "s"} waiting`
      : job.status === "running"
        ? (job.activeLabel ?? `${totalItems} files in progress`)
        : job.status === "completed"
          ? `${totalItems} file${totalItems === 1 ? "" : "s"} ready`
          : failedCount > 0
            ? `${failedCount} failed file${failedCount === 1 ? "" : "s"}`
            : "Download failed";

  return (
    <div
      className={cn(
        "rounded-lg border bg-background/60 p-3 shadow-sm",
        job.status === "failed"
          ? "border-destructive/30"
          : "border-sidebar-border",
      )}
    >
      <div className="flex items-start gap-2.5">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-md border border-border bg-muted/55">
          <DownloadJobIcon status={job.status} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <div className="truncate font-semibold text-foreground text-xs leading-none">
                {job.title}
              </div>
              <div className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <span
                  className={cn(
                    "size-1.5 rounded-full",
                    job.status === "failed"
                      ? "bg-destructive"
                      : job.status === "completed"
                        ? "bg-primary"
                        : job.status === "running"
                          ? "bg-primary animate-pulse"
                          : "bg-muted-foreground/60",
                  )}
                />
                <span>{statusLabel}</span>
                <span className="text-muted-foreground/45">at</span>
                <span>{formatSidebarTime(job.updatedAt)}</span>
              </div>
            </div>
            {job.status !== "running" ? (
              <Button
                aria-label={`Clear download for ${job.title}`}
                onClick={() => onClear(job.id)}
                size="icon-xs"
                type="button"
                variant="ghost"
              >
                <XIcon />
              </Button>
            ) : null}
          </div>

          <div className="mt-2">
            <div className="flex items-center justify-between gap-2 text-[11px]">
              <span className="font-medium text-foreground">{detailLabel}</span>
              <span className="shrink-0 text-muted-foreground tabular-nums">
                {job.status === "queued"
                  ? "Waiting"
                  : job.status === "running"
                    ? formatProgressPercent(progressValue)
                    : `${formatProgressPercent(progressValue)} · ${completedCount}/${totalItems}`}
              </span>
            </div>
            <Progress
              aria-label={`${job.title} download progress`}
              className={cn(
                "mt-1.5",
                job.status === "failed" &&
                  "[&_[data-slot=progress-indicator]]:bg-destructive",
                job.status === "running" &&
                  "[&_[data-slot=progress-indicator]]:opacity-90",
              )}
              value={progressValue}
            />
          </div>

          <div className="mt-2 flex flex-wrap gap-1">
            <span className="rounded border border-border bg-muted/45 px-1.5 py-0.5 text-[11px] text-muted-foreground">
              {job.source === "curseforge"
                ? "CurseForge"
                : job.source === "modrinth"
                  ? "Modrinth"
                  : "Launch"}
            </span>
            {targetInstanceId ? (
              <span className="rounded border border-border bg-muted/45 px-1.5 py-0.5 text-[11px] text-muted-foreground">
                {targetInstanceName ?? `Instance ${targetInstanceId}`}
              </span>
            ) : null}
            {groups.map((group) => (
              <span
                className="rounded border border-border bg-muted/45 px-1.5 py-0.5 text-[11px] text-muted-foreground"
                key={group.label}
              >
                {group.label} {group.count}
              </span>
            ))}
          </div>

          <ul className="mt-2 grid gap-1">
            {visibleItems.map((item) => (
              <li
                className="flex min-w-0 items-center gap-1.5 text-[11px] text-muted-foreground"
                key={item.id}
              >
                <FilesIcon className="size-3 shrink-0" />
                <span className="truncate font-mono">{item.label}</span>
              </li>
            ))}
            {hiddenArtifactCount > 0 ? (
              <li className="text-[11px] text-muted-foreground/75">
                +{hiddenArtifactCount} more file
                {hiddenArtifactCount === 1 ? "" : "s"}
              </li>
            ) : null}
          </ul>

          {job.status === "failed" ? (
            <div className="mt-2 rounded-md border border-destructive/25 bg-destructive/10 px-2 py-1.5 text-[11px] text-destructive">
              {job.error ??
                job.items.find((item) => item.error)?.error ??
                "One or more files could not be downloaded."}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
