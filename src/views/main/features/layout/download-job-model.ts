import type { DownloadQueueJob } from "@/shared/types";
import { formatClockTime } from "@/views/main/lib/date-format";

export const formatSidebarTime = (value: string): string =>
  formatClockTime(value);

export const formatProgressPercent = (value: number | null): string =>
  value === null ? "Working" : `${Math.round(value)}%`;

export const groupDownloadItems = (
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
