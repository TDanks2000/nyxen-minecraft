import {
  AlertCircleIcon,
  CheckCircle2Icon,
  RefreshCcwIcon,
  SearchIcon,
} from "lucide-react";
import type { CurseForgeProjectSummary } from "@/shared/types";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/views/main/components/ui/alert";
import { Button } from "@/views/main/components/ui/button";
import { getManualInstallFileName } from "@/views/main/features/curseforge/components/content-browser-dialog-model";

type ContentBrowserManualInstallPanelProps = {
  disabled: boolean;
  item: CurseForgeProjectSummary;
  onCancel: () => void;
  onOpenDownload: () => void;
  onScanDownloads: () => void;
  pending: boolean;
};

export function ContentBrowserManualInstallPanel({
  disabled,
  item,
  onCancel,
  onOpenDownload,
  onScanDownloads,
  pending,
}: ContentBrowserManualInstallPanelProps) {
  const fileName = getManualInstallFileName(item);

  return (
    <Alert className="mb-3 border-primary/30 bg-primary/5">
      <AlertCircleIcon />
      <AlertTitle>Manual download required</AlertTitle>
      <AlertDescription>
        Open CurseForge, download {fileName} to your Downloads folder, then scan
        Downloads to copy it into the selected launcher target.
      </AlertDescription>
      <div className="mt-2 flex flex-wrap gap-2 group-has-[>svg]/alert:col-start-2">
        <Button
          disabled={disabled || pending}
          onClick={onOpenDownload}
          size="sm"
          variant="outline"
        >
          <SearchIcon data-icon="inline-start" />
          Open CurseForge
        </Button>
        <Button
          disabled={disabled || pending}
          onClick={onScanDownloads}
          size="sm"
        >
          {pending ? (
            <RefreshCcwIcon className="animate-spin" data-icon="inline-start" />
          ) : (
            <CheckCircle2Icon data-icon="inline-start" />
          )}
          Scan Downloads
        </Button>
        <Button disabled={pending} onClick={onCancel} size="sm" variant="ghost">
          Cancel
        </Button>
      </div>
    </Alert>
  );
}
