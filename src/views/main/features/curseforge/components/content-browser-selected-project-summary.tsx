import { XIcon } from "lucide-react";
import type {
  CurseForgeCategory,
  CurseForgeProjectSummary,
  ModrinthCategory,
  ModrinthProjectSummary,
} from "@/shared/types";
import { Badge } from "@/views/main/components/ui/badge";
import { Button } from "@/views/main/components/ui/button";
import { ContentBrowserDetailItem } from "@/views/main/features/curseforge/components/content-browser-detail-item";
import type {
  BrowserCategory,
  BrowserProjectSummary,
} from "@/views/main/features/curseforge/components/content-browser-dialog-model";
import {
  formatLoaderList,
  formatProjectHost,
  formatVersionList,
  getAvailabilityLabel,
  getProjectReleaseDate,
  getProjectReleaseLabel,
} from "@/views/main/features/curseforge/components/content-browser-dialog-model";
import {
  getCurseForgeCategoryLabel,
  getVisibleMinecraftVersions,
} from "@/views/main/features/curseforge/curseforge-browser-model";
import type {
  ContentBrowserSource,
  SelectedInstance,
} from "@/views/main/features/curseforge/curseforge-browser-types";
import {
  getModrinthCategoryLabel,
  getVisibleModrinthMinecraftVersions,
} from "@/views/main/features/modrinth/modrinth-browser-model";

type ContentBrowserSelectedProjectSummaryProps = {
  category: BrowserCategory;
  item: BrowserProjectSummary;
  onClear: () => void;
  selectedInstance: SelectedInstance | null;
  source: ContentBrowserSource;
};

export function ContentBrowserSelectedProjectSummary({
  category,
  item,
  onClear,
  selectedInstance,
  source,
}: ContentBrowserSelectedProjectSummaryProps) {
  const versions =
    source === "curseforge"
      ? getVisibleMinecraftVersions(item as CurseForgeProjectSummary, 4)
      : getVisibleModrinthMinecraftVersions(item as ModrinthProjectSummary, 4);
  const categoryLabel =
    source === "curseforge"
      ? getCurseForgeCategoryLabel(category as CurseForgeCategory)
      : getModrinthCategoryLabel(category as ModrinthCategory);
  const sourceLabel = source === "curseforge" ? "CurseForge" : "Modrinth";
  const previewUrl = item.screenshotUrls[0] ?? item.logoUrl;
  const latestFile = item.latestFile;
  const releaseLabel = getProjectReleaseLabel(latestFile);
  const releaseDate = getProjectReleaseDate(item);
  const targetLabel =
    category === "modpacks"
      ? "New instance"
      : (selectedInstance?.name ?? "No instance selected");

  return (
    <div
      className="flex min-w-0 gap-3 rounded-lg border border-border bg-card/70 p-3"
      data-slot="content-browser-selected-project"
    >
      {previewUrl ? (
        <img
          alt=""
          className="hidden h-24 w-36 shrink-0 rounded-md object-cover ring-1 ring-border xl:block"
          src={previewUrl}
        />
      ) : null}
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          <div className="min-w-0 truncate font-heading font-semibold">
            {item.name}
          </div>
          <Badge variant="secondary">{categoryLabel}</Badge>
          <Badge variant="outline">{sourceLabel}</Badge>
          <Badge variant="outline">
            {getAvailabilityLabel({ item, source })}
          </Badge>
        </div>
        <div className="mt-2 grid min-w-0 grid-cols-2 gap-2 xl:grid-cols-3">
          <ContentBrowserDetailItem
            label="Latest file"
            value={latestFile?.fileName || latestFile?.displayName || "Missing"}
          />
          <ContentBrowserDetailItem
            label="Release"
            value={`${releaseLabel} · ${releaseDate}`}
          />
          <ContentBrowserDetailItem
            label="Minecraft"
            value={formatVersionList(versions)}
          />
          <ContentBrowserDetailItem
            label="Loaders"
            value={formatLoaderList(item.modLoaders)}
          />
          <ContentBrowserDetailItem
            label="Install target"
            value={targetLabel}
          />
          <ContentBrowserDetailItem
            label="Project page"
            value={formatProjectHost(item.websiteUrl)}
          />
        </div>
      </div>
      <Button
        aria-label="Close project details"
        className="shrink-0"
        onClick={onClear}
        size="icon-sm"
        variant="ghost"
      >
        <XIcon />
      </Button>
    </div>
  );
}
