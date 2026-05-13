import { FolderOpenIcon } from "lucide-react";
import type { ReactNode } from "react";
import type { InstanceFileEntry } from "@/shared/types";
import { Badge } from "@/views/main/components/ui/badge";
import { Button } from "@/views/main/components/ui/button";
import { InstanceCatalogFileIcon } from "@/views/main/features/instances/components/instance-catalog-file-icon";
import { InstanceCatalogStatusBadge } from "@/views/main/features/instances/components/instance-catalog-status-badge";
import {
  formatContentBytes,
  formatContentModified,
  openInstancePath,
} from "@/views/main/features/instances/components/instance-content-format";

type InstanceCatalogFileCardProps = {
  action?: ReactNode;
  entry: InstanceFileEntry;
};

export function InstanceCatalogFileCard({
  action,
  entry,
}: InstanceCatalogFileCardProps) {
  return (
    <article className="rounded-lg border border-border bg-background/45 p-3">
      <div className="flex items-start gap-3">
        <InstanceCatalogFileIcon entry={entry} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate font-heading font-semibold text-sm">
                {entry.displayName}
              </h3>
              <p className="mt-1 truncate font-mono text-muted-foreground text-xs">
                {entry.fileName}
              </p>
            </div>
            <Button
              aria-label={`Open ${entry.displayName}`}
              onClick={() => openInstancePath(entry.path)}
              size="icon-sm"
              variant="ghost"
            >
              <FolderOpenIcon />
            </Button>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <InstanceCatalogStatusBadge enabled={entry.enabled} />
            <Badge variant="secondary">
              {entry.isDirectory ? "Folder" : (entry.extension ?? "File")}
            </Badge>
            <Badge variant="ghost">{formatContentBytes(entry.sizeBytes)}</Badge>
          </div>
          <div className="mt-2 text-muted-foreground text-xs">
            Modified {formatContentModified(entry.modifiedAt)}
          </div>
          {action ? <div className="mt-3">{action}</div> : null}
        </div>
      </div>
    </article>
  );
}
