import {
  ActivityIcon,
  AlertCircleIcon,
  CheckCircle2Icon,
  DownloadCloudIcon,
  FilesIcon,
  Loader2Icon,
  XIcon,
} from "lucide-react";
import { useEffect, useMemo } from "react";
import type { DownloadQueueJob } from "@/shared/types";
import { Button } from "@/views/main/components/ui/button";
import { Progress } from "@/views/main/components/ui/progress";
import { formatRelativeDate } from "@/views/main/features/catalog/catalog-model";
import { useDownloadQueueStore } from "@/views/main/features/downloads/download-queue-store";
import { useInstances } from "@/views/main/hooks/use-instances";
import { formatClockTime } from "@/views/main/lib/date-format";
import { cn } from "@/views/main/lib/utils";

const formatSidebarTime = (value: string): string => formatClockTime(value);

const formatProgressPercent = (value: number | null): string =>
  value === null ? "Working" : `${Math.round(value)}%`;

function DownloadJobIcon({ status }: { status: DownloadQueueJob["status"] }) {
  if (status === "completed") {
    return <CheckCircle2Icon className="size-4 text-primary" />;
  }

  if (status === "failed") {
    return <AlertCircleIcon className="size-4 text-destructive" />;
  }

  if (status === "running") {
    return <Loader2Icon className="size-4 animate-spin text-primary" />;
  }

  return <DownloadCloudIcon className="size-4 text-muted-foreground" />;
}

const groupDownloadItems = (
  job: DownloadQueueJob,
): Array<{ count: number; label: string }> => {
  const groups = new Map<string, number>();

  for (const item of job.items) {
    groups.set(item.kind, (groups.get(item.kind) ?? 0) + 1);
  }

  return Array.from(groups.entries()).map(([label, count]) => ({
    count,
    label,
  }));
};

function DownloadJobCard({
  job,
  onClear,
}: {
  job: DownloadQueueJob;
  onClear: (jobId: string) => void;
}) {
  const groups = groupDownloadItems(job);
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
              <div className="mt-1 flex items-center gap-1.5 text-[0.62rem] text-muted-foreground">
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
            <div className="flex items-center justify-between gap-2 text-[0.65rem]">
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
            {groups.map((group) => (
              <span
                className="rounded border border-border bg-muted/45 px-1.5 py-0.5 text-[0.58rem] text-muted-foreground"
                key={group.label}
              >
                {group.label} {group.count}
              </span>
            ))}
          </div>

          <ul className="mt-2 grid gap-1">
            {visibleItems.map((item) => (
              <li
                className="flex min-w-0 items-center gap-1.5 text-[0.6rem] text-muted-foreground"
                key={item.id}
              >
                <FilesIcon className="size-3 shrink-0" />
                <span className="truncate font-mono">{item.label}</span>
              </li>
            ))}
            {hiddenArtifactCount > 0 ? (
              <li className="text-[0.6rem] text-muted-foreground/75">
                +{hiddenArtifactCount} more file
                {hiddenArtifactCount === 1 ? "" : "s"}
              </li>
            ) : null}
          </ul>

          {job.status === "failed" ? (
            <div className="mt-2 rounded-md border border-destructive/25 bg-destructive/10 px-2 py-1.5 text-[0.6rem] text-destructive">
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

type ActivityItem = {
  description: string;
  id: string;
  initials: string;
  tone: "destructive" | "muted" | "primary" | "warning";
  time: string;
  title: string;
};

const getInitials = (value: string): string => {
  const initials = value
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return initials || "?";
};

const getDownloadActivityDescription = (job: DownloadQueueJob): string => {
  if (job.status === "completed") return "Download completed";
  if (job.status === "failed") return job.error ?? "Download failed";
  if (job.status === "running") {
    return job.activeLabel ?? "Download in progress";
  }
  return "Download queued";
};

const getDownloadTone = (job: DownloadQueueJob): ActivityItem["tone"] => {
  if (job.status === "completed") return "primary";
  if (job.status === "failed") return "destructive";
  if (job.status === "running") return "warning";
  return "muted";
};

type RightSidebarProps = {
  open: boolean;
};

export function RightSidebar({ open }: RightSidebarProps) {
  const instancesHook = useInstances();
  const jobs = useDownloadQueueStore((state) => state.jobs);
  const clearDownloadJob = useDownloadQueueStore(
    (state) => state.clearDownloadJob,
  );
  const clearFinishedDownloadJobs = useDownloadQueueStore(
    (state) => state.clearFinishedDownloadJobs,
  );
  const refreshDownloadJobs = useDownloadQueueStore(
    (state) => state.refreshDownloadJobs,
  );
  const instances = instancesHook.data ?? [];
  const activeJobCount = useMemo(
    () =>
      jobs.filter((job) => job.status === "queued" || job.status === "running")
        .length,
    [jobs],
  );
  const hasActiveJobs = activeJobCount > 0;
  const finishedJobCount = jobs.length - activeJobCount;
  const activityItems = useMemo<Array<ActivityItem>>(() => {
    const downloadActivities = jobs.map((job) => ({
      description: getDownloadActivityDescription(job),
      id: `download:${job.id}`,
      initials:
        job.source === "curseforge"
          ? "CF"
          : job.source === "modrinth"
            ? "MR"
            : "DL",
      time: job.updatedAt,
      title: job.title,
      tone: getDownloadTone(job),
    }));
    const instanceActivities: Array<ActivityItem> = [];

    for (const instance of instances) {
      const metadataTime = instance.updatedAt || instance.createdAt;
      const metadataDescription =
        instance.updatedAt === instance.createdAt
          ? "Instance created"
          : "Instance metadata updated";

      if (instance.lastLaunchedAt) {
        instanceActivities.push({
          description: "Minecraft launch recorded",
          id: `launch:${instance.id}`,
          initials: getInitials(instance.name),
          time: instance.lastLaunchedAt,
          title: instance.name,
          tone: "primary",
        });
      }

      instanceActivities.push({
        description: metadataDescription,
        id: `instance:${instance.id}`,
        initials: getInitials(instance.name),
        time: metadataTime,
        title: instance.name,
        tone: "muted",
      });
    }

    return [...downloadActivities, ...instanceActivities]
      .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
      .slice(0, 5);
  }, [instances, jobs]);

  useEffect(() => {
    void refreshDownloadJobs().catch(() => undefined);

    const interval = setInterval(
      () => void refreshDownloadJobs().catch(() => undefined),
      hasActiveJobs ? 1_000 : 4_000,
    );

    return () => clearInterval(interval);
  }, [hasActiveJobs, refreshDownloadJobs]);

  return (
    <aside
      aria-hidden={!open}
      data-state={open ? "open" : "closed"}
      className={cn(
        "fixed top-12 right-0 bottom-0 z-40 flex w-72 shrink-0 flex-col overflow-x-hidden overflow-y-auto border-l border-sidebar-border bg-sidebar transition-[width,transform,opacity,box-shadow] duration-200 ease-out motion-reduce:transition-none 2xl:static 2xl:z-auto",
        open
          ? "translate-x-0 opacity-100 shadow-xl 2xl:shadow-none"
          : "pointer-events-none translate-x-full opacity-0 2xl:w-0 2xl:translate-x-0 2xl:border-l-0",
      )}
    >
      {/* Download Queue */}
      <section className="p-4 border-b border-sidebar-border">
        <div className="flex items-center justify-between border-b border-sidebar-border/30 pb-2 mb-3">
          <span className="text-sm font-semibold text-foreground">
            Download Queue
          </span>
          {jobs.length > 0 ? (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[0.6rem] font-bold text-primary-foreground">
              {activeJobCount || jobs.length}
            </span>
          ) : null}
        </div>

        {jobs.length > 0 ? (
          <div className="flex flex-col gap-3">
            {jobs.map((job) => (
              <DownloadJobCard
                job={job}
                key={job.id}
                onClear={(jobId) => void clearDownloadJob({ jobId })}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-sidebar-border bg-background/35 px-3 py-4 text-center">
            <DownloadCloudIcon className="mx-auto size-5 text-muted-foreground" />
            <div className="mt-2 font-semibold text-foreground text-xs">
              No downloads running
            </div>
            <p className="mt-1 text-[0.62rem] text-muted-foreground">
              Downloads appear here when Nyxen is preparing launch files or
              installing catalog content.
            </p>
          </div>
        )}

        {finishedJobCount > 0 ? (
          <Button
            className="mt-3 w-full"
            onClick={() => void clearFinishedDownloadJobs()}
            size="xs"
            type="button"
            variant="ghost"
          >
            Clear Finished
          </Button>
        ) : null}
      </section>

      {/* Recent Activity */}
      <section className="p-4">
        <div className="text-sm font-semibold text-foreground border-b border-sidebar-border/30 pb-2 mb-3">
          Recent Activity
        </div>
        {activityItems.length > 0 ? (
          <div className="flex flex-col gap-2.5">
            {activityItems.map((item) => (
              <div key={item.id} className="flex items-start gap-2.5">
                <div
                  className={cn(
                    "flex size-7 shrink-0 items-center justify-center rounded text-[0.5rem] font-bold",
                    item.tone === "primary" && "bg-primary/15 text-primary",
                    item.tone === "warning" && "bg-amber-500/15 text-amber-500",
                    item.tone === "destructive" &&
                      "bg-destructive/15 text-destructive",
                    item.tone === "muted" && "bg-muted text-muted-foreground",
                  )}
                >
                  {item.initials}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold text-foreground text-xs leading-none">
                    {item.title}
                  </div>
                  <div className="mt-0.5 truncate text-[0.62rem] text-muted-foreground">
                    {item.description}
                  </div>
                </div>
                <span className="mt-0.5 shrink-0 text-[0.6rem] text-muted-foreground">
                  {formatRelativeDate(item.time)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-sidebar-border bg-background/35 px-3 py-4 text-center">
            <ActivityIcon className="mx-auto size-5 text-muted-foreground" />
            <div className="mt-2 font-semibold text-foreground text-xs">
              No activity yet
            </div>
            <p className="mt-1 text-[0.62rem] text-muted-foreground">
              Launches, instance changes, and downloads appear here.
            </p>
          </div>
        )}
      </section>
    </aside>
  );
}
