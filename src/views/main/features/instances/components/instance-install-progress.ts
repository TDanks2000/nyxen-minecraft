import type { DownloadQueueJob } from "@/shared/types";

export const getInstallProgress = (job: DownloadQueueJob): number =>
  Math.max(0, Math.min(100, job.progress ?? 0));

export const getCompletedInstallItems = (job: DownloadQueueJob): number =>
  job.items.filter(
    (item) => item.status === "completed" || item.status === "skipped",
  ).length;

export const getDownloadSourceLabel = (job: DownloadQueueJob): string =>
  job.source === "modrinth"
    ? "Modrinth"
    : job.source === "curseforge"
      ? "CurseForge"
      : "Download";
