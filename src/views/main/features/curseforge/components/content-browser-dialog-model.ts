import type {
  CurseForgeCategory,
  CurseForgeProjectSummary,
  ModLoader,
  ModrinthCategory,
  ModrinthProjectSummary,
} from "@/shared/types";
import {
  formatCurseForgeDate,
  getCurseForgeExpectedFileName,
  requiresManualCurseForgeDownload,
} from "@/views/main/features/curseforge/curseforge-browser-model";
import type {
  ContentBrowserSource,
  CurseForgeBrowserActionState,
} from "@/views/main/features/curseforge/curseforge-browser-types";
import { LOADER_LABELS } from "@/views/main/features/instances/components/instance-format";

export type LoaderFilter = Exclude<ModLoader, "vanilla"> | "all";
export type BrowserCategory = CurseForgeCategory | ModrinthCategory;
export type SelectedProject =
  | {
      category: CurseForgeCategory;
      item: CurseForgeProjectSummary;
      source: "curseforge";
    }
  | {
      category: ModrinthCategory;
      item: ModrinthProjectSummary;
      source: "modrinth";
    };
export type BrowserProjectSummary =
  | CurseForgeProjectSummary
  | ModrinthProjectSummary;
export type ManualInstallRequest = {
  category: CurseForgeCategory;
  item: CurseForgeProjectSummary;
};

export const NO_INSTANCE_VALUE = "none";
export const GRID_SKELETON_KEYS = [
  "grid-loading-a",
  "grid-loading-b",
  "grid-loading-c",
  "grid-loading-d",
  "grid-loading-e",
  "grid-loading-f",
  "grid-loading-g",
  "grid-loading-h",
  "grid-loading-i",
];
export const LIST_SKELETON_KEYS = [
  "list-loading-a",
  "list-loading-b",
  "list-loading-c",
  "list-loading-d",
  "list-loading-e",
  "list-loading-f",
];

const releaseTypeLabel: Record<string, string> = {
  alpha: "Alpha",
  beta: "Beta",
  release: "Release",
  unknown: "Unknown",
};

export function formatProjectHost(url: string | null): string {
  if (!url) return "Project page unavailable";

  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "Project page";
  }
}

export function formatLoaderList(loaders: BrowserProjectSummary["modLoaders"]) {
  if (loaders.length === 0) return "Any loader";

  const visibleLoaders = loaders
    .slice(0, 4)
    .map((loader) => LOADER_LABELS[loader]);
  const suffix =
    loaders.length > visibleLoaders.length
      ? ` +${loaders.length - visibleLoaders.length}`
      : "";

  return `${visibleLoaders.join(", ")}${suffix}`;
}

export function formatVersionList(versions: Array<string>) {
  if (versions.length === 0) return "Version varies";

  const visibleVersions = versions.slice(0, 4);
  const suffix =
    versions.length > visibleVersions.length
      ? ` +${versions.length - visibleVersions.length}`
      : "";

  return `${visibleVersions.join(", ")}${suffix}`;
}

export function getAvailabilityLabel({
  item,
  source,
}: {
  item: BrowserProjectSummary;
  source: ContentBrowserSource;
}) {
  if (!item.latestFile) return "No file metadata";

  if (source === "curseforge") {
    const curseForgeItem = item as CurseForgeProjectSummary;

    if (curseForgeItem.allowDistribution === false) {
      return "Restricted download";
    }

    return requiresManualCurseForgeDownload(curseForgeItem)
      ? "Manual download"
      : "Direct download";
  }

  return "Direct download";
}

export function getProjectReleaseLabel(
  latestFile: BrowserProjectSummary["latestFile"],
): string {
  return latestFile
    ? (releaseTypeLabel[latestFile.releaseType] ?? "Unknown")
    : "Unknown";
}

export function getProjectReleaseDate(item: BrowserProjectSummary): string {
  return item.latestFile?.fileDate
    ? formatCurseForgeDate(item.latestFile.fileDate)
    : formatCurseForgeDate(item.dateModified);
}

export function getManualInstallFileName(item: CurseForgeProjectSummary) {
  return getCurseForgeExpectedFileName(item) ?? "the CurseForge file";
}

export function getDisabledReason({
  actionState,
  category,
  hasFile,
  hasInstallCallback,
  hasManualInstallCallback,
  hasUpdateCallback,
  manualDownloadRequired,
  source,
}: {
  actionState: CurseForgeBrowserActionState;
  category: BrowserCategory;
  hasFile: boolean;
  hasInstallCallback: boolean;
  hasManualInstallCallback: boolean;
  hasUpdateCallback: boolean;
  manualDownloadRequired: boolean;
  source: ContentBrowserSource;
}): string | null {
  if (actionState === "select-instance") {
    return "Select an instance to install content.";
  }

  if (actionState === "incompatible") {
    if (category === "modpacks") {
      return "Modpacks create new instances and cannot be installed into the selected instance.";
    }

    return "This project does not match the selected instance.";
  }

  if (actionState === "installing") return "Action already in progress.";
  if (actionState === "installed") return "This project is already installed.";
  if (actionState === "managed") {
    return "Mods for this instance are managed by its linked modpack.";
  }

  if (
    !hasFile &&
    (actionState === "install" ||
      actionState === "failed" ||
      actionState === "update-available")
  ) {
    return `${source === "curseforge" ? "CurseForge" : "Modrinth"} did not provide file metadata for this project.`;
  }

  if (
    actionState === "update-available" &&
    !hasUpdateCallback &&
    !manualDownloadRequired
  ) {
    return "Updates are not available from this view.";
  }

  if (
    manualDownloadRequired &&
    (actionState === "install" ||
      actionState === "failed" ||
      actionState === "update-available") &&
    !hasManualInstallCallback
  ) {
    return "Manual install scanning is not available from this view.";
  }

  if (
    !manualDownloadRequired &&
    (actionState === "install" || actionState === "failed") &&
    !hasInstallCallback
  ) {
    return "Installs are not available from this view.";
  }

  return null;
}
