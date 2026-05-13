import type { InstanceLogLine } from "@/shared/types";
import { Badge } from "@/views/main/components/ui/badge";
import {
  getLogLevelLabel,
  getLogLevelVariant,
  getLogTypeVariant,
  LOG_TYPE_LABELS,
} from "@/views/main/features/instances/components/instance-log-panel-model";
import { cn } from "@/views/main/lib/utils";

export function InstanceLogLineRow({ line }: { line: InstanceLogLine }) {
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
