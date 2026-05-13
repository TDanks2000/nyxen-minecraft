import { AlertTriangleIcon, PuzzleIcon, RotateCcwIcon } from "lucide-react";
import type { LauncherInstance, ModLoader } from "@/shared/types";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/views/main/components/ui/alert";
import { Button } from "@/views/main/components/ui/button";
import { Switch } from "@/views/main/components/ui/switch";
import { LOADER_LABELS } from "@/views/main/features/instances/components/instance-format";

type InstanceCompatibilityAlertProps = {
  compatibilityConfirmed: boolean;
  instance: LauncherInstance;
  localModCount: number;
  loader: ModLoader;
  nextLoaderVersion: string | null;
  onCompatibilityConfirmedChange: (confirmed: boolean) => void;
  onKeepCurrentRuntime: () => void;
  onReviewMods: () => void;
  versionId: string;
};

export function InstanceCompatibilityAlert({
  compatibilityConfirmed,
  instance,
  localModCount,
  loader,
  nextLoaderVersion,
  onCompatibilityConfirmedChange,
  onKeepCurrentRuntime,
  onReviewMods,
  versionId,
}: InstanceCompatibilityAlertProps) {
  return (
    <Alert variant="destructive">
      <AlertTriangleIcon />
      <AlertTitle>Compatibility Review Required</AlertTitle>
      <AlertDescription className="flex flex-col gap-3">
        <p>
          This instance has {localModCount} local mod
          {localModCount === 1 ? "" : "s"}. Changing Minecraft or the mod loader
          keeps those files in place, so incompatible jars must be updated,
          replaced, or removed before launch.
        </p>
        <div className="grid gap-2 text-xs sm:grid-cols-2">
          <div className="rounded-md border border-border bg-background/65 px-3 py-2">
            <div className="text-muted-foreground">Current runtime</div>
            <div className="mt-1 font-semibold">
              {instance.versionId} · {LOADER_LABELS[instance.loader]}
              {instance.loaderVersion ? ` ${instance.loaderVersion}` : ""}
            </div>
          </div>
          <div className="rounded-md border border-border bg-background/65 px-3 py-2">
            <div className="text-muted-foreground">Next runtime</div>
            <div className="mt-1 font-semibold">
              {versionId} · {LOADER_LABELS[loader]}
              {nextLoaderVersion ? ` ${nextLoaderVersion}` : ""}
            </div>
          </div>
        </div>
        <div className="flex items-start gap-3 rounded-md border border-border bg-background/65 p-3">
          <Switch
            aria-label="Confirm mod compatibility review"
            checked={compatibilityConfirmed}
            onCheckedChange={onCompatibilityConfirmedChange}
            size="sm"
          />
          <span>
            I understand the runtime change may break local mods and will review
            compatibility before launching.
          </span>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            onClick={onReviewMods}
            size="sm"
            type="button"
            variant="outline"
          >
            <PuzzleIcon data-icon="inline-start" />
            Review Mods
          </Button>
          <Button
            onClick={onKeepCurrentRuntime}
            size="sm"
            type="button"
            variant="outline"
          >
            <RotateCcwIcon data-icon="inline-start" />
            Keep Current Runtime
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}
