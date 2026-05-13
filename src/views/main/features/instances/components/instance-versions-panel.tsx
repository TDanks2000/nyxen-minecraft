import type { InstanceContent, LauncherInstance } from "@/shared/types";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/views/main/components/ui/card";
import { formatContentModified } from "@/views/main/features/instances/components/instance-content-format";
import { InstanceRecipeSummaryPanel } from "@/views/main/features/instances/components/instance-recipe-summary-panel";

type InstanceVersionsPanelProps = {
  content: InstanceContent | null;
  instance: LauncherInstance;
};

export function InstanceVersionsPanel({
  content,
  instance,
}: InstanceVersionsPanelProps) {
  return (
    <div className="flex flex-col gap-3">
      <Card>
        <CardHeader>
          <CardTitle>Versions</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 lg:grid-cols-3">
          {[
            ["Minecraft", instance.versionId],
            ["Loader", instance.loader],
            ["Loader version", instance.loaderVersion ?? "Managed"],
            ["Created", formatContentModified(instance.createdAt)],
            ["Updated", formatContentModified(instance.updatedAt)],
            [
              "Content refreshed",
              content
                ? formatContentModified(content.refreshedAt)
                : "Not loaded",
            ],
          ].map(([label, value]) => (
            <div
              className="rounded-lg border border-border bg-background/45 p-3"
              key={label}
            >
              <div className="text-muted-foreground text-xs">{label}</div>
              <div className="mt-1 truncate font-semibold">{value}</div>
            </div>
          ))}
        </CardContent>
      </Card>
      <InstanceRecipeSummaryPanel recipe={content?.recipe ?? null} />
    </div>
  );
}
