import { CheckCircle2Icon, FileDownIcon, FileTextIcon } from "lucide-react";
import type { ComponentProps } from "react";
import { useState } from "react";
import { toast } from "sonner";
import type { InstanceRecipeSummary } from "@/shared/types";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/views/main/components/ui/alert";
import { Badge } from "@/views/main/components/ui/badge";
import { Button } from "@/views/main/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/views/main/components/ui/card";
import { formatContentModified } from "@/views/main/features/instances/components/instance-content-format";
import { openLocalPath } from "@/views/main/lib/open-local-path";
import { rpc } from "@/views/main/lib/rpc";

const getRecipeStatusLabel = (
  status: InstanceRecipeSummary["status"],
): string => {
  switch (status) {
    case "clean":
      return "Verified";
    case "drifted":
      return "Drift Detected";
    case "incomplete":
      return "Incomplete";
    case "weaklyVerified":
      return "Weakly Verified";
    default:
      return "Unknown";
  }
};

const getRecipeStatusVariant = (
  status: InstanceRecipeSummary["status"],
): ComponentProps<typeof Badge>["variant"] => {
  if (status === "drifted") return "destructive";
  if (status === "clean") return "default";
  if (status === "incomplete") return "secondary";
  return "outline";
};

const getRecipeSourceLabel = (
  source: InstanceRecipeSummary["revision"]["source"],
): string => {
  if (source.kind === "manual") return "Manual";
  if (source.kind === "curseforge") return "CurseForge";
  return "Modrinth";
};

export function InstanceRecipeSummaryPanel({
  recipe,
}: {
  recipe: InstanceRecipeSummary | null;
}) {
  const [exportingRecipe, setExportingRecipe] = useState(false);

  const exportRecipe = () => {
    if (!recipe || exportingRecipe) return;

    void (async () => {
      setExportingRecipe(true);

      try {
        const result = await rpc.requestProxy.exportInstanceRecipe({
          instanceId: recipe.revision.instanceId,
        });
        const warningCount = result.recipe.warnings.reduce(
          (total, warning) => total + warning.count,
          0,
        );

        await openLocalPath(result.path, {
          failureMessage: "Recipe exported, but the file could not be opened.",
          successMessage:
            warningCount > 0
              ? `Recipe exported with ${warningCount} portability warning${
                  warningCount === 1 ? "" : "s"
                }`
              : "Recipe exported",
        });
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to export recipe",
        );
      } finally {
        setExportingRecipe(false);
      }
    })();
  };

  if (!recipe) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recipe</CardTitle>
          <CardAction>
            <Badge variant="outline">Not recorded</Badge>
          </CardAction>
        </CardHeader>
        <CardContent>
          <Alert>
            <FileTextIcon />
            <AlertTitle>No recipe revision</AlertTitle>
            <AlertDescription>
              This instance has local metadata, but no reproducible recipe has
              been recorded yet.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const source = recipe.revision.source;
  const sourceDetail =
    source.kind === "manual"
      ? "Manual snapshot"
      : [source.version, source.fileName].filter(Boolean).join(" / ");
  const visibleDrift = recipe.drift.slice(0, 5);
  const hiddenDriftCount = Math.max(
    0,
    recipe.drift.length - visibleDrift.length,
  );
  const metrics = [
    ["Managed files", recipe.counts.managedFiles],
    ["Overrides", recipe.counts.overrides],
    ["Missing", recipe.counts.missing],
    ["Changed", recipe.counts.changed],
    ["Added", recipe.counts.added],
    ["Weak", recipe.counts.weaklyVerified],
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recipe</CardTitle>
        <CardAction className="flex items-center gap-2">
          <Button
            disabled={exportingRecipe}
            onClick={exportRecipe}
            size="sm"
            type="button"
            variant="outline"
          >
            <FileDownIcon data-icon="inline-start" />
            Export
          </Button>
          <Badge variant={getRecipeStatusVariant(recipe.status)}>
            {getRecipeStatusLabel(recipe.status)}
          </Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="grid gap-3 lg:grid-cols-3">
          <div className="rounded-lg border border-border bg-background/45 p-3 lg:col-span-2">
            <div className="text-muted-foreground text-xs">Source</div>
            <div className="mt-1 truncate font-semibold">
              {getRecipeSourceLabel(source)}
            </div>
            <div className="mt-1 truncate text-muted-foreground text-xs">
              {sourceDetail || recipe.revision.id}
            </div>
          </div>
          <div className="rounded-lg border border-border bg-background/45 p-3">
            <div className="text-muted-foreground text-xs">Recorded</div>
            <div className="mt-1 truncate font-semibold">
              {formatContentModified(recipe.revision.createdAt)}
            </div>
            <div className="mt-1 truncate text-muted-foreground text-xs">
              {recipe.revision.runtime.minecraftVersionId}
            </div>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-6">
          {metrics.map(([label, value]) => (
            <div
              className="rounded-md border border-border bg-background/35 px-3 py-2"
              key={label}
            >
              <div className="text-muted-foreground text-xs">{label}</div>
              <div className="mt-0.5 truncate font-heading font-semibold">
                {value}
              </div>
            </div>
          ))}
        </div>

        {visibleDrift.length > 0 ? (
          <div className="flex flex-col gap-2 rounded-lg border border-border bg-background/35 p-3">
            {visibleDrift.map((item) => (
              <div
                className="flex min-w-0 items-center gap-2 text-xs"
                key={`${item.status}:${item.path}`}
              >
                <Badge
                  variant={
                    item.status === "changed" ||
                    item.status === "missing" ||
                    item.status === "added"
                      ? "destructive"
                      : "outline"
                  }
                >
                  {item.status}
                </Badge>
                <span className="truncate font-mono text-muted-foreground">
                  {item.path}
                </span>
              </div>
            ))}
            {hiddenDriftCount > 0 ? (
              <div className="text-muted-foreground text-xs">
                {hiddenDriftCount} more item
                {hiddenDriftCount === 1 ? "" : "s"} not shown
              </div>
            ) : null}
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-lg border border-border bg-background/35 p-3 text-muted-foreground text-xs">
            <CheckCircle2Icon className="size-3.5 text-primary" />
            No managed file drift detected.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
