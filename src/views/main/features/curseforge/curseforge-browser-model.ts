import type {
  CurseForgeCategory,
  CurseForgeProjectSummary,
  CurseForgeSortField,
  LauncherInstance,
  ModLoader,
} from "@/shared/types";
import type {
  CurseForgeBrowserActionState,
  InstalledContentByCategory,
  InstalledCurseForgeItem,
  SelectedInstance,
} from "@/views/main/features/curseforge/curseforge-browser-types";

type CategoryDefinition = {
  description: string;
  label: string;
  value: CurseForgeCategory;
};

type SortDefinition = {
  label: string;
  value: CurseForgeSortField;
};

export const DEFAULT_CURSEFORGE_CATEGORY: CurseForgeCategory = "mods";

export const CURSEFORGE_CATEGORIES: Array<CategoryDefinition> = [
  {
    description: "Gameplay additions, libraries, utilities, and client mods.",
    label: "Mods",
    value: "mods",
  },
  {
    description: "Ready-made collections with tuned dependencies.",
    label: "Modpacks",
    value: "modpacks",
  },
  {
    description: "Textures, models, UI art, and visual refresh packs.",
    label: "Resource Packs",
    value: "resource-packs",
  },
  {
    description: "Lighting and rendering packs for richer worlds.",
    label: "Shaders",
    value: "shaders",
  },
  {
    description: "Maps, saves, adventures, and shared builds.",
    label: "Worlds",
    value: "worlds",
  },
];

export const CURSEFORGE_SORT_OPTIONS: Array<SortDefinition> = [
  { label: "Popularity", value: "popularity" },
  { label: "Downloads", value: "downloads" },
  { label: "Recently Updated", value: "lastUpdated" },
  { label: "Name", value: "name" },
  { label: "Released", value: "released" },
];

export const CURSEFORGE_LOADER_OPTIONS: Array<{
  label: string;
  value: Exclude<ModLoader, "vanilla">;
}> = [
  { label: "Forge", value: "forge" },
  { label: "Fabric", value: "fabric" },
  { label: "NeoForge", value: "neoforge" },
  { label: "Quilt", value: "quilt" },
];

export const MINECRAFT_VERSION_PATTERN = /^\d+(?:\.\d+)+(?:[-\w.]*)?$/;

export const categorySupportsLoaderFilter = (
  category: CurseForgeCategory,
): boolean => category === "mods" || category === "modpacks";

export const categoryRequiresInstanceTarget = (
  category: CurseForgeCategory,
): boolean => category !== "modpacks";

export const isCurseForgeCategoryAvailable = (
  category: CurseForgeCategory,
  selectedInstance: SelectedInstance | null,
): boolean => !(category === "modpacks" && selectedInstance);

export const getCurseForgeExpectedFileName = (
  item: CurseForgeProjectSummary,
): string | null =>
  item.latestFile?.fileName || item.latestFile?.displayName || null;

export const requiresManualCurseForgeDownload = (
  item: CurseForgeProjectSummary,
): boolean => Boolean(item.latestFile && !item.latestFile.downloadUrl);

export const getCurseForgeCategoryLabel = (
  category: CurseForgeCategory,
): string =>
  CURSEFORGE_CATEGORIES.find((entry) => entry.value === category)?.label ??
  category;

export const toSelectedInstance = (
  instance: LauncherInstance,
): SelectedInstance => ({
  id: instance.id,
  iconUrl: instance.iconUrl,
  loader: instance.loader,
  minecraftVersion: instance.versionId,
  modpackLocked: instance.modpack?.locked ?? false,
  modpackName: instance.modpack?.name ?? null,
  name: instance.name,
});

export const getCurseForgeItemKey = (
  category: CurseForgeCategory,
  item: CurseForgeProjectSummary,
): string => `${category}:${item.id}`;

const normalizeStableId = (
  value: number | string | null | undefined,
): string | null => {
  if (value === null || value === undefined) return null;

  const normalized = String(value).trim();

  return normalized.length > 0 ? normalized : null;
};

export const findInstalledCurseForgeItem = (
  item: CurseForgeProjectSummary,
  category: CurseForgeCategory,
  installedContent: InstalledContentByCategory | undefined,
): InstalledCurseForgeItem | null => {
  const installedItems = installedContent?.[category] ?? [];
  const projectId = normalizeStableId(item.id);
  const fileId = normalizeStableId(item.latestFile?.id);
  const slug = normalizeStableId(item.slug);

  return (
    installedItems.find((installedItem) => {
      if (
        projectId &&
        normalizeStableId(installedItem.projectId) === projectId
      ) {
        return true;
      }

      if (fileId && normalizeStableId(installedItem.fileId) === fileId) {
        return true;
      }

      if (slug && normalizeStableId(installedItem.slug) === slug) {
        return true;
      }

      return false;
    }) ?? null
  );
};

export const hasCurseForgeUpdateAvailable = (
  item: CurseForgeProjectSummary,
  installedItem: InstalledCurseForgeItem | null,
): boolean => {
  const latestFileId = normalizeStableId(item.latestFile?.id);
  const installedFileId = normalizeStableId(installedItem?.fileId);

  return Boolean(
    latestFileId && installedFileId && latestFileId !== installedFileId,
  );
};

const getProjectMinecraftVersions = (
  item: CurseForgeProjectSummary,
): Array<string> => {
  const versions = [
    ...(item.latestFile?.gameVersions ?? []),
    ...item.gameVersions,
  ].filter((version) => MINECRAFT_VERSION_PATTERN.test(version));

  return [...new Set(versions)];
};

export const getVisibleMinecraftVersions = (
  item: CurseForgeProjectSummary,
  limit = 4,
): Array<string> => getProjectMinecraftVersions(item).slice(0, limit);

export const isCurseForgeItemCompatible = (
  item: CurseForgeProjectSummary,
  category: CurseForgeCategory,
  selectedInstance: SelectedInstance | null,
): boolean => {
  if (category === "modpacks") return !selectedInstance;

  if (!selectedInstance) return false;

  const minecraftVersions = getProjectMinecraftVersions(item);
  const supportsMinecraftVersion =
    minecraftVersions.length === 0 ||
    minecraftVersions.includes(selectedInstance.minecraftVersion);

  if (!supportsMinecraftVersion) return false;

  if (!categorySupportsLoaderFilter(category)) return true;

  if (item.modLoaders.length === 0) return true;

  return selectedInstance.loader
    ? item.modLoaders.includes(selectedInstance.loader)
    : false;
};

export const getCurseForgeActionState = ({
  category,
  failed,
  installedItem,
  item,
  pending,
  selectedInstance,
}: {
  category: CurseForgeCategory;
  failed: boolean;
  installedItem: InstalledCurseForgeItem | null;
  item: CurseForgeProjectSummary;
  pending: boolean;
  selectedInstance: SelectedInstance | null;
}): CurseForgeBrowserActionState => {
  if (categoryRequiresInstanceTarget(category) && !selectedInstance) {
    return "select-instance";
  }
  if (failed) return "failed";
  if (pending) return "installing";

  if (category === "mods" && selectedInstance?.modpackLocked) {
    return "managed";
  }

  if (!isCurseForgeItemCompatible(item, category, selectedInstance)) {
    return "incompatible";
  }

  if (installedItem) {
    return hasCurseForgeUpdateAvailable(item, installedItem)
      ? "update-available"
      : "installed";
  }

  return "install";
};

export const formatCurseForgeDownloads = (value: number): string =>
  new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 1,
    notation: "compact",
  }).format(value);

export const formatCurseForgeDate = (value: string | null): string => {
  if (!value) return "Recently updated";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Recently updated";

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
  }).format(date);
};

export const getAuthorLine = (item: CurseForgeProjectSummary): string =>
  item.authors.length > 0 ? item.authors.join(", ") : "Unknown author";
