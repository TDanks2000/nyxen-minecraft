import {
  AlertTriangleIcon,
  CheckIcon,
  DownloadIcon,
  ExternalLinkIcon,
  PackageIcon,
  RefreshCcwIcon,
} from "lucide-react";
import type { CurseForgeCategory } from "@/shared/types";
import type { CurseForgeBrowserActionState } from "@/views/main/features/curseforge/curseforge-browser-types";

type CurseForgeResultActionIconProps = {
  category: CurseForgeCategory;
  manualDownloadRequired: boolean;
  state: CurseForgeBrowserActionState;
};

export function CurseForgeResultActionIcon({
  category,
  manualDownloadRequired,
  state,
}: CurseForgeResultActionIconProps) {
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
  if (manualDownloadRequired) {
    return <ExternalLinkIcon data-icon="inline-start" />;
  }
  if (category === "modpacks") return <PackageIcon data-icon="inline-start" />;

  return <DownloadIcon data-icon="inline-start" />;
}
