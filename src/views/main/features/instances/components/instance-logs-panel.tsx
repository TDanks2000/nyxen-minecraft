import {
  ActivityIcon,
  ArchiveIcon,
  ClockIcon,
  FileTextIcon,
  FolderOpenIcon,
  Loader2Icon,
  RefreshCwIcon,
  SearchIcon,
  ShieldAlertIcon,
  TerminalSquareIcon,
} from "lucide-react";
import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  InstanceFileEntry,
  InstanceLogFilePreview,
  InstanceLogFolder,
  InstanceLogLine,
  InstanceLogLineLevel,
  InstanceLogLineType,
  LauncherInstance,
} from "@/shared/types";
import { Badge } from "@/views/main/components/ui/badge";
import { Button } from "@/views/main/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/views/main/components/ui/card";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/views/main/components/ui/input-group";
import { ScrollArea } from "@/views/main/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/views/main/components/ui/select";
import { formatRelativeTime } from "@/views/main/lib/date-format";
import { openLocalPath } from "@/views/main/lib/open-local-path";
import { rpc } from "@/views/main/lib/rpc";
import { cn } from "@/views/main/lib/utils";

const LIVE_LOG_ID = "live";
const LOG_PREVIEW_BYTES = 256 * 1024;
const LOG_PREVIEW_LINES = 700;
const MAX_VISIBLE_LOG_TABS = 140;
const LIVE_REFRESH_MS = 4000;

type LogPanelFolders = {
  folders: Array<InstanceLogFolder>;
  hiddenCount: number;
  matchCount: number;
};

type LogTypeFilter = "all" | InstanceLogLineType;

const LOG_TYPE_LABELS: Record<InstanceLogLineType, string> = {
  auth: "Authentication",
  crash: "Crash",
  exception: "Exception",
  game: "Game",
  graphics: "Graphics",
  io: "File I/O",
  loader: "Loader",
  mixin: "Mixin",
  mod: "Mod",
  network: "Network",
  resource: "Resource",
  stackTrace: "Stack Trace",
  unknown: "Raw",
};

const LOG_TYPE_ORDER: Array<InstanceLogLineType> = [
  "crash",
  "exception",
  "stackTrace",
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

const openExternalPath = (path: string) => {
  void openLocalPath(path);
};

const formatBytes = (bytes: number): string => {
  if (bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"] as const;
  const index = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
};

const formatModified = (value: string): string => formatRelativeTime(value);

const getLogLevelVariant = (
  level: InstanceLogLineLevel,
): React.ComponentProps<typeof Badge>["variant"] => {
  if (level === "error" || level === "fatal") return "destructive";
  if (level === "warn") return "outline";
  if (level === "info") return "secondary";
  return "ghost";
};

const getLogLevelLabel = (level: InstanceLogLineLevel): string =>
  level === "unknown" ? "raw" : level;

const getLogTypeVariant = (
  type: InstanceLogLineType,
): React.ComponentProps<typeof Badge>["variant"] => {
  if (type === "crash" || type === "exception") return "destructive";
  if (type === "mixin" || type === "loader" || type === "mod") {
    return "outline";
  }
  if (type === "game") return "secondary";
  return "ghost";
};

const getEntryMeta = (entry: InstanceFileEntry): string =>
  `${entry.fileName} / ${formatBytes(entry.sizeBytes)} / ${formatModified(
    entry.modifiedAt,
  )}`;

const createFallbackFolders = (
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

function LogTabButton({
  active,
  entry,
  icon: Icon,
  label,
  meta,
  onClick,
}: {
  active: boolean;
  entry?: InstanceFileEntry;
  icon: typeof FileTextIcon;
  label: string;
  meta: string;
  onClick: () => void;
}) {
  return (
    <Button
      aria-pressed={active}
      className="h-auto w-full min-w-0 justify-start px-2 py-2 text-left"
      onClick={onClick}
      size="sm"
      variant={active ? "default" : "ghost"}
    >
      <Icon data-icon="inline-start" />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold">{label}</span>
        <span
          className={cn(
            "block truncate font-normal text-xs",
            active ? "text-primary-foreground/75" : "text-muted-foreground",
          )}
        >
          {meta}
        </span>
      </span>
      {entry?.fileName.toLowerCase().endsWith(".gz") ? (
        <ArchiveIcon className="text-current/70" data-icon="inline-end" />
      ) : null}
    </Button>
  );
}

function LogLineRow({ line }: { line: InstanceLogLine }) {
  const hasDetails =
    line.timestamp || line.thread || line.source || line.groupLabel;

  return (
    <div
      className={cn(
        "grid min-w-0 grid-cols-[3.5rem_minmax(4rem,5rem)_minmax(0,1fr)] gap-2 border-border border-b px-3 py-2 font-mono text-xs",
        (line.level === "error" || line.level === "fatal") &&
          "bg-destructive/5",
        line.level === "warn" && "bg-muted/45",
      )}
    >
      <div className="text-right text-muted-foreground tabular-nums">
        {line.lineNumber}
      </div>
      <div>
        <div className="flex flex-col items-start gap-1">
          <Badge variant={getLogLevelVariant(line.level)}>
            {getLogLevelLabel(line.level)}
          </Badge>
          <Badge variant={getLogTypeVariant(line.type)}>
            {LOG_TYPE_LABELS[line.type]}
          </Badge>
        </div>
      </div>
      <div className="min-w-0">
        {hasDetails ? (
          <div className="mb-1 flex min-w-0 flex-wrap gap-x-2 gap-y-1 text-muted-foreground">
            {line.timestamp ? <span>{line.timestamp}</span> : null}
            {line.thread ? <span>{line.thread}</span> : null}
            {line.source ? <span>{line.source}</span> : null}
            {line.groupLabel ? <span>{line.groupLabel}</span> : null}
          </div>
        ) : null}
        <pre className="whitespace-pre-wrap break-words font-mono leading-5">
          {line.message}
        </pre>
        {line.details.length > 0 ? (
          <pre className="mt-2 whitespace-pre-wrap break-words rounded-md border border-border bg-muted/30 p-2 font-mono text-muted-foreground leading-5">
            {line.details.join("\n")}
          </pre>
        ) : null}
      </div>
    </div>
  );
}

function LogEmptyState({
  folderPath,
  onRefreshContent,
}: {
  folderPath: string;
  onRefreshContent: () => void;
}) {
  return (
    <div className="rounded-lg border border-border bg-background/45 p-6 text-center">
      <FileTextIcon className="mx-auto size-8 text-muted-foreground" />
      <h3 className="mt-3 font-heading font-semibold text-sm">No logs found</h3>
      <p className="mx-auto mt-1 max-w-md text-muted-foreground text-sm">
        Minecraft logs for this instance will appear here after the game runs.
      </p>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        <Button onClick={onRefreshContent} size="sm" variant="outline">
          <RefreshCwIcon data-icon="inline-start" />
          Refresh
        </Button>
        <Button
          onClick={() => openExternalPath(folderPath)}
          size="sm"
          variant="outline"
        >
          <FolderOpenIcon data-icon="inline-start" />
          Open Folder
        </Button>
      </div>
    </div>
  );
}

function filterFolders(
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

export function InstanceLogsPanel({
  active,
  instance,
  logFolders,
  logs,
  onRefreshContent,
}: {
  active: boolean;
  instance: LauncherInstance;
  logFolders: Array<InstanceLogFolder>;
  logs: Array<InstanceFileEntry>;
  onRefreshContent: () => void;
}) {
  const [logQuery, setLogQuery] = useState("");
  const [selectedLogId, setSelectedLogId] = useState(LIVE_LOG_ID);
  const [preview, setPreview] = useState<InstanceLogFilePreview | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [lineTypeFilter, setLineTypeFilter] = useState<LogTypeFilter>("all");
  const deferredLogQuery = useDeferredValue(logQuery);
  const requestIdRef = useRef(0);

  const folders = useMemo(
    () =>
      logFolders.length > 0
        ? logFolders
        : createFallbackFolders(instance, logs),
    [instance, logFolders, logs],
  );
  const allLogFiles = useMemo(
    () => folders.flatMap((folder) => folder.files),
    [folders],
  );
  const liveEntry = useMemo(
    () =>
      allLogFiles.find(
        (entry) =>
          entry.fileName.toLowerCase() === "latest.log" &&
          (entry.relativePath?.startsWith("logs/") ?? true),
      ) ??
      allLogFiles.find(
        (entry) => entry.fileName.toLowerCase() === "latest.log",
      ) ??
      allLogFiles[0] ??
      null,
    [allLogFiles],
  );
  const selectedEntry = useMemo(() => {
    if (selectedLogId === LIVE_LOG_ID) return liveEntry;
    return allLogFiles.find((entry) => entry.id === selectedLogId) ?? null;
  }, [allLogFiles, liveEntry, selectedLogId]);
  const filteredFolders = useMemo(
    () => filterFolders(folders, deferredLogQuery),
    [deferredLogQuery, folders],
  );
  const typeSummaries = useMemo(() => {
    if (!preview) return [];

    const counts = new Map<InstanceLogLineType, number>();

    for (const line of preview.lines) {
      counts.set(line.type, (counts.get(line.type) ?? 0) + 1);
    }

    return LOG_TYPE_ORDER.flatMap((type) => {
      const count = counts.get(type) ?? 0;
      return count > 0 ? [{ count, type }] : [];
    });
  }, [preview]);
  const filteredLogLines = useMemo(() => {
    const lines = preview?.lines ?? [];

    if (lineTypeFilter === "all") return lines;

    const relatedGroupKeys = new Set(
      lines
        .filter((line) => line.type === lineTypeFilter && line.groupKey)
        .map((line) => line.groupKey as string),
    );

    return lines.filter(
      (line) =>
        line.type === lineTypeFilter ||
        Boolean(line.groupKey && relatedGroupKeys.has(line.groupKey)),
    );
  }, [lineTypeFilter, preview]);

  useEffect(() => {
    if (allLogFiles.length === 0) {
      setSelectedLogId(LIVE_LOG_ID);
      return;
    }

    if (selectedLogId === LIVE_LOG_ID && liveEntry) return;

    if (allLogFiles.some((entry) => entry.id === selectedLogId)) return;

    setSelectedLogId(
      liveEntry ? LIVE_LOG_ID : (allLogFiles[0]?.id ?? LIVE_LOG_ID),
    );
  }, [allLogFiles, liveEntry, selectedLogId]);

  useEffect(() => {
    if (lineTypeFilter === "all") return;
    if (typeSummaries.some((summary) => summary.type === lineTypeFilter)) {
      return;
    }

    setLineTypeFilter("all");
  }, [lineTypeFilter, typeSummaries]);

  const loadSelectedLog = useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      if (!selectedEntry) {
        setPreview(null);
        setPreviewError(null);
        return;
      }

      const requestId = requestIdRef.current + 1;
      requestIdRef.current = requestId;

      if (!silent) setPreviewLoading(true);
      setPreviewError(null);

      try {
        const next = await rpc.requestProxy.getInstanceLogFile({
          fileId: selectedEntry.id,
          instanceId: instance.id,
          maxBytes: LOG_PREVIEW_BYTES,
          maxLines: LOG_PREVIEW_LINES,
        });

        if (requestIdRef.current !== requestId) return;
        setPreview(next);
      } catch (error) {
        if (requestIdRef.current !== requestId) return;
        setPreview(null);
        setPreviewError(
          error instanceof Error ? error.message : "Failed to read log file",
        );
      } finally {
        if (requestIdRef.current === requestId && !silent) {
          setPreviewLoading(false);
        }
      }
    },
    [instance.id, selectedEntry],
  );

  useEffect(() => {
    if (!active) return;
    void loadSelectedLog();
  }, [active, loadSelectedLog]);

  useEffect(() => {
    if (!active || selectedLogId !== LIVE_LOG_ID || !selectedEntry) return;

    const interval = window.setInterval(() => {
      void loadSelectedLog({ silent: true });
    }, LIVE_REFRESH_MS);

    return () => window.clearInterval(interval);
  }, [active, loadSelectedLog, selectedEntry, selectedLogId]);

  const openSelectedPath = () => {
    if (selectedEntry) openExternalPath(selectedEntry.path);
  };

  const totalLogCount = allLogFiles.length;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Logs</CardTitle>
        <CardAction className="flex gap-2">
          <Button onClick={onRefreshContent} size="sm" variant="outline">
            <RefreshCwIcon data-icon="inline-start" />
            Refresh List
          </Button>
          <Button
            onClick={() => openExternalPath(instance.folders.logs)}
            size="sm"
            variant="outline"
          >
            <FolderOpenIcon data-icon="inline-start" />
            Open Folder
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        {totalLogCount === 0 ? (
          <LogEmptyState
            folderPath={instance.folders.logs}
            onRefreshContent={onRefreshContent}
          />
        ) : (
          <div className="grid min-w-0 gap-3 xl:grid-cols-[18rem_minmax(0,1fr)]">
            <aside className="min-w-0 overflow-hidden rounded-lg border border-border bg-background/45">
              <div className="border-border border-b p-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="font-heading font-semibold text-sm">
                      Log Sources
                    </div>
                    <div className="text-muted-foreground text-xs">
                      {totalLogCount} files across {folders.length} folders
                    </div>
                  </div>
                  <Badge variant="secondary">
                    {filteredFolders.matchCount}
                  </Badge>
                </div>

                <InputGroup className="mt-3 h-9 min-w-0">
                  <InputGroupAddon>
                    <SearchIcon />
                  </InputGroupAddon>
                  <InputGroupInput
                    aria-label="Search logs"
                    onChange={(event) => setLogQuery(event.target.value)}
                    placeholder="Search log files"
                    value={logQuery}
                  />
                </InputGroup>
              </div>

              <ScrollArea className="h-[32rem] min-h-0">
                <div className="flex min-w-0 flex-col gap-3 p-2">
                  {liveEntry ? (
                    <LogTabButton
                      active={selectedLogId === LIVE_LOG_ID}
                      entry={liveEntry}
                      icon={ActivityIcon}
                      label="Live"
                      meta={getEntryMeta(liveEntry)}
                      onClick={() => setSelectedLogId(LIVE_LOG_ID)}
                    />
                  ) : null}

                  {filteredFolders.folders.map((folder) => (
                    <section className="min-w-0" key={folder.id}>
                      <div className="mb-1 flex items-center justify-between gap-2 px-2 text-muted-foreground text-xs">
                        <span className="truncate font-semibold">
                          {folder.displayName}
                        </span>
                        <Badge variant="ghost">{folder.files.length}</Badge>
                      </div>
                      <div className="flex min-w-0 flex-col gap-1">
                        {folder.files.map((entry) => (
                          <LogTabButton
                            active={
                              selectedLogId !== LIVE_LOG_ID &&
                              selectedLogId === entry.id
                            }
                            entry={entry}
                            icon={FileTextIcon}
                            key={entry.id}
                            label={entry.displayName}
                            meta={getEntryMeta(entry)}
                            onClick={() => setSelectedLogId(entry.id)}
                          />
                        ))}
                      </div>
                    </section>
                  ))}

                  {filteredFolders.hiddenCount > 0 ? (
                    <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-muted-foreground text-xs">
                      {filteredFolders.hiddenCount} more files hidden. Narrow
                      the search to keep the list responsive.
                    </div>
                  ) : null}
                </div>
              </ScrollArea>
            </aside>

            <div className="min-w-0 overflow-hidden rounded-lg border border-border bg-background/45">
              <div className="grid gap-3 border-border border-b p-3 lg:grid-cols-[minmax(0,1fr)_auto]">
                <div className="min-w-0">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <TerminalSquareIcon className="size-4 shrink-0 text-primary" />
                    <h3 className="truncate font-heading font-semibold text-base">
                      {selectedLogId === LIVE_LOG_ID
                        ? "Live"
                        : (selectedEntry?.displayName ?? "Log Preview")}
                    </h3>
                    {selectedEntry ? (
                      <Badge variant="outline">{selectedEntry.fileName}</Badge>
                    ) : null}
                  </div>
                  {selectedEntry ? (
                    <div className="mt-1 flex min-w-0 flex-wrap gap-x-3 gap-y-1 text-muted-foreground text-xs">
                      <span>{formatBytes(selectedEntry.sizeBytes)}</span>
                      <span>
                        Modified {formatModified(selectedEntry.modifiedAt)}
                      </span>
                      {preview?.truncated ? (
                        <span>
                          Showing latest {formatBytes(preview.readBytes)}
                        </span>
                      ) : null}
                      {selectedLogId === LIVE_LOG_ID ? (
                        <span>Auto-refreshes every 4s</span>
                      ) : null}
                    </div>
                  ) : null}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {preview ? (
                    <>
                      <Badge variant="secondary">
                        {preview.summary.totalLines} lines
                      </Badge>
                      <Badge
                        variant={
                          preview.summary.warnings > 0 ? "outline" : "ghost"
                        }
                      >
                        {preview.summary.warnings} warnings
                      </Badge>
                      <Badge
                        variant={
                          preview.summary.errors > 0 ? "destructive" : "ghost"
                        }
                      >
                        {preview.summary.errors} errors
                      </Badge>
                      <Select
                        onValueChange={(value) =>
                          setLineTypeFilter(value as LogTypeFilter)
                        }
                        value={lineTypeFilter}
                      >
                        <SelectTrigger className="h-7 w-44">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            <SelectItem value="all">
                              All parsed types
                            </SelectItem>
                            {typeSummaries.map((summary) => (
                              <SelectItem
                                key={summary.type}
                                value={summary.type}
                              >
                                {`${LOG_TYPE_LABELS[summary.type]} (${summary.count})`}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </>
                  ) : null}
                  <Button
                    disabled={!selectedEntry || previewLoading}
                    onClick={() => void loadSelectedLog()}
                    size="sm"
                    variant="outline"
                  >
                    {previewLoading ? (
                      <Loader2Icon
                        className="animate-spin"
                        data-icon="inline-start"
                      />
                    ) : (
                      <RefreshCwIcon data-icon="inline-start" />
                    )}
                    Reload
                  </Button>
                  <Button
                    disabled={!selectedEntry}
                    onClick={openSelectedPath}
                    size="sm"
                    variant="outline"
                  >
                    <FolderOpenIcon data-icon="inline-start" />
                    Open
                  </Button>
                </div>
              </div>

              {previewError ? (
                <div className="m-3 flex items-start gap-2 rounded-lg border border-border bg-muted/35 p-3 text-sm">
                  <ShieldAlertIcon className="mt-0.5 size-4 shrink-0 text-destructive" />
                  <div>
                    <div className="font-semibold">Could not parse log</div>
                    <div className="mt-1 text-muted-foreground">
                      {previewError}
                    </div>
                  </div>
                </div>
              ) : null}

              {previewLoading && !preview ? (
                <div className="flex h-[32rem] items-center justify-center gap-2 text-muted-foreground text-sm">
                  <Loader2Icon className="size-4 animate-spin" />
                  Loading log preview...
                </div>
              ) : preview && preview.lines.length > 0 ? (
                <ScrollArea className="h-[32rem] min-h-0">
                  <div className="min-w-0">
                    {filteredLogLines.length > 0 ? (
                      filteredLogLines.map((line) => (
                        <LogLineRow key={line.id} line={line} />
                      ))
                    ) : (
                      <div className="flex h-[32rem] items-center justify-center p-6 text-center text-muted-foreground text-sm">
                        No log lines match this parsed type.
                      </div>
                    )}
                  </div>
                </ScrollArea>
              ) : (
                <div className="flex h-[32rem] flex-col items-center justify-center gap-2 p-6 text-center text-muted-foreground text-sm">
                  <ClockIcon className="size-8" />
                  <div>
                    {selectedEntry
                      ? "This log file is empty."
                      : "Select a log file to inspect parsed lines."}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
