import { FolderOpenIcon } from "lucide-react";
import type { ElementType } from "react";
import type { InstanceFileEntry } from "@/shared/types";
import { Button } from "@/views/main/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/views/main/components/ui/card";
import { InstanceCatalogEmptyPanel } from "@/views/main/features/instances/components/instance-catalog-empty-panel";
import { InstanceCatalogFileCard } from "@/views/main/features/instances/components/instance-catalog-file-card";
import { openInstancePath } from "@/views/main/features/instances/components/instance-content-format";

type InstanceCatalogFileListPanelProps = {
  emptyIcon: ElementType;
  emptyText: string;
  emptyTitle: string;
  entries: Array<InstanceFileEntry>;
  folderPath: string;
  title: string;
};

export function InstanceCatalogFileListPanel({
  emptyIcon,
  emptyText,
  emptyTitle,
  entries,
  folderPath,
  title,
}: InstanceCatalogFileListPanelProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardAction>
          <Button
            onClick={() => openInstancePath(folderPath)}
            size="sm"
            variant="outline"
          >
            <FolderOpenIcon data-icon="inline-start" />
            Open Folder
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <InstanceCatalogEmptyPanel
            action={
              <Button
                onClick={() => openInstancePath(folderPath)}
                size="sm"
                variant="outline"
              >
                <FolderOpenIcon data-icon="inline-start" />
                Open Folder
              </Button>
            }
            description={emptyText}
            icon={emptyIcon}
            title={emptyTitle}
          />
        ) : (
          <div className="grid gap-2 lg:grid-cols-2">
            {entries.map((entry) => (
              <InstanceCatalogFileCard entry={entry} key={entry.id} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
