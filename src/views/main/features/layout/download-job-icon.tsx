import {
  AlertCircleIcon,
  CheckCircle2Icon,
  DownloadCloudIcon,
  Loader2Icon,
} from "lucide-react";
import type { DownloadQueueJob } from "@/shared/types";

export function DownloadJobIcon({
  status,
}: {
  status: DownloadQueueJob["status"];
}) {
  if (status === "completed") {
    return <CheckCircle2Icon className="size-4 text-primary" />;
  }

  if (status === "failed") {
    return <AlertCircleIcon className="size-4 text-destructive" />;
  }

  if (status === "running") {
    return <Loader2Icon className="size-4 animate-spin text-primary" />;
  }

  return <DownloadCloudIcon className="size-4 text-muted-foreground" />;
}
