import { FolderOpenIcon, RefreshCwIcon } from "lucide-react";
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
  InstanceLogLineType,
  LauncherInstance,
} from "@/shared/types";
import { Button } from "@/views/main/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/views/main/components/ui/card";
import { openInstancePath } from "@/views/main/features/instances/components/instance-content-format";
import { InstanceLogEmptyState } from "@/views/main/features/instances/components/instance-log-empty-state";
import {
  createFallbackLogFolders,
  filterLogFolders,
  LIVE_LOG_ID,
  LIVE_REFRESH_MS,
  LOG_PREVIEW_BYTES,
  LOG_PREVIEW_LINES,
  LOG_TYPE_ORDER,
  type LogTypeFilter,
} from "@/views/main/features/instances/components/instance-log-panel-model";
import { InstanceLogPreview } from "@/views/main/features/instances/components/instance-log-preview";
import { InstanceLogSourceList } from "@/views/main/features/instances/components/instance-log-source-list";
import { rpc } from "@/views/main/lib/rpc";

type InstanceLogsPanelProps = {
  active: boolean;
  instance: LauncherInstance;
  logFolders: Array<InstanceLogFolder>;
  logs: Array<InstanceFileEntry>;
  onRefreshContent: () => void;
};

export function InstanceLogsPanel({
  active,
  instance,
  logFolders,
  logs,
  onRefreshContent,
}: InstanceLogsPanelProps) {
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
        : createFallbackLogFolders(instance, logs),
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
    () => filterLogFolders(folders, deferredLogQuery),
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
    if (selectedEntry) openInstancePath(selectedEntry.path);
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
            onClick={() => openInstancePath(instance.folders.logs)}
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
          <InstanceLogEmptyState
            folderPath={instance.folders.logs}
            onRefreshContent={onRefreshContent}
          />
        ) : (
          <div className="grid min-w-0 gap-3 xl:grid-cols-[18rem_minmax(0,1fr)]">
            <InstanceLogSourceList
              filteredFolders={filteredFolders}
              folders={folders}
              liveEntry={liveEntry}
              logQuery={logQuery}
              onLogQueryChange={setLogQuery}
              onSelectLogId={setSelectedLogId}
              selectedLogId={selectedLogId}
              totalLogCount={totalLogCount}
            />
            <InstanceLogPreview
              filteredLogLines={filteredLogLines}
              lineTypeFilter={lineTypeFilter}
              onLineTypeFilterChange={setLineTypeFilter}
              onOpenSelectedPath={openSelectedPath}
              onReload={() => void loadSelectedLog()}
              preview={preview}
              previewError={previewError}
              previewLoading={previewLoading}
              selectedEntry={selectedEntry}
              selectedLogId={selectedLogId}
              typeSummaries={typeSummaries}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
