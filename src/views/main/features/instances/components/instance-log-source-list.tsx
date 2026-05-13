import { ActivityIcon, FileTextIcon, SearchIcon } from "lucide-react";
import type { InstanceFileEntry, InstanceLogFolder } from "@/shared/types";
import { Badge } from "@/views/main/components/ui/badge";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/views/main/components/ui/input-group";
import { ScrollArea } from "@/views/main/components/ui/scroll-area";
import {
  getLogEntryMeta,
  LIVE_LOG_ID,
  type LogPanelFolders,
} from "@/views/main/features/instances/components/instance-log-panel-model";
import { InstanceLogTabButton } from "@/views/main/features/instances/components/instance-log-tab-button";

type InstanceLogSourceListProps = {
  filteredFolders: LogPanelFolders;
  folders: Array<InstanceLogFolder>;
  liveEntry: InstanceFileEntry | null;
  logQuery: string;
  onLogQueryChange: (query: string) => void;
  onSelectLogId: (logId: string) => void;
  selectedLogId: string;
  totalLogCount: number;
};

export function InstanceLogSourceList({
  filteredFolders,
  folders,
  liveEntry,
  logQuery,
  onLogQueryChange,
  onSelectLogId,
  selectedLogId,
  totalLogCount,
}: InstanceLogSourceListProps) {
  return (
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
          <Badge variant="secondary">{filteredFolders.matchCount}</Badge>
        </div>

        <InputGroup className="mt-3 h-9 min-w-0">
          <InputGroupAddon>
            <SearchIcon />
          </InputGroupAddon>
          <InputGroupInput
            aria-label="Search logs"
            onChange={(event) => onLogQueryChange(event.target.value)}
            placeholder="Search log files"
            value={logQuery}
          />
        </InputGroup>
      </div>

      <ScrollArea className="h-[32rem] min-h-0">
        <div className="flex min-w-0 flex-col gap-3 p-2">
          {liveEntry ? (
            <InstanceLogTabButton
              active={selectedLogId === LIVE_LOG_ID}
              entry={liveEntry}
              icon={ActivityIcon}
              label="Live"
              meta={getLogEntryMeta(liveEntry)}
              onClick={() => onSelectLogId(LIVE_LOG_ID)}
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
                  <InstanceLogTabButton
                    active={
                      selectedLogId !== LIVE_LOG_ID &&
                      selectedLogId === entry.id
                    }
                    entry={entry}
                    icon={FileTextIcon}
                    key={entry.id}
                    label={entry.displayName}
                    meta={getLogEntryMeta(entry)}
                    onClick={() => onSelectLogId(entry.id)}
                  />
                ))}
              </div>
            </section>
          ))}

          {filteredFolders.hiddenCount > 0 ? (
            <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-muted-foreground text-xs">
              {filteredFolders.hiddenCount} more files hidden. Narrow the search
              to keep the list responsive.
            </div>
          ) : null}
        </div>
      </ScrollArea>
    </aside>
  );
}
