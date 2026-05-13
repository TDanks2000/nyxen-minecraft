import { formatRelativeTime } from "@/views/main/lib/date-format";
import { openLocalPath } from "@/views/main/lib/open-local-path";

export const openInstancePath = (path: string) => {
  void openLocalPath(path);
};

export const formatContentBytes = (bytes: number): string => {
  if (bytes <= 0) return "0 B";

  const units = ["B", "KB", "MB", "GB"] as const;
  const index = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );

  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
};

export const formatContentModified = (value: string): string =>
  formatRelativeTime(value);
