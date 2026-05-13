import {
  ClockIcon,
  FolderOpenIcon,
  Loader2Icon,
  RefreshCwIcon,
  ShieldAlertIcon,
  TerminalSquareIcon,
} from "lucide-react";
import type {
  InstanceFileEntry,
  InstanceLogFilePreview,
  InstanceLogLine,
  InstanceLogLineType,
} from "@/shared/types";
import { Badge } from "@/views/main/components/ui/badge";
import { Button } from "@/views/main/components/ui/button";
import { ScrollArea } from "@/views/main/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/views/main/components/ui/select";
import {
  formatContentBytes,
  formatContentModified,
} from "@/views/main/features/instances/components/instance-content-format";
import { InstanceLogLineRow } from "@/views/main/features/instances/components/instance-log-line-row";
import {
  LIVE_LOG_ID,
  LOG_TYPE_LABELS,
  type LogTypeFilter,
} from "@/views/main/features/instances/components/instance-log-panel-model";

type LogTypeSummary = {
  count: number;
  type: InstanceLogLineType;
};

type InstanceLogPreviewProps = {
  filteredLogLines: Array<InstanceLogLine>;
  lineTypeFilter: LogTypeFilter;
  onLineTypeFilterChange: (filter: LogTypeFilter) => void;
  onOpenSelectedPath: () => void;
  onReload: () => void;
  preview: InstanceLogFilePreview | null;
  previewError: string | null;
  previewLoading: boolean;
  selectedEntry: InstanceFileEntry | null;
  selectedLogId: string;
  typeSummaries: Array<LogTypeSummary>;
};

export function InstanceLogPreview({
  filteredLogLines,
  lineTypeFilter,
  onLineTypeFilterChange,
  onOpenSelectedPath,
  onReload,
  preview,
  previewError,
  previewLoading,
  selectedEntry,
  selectedLogId,
  typeSummaries,
}: InstanceLogPreviewProps) {
  return (
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
              <span>{formatContentBytes(selectedEntry.sizeBytes)}</span>
              <span>
                Modified {formatContentModified(selectedEntry.modifiedAt)}
              </span>
              {preview?.truncated ? (
                <span>
                  Showing latest {formatContentBytes(preview.readBytes)}
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
                variant={preview.summary.warnings > 0 ? "outline" : "ghost"}
              >
                {preview.summary.warnings} warnings
              </Badge>
              <Badge
                variant={preview.summary.errors > 0 ? "destructive" : "ghost"}
              >
                {preview.summary.errors} errors
              </Badge>
              <Select
                onValueChange={(value) =>
                  onLineTypeFilterChange(value as LogTypeFilter)
                }
                value={lineTypeFilter}
              >
                <SelectTrigger className="h-7 w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="all">All parsed types</SelectItem>
                    {typeSummaries.map((summary) => (
                      <SelectItem key={summary.type} value={summary.type}>
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
            onClick={onReload}
            size="sm"
            variant="outline"
          >
            {previewLoading ? (
              <Loader2Icon className="animate-spin" data-icon="inline-start" />
            ) : (
              <RefreshCwIcon data-icon="inline-start" />
            )}
            Reload
          </Button>
          <Button
            disabled={!selectedEntry}
            onClick={onOpenSelectedPath}
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
            <div className="mt-1 text-muted-foreground">{previewError}</div>
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
                <InstanceLogLineRow key={line.id} line={line} />
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
  );
}
