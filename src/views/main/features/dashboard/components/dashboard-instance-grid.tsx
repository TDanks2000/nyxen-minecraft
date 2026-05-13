import { Link } from "@tanstack/react-router";
import { ChevronRightIcon } from "lucide-react";
import type { DownloadQueueJob, LauncherInstance } from "@/shared/types";
import { InstanceCollection } from "@/views/main/features/instances/components/instance-collection";

type DashboardInstanceGridProps = {
  downloadJobs: Array<DownloadQueueJob>;
  featuredInstanceId: string | null;
  instanceCount: number | undefined;
  instances: Array<LauncherInstance>;
  launchLoadingId: string | null;
  loading: boolean;
  onCreateInstance: () => void;
  onInstallCompleted: () => void;
  onPlayInstance: (instanceId: string) => void;
};

export function DashboardInstanceGrid({
  downloadJobs,
  featuredInstanceId,
  instanceCount,
  instances,
  launchLoadingId,
  loading,
  onCreateInstance,
  onInstallCompleted,
  onPlayInstance,
}: DashboardInstanceGridProps) {
  return (
    <>
      <InstanceCollection
        cardDensity="compact"
        className="px-4 pt-5 pb-4 sm:px-5"
        downloadJobs={downloadJobs}
        featuredInstanceId={featuredInstanceId}
        gridClassName="grid grid-cols-[repeat(auto-fill,minmax(10.5rem,1fr))] gap-3"
        instanceCount={instanceCount}
        instances={instances}
        launchLoadingId={launchLoadingId}
        listClassName="flex flex-col gap-1"
        loading={loading}
        onCreateInstance={onCreateInstance}
        onInstallCompleted={onInstallCompleted}
        onPlayInstance={onPlayInstance}
        showViewToggle
        title="My Instances"
      />

      {instances.length > 5 && (
        <div className="mt-4 flex justify-center">
          <Link
            to="/instances"
            className="flex items-center gap-1 text-muted-foreground text-xs transition-colors hover:text-foreground"
          >
            View all instances
            <ChevronRightIcon className="size-3.5" />
          </Link>
        </div>
      )}
    </>
  );
}
