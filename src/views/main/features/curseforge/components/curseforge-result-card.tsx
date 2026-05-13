import { ExternalLinkIcon, InfoIcon } from "lucide-react";
import type { KeyboardEvent, MouseEvent } from "react";
import type {
  CurseForgeCategory,
  CurseForgeProjectSummary,
} from "@/shared/types";
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
import { CurseForgeProjectBadges } from "@/views/main/features/curseforge/components/curseforge-project-badges";
import { CurseForgeProjectImage } from "@/views/main/features/curseforge/components/curseforge-project-image";
import { CurseForgeProjectMetadataLine } from "@/views/main/features/curseforge/components/curseforge-project-metadata-line";
import { CurseForgeResultActionIcon } from "@/views/main/features/curseforge/components/curseforge-result-action-icon";
import type {
  CurseForgeBrowserActionState,
  CurseForgeBrowserViewMode,
  InstalledCurseForgeItem,
} from "@/views/main/features/curseforge/curseforge-browser-types";
import { cn } from "@/views/main/lib/utils";

type CurseForgeResultCardProps = {
  actionDisabledReason: string | null;
  actionState: CurseForgeBrowserActionState;
  category: CurseForgeCategory;
  installActionsConfigured: boolean;
  installedItem: InstalledCurseForgeItem | null;
  item: CurseForgeProjectSummary;
  manualDownloadRequired: boolean;
  onDetails: () => void;
  onPrimaryAction: () => void;
  onSecondaryAction?: () => void;
  selected: boolean;
  viewMode: CurseForgeBrowserViewMode;
};

const CARD_ACTION_SELECTOR =
  "a,button,input,select,textarea,[data-card-action]";

const actionLabelByState: Record<CurseForgeBrowserActionState, string> = {
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
  state: CurseForgeBrowserActionState,
  category: CurseForgeCategory,
  manualDownloadRequired: boolean,
) {
  if (manualDownloadRequired && state === "update-available") {
    return "Manual update";
  }

  if (manualDownloadRequired && state === "install") {
    return "Manual install";
  }

  if (state === "install" && category === "modpacks") {
    return "Install pack";
  }

  return actionLabelByState[state];
}

export function CurseForgeResultCard({
  actionDisabledReason,
  actionState,
  category,
  installActionsConfigured,
  installedItem,
  item,
  manualDownloadRequired,
  onDetails,
  onPrimaryAction,
  onSecondaryAction,
  selected,
  viewMode,
}: CurseForgeResultCardProps) {
  const canRunPrimary =
    actionState === "install" ||
    actionState === "failed" ||
    actionState === "update-available";
  const primaryDisabled =
    installActionsConfigured &&
    (!canRunPrimary || actionDisabledReason !== null);
  const showRemove = Boolean(
    installActionsConfigured && installedItem && onSecondaryAction,
  );
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
          <CurseForgeProjectImage category={category} item={item} />
          <div className="min-w-0">
            <CardTitle className="truncate">{item.name}</CardTitle>
            <CardDescription className="mt-1 line-clamp-2">
              {item.summary || "CurseForge project"}
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
        <CurseForgeProjectMetadataLine item={item} />
        <CurseForgeProjectBadges
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
          {showRemove ? (
            <Button onClick={onSecondaryAction} size="sm" variant="outline">
              Remove
            </Button>
          ) : null}
          {installActionsConfigured ? (
            <Button
              disabled={primaryDisabled}
              onClick={onPrimaryAction}
              size="sm"
              title={actionDisabledReason ?? undefined}
              variant={actionState === "failed" ? "destructive" : "default"}
            >
              <CurseForgeResultActionIcon
                category={category}
                manualDownloadRequired={manualDownloadRequired}
                state={actionState}
              />
              {getActionLabel(actionState, category, manualDownloadRequired)}
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
