import { CheckCircle2Icon, ShieldAlertIcon } from "lucide-react";
import type { InstanceRecipeSummary, LauncherInstance } from "@/shared/types";
import { Badge } from "@/views/main/components/ui/badge";
import { Button } from "@/views/main/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/views/main/components/ui/card";
import { openInstancePath } from "@/views/main/features/instances/components/instance-content-format";

type InstanceWarningPanelProps = {
  contentError: string | null;
  disabledModsCount: number;
  instance: LauncherInstance;
  recipe: InstanceRecipeSummary | null;
};

export function InstanceWarningPanel({
  disabledModsCount,
  contentError,
  instance,
  recipe,
}: InstanceWarningPanelProps) {
  const warnings = [
    ...(contentError ? [contentError] : []),
    ...(recipe?.status === "drifted"
      ? [
          `${recipe.counts.added + recipe.counts.changed + recipe.counts.missing} recipe drift item${
            recipe.counts.added +
              recipe.counts.changed +
              recipe.counts.missing ===
            1
              ? ""
              : "s"
          } detected`,
        ]
      : []),
    ...(recipe?.status === "incomplete"
      ? [
          `${recipe.counts.optionalMissing} optional recipe file${
            recipe.counts.optionalMissing === 1 ? "" : "s"
          } skipped during install`,
        ]
      : []),
    ...(disabledModsCount > 0
      ? [
          `${disabledModsCount} mod${disabledModsCount === 1 ? "" : "s"} disabled`,
        ]
      : []),
  ];

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldAlertIcon className="size-4 text-amber-400" />
          Warnings
        </CardTitle>
        <CardAction>
          <Badge variant={warnings.length > 0 ? "default" : "outline"}>
            {warnings.length}
          </Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {warnings.length === 0 ? (
          <div className="flex items-center gap-2 text-muted-foreground text-xs">
            <CheckCircle2Icon className="size-3.5 text-primary" />
            No local content warnings.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {warnings.map((warning) => (
              <div
                className="flex items-start gap-2 text-muted-foreground text-xs"
                key={warning}
              >
                <ShieldAlertIcon className="mt-0.5 size-3.5 shrink-0 text-amber-400" />
                <span>{warning}</span>
              </div>
            ))}
          </div>
        )}
        <Button
          onClick={() => openInstancePath(instance.folders.logs)}
          size="sm"
          variant="outline"
        >
          Open Logs
        </Button>
      </CardContent>
    </Card>
  );
}
