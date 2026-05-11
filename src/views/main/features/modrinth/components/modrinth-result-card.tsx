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
import type { ModrinthCategory, ModrinthProjectSummary } from "@/shared/types";
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
} from "@/views/main/features/curseforge/curseforge-browser-model";
import type {
  ContentBrowserActionState,
  CurseForgeBrowserViewMode,
} from "@/views/main/features/curseforge/curseforge-browser-types";
import {
  getModrinthCategoryLabel,
  getVisibleModrinthMinecraftVersions,
  type InstalledModrinthItem,
} from "@/views/main/features/modrinth/modrinth-browser-model";
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

function ActionIcon({
  category,
  state,
}: {
  category: ModrinthCategory;
  state: ContentBrowserActionState;
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
  if (state === "managed") {
    return <PackageIcon data-icon="inline-start" />;
  }
  if (category === "modpacks") return <PackageIcon data-icon="inline-start" />;

  return <DownloadIcon data-icon="inline-start" />;
}

function ProjectImage({
  category,
  item,
}: {
  category: ModrinthCategory;
  item: ModrinthProjectSummary;
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
      <span className="sr-only">{getModrinthCategoryLabel(category)}</span>
    </div>
  );
}

function MetadataLine({ item }: { item: ModrinthProjectSummary }) {
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-muted-foreground text-xs">
      <span className="inline-flex min-w-0 items-center gap-1">
        <UserRoundIcon className="size-3.5 shrink-0" />
        <span className="truncate">
          {item.authors.length > 0 ? item.authors.join(", ") : "Unknown author"}
        </span>
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
  category: ModrinthCategory;
  installedItem: InstalledModrinthItem | null;
  item: ModrinthProjectSummary;
}) {
  const versions = getVisibleModrinthMinecraftVersions(item, 3);
  const loaders = item.modLoaders.slice(0, 3);

  return (
    <div className="flex flex-wrap gap-1.5">
      <Badge variant="secondary">{getModrinthCategoryLabel(category)}</Badge>
      <Badge variant="outline">Modrinth</Badge>
      {installedItem ? <Badge variant="default">Installed</Badge> : null}
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
              {item.summary || "Modrinth project"}
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
          {installActionsConfigured ? (
            <Button
              disabled={primaryDisabled}
              onClick={onPrimaryAction}
              size="sm"
              title={actionDisabledReason ?? undefined}
              variant={actionState === "failed" ? "destructive" : "default"}
            >
              <ActionIcon category={category} state={actionState} />
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
