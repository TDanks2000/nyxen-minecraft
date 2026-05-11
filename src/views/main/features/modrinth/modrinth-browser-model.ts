import type {
  InstanceContent,
  InstanceFileEntry,
  ModLoader,
  ModrinthCategory,
  ModrinthProjectSummary,
  ModrinthSortField,
} from "@/shared/types";
import {
  categoryRequiresInstanceTarget,
  categorySupportsLoaderFilter,
  MINECRAFT_VERSION_PATTERN,
} from "@/views/main/features/curseforge/curseforge-browser-model";
import type {
  ContentBrowserActionState,
  SelectedInstance,
} from "@/views/main/features/curseforge/curseforge-browser-types";

type CategoryDefinition = {
  description: string;
  label: string;
  value: ModrinthCategory;
};

type SortDefinition = {
  label: string;
  value: ModrinthSortField;
};

export type InstalledModrinthItem = {
  category: ModrinthCategory;
  fileName: string;
  name: string;
};

export const DEFAULT_MODRINTH_CATEGORY: ModrinthCategory = "mods";

export const MODRINTH_CATEGORIES: Array<CategoryDefinition> = [
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
];

export const MODRINTH_SORT_OPTIONS: Array<SortDefinition> = [
  { label: "Relevance", value: "relevance" },
  { label: "Downloads", value: "downloads" },
  { label: "Followers", value: "follows" },
  { label: "Recently Updated", value: "updated" },
  { label: "Newest", value: "newest" },
];

export const MODRINTH_LOADER_OPTIONS: Array<{
  label: string;
  value: Exclude<ModLoader, "vanilla">;
}> = [
  { label: "Forge", value: "forge" },
  { label: "Fabric", value: "fabric" },
  { label: "NeoForge", value: "neoforge" },
  { label: "Quilt", value: "quilt" },
];

export const categorySupportsModrinthLoaderFilter =
  categorySupportsLoaderFilter;

export const isModrinthCategoryAvailable = (
  category: ModrinthCategory,
  selectedInstance: SelectedInstance | null,
): boolean => !(category === "modpacks" && selectedInstance);

export const getModrinthCategoryLabel = (category: ModrinthCategory): string =>
  MODRINTH_CATEGORIES.find((entry) => entry.value === category)?.label ??
  category;

export const getModrinthItemKey = (
  category: ModrinthCategory,
  item: ModrinthProjectSummary,
): string => `${category}:${item.id}`;

const getProjectMinecraftVersions = (
  item: ModrinthProjectSummary,
): Array<string> => {
  const versions = [
    ...(item.latestFile?.gameVersions ?? []),
    ...item.gameVersions,
  ].filter((version) => MINECRAFT_VERSION_PATTERN.test(version));

  return [...new Set(versions)];
};

export const getVisibleModrinthMinecraftVersions = (
  item: ModrinthProjectSummary,
  limit = 4,
): Array<string> => getProjectMinecraftVersions(item).slice(0, limit);

export const isModrinthItemCompatible = (
  item: ModrinthProjectSummary,
  category: ModrinthCategory,
  selectedInstance: SelectedInstance | null,
): boolean => {
  if (category === "modpacks") return !selectedInstance;

  if (!selectedInstance) return false;

  const minecraftVersions = getProjectMinecraftVersions(item);
  const supportsMinecraftVersion =
    minecraftVersions.length === 0 ||
    minecraftVersions.includes(selectedInstance.minecraftVersion);

  if (!supportsMinecraftVersion) return false;

  if (!categorySupportsModrinthLoaderFilter(category)) return true;

  if (item.modLoaders.length === 0) return true;

  return selectedInstance.loader
    ? item.modLoaders.includes(selectedInstance.loader)
    : false;
};

const categoryFiles = (
  category: ModrinthCategory,
  content: InstanceContent | null | undefined,
): Array<InstanceFileEntry> => {
  if (!content) return [];
  if (category === "mods") return content.mods;
  if (category === "resource-packs") return content.resourcePacks;
  if (category === "shaders") return content.shaderPacks;

  return [];
};

export const findInstalledModrinthItem = (
  item: ModrinthProjectSummary,
  category: ModrinthCategory,
  content: InstanceContent | null | undefined,
): InstalledModrinthItem | null => {
  const latestFileName = item.latestFile?.fileName?.trim();

  if (!latestFileName) return null;

  const installedFile = categoryFiles(category, content).find(
    (entry) => entry.fileName === latestFileName,
  );

  if (!installedFile) return null;

  return {
    category,
    fileName: installedFile.fileName,
    name: installedFile.displayName,
  };
};

export const getModrinthActionState = ({
  category,
  failed,
  installedItem,
  item,
  pending,
  selectedInstance,
}: {
  category: ModrinthCategory;
  failed: boolean;
  installedItem: InstalledModrinthItem | null;
  item: ModrinthProjectSummary;
  pending: boolean;
  selectedInstance: SelectedInstance | null;
}): ContentBrowserActionState => {
  if (categoryRequiresInstanceTarget(category) && !selectedInstance) {
    return "select-instance";
  }
  if (failed) return "failed";
  if (pending) return "installing";

  if (category === "mods" && selectedInstance?.modpackLocked) {
    return "managed";
  }

  if (!isModrinthItemCompatible(item, category, selectedInstance)) {
    return "incompatible";
  }

  if (installedItem) {
    return "installed";
  }

  return "install";
};
