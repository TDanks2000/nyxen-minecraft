import { ActivityIcon, DownloadCloudIcon } from "lucide-react";
import { useEffect, useMemo } from "react";
import type { DownloadQueueJob } from "@/shared/types";
import { Button } from "@/views/main/components/ui/button";
import { formatRelativeDate } from "@/views/main/features/catalog/catalog-model";
import { useDownloadQueueStore } from "@/views/main/features/downloads/download-queue-store";
import { DownloadJobCard } from "@/views/main/features/layout/download-job-card";
import { useInstances } from "@/views/main/hooks/use-instances";
import { cn } from "@/views/main/lib/utils";

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
