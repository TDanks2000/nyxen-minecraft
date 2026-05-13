import {
  AlertTriangleIcon,
  CheckIcon,
  DownloadIcon,
  PackageIcon,
  RefreshCcwIcon,
} from "lucide-react";
import type { ModrinthCategory } from "@/shared/types";
import type { ContentBrowserActionState } from "@/views/main/features/curseforge/curseforge-browser-types";

export function ModrinthResultActionIcon({
  category,
  state,
}: {
  category: ModrinthCategory;
  state: ContentBrowserActionState;
}) {
  if (state === "installed") return <CheckIcon data-icon="inline-start" />;
  if (state === "installing") {
    return <RefreshCcwIcon className="animate-spin" data-icon="inline-start" />;
  }
  if (state === "update-available") {
    return <RefreshCcwIcon data-icon="inline-start" />;
  }
  if (state === "failed" || state === "incompatible") {
    return <AlertTriangleIcon data-icon="inline-start" />;
  }
  if (state === "managed") return <PackageIcon data-icon="inline-start" />;
  if (category === "modpacks") return <PackageIcon data-icon="inline-start" />;

  return <DownloadIcon data-icon="inline-start" />;
}
