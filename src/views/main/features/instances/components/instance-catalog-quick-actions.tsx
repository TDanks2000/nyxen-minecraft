import { FileTextIcon, RefreshCwIcon, Settings2Icon } from "lucide-react";
import type { InstanceFileEntry } from "@/shared/types";
import { Button } from "@/views/main/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/views/main/components/ui/card";
import { openInstancePath } from "@/views/main/features/instances/components/instance-content-format";

type InstanceCatalogQuickActionsProps = {
  latestLog: InstanceFileEntry | null;
  logsFolderPath: string;
  onRefreshContent: () => void;
  onSetActiveTab: (tab: string) => void;
};

export function InstanceCatalogQuickActions({
  latestLog,
  logsFolderPath,
  onRefreshContent,
  onSetActiveTab,
}: InstanceCatalogQuickActionsProps) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-2">
        <Button
          className="w-full"
          onClick={() => openInstancePath(latestLog?.path ?? logsFolderPath)}
          size="sm"
          variant="outline"
        >
          <FileTextIcon data-icon="inline-start" />
          Latest Log
        </Button>
        <Button
          className="w-full"
          onClick={onRefreshContent}
          size="sm"
          variant="outline"
        >
          <RefreshCwIcon data-icon="inline-start" />
          Refresh
        </Button>
        <Button
          className="w-full sm:col-span-2"
          onClick={() => onSetActiveTab("settings")}
          size="sm"
          variant="outline"
        >
          <Settings2Icon data-icon="inline-start" />
          Edit Configuration
        </Button>
      </CardContent>
    </Card>
  );
}
