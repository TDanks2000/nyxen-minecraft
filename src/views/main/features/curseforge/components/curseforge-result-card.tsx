import {
  AlertTriangleIcon,
  CalendarDaysIcon,
  CheckIcon,
  DownloadIcon,
  ExternalLinkIcon,
  PackageIcon,
  RefreshCcwIcon,
  UserRoundIcon,
} from "lucide-react";
import type {
  CurseForgeCategory,
  CurseForgeProjectSummary,
} from "@/shared/types";
import { Badge } from "@/views/main/components/ui/badge";
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
import {
  formatCurseForgeDate,
  formatCurseForgeDownloads,
  getAuthorLine,
  getCurseForgeCategoryLabel,
  getVisibleMinecraftVersions,
  requiresManualCurseForgeDownload,
} from "@/views/main/features/curseforge/curseforge-browser-model";
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

const actionLabelByState: Record<CurseForgeBrowserActionState, string> = {
  failed: "Retry",
  incompatible: "Incompatible",
  install: "Install",
  installed: "Installed",
  installing: "Installing",
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

function ActionIcon({
  category,
  manualDownloadRequired,
  state,
}: {
  category: CurseForgeCategory;
  manualDownloadRequired: boolean;
  state: CurseForgeBrowserActionState;
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
  if (manualDownloadRequired) {
    return <ExternalLinkIcon data-icon="inline-start" />;
  }
  if (category === "modpacks") return <PackageIcon data-icon="inline-start" />;

  return <DownloadIcon data-icon="inline-start" />;
}

function ProjectImage({
  category,
  item,
}: {
  category: CurseForgeCategory;
  item: CurseForgeProjectSummary;
}) {
  if (item.logoUrl) {
    return (
      <img
        alt=""
        className="size-14 rounded-md object-cover ring-1 ring-border"
        src={item.logoUrl}
      />
    );
  }

  return (
    <div
      aria-hidden="true"
      className="flex size-14 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground ring-1 ring-border"
    >
      <PackageIcon />
      <span className="sr-only">{getCurseForgeCategoryLabel(category)}</span>
    </div>
  );
}

function MetadataLine({ item }: { item: CurseForgeProjectSummary }) {
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-muted-foreground text-xs">
      <span className="inline-flex min-w-0 items-center gap-1">
        <UserRoundIcon className="size-3.5 shrink-0" />
        <span className="truncate">{getAuthorLine(item)}</span>
      </span>
      <span className="inline-flex items-center gap-1">
        <DownloadIcon className="size-3.5 shrink-0" />
        {formatCurseForgeDownloads(item.downloadCount)}
      </span>
      <span className="inline-flex items-center gap-1">
        <CalendarDaysIcon className="size-3.5 shrink-0" />
        {formatCurseForgeDate(item.dateModified)}
      </span>
    </div>
  );
}

function ProjectBadges({
  category,
  installedItem,
  item,
}: {
  category: CurseForgeCategory;
  installedItem: InstalledCurseForgeItem | null;
  item: CurseForgeProjectSummary;
}) {
  const versions = getVisibleMinecraftVersions(item, 3);
  const loaders = item.modLoaders.slice(0, 3);

  return (
    <div className="flex flex-wrap gap-1.5">
      <Badge variant="secondary">{getCurseForgeCategoryLabel(category)}</Badge>
      {installedItem ? <Badge variant="default">Installed</Badge> : null}
      {requiresManualCurseForgeDownload(item) ? (
        <Badge variant="outline">Manual download</Badge>
      ) : null}
      {versions.map((version) => (
        <Badge key={version} variant="outline">
          {version}
        </Badge>
      ))}
      {loaders.map((loader) => (
        <Badge key={loader} variant="outline">
          {loader}
        </Badge>
      ))}
    </div>
  );
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

  return (
    <Card
      size="sm"
      className={cn(
        "min-w-0 border-border/80 bg-card/80 transition-colors hover:border-primary/45 hover:bg-card",
        selected && "border-primary/70 bg-primary/10 ring-1 ring-primary/25",
        viewMode === "list" &&
          "md:grid md:grid-cols-[auto_minmax(0,1fr)] md:gap-0",
      )}
    >
      <CardHeader
        className={cn(
          "min-w-0",
          viewMode === "list" &&
            "md:col-start-1 md:row-span-3 md:w-80 md:border-r md:border-border",
        )}
      >
        <div className="flex min-w-0 gap-3">
          <ProjectImage category={category} item={item} />
          <div className="min-w-0">
            <CardTitle className="truncate">{item.name}</CardTitle>
            <CardDescription className="mt-1 line-clamp-2">
              {item.summary || "CurseForge project"}
            </CardDescription>
          </div>
        </div>
        <CardAction>
          <Button
            aria-label={`View details for ${item.name}`}
            onClick={onDetails}
            size="icon-sm"
            variant={selected ? "secondary" : "ghost"}
          >
            <ExternalLinkIcon />
          </Button>
        </CardAction>
      </CardHeader>

      <CardContent className="flex min-w-0 flex-col gap-3">
        <MetadataLine item={item} />
        <ProjectBadges
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
        <div className="flex shrink-0 items-center gap-2">
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
              <ActionIcon
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
