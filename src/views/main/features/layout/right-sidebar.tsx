import {
  AlertCircleIcon,
  CheckCircle2Icon,
  CloudIcon,
  DownloadCloudIcon,
  FilesIcon,
  Loader2Icon,
  XIcon,
} from "lucide-react";
import { useEffect } from "react";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import type { DownloadQueueJob } from "@/shared/types";
import { Button } from "@/views/main/components/ui/button";
import { useDownloadQueueStore } from "@/views/main/features/downloads/download-queue-store";
import { cn } from "@/views/main/lib/utils";

const mkSpark = (values: Array<number>) => values.map((v, i) => ({ i, v }));

const CPU_DATA = mkSpark([6, 14, 22, 10, 28, 18, 12, 24, 16, 14]);
const MEM_DATA = mkSpark([54, 58, 62, 68, 60, 66, 72, 64, 68, 64]);
const DISK_DATA = mkSpark([22, 24, 26, 25, 28, 26, 30, 27, 24, 25]);

function SparkLine({ data }: { data: Array<{ i: number; v: number }> }) {
  return (
    <div style={{ height: 32, width: "100%" }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 2, right: 0, bottom: 0, left: 0 }}
        >
          <Area
            type="monotone"
            dataKey="v"
            stroke="#4ade80"
            strokeWidth={1.5}
            fill="rgba(74,222,128,0.14)"
            dot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

const formatSidebarTime = (value: string): string =>
  new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));

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
    (item) => item.status === "completed",
  ).length;
  const totalItems = Math.max(1, job.totalItems);
  const completedRatio = completedCount / totalItems;
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
        ? `${job.totalItems} file${job.totalItems === 1 ? "" : "s"} in progress`
        : job.status === "completed"
          ? `${job.totalItems} file${job.totalItems === 1 ? "" : "s"} ready`
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
                    ? "In progress"
                    : `${completedCount}/${job.totalItems}`}
              </span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  "h-full rounded-full bg-primary transition-all",
                  job.status === "running" && "w-1/2 animate-pulse opacity-80",
                  job.status === "completed" && "w-full",
                  job.status === "failed" && "bg-destructive",
                )}
                style={
                  job.status === "failed"
                    ? {
                        width: `${Math.max(
                          8,
                          Math.min(100, completedRatio * 100),
                        )}%`,
                      }
                    : undefined
                }
              />
            </div>
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

export function RightSidebar() {
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
  const hasActiveJobs = jobs.some(
    (job) => job.status === "queued" || job.status === "running",
  );
  const activeJobCount = jobs.filter(
    (job) => job.status === "queued" || job.status === "running",
  ).length;
  const finishedJobCount = jobs.length - activeJobCount;

  useEffect(() => {
    void refreshDownloadJobs().catch(() => undefined);

    const interval = setInterval(
      () => void refreshDownloadJobs().catch(() => undefined),
      hasActiveJobs ? 1_000 : 4_000,
    );

    return () => clearInterval(interval);
  }, [hasActiveJobs, refreshDownloadJobs]);

  return (
    <aside className="hidden w-72 shrink-0 flex-col overflow-y-auto border-l border-sidebar-border bg-sidebar 2xl:flex">
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
      <section className="p-4 border-b border-sidebar-border">
        <div className="text-sm font-semibold text-foreground border-b border-sidebar-border/30 pb-2 mb-3">
          Recent Activity
        </div>
        <div className="flex flex-col gap-2.5">
          {[
            {
              id: "atm9",
              bg: "bg-yellow-900",
              abbr: "ATM",
              name: "All the Mods 9",
              desc: "Updated to 1.20.1",
              time: "2h ago",
            },
            {
              id: "cf",
              bg: "bg-cyan-900",
              abbr: "CF",
              name: "Creative Flat",
              desc: "World backup created",
              time: "6h ago",
            },
            {
              id: "rl",
              bg: "bg-red-950",
              abbr: "RL",
              name: "RLCraft",
              desc: "Played for 3h 24m",
              time: "1d ago",
            },
          ].map((item) => (
            <div key={item.id} className="flex items-start gap-2.5">
              <div
                className={`size-7 rounded shrink-0 flex items-center justify-center text-[0.5rem] font-bold text-white/60 ${item.bg}`}
              >
                {item.abbr}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-foreground truncate leading-none">
                  {item.name}
                </div>
                <div className="text-[0.62rem] text-muted-foreground mt-0.5">
                  {item.desc}
                </div>
              </div>
              <span className="text-[0.6rem] text-muted-foreground shrink-0 mt-0.5">
                {item.time}
              </span>
            </div>
          ))}
        </div>
        <button
          type="button"
          className="mt-3 text-[0.7rem] text-primary hover:text-primary/80 transition-colors"
        >
          View all activity →
        </button>
      </section>

      {/* System Overview */}
      <section className="p-4 border-b border-sidebar-border">
        <div className="text-sm font-semibold text-foreground border-b border-sidebar-border/30 pb-2 mb-3">
          System Overview
        </div>
        <div className="flex flex-col gap-2">
          {(
            [
              { label: "CPU", value: "14%", data: CPU_DATA },
              { label: "Memory", value: "5.1 / 8 GB", data: MEM_DATA },
              { label: "Disk", value: "120 / 476 GB", data: DISK_DATA },
            ] as const
          ).map((row) => (
            <div key={row.label} className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground w-12 shrink-0">
                {row.label}
              </span>
              <span className="text-xs text-foreground w-24 shrink-0 tabular-nums">
                {row.value}
              </span>
              <div className="flex-1 min-w-0">
                <SparkLine data={row.data} />
              </div>
            </div>
          ))}
        </div>
        <button
          type="button"
          className="mt-3 text-[0.7rem] text-primary hover:text-primary/80 transition-colors"
        >
          Open Performance Monitor
        </button>
      </section>

      {/* Cloud Sync */}
      <section className="p-4">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-sm font-semibold text-foreground">
            Cloud Sync
          </span>
          <div className="flex items-center gap-1.5 text-primary">
            <span className="size-2 rounded-full bg-primary shrink-0" />
            <span className="text-[0.65rem] font-semibold">Up to date</span>
          </div>
        </div>
        <p className="text-[0.62rem] text-muted-foreground mb-3">
          Last synced: 2m ago
        </p>
        <button
          type="button"
          className="w-full h-7 flex items-center justify-center gap-1.5 rounded-md border border-border bg-muted/40 hover:bg-muted/70 text-xs font-semibold text-foreground transition-colors"
        >
          <CloudIcon className="size-3.5" />
          Manage
        </button>
      </section>
    </aside>
  );
}
