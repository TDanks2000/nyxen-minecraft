import type { ComponentProps } from "react";
import type {
  InstanceFileEntry,
  InstanceLogFolder,
  InstanceLogLineLevel,
  InstanceLogLineType,
  LauncherInstance,
} from "@/shared/types";
import type { Badge } from "@/views/main/components/ui/badge";
import {
  formatContentBytes,
  formatContentModified,
} from "@/views/main/features/instances/components/instance-content-format";

export const LIVE_LOG_ID = "live";
export const LOG_PREVIEW_BYTES = 256 * 1024;
export const LOG_PREVIEW_LINES = 700;
export const LIVE_REFRESH_MS = 4000;

const MAX_VISIBLE_LOG_TABS = 140;

export type LogPanelFolders = {
  folders: Array<InstanceLogFolder>;
  hiddenCount: number;
  matchCount: number;
};

export type LogTypeFilter = "all" | InstanceLogLineType;

export const LOG_TYPE_LABELS: Record<InstanceLogLineType, string> = {
  auth: "Authentication",
  crash: "Crash",
  exception: "Exception",
  game: "Game",
  graphics: "Graphics",
  io: "File I/O",
  java: "Java",
  loader: "Loader",
  mixin: "Mixin",
  mod: "Mod",
  network: "Network",
  resource: "Resource",
  stackTrace: "Stack Trace",
  unknown: "Raw",
};

export const LOG_TYPE_ORDER: Array<InstanceLogLineType> = [
  "crash",
  "exception",
  "stackTrace",
  "java",
  "mixin",
  "loader",
  "mod",
  "resource",
  "graphics",
  "network",
  "auth",
  "io",
  "game",
  "unknown",
];

export const getLogLevelVariant = (
  level: InstanceLogLineLevel,
): ComponentProps<typeof Badge>["variant"] => {
  if (level === "error" || level === "fatal") return "destructive";
  if (level === "warn") return "outline";
  if (level === "info") return "secondary";
  return "ghost";
};

export const getLogLevelLabel = (level: InstanceLogLineLevel): string =>
  level === "unknown" ? "raw" : level;

export const getLogTypeVariant = (
  type: InstanceLogLineType,
): ComponentProps<typeof Badge>["variant"] => {
  if (type === "crash" || type === "exception" || type === "java") {
    return "destructive";
  }
  if (type === "mixin" || type === "loader" || type === "mod") {
    return "outline";
  }
  if (type === "game") return "secondary";
  return "ghost";
};

export const getLogEntryMeta = (entry: InstanceFileEntry): string =>
  `${entry.fileName} / ${formatContentBytes(entry.sizeBytes)} / ${formatContentModified(
    entry.modifiedAt,
  )}`;

export const createFallbackLogFolders = (
  instance: LauncherInstance,
  logs: Array<InstanceFileEntry>,
): Array<InstanceLogFolder> =>
  logs.length === 0
    ? []
    : [
        {
          displayName: "Game Logs",
          files: logs,
          id: "logs",
          path: instance.folders.logs,
        },
      ];

export function filterLogFolders(
  folders: Array<InstanceLogFolder>,
  query: string,
): LogPanelFolders {
  const normalizedQuery = query.trim().toLowerCase();
  const nextFolders: Array<InstanceLogFolder> = [];
  let matchCount = 0;
  let visibleCount = 0;

  for (const folder of folders) {
    const files: Array<InstanceFileEntry> = [];

    for (const file of folder.files) {
      const matches =
        normalizedQuery.length === 0 ||
        [
          file.displayName,
          file.fileName,
          file.relativePath ?? "",
          folder.displayName,
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);

      if (!matches) continue;

      matchCount += 1;

      if (visibleCount < MAX_VISIBLE_LOG_TABS) {
        files.push(file);
        visibleCount += 1;
      }
    }

    if (files.length > 0) {
      nextFolders.push({ ...folder, files });
    }
  }

  return {
    folders: nextFolders,
    hiddenCount: Math.max(0, matchCount - visibleCount),
    matchCount,
  };
}
