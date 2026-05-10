import { randomUUID } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  type Stats,
  statSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, extname, join } from "node:path";
import type {
  CurseForgeCategory,
  DownloadCurseForgeFileInput,
  DownloadCurseForgeFileResult,
  GetInstanceContentInput,
  InstallDownloadedCurseForgeFileInput,
  InstallDownloadedCurseForgeFileResult,
  InstalledCurseForgeFile,
  InstanceContent,
  InstanceFileEntry,
  InstanceFileKind,
  LauncherInstance,
  SetInstanceModEnabledInput,
} from "../../shared/types";
import { getLauncherInstance } from "./instances";
import { ensurePrivateDirectory, getLauncherDirectories } from "./paths";

const fileExtensions = {
  logs: new Set([".gz", ".log", ".txt"]),
  mods: new Set([".jar"]),
  resourcePacks: new Set([".jar", ".zip"]),
  screenshots: new Set([".jpeg", ".jpg", ".png", ".webp"]),
  shaderPacks: new Set([".jar", ".zip"]),
};

const disabledSuffix = ".disabled";
const curseForgeMetadataFileName = "curseforge-content.json";
const maxCurseForgeDownloadBytes = 512 * 1024 * 1024;

type DownloadFetcher = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

type DownloadCurseForgeFileOptions = {
  fetcher?: DownloadFetcher;
  maxBytes?: number;
  requestTimeoutMs?: number;
};

type InstallCurseForgeFileDataOptions = {
  data: Uint8Array;
  fileName: string;
};

const curseForgeCategories: Array<CurseForgeCategory> = [
  "mods",
  "modpacks",
  "resource-packs",
  "shaders",
  "worlds",
];

const allowedCurseForgeExtensions: Record<CurseForgeCategory, Set<string>> = {
  mods: new Set([".jar"]),
  modpacks: new Set([".zip"]),
  "resource-packs": new Set([".jar", ".zip"]),
  shaders: new Set([".jar", ".zip"]),
  worlds: new Set([".mcworld", ".zip"]),
};

const fallbackExtensionByCategory: Record<CurseForgeCategory, string> = {
  mods: ".jar",
  modpacks: ".zip",
  "resource-packs": ".zip",
  shaders: ".zip",
  worlds: ".zip",
};

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

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const optionalString = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim() ? value.trim() : undefined;

const toInstalledCurseForgeFile = (
  value: unknown,
  category: CurseForgeCategory,
): InstalledCurseForgeFile | null => {
  if (!isRecord(value)) return null;

  const fileId = optionalString(value.fileId);
  const fileName = optionalString(value.fileName);
  const installedAt = optionalString(value.installedAt);
  const name = optionalString(value.name);
  const projectId = optionalString(value.projectId);

  if (!fileId || !fileName || !installedAt || !name || !projectId) {
    return null;
  }

  if (!isSafeFileName(fileName)) return null;

  return {
    category,
    fileId,
    fileName,
    installedAt,
    name,
    projectId,
    slug: optionalString(value.slug),
    version: optionalString(value.version),
  };
};

const getCurseForgeMetadataPath = (instance: LauncherInstance): string =>
  join(instance.folders.metadata, curseForgeMetadataFileName);

const readCurseForgeMetadata = (
  instance: LauncherInstance,
): InstanceContent["curseForge"] => {
  const path = getCurseForgeMetadataPath(instance);

  if (!existsSync(path)) return {};

  let parsed: unknown;

  try {
    parsed = JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return {};
  }

  if (!isRecord(parsed)) return {};

  const metadata: InstanceContent["curseForge"] = {};

  for (const category of curseForgeCategories) {
    const entries = parsed[category];
    if (!Array.isArray(entries)) continue;

    const installed = entries.flatMap((entry) => {
      const item = toInstalledCurseForgeFile(entry, category);
      return item ? [item] : [];
    });

    if (installed.length > 0) {
      metadata[category] = installed;
    }
  }

  return metadata;
};

const writeCurseForgeMetadata = (
  instance: LauncherInstance,
  metadata: InstanceContent["curseForge"],
): void => {
  const path = getCurseForgeMetadataPath(instance);
  mkdirSync(dirname(path), { recursive: true });

  const tempPath = `${path}.write-${process.pid}-${randomUUID()}.tmp`;

  try {
    writeFileSync(tempPath, `${JSON.stringify(metadata, null, 2)}\n`, {
      flag: "wx",
    });
    renameSync(tempPath, path);
  } finally {
    if (existsSync(tempPath)) {
      unlinkSync(tempPath);
    }
  }
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

const getCurseForgeTargetFolder = (
  category: CurseForgeCategory,
  instance: LauncherInstance | null,
): string => {
  if (category === "modpacks") {
    const folder = join(
      getLauncherDirectories().downloads,
      "curseforge",
      "modpacks",
    );
    ensurePrivateDirectory(folder);
    return folder;
  }

  if (!instance) {
    throw new Error("Select an instance before downloading this content.");
  }

  switch (category) {
    case "mods":
      return instance.folders.mods;
    case "resource-packs":
      return instance.folders.resourcePacks;
    case "shaders":
      return instance.folders.shaderPacks;
    case "worlds":
      return instance.folders.saves;
    default:
      throw new Error("CurseForge category is not supported.");
  }
};

const sanitizeCurseForgeFileName = (
  input: DownloadCurseForgeFileInput,
): string => {
  const fallbackName = `${input.projectSlug || input.projectId}-${input.file.id}${
    fallbackExtensionByCategory[input.category]
  }`;
  const rawName = input.file.fileName || input.file.displayName || fallbackName;
  const baseName = basename(rawName.replaceAll("\\", "/"));
  const sanitized = Array.from(baseName, (character) =>
    character.charCodeAt(0) < 32 || '<>:"|?*'.includes(character)
      ? "-"
      : character,
  )
    .join("")
    .replaceAll(/\s+/g, " ")
    .trim()
    .replaceAll(/^\.+/g, "");
  const fileName = sanitized || fallbackName;
  const extension = extname(fileName).toLowerCase();

  if (!allowedCurseForgeExtensions[input.category].has(extension)) {
    throw new Error(
      `${getCurseForgeCategoryLabel(input.category)} downloads must use ${[
        ...allowedCurseForgeExtensions[input.category],
      ].join(" or ")} files.`,
    );
  }

  return assertSafeFileName(fileName);
};

const getCurseForgeCategoryLabel = (category: CurseForgeCategory): string => {
  if (category === "mods") return "Mod";
  if (category === "modpacks") return "Modpack";
  if (category === "resource-packs") return "Resource pack";
  if (category === "shaders") return "Shader";
  return "World";
};

const fetchCurseForgeDownload = async (
  input: DownloadCurseForgeFileInput,
  options: DownloadCurseForgeFileOptions,
): Promise<Uint8Array> => {
  const downloadUrl = input.file.downloadUrl?.trim();

  if (!downloadUrl) {
    throw new Error("CurseForge did not provide a download URL for this file.");
  }

  const url = new URL(downloadUrl);

  if (url.protocol !== "https:") {
    throw new Error("CurseForge download URL must use HTTPS.");
  }

  const controller = new AbortController();
  const timeoutMs = Math.max(1, options.requestTimeoutMs ?? 60_000);
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const fetcher = options.fetcher ?? fetch;
  let response: Response;

  try {
    response = await fetcher(url, { signal: controller.signal });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(
        `CurseForge download timed out after ${Math.round(timeoutMs / 1000)} seconds.`,
      );
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    throw new Error(
      `CurseForge download failed: ${response.status} ${response.statusText}`,
    );
  }

  const maxBytes = Math.max(1, options.maxBytes ?? maxCurseForgeDownloadBytes);
  const contentLength = Number(response.headers.get("content-length") ?? "");

  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    throw new Error("CurseForge file is too large to download.");
  }

  const data = new Uint8Array(await response.arrayBuffer());

  if (data.byteLength > maxBytes) {
    throw new Error("CurseForge file is too large to download.");
  }

  return data;
};

const writeDownloadedFile = (path: string, data: Uint8Array): void => {
  mkdirSync(dirname(path), { recursive: true });

  const tempPath = `${path}.download-${process.pid}-${randomUUID()}.tmp`;

  try {
    writeFileSync(tempPath, data, { flag: "wx" });
    renameSync(tempPath, path);
  } finally {
    if (existsSync(tempPath)) {
      unlinkSync(tempPath);
    }
  }
};

const getDefaultDownloadsDirectory = (): string => join(homedir(), "Downloads");

const normalizeDownloadsDirectory = (directory: string | undefined): string => {
  const normalized = directory?.trim();

  if (normalized) {
    if (normalized.includes("\0")) {
      throw new Error("Downloads folder is invalid.");
    }

    return normalized;
  }

  return getDefaultDownloadsDirectory();
};

const sameCurseForgeProject = (
  item: InstalledCurseForgeFile,
  input: DownloadCurseForgeFileInput,
): boolean =>
  item.projectId === String(input.projectId) ||
  Boolean(input.projectSlug && item.slug === input.projectSlug);

const removeReplacedCurseForgeFile = (
  folder: string,
  existing: InstalledCurseForgeFile | undefined,
  nextFileName: string,
): void => {
  if (!existing || existing.fileName === nextFileName) return;
  if (!isSafeFileName(existing.fileName)) return;

  const path = join(folder, existing.fileName);
  if (existsSync(path)) {
    unlinkSync(path);
  }
};

const installCurseForgeFileData = (
  input: DownloadCurseForgeFileInput,
  { data, fileName }: InstallCurseForgeFileDataOptions,
): DownloadCurseForgeFileResult => {
  const category = input.category;
  const instance =
    category === "modpacks" ? null : getInstanceOrThrow(input.instanceId ?? "");
  const folder = getCurseForgeTargetFolder(category, instance);
  const path = join(folder, fileName);
  const installedItem: InstalledCurseForgeFile = {
    category,
    fileId: String(input.file.id),
    fileName,
    installedAt: new Date().toISOString(),
    name: input.projectName.trim() || input.file.displayName || fileName,
    projectId: String(input.projectId),
    slug: input.projectSlug?.trim() || undefined,
    version: input.file.displayName || undefined,
  };

  if (!instance) {
    writeDownloadedFile(path, data);
    return {
      category,
      content: null,
      fileName,
      installedItem,
      path,
    };
  }

  const metadata = readCurseForgeMetadata(instance);
  const currentEntries = metadata[category] ?? [];
  const existing = currentEntries.find((item) =>
    sameCurseForgeProject(item, input),
  );

  removeReplacedCurseForgeFile(folder, existing, fileName);
  writeDownloadedFile(path, data);

  metadata[category] = [
    installedItem,
    ...currentEntries.filter((item) => !sameCurseForgeProject(item, input)),
  ];
  writeCurseForgeMetadata(instance, metadata);

  return {
    category,
    content: getInstanceContent({ instanceId: instance.id }),
    fileName,
    installedItem,
    path,
  };
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
    curseForge: readCurseForgeMetadata(instance),
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

export const downloadCurseForgeFile = async (
  input: DownloadCurseForgeFileInput,
  options: DownloadCurseForgeFileOptions = {},
): Promise<DownloadCurseForgeFileResult> => {
  const fileName = sanitizeCurseForgeFileName(input);
  const data = await fetchCurseForgeDownload(input, options);

  return installCurseForgeFileData(input, { data, fileName });
};

export const installDownloadedCurseForgeFile = (
  input: InstallDownloadedCurseForgeFileInput,
  options: Pick<DownloadCurseForgeFileOptions, "maxBytes"> = {},
): InstallDownloadedCurseForgeFileResult => {
  const fileName = sanitizeCurseForgeFileName(input);
  const downloadsDirectory = normalizeDownloadsDirectory(
    input.downloadsDirectory,
  );
  const sourcePath = join(downloadsDirectory, fileName);

  if (!existsSync(sourcePath)) {
    throw new Error(
      `Download ${fileName} to ${downloadsDirectory}, then scan again.`,
    );
  }

  const stats = statSync(sourcePath);

  if (!stats.isFile()) {
    throw new Error(`${fileName} is not a file.`);
  }

  const maxBytes = Math.max(1, options.maxBytes ?? maxCurseForgeDownloadBytes);

  if (stats.size > maxBytes) {
    throw new Error("CurseForge file is too large to install.");
  }

  return {
    ...installCurseForgeFileData(input, {
      data: new Uint8Array(readFileSync(sourcePath)),
      fileName,
    }),
    sourcePath,
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
