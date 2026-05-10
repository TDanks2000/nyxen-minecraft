import {
  existsSync,
  readdirSync,
  renameSync,
  type Stats,
  statSync,
} from "node:fs";
import { basename, extname, join } from "node:path";
import type {
  GetInstanceContentInput,
  InstanceContent,
  InstanceFileEntry,
  InstanceFileKind,
  LauncherInstance,
  SetInstanceModEnabledInput,
} from "../../shared/types";
import { getLauncherInstance } from "./instances";

const fileExtensions = {
  logs: new Set([".gz", ".log", ".txt"]),
  mods: new Set([".jar"]),
  resourcePacks: new Set([".jar", ".zip"]),
  screenshots: new Set([".jpeg", ".jpg", ".png", ".webp"]),
  shaderPacks: new Set([".jar", ".zip"]),
};

const disabledSuffix = ".disabled";

const getInstanceOrThrow = (instanceId: string): LauncherInstance => {
  const instance = getLauncherInstance(instanceId);

  if (!instance) {
    throw new Error("Launcher instance not found.");
  }

  return instance;
};

const isSafeFileName = (value: string): boolean =>
  value.length > 0 &&
  value === basename(value) &&
  value !== "." &&
  value !== ".." &&
  !value.includes("\\") &&
  !value.includes("\0");

const assertSafeFileName = (value: string): string => {
  const normalized = value.trim();

  if (!isSafeFileName(normalized)) {
    throw new Error("File name is invalid.");
  }

  return normalized;
};

const formatDisplayName = (fileName: string): string => {
  const withoutDisabled = fileName.endsWith(disabledSuffix)
    ? fileName.slice(0, -disabledSuffix.length)
    : fileName;
  const extension = extname(withoutDisabled);
  const withoutExtension = extension
    ? withoutDisabled.slice(0, -extension.length)
    : withoutDisabled;

  return withoutExtension
    .replaceAll(/[-_.]+/g, " ")
    .trim()
    .replace(/\b\w/g, (match) => match.toUpperCase());
};

const toIso = (stats: Stats): string => stats.mtime.toISOString();

const createEntry = ({
  enabled = null,
  fileName,
  folder,
  isDirectory,
  kind,
  stats,
}: {
  enabled?: boolean | null;
  fileName: string;
  folder: string;
  isDirectory: boolean;
  kind: InstanceFileKind;
  stats: Stats;
}): InstanceFileEntry => ({
  displayName: formatDisplayName(fileName),
  enabled,
  extension: isDirectory ? null : extname(fileName).toLowerCase() || null,
  fileName,
  id: `${kind}:${fileName}`,
  isDirectory,
  kind,
  modifiedAt: toIso(stats),
  path: join(folder, fileName),
  sizeBytes: isDirectory ? 0 : stats.size,
});

const listFolderEntries = ({
  allowDirectories = false,
  enabled,
  extensions,
  folder,
  kind,
}: {
  allowDirectories?: boolean;
  enabled?: (fileName: string) => boolean | null;
  extensions?: Set<string>;
  folder: string;
  kind: InstanceFileKind;
}): Array<InstanceFileEntry> => {
  if (!existsSync(folder)) return [];

  return readdirSync(folder, { withFileTypes: true })
    .flatMap((entry) => {
      const fileName = entry.name;

      if (!isSafeFileName(fileName)) return [];

      const isDirectory = entry.isDirectory();
      if (isDirectory && !allowDirectories) return [];
      if (!isDirectory && extensions) {
        const extension = extname(fileName).toLowerCase();
        const matchesDisabledMod =
          kind === "mod" &&
          fileName.toLowerCase().endsWith(`.jar${disabledSuffix}`);

        if (!extensions.has(extension) && !matchesDisabledMod) return [];
      }

      const path = join(folder, fileName);
      const stats = statSync(path);

      return [
        createEntry({
          enabled: enabled?.(fileName) ?? null,
          fileName,
          folder,
          isDirectory,
          kind,
          stats,
        }),
      ];
    })
    .sort((a, b) => a.displayName.localeCompare(b.displayName));
};

const isEnabledModFile = (fileName: string): boolean | null => {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".jar")) return true;
  if (lower.endsWith(".jar.disabled")) return false;
  return null;
};

const getServerListEntry = (
  gameDirectory: string,
): InstanceFileEntry | null => {
  const fileName = "servers.dat";
  const path = join(gameDirectory, fileName);

  if (!existsSync(path)) return null;

  const stats = statSync(path);
  if (!stats.isFile()) return null;

  return createEntry({
    enabled: null,
    fileName,
    folder: gameDirectory,
    isDirectory: false,
    kind: "serverList",
    stats,
  });
};

export const getInstanceContent = ({
  instanceId,
}: GetInstanceContentInput): InstanceContent => {
  const instance = getInstanceOrThrow(instanceId);
  const mods = listFolderEntries({
    enabled: isEnabledModFile,
    extensions: fileExtensions.mods,
    folder: instance.folders.mods,
    kind: "mod",
  }).filter((entry) => entry.enabled !== null);
  const resourcePacks = listFolderEntries({
    allowDirectories: true,
    extensions: fileExtensions.resourcePacks,
    folder: instance.folders.resourcePacks,
    kind: "resourcePack",
  });
  const shaderPacks = listFolderEntries({
    allowDirectories: true,
    extensions: fileExtensions.shaderPacks,
    folder: instance.folders.shaderPacks,
    kind: "shaderPack",
  });
  const screenshots = listFolderEntries({
    extensions: fileExtensions.screenshots,
    folder: instance.folders.screenshots,
    kind: "screenshot",
  }).sort(
    (a, b) =>
      new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime(),
  );
  const logs = listFolderEntries({
    extensions: fileExtensions.logs,
    folder: instance.folders.logs,
    kind: "log",
  }).sort(
    (a, b) =>
      new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime(),
  );
  const worlds = listFolderEntries({
    allowDirectories: true,
    folder: instance.folders.saves,
    kind: "world",
  });

  return {
    counts: {
      disabledMods: mods.filter((entry) => entry.enabled === false).length,
      enabledMods: mods.filter((entry) => entry.enabled === true).length,
      logs: logs.length,
      mods: mods.length,
      resourcePacks: resourcePacks.length,
      screenshots: screenshots.length,
      shaderPacks: shaderPacks.length,
      worlds: worlds.length,
    },
    instanceId: instance.id,
    logs,
    mods,
    refreshedAt: new Date().toISOString(),
    resourcePacks,
    screenshots,
    serverList: getServerListEntry(instance.gameDirectory),
    shaderPacks,
    worlds,
  };
};

export const setInstanceModEnabled = ({
  enabled,
  fileName,
  instanceId,
}: SetInstanceModEnabledInput): InstanceContent => {
  const instance = getInstanceOrThrow(instanceId);
  const sourceFileName = assertSafeFileName(fileName);
  const sourcePath = join(instance.folders.mods, sourceFileName);

  if (!existsSync(sourcePath)) {
    throw new Error("Mod file no longer exists.");
  }

  const currentlyEnabled = isEnabledModFile(sourceFileName);
  if (currentlyEnabled === null) {
    throw new Error("Only .jar mod files can be enabled or disabled.");
  }

  if (currentlyEnabled === enabled) {
    return getInstanceContent({ instanceId });
  }

  const targetFileName = enabled
    ? sourceFileName.slice(0, -disabledSuffix.length)
    : `${sourceFileName}${disabledSuffix}`;
  const targetPath = join(
    instance.folders.mods,
    assertSafeFileName(targetFileName),
  );

  if (existsSync(targetPath)) {
    throw new Error(
      `Cannot rename mod because ${targetFileName} already exists.`,
    );
  }

  renameSync(sourcePath, targetPath);

  return getInstanceContent({ instanceId });
};
