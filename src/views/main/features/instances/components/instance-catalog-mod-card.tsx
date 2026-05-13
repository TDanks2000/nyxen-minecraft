import { memo } from "react";
import type { InstanceFileEntry } from "@/shared/types";
import { Badge } from "@/views/main/components/ui/badge";
import { Switch } from "@/views/main/components/ui/switch";
import { InstanceCatalogModIcon } from "@/views/main/features/instances/components/instance-catalog-mod-icon";
import { InstanceCatalogStatusBadge } from "@/views/main/features/instances/components/instance-catalog-status-badge";
import {
  formatContentBytes,
  formatContentModified,
} from "@/views/main/features/instances/components/instance-content-format";
import { cn } from "@/views/main/lib/utils";

type InstanceCatalogModCardProps = {
  entry: InstanceFileEntry;
  managedByModpack: boolean;
  mutating: boolean;
  onToggleMod: (fileName: string, name: string, enabled: boolean) => void;
};

export const InstanceCatalogModCard = memo(function InstanceCatalogModCard({
  entry,
  managedByModpack,
  mutating,
  onToggleMod,
}: InstanceCatalogModCardProps) {
  const enabled = entry.enabled === true;

  return (
    <article
      className={cn(
        "group flex min-w-0 flex-col rounded-lg border bg-background/55 p-3 transition-colors",
        enabled
          ? "border-primary/25 hover:border-primary/55"
          : "border-border opacity-80 hover:border-muted-foreground/45 hover:opacity-100",
      )}
    >
      <div className="flex min-w-0 items-start gap-3">
        <InstanceCatalogModIcon enabled={enabled} />
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-start gap-2">
            <div className="min-w-0 flex-1">
              <h3 className="truncate font-heading font-semibold text-sm leading-5">
                {entry.displayName}
              </h3>
              <p className="mt-1 line-clamp-2 break-all font-mono text-muted-foreground text-xs leading-5">
                {entry.fileName}
              </p>
            </div>
          </div>

          <div className="mt-3 flex min-w-0 flex-wrap gap-1.5">
            <InstanceCatalogStatusBadge enabled={entry.enabled} />
            <Badge variant="secondary">Local Jar</Badge>
            {managedByModpack ? (
              <Badge variant="outline">Modpack managed</Badge>
            ) : null}
            <Badge variant="ghost">{formatContentBytes(entry.sizeBytes)}</Badge>
          </div>

          <div className="mt-3 grid gap-2 text-xs [grid-template-columns:repeat(auto-fit,minmax(8rem,1fr))]">
            <div className="min-w-0 rounded-md bg-muted/30 px-2 py-1.5">
              <div className="text-muted-foreground">Modified</div>
              <div className="mt-0.5 truncate font-semibold">
                {formatContentModified(entry.modifiedAt)}
              </div>
            </div>
            <div className="min-w-0 rounded-md bg-muted/30 px-2 py-1.5">
              <div className="text-muted-foreground">Updater</div>
              <div className="mt-0.5 truncate font-semibold">Manual file</div>
            </div>
          </div>

          <div className="mt-3 flex min-w-0 flex-wrap items-center gap-2 border-border border-t pt-3">
            <div className="flex items-center gap-2">
              <Switch
                aria-label={`${enabled ? "Disable" : "Enable"} ${entry.displayName}`}
                checked={enabled}
                disabled={mutating || managedByModpack}
                onCheckedChange={(checked) =>
                  onToggleMod(entry.fileName, entry.displayName, checked)
                }
                size="sm"
              />
              <span className="font-medium text-xs">
                {enabled ? "Enabled" : "Disabled"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
});
