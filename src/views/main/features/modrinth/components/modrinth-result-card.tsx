import { ExternalLinkIcon, InfoIcon } from "lucide-react";
import type { KeyboardEvent, MouseEvent } from "react";
import type { ModrinthCategory, ModrinthProjectSummary } from "@/shared/types";
import { Button } from "@/views/main/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/views/main/components/ui/card";
import type {
  ContentBrowserActionState,
  CurseForgeBrowserViewMode,
} from "@/views/main/features/curseforge/curseforge-browser-types";
import { ModrinthProjectBadges } from "@/views/main/features/modrinth/components/modrinth-project-badges";
import { ModrinthProjectImage } from "@/views/main/features/modrinth/components/modrinth-project-image";
import { ModrinthProjectMetadataLine } from "@/views/main/features/modrinth/components/modrinth-project-metadata-line";
import { ModrinthResultActionIcon } from "@/views/main/features/modrinth/components/modrinth-result-action-icon";
import type { InstalledModrinthItem } from "@/views/main/features/modrinth/modrinth-browser-model";
import { cn } from "@/views/main/lib/utils";

type ModrinthResultCardProps = {
  actionDisabledReason: string | null;
  actionState: ContentBrowserActionState;
  category: ModrinthCategory;
  installActionsConfigured: boolean;
  installedItem: InstalledModrinthItem | null;
  item: ModrinthProjectSummary;
  onDetails: () => void;
  onPrimaryAction: () => void;
  selected: boolean;
  viewMode: CurseForgeBrowserViewMode;
};

const CARD_ACTION_SELECTOR =
  "a,button,input,select,textarea,[data-card-action]";

const actionLabelByState: Record<ContentBrowserActionState, string> = {
  failed: "Retry",
  incompatible: "Incompatible",
  install: "Install",
  installed: "Installed",
  installing: "Installing",
  managed: "Managed",
  "select-instance": "Select instance",
  "update-available": "Update",
};

function getActionLabel(
  state: ContentBrowserActionState,
  category: ModrinthCategory,
) {
  if (state === "install" && category === "modpacks") {
    return "Install pack";
  }

  return actionLabelByState[state];
}

export function ModrinthResultCard({
  actionDisabledReason,
  actionState,
  category,
  installActionsConfigured,
  installedItem,
  item,
  onDetails,
  onPrimaryAction,
  selected,
  viewMode,
}: ModrinthResultCardProps) {
  const canRunPrimary = actionState === "install" || actionState === "failed";
  const primaryDisabled =
    installActionsConfigured &&
    (!canRunPrimary || actionDisabledReason !== null);
  const shouldIgnoreCardActivation = (
    event: MouseEvent<HTMLDivElement>,
  ): boolean => {
    const target = event.target;

    return (
      target instanceof Element &&
      target !== event.currentTarget &&
      Boolean(target.closest(CARD_ACTION_SELECTOR))
    );
  };
  const handleCardClick = (event: MouseEvent<HTMLDivElement>) => {
    if (shouldIgnoreCardActivation(event)) return;

    onDetails();
  };
  const handleCardKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.currentTarget !== event.target) return;
    if (event.key !== "Enter" && event.key !== " ") return;

    event.preventDefault();
    onDetails();
  };

  return (
    <Card
      aria-label={`View details for ${item.name}`}
      role="button"
      size="sm"
      tabIndex={0}
      className={cn(
        "min-w-0 cursor-pointer border-border/80 bg-card/80 transition-colors outline-none hover:border-primary/45 hover:bg-card focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
        selected && "border-primary/70 bg-primary/10 ring-1 ring-primary/25",
        viewMode === "list" &&
          "md:grid md:grid-cols-[auto_minmax(0,1fr)] md:gap-0",
      )}
      onClick={handleCardClick}
      onKeyDown={handleCardKeyDown}
    >
      <CardHeader
        className={cn(
          "min-w-0",
          viewMode === "list" &&
            "md:col-start-1 md:row-span-3 md:w-80 md:border-r md:border-border",
        )}
      >
        <div className="flex min-w-0 gap-3">
          <ModrinthProjectImage category={category} item={item} />
          <div className="min-w-0">
            <CardTitle className="truncate">{item.name}</CardTitle>
            <CardDescription className="mt-1 line-clamp-2">
              {item.summary || "Modrinth project"}
            </CardDescription>
          </div>
        </div>
        <CardAction data-card-action>
          <Button
            aria-label={`View details for ${item.name}`}
            onClick={onDetails}
            size="icon-sm"
            variant={selected ? "secondary" : "ghost"}
          >
            <InfoIcon />
          </Button>
        </CardAction>
      </CardHeader>

      <CardContent className="flex min-w-0 flex-col gap-3">
        <ModrinthProjectMetadataLine item={item} />
        <ModrinthProjectBadges
          category={category}
          installedItem={installedItem}
          item={item}
        />
      </CardContent>

      <CardFooter className="justify-between gap-3">
        <div className="min-w-0 text-xs text-muted-foreground">
          {item.latestFile ? (
            <span className="block truncate">
              Latest: {item.latestFile.displayName}
            </span>
          ) : (
            <span className="block truncate">No file metadata</span>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2" data-card-action>
          {installActionsConfigured ? (
            <Button
              disabled={primaryDisabled}
              onClick={onPrimaryAction}
              size="sm"
              title={actionDisabledReason ?? undefined}
              variant={actionState === "failed" ? "destructive" : "default"}
            >
              <ModrinthResultActionIcon
                category={category}
                state={actionState}
              />
              {getActionLabel(actionState, category)}
            </Button>
          ) : (
            <Button onClick={onDetails} size="sm" variant="outline">
              <ExternalLinkIcon data-icon="inline-start" />
              Details
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}
