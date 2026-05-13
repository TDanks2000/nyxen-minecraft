import { FileTextIcon, FolderOpenIcon, RefreshCwIcon } from "lucide-react";
import { Button } from "@/views/main/components/ui/button";
import { openInstancePath } from "@/views/main/features/instances/components/instance-content-format";

type InstanceLogEmptyStateProps = {
  folderPath: string;
  onRefreshContent: () => void;
};

export function InstanceLogEmptyState({
  folderPath,
  onRefreshContent,
}: InstanceLogEmptyStateProps) {
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
          onClick={() => openInstancePath(folderPath)}
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
