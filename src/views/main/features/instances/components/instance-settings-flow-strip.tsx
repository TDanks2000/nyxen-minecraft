import {
  AlertTriangleIcon,
  CheckCircle2Icon,
  GaugeIcon,
  PuzzleIcon,
  UserRoundIcon,
  WrenchIcon,
} from "lucide-react";
import { INSTANCE_SETTINGS_FLOW } from "@/views/main/features/instances/components/instance-settings-model";
import { cn } from "@/views/main/lib/utils";

const STEP_ICONS = [UserRoundIcon, PuzzleIcon, GaugeIcon, WrenchIcon];

export function InstanceSettingsFlowStrip({ blocked }: { blocked: boolean }) {
  return (
    <div className="mb-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
      {INSTANCE_SETTINGS_FLOW.map((step, index) => {
        const Icon = STEP_ICONS[index] ?? UserRoundIcon;
        const guarded = blocked && step.label === "Version";

        return (
          <div
            className={cn(
              "flex min-w-0 items-center gap-2 rounded-lg border border-border bg-card/70 px-3 py-2",
              guarded && "border-destructive/40 bg-destructive/10",
            )}
            key={step.label}
          >
            <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
              <Icon />
            </span>
            <div className="min-w-0">
              <div className="text-muted-foreground text-xs">
                {String(index + 1).padStart(2, "0")}
              </div>
              <div className="truncate font-heading font-semibold text-sm">
                {step.label}
              </div>
            </div>
            {guarded ? (
              <AlertTriangleIcon className="ml-auto text-destructive" />
            ) : (
              <CheckCircle2Icon className="ml-auto text-primary" />
            )}
          </div>
        );
      })}
    </div>
  );
}
