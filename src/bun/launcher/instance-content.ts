import {
  chmodSync,
  closeSync,
  copyFileSync,
  cpSync,
  type Dirent,
  existsSync,
  mkdirSync,
  openSync,
  readdirSync,
  readFileSync,
  readSync,
  renameSync,
  rmSync,
  type Stats,
  statSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { readdir as readdirAsync, stat as statAsync } from "node:fs/promises";
import { homedir } from "node:os";
import {
  basename,
  dirname,
  extname,
  isAbsolute,
  join,
  relative,
  resolve,
} from "node:path";
import type {
  CreateInstanceServerInput,
  CreateInstanceServerResult,
  CurseForgeCategory,
  DeleteInstanceServerInput,
  DeleteInstanceServerResult,
  DownloadCurseForgeFileInput,
  DownloadCurseForgeFileResult,
  DownloadModrinthFileInput,
  DownloadModrinthFileResult,
  GetInstanceContentInput,
  GetInstanceLogFileInput,
  GetInstanceModpackUpdateInput,
  InstallDownloadedCurseForgeFileInput,
  InstallDownloadedCurseForgeFileResult,
  InstalledCurseForgeFile,
  InstanceContent,
  InstanceFileEntry,
  InstanceFileKind,
  InstanceLogFilePreview,
  InstanceLogFolder,
  InstanceLogLine,
  InstanceLogLineLevel,
  InstanceLogLineType,
  InstanceModpackUpdate,
  InstanceServerFileCandidate,
  InstanceServerManager,
  InstanceServerRequirement,
  InstanceServerWorkspace,
  LauncherInstance,
  LauncherInstanceModpack,
  ModrinthCategory,
  SetInstanceModEnabledInput,
  UpdateInstanceModpackInput,
  UpdateInstanceModpackResult,
} from "../../shared/types";
import type { CurseForgeOptions } from "./curseforge";
import { getCurseForgeProject, getCurseForgeProjectFile } from "./curseforge";
import {
  getInstanceRecipeSummary,
  readInstanceRecipeRevision,
  writeCurseForgeRecipeRevision,
  writeModrinthRecipeRevision,
} from "./instance-recipes";
import {
  createLauncherInstance,
  getLauncherInstance,
  setLauncherInstanceModpack,
  updateLauncherInstance,
} from "./instances";
import { readLaunchAttemptRecords } from "./launch-diagnostics";
import { resolveModLoader } from "./mod-loaders";
import type { ModrinthOptions } from "./modrinth";
import { ensurePrivateDirectory, getLauncherDirectories } from "./paths";
import { getMinecraftVersionDetails } from "./versions";
import { listZipEntries, readZipJson } from "./zip";

const fileExtensions = {
  logs: new Set([".gz", ".log", ".txt"]),
  mods: new Set([".jar"]),
  resourcePacks: new Set([".jar", ".zip"]),
  screenshots: new Set([".jpeg", ".jpg", ".png", ".webp"]),
  shaderPacks: new Set([".jar", ".zip"]),
};

const disabledSuffix = ".disabled";
const curseForgeMetadataFileName = "curseforge-content.json";
const curseForgeModpackManifestFileName = "curseforge-modpack-manifest.json";
const maxCurseForgeDownloadBytes = 512 * 1024 * 1024;
const maxCurseForgeMediaBytes = 12 * 1024 * 1024;
const maxLogFolders = 80;
const maxLogFiles = 400;
const maxLogFolderDepth = 2;
const defaultLogPreviewBytes = 256 * 1024;
const defaultLogPreviewLines = 700;
const maxLogPreviewBytes = 1024 * 1024;
const maxLogPreviewLines = 2000;
const maxCompressedLogBytes = 2 * 1024 * 1024;
const maxLaunchAttemptsInContent = 5;
const serverWorkspaceFolderName = "servers";
const serverMetadataFileName = "nyxen-server.json";
const serverFileExtensions = {
  config: new Set([".json", ".toml", ".cfg", ".conf", ".properties", ".txt"]),
  mods: new Set([".jar"]),
  resourcePacks: new Set([".jar", ".zip"]),
};

type DownloadCurseForgeFileOptions = CurseForgeOptions & {
  maxBytes?: number;
  onProgress?: (event: CurseForgeDownloadProgressEvent) => void;
};

type DownloadModrinthFileOptions = ModrinthOptions & {
  maxBytes?: number;
  onProgress?: (event: CurseForgeDownloadProgressEvent) => void;
};

export type CurseForgeDownloadProgressItem = {
  downloadedBytes?: number;
  error?: string | null;
  id: string;
  kind?: string;
  label?: string;
  progress?: number | null;
  status?: "queued" | "running" | "completed" | "failed" | "skipped";
  totalBytes?: number | null;
};

export type CurseForgeDownloadProgressEvent = {
  activeLabel?: string | null;
  item?: CurseForgeDownloadProgressItem;
  items?: Array<CurseForgeDownloadProgressItem>;
  totalItems?: number;
};

type InstallCurseForgeFileDataOptions = {
  data: Uint8Array;
  fileName: string;
  replacingInstance?: LauncherInstance;
};

type CurseForgeModpackManifestFile = {
  fileID: number;
  projectID: number;
  required: boolean;
};

export type MissingCurseForgeModpackDependency = {
  fileID: number;
  projectID: number;
};

type ParsedCurseForgeModpackManifest = {
  files: Array<CurseForgeModpackManifestFile>;
  minecraftVersion: string;
  modLoader: LauncherInstance["loader"];
  modLoaderVersion: string | null;
  name: string | null;
  overrides: string | null;
  recommendedMemoryMb: number | null;
  version: string | null;
};

type SkippedCurseForgeModpackDependency = Pick<
  InstalledCurseForgeFile,
  "category" | "fileId" | "fileName" | "projectId"
>;

type ModrinthModpackManifestFile = {
  downloads: Array<string>;
  fileSize: number | null;
  hashes: {
    sha1?: string;
    sha512?: string;
  };
  path: string;
};

type ParsedModrinthModpackManifest = {
  files: Array<ModrinthModpackManifestFile>;
  minecraftVersion: string;
  modLoader: LauncherInstance["loader"];
  modLoaderVersion: string | null;
  name: string | null;
  version: string | null;
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

const allowedModrinthExtensions: Record<ModrinthCategory, Set<string>> = {
  mods: new Set([".jar"]),
  modpacks: new Set([".mrpack"]),
  "resource-packs": new Set([".jar", ".zip"]),
  shaders: new Set([".jar", ".zip"]),
};

const fallbackModrinthExtensionByCategory: Record<ModrinthCategory, string> = {
  mods: ".jar",
  modpacks: ".mrpack",
  "resource-packs": ".zip",
  shaders: ".zip",
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

const optionalNumber = (value: unknown): number | undefined =>
  typeof value === "number" && Number.isInteger(value) ? value : undefined;

const parseModpackLoader = (
  manifest: Record<string, unknown>,
): Pick<ParsedCurseForgeModpackManifest, "modLoader" | "modLoaderVersion"> => {
  const minecraft = isRecord(manifest.minecraft) ? manifest.minecraft : {};
  const loaders = Array.isArray(minecraft.modLoaders)
    ? minecraft.modLoaders.filter(isRecord)
    : [];
  const selectedLoader =
    loaders.find((loader) => loader.primary === true) ?? loaders[0];
  const rawId = optionalString(selectedLoader?.id);

  if (!rawId) {
    return { modLoader: "vanilla", modLoaderVersion: null };
  }

  const normalized = rawId.toLowerCase();
  const knownLoaders: Array<Exclude<LauncherInstance["loader"], "vanilla">> = [
    "neoforge",
    "fabric",
    "forge",
    "quilt",
  ];
  const loader = knownLoaders.find(
    (candidate) =>
      normalized === candidate || normalized.startsWith(`${candidate}-`),
  );

  if (!loader) {
    return { modLoader: "vanilla", modLoaderVersion: null };
  }

  const version = rawId.slice(loader.length).replace(/^-+/, "").trim();

  return {
    modLoader: loader,
    modLoaderVersion: version || null,
  };
};

const parseCurseForgeModpackManifest = (
  archiveData: Uint8Array,
): ParsedCurseForgeModpackManifest => {
  const parsed = readZipJson(archiveData, "manifest.json");

  if (!isRecord(parsed)) {
    throw new Error("CurseForge modpack is missing manifest.json.");
  }

  const minecraft = isRecord(parsed.minecraft) ? parsed.minecraft : {};
  const minecraftVersion = optionalString(minecraft.version);

  if (!minecraftVersion) {
    throw new Error(
      "CurseForge modpack manifest is missing Minecraft version.",
    );
  }

  const files = Array.isArray(parsed.files)
    ? parsed.files.flatMap((entry) => {
        if (!isRecord(entry)) return [];

        const projectID = optionalNumber(entry.projectID);
        const fileID = optionalNumber(entry.fileID);

        if (!projectID || !fileID) return [];

        return [
          {
            fileID,
            projectID,
            required: entry.required !== false,
          },
        ];
      })
    : [];
  const { modLoader, modLoaderVersion } = parseModpackLoader(parsed);
  const overrides = optionalString(parsed.overrides);

  return {
    files,
    minecraftVersion,
    modLoader,
    modLoaderVersion,
    name: optionalString(parsed.name) ?? null,
    overrides: overrides && isSafeZipPath(overrides) ? overrides : null,
    recommendedMemoryMb: optionalNumber(minecraft.recommendedRam) ?? null,
    version: optionalString(parsed.version) ?? null,
  };
};

const parseModrinthPackLoader = (
  dependencies: Record<string, unknown>,
): Pick<ParsedModrinthModpackManifest, "modLoader" | "modLoaderVersion"> => {
  const loaderDefinitions: Array<{
    key: string;
    loader: Exclude<LauncherInstance["loader"], "vanilla">;
  }> = [
    { key: "neoforge", loader: "neoforge" },
    { key: "fabric-loader", loader: "fabric" },
    { key: "forge", loader: "forge" },
    { key: "quilt-loader", loader: "quilt" },
  ];

  for (const definition of loaderDefinitions) {
    const version = optionalString(dependencies[definition.key]);

    if (version) {
      return {
        modLoader: definition.loader,
        modLoaderVersion: version,
      };
    }
  }

  return { modLoader: "vanilla", modLoaderVersion: null };
};

const parseModrinthModpackManifest = (
  archiveData: Uint8Array,
): ParsedModrinthModpackManifest => {
  const parsed = readZipJson(archiveData, "modrinth.index.json");

  if (!isRecord(parsed)) {
    throw new Error("Modrinth modpack is missing modrinth.index.json.");
  }

  const dependencies = isRecord(parsed.dependencies) ? parsed.dependencies : {};
  const minecraftVersion = optionalString(dependencies.minecraft);

  if (!minecraftVersion) {
    throw new Error("Modrinth modpack manifest is missing Minecraft version.");
  }

  const files = Array.isArray(parsed.files)
    ? parsed.files.flatMap((entry) => {
        if (!isRecord(entry)) return [];

        const path = optionalString(entry.path);
        const downloads = Array.isArray(entry.downloads)
          ? entry.downloads.filter(
              (download): download is string =>
                typeof download === "string" && download.trim().length > 0,
            )
          : [];
        const hashes = isRecord(entry.hashes) ? entry.hashes : {};

        if (!path || !isSafeZipPath(path) || downloads.length === 0) {
          return [];
        }

        return [
          {
            downloads,
            fileSize: optionalNumber(entry.fileSize) ?? null,
            hashes: {
              sha1: optionalString(hashes.sha1),
              sha512: optionalString(hashes.sha512),
            },
            path,
          },
        ];
      })
    : [];
  const { modLoader, modLoaderVersion } = parseModrinthPackLoader(dependencies);

  return {
    files,
    minecraftVersion,
    modLoader,
    modLoaderVersion,
    name: optionalString(parsed.name) ?? null,
    version: optionalString(parsed.versionId) ?? null,
  };
};

const isSafeZipPath = (value: string): boolean =>
  value
    .split("/")
    .filter(Boolean)
    .every((segment) => isSafeFileName(segment));

const isPathInside = (parent: string, child: string): boolean => {
  const relativePath = relative(resolve(parent), resolve(child));

  return (
    relativePath === "" ||
    (!relativePath.startsWith("..") && !isAbsolute(relativePath))
  );
};

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

const readRequiredModpackManifestFiles = (
  manifestPath: string,
): Array<CurseForgeModpackManifestFile> => {
  if (!existsSync(manifestPath)) return [];

  let parsed: unknown;

  try {
    parsed = JSON.parse(readFileSync(manifestPath, "utf8"));
  } catch {
    return [];
  }

  if (!isRecord(parsed) || !Array.isArray(parsed.files)) return [];

  return parsed.files.flatMap((entry) => {
    if (!isRecord(entry) || entry.required === false) return [];

    const projectID = optionalNumber(entry.projectID);
    const fileID = optionalNumber(entry.fileID);

    return projectID && fileID ? [{ fileID, projectID, required: true }] : [];
  });
};

export const getMissingRequiredModpackDependencies = (
  instance: LauncherInstance,
): Array<MissingCurseForgeModpackDependency> => {
  if (!instance.modpack?.locked) return [];

  const requiredFiles = readRequiredModpackManifestFiles(
    instance.modpack.manifestPath,
  );

  if (requiredFiles.length === 0) return [];

  const installedFiles = new Set(
    Object.values(readCurseForgeMetadata(instance))
      .flatMap((files) => files ?? [])
      .map((file) => `${file.projectId}:${file.fileId}`),
  );

  return requiredFiles
    .filter((file) => !installedFiles.has(`${file.projectID}:${file.fileID}`))
    .map(({ fileID, projectID }) => ({ fileID, projectID }));
};

const writeCurseForgeMetadata = (
  instance: LauncherInstance,
  metadata: InstanceContent["curseForge"],
): void => {
  const path = getCurseForgeMetadataPath(instance);
  mkdirSync(dirname(path), { recursive: true });

  const tempPath = `${path}.write-${process.pid}-${crypto.randomUUID()}.tmp`;

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

const monthNames = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

const formatLogDate = (year: string, month: string, day: string): string => {
  const monthIndex = Number(month) - 1;
  const monthName = monthNames[monthIndex] ?? month;

  return `${monthName} ${Number(day)}, ${year}`;
};

const formatLogTime = (hour: string, minute: string, second: string): string =>
  `${hour}:${minute}:${second}`;

const formatLogDisplayName = (fileName: string, folderId: string): string => {
  const lower = fileName.toLowerCase();
  const uncompressed = lower.endsWith(".gz") ? fileName.slice(0, -3) : fileName;
  const archiveMatch = uncompressed.match(
    /^(\d{4})-(\d{2})-(\d{2})-(\d+)\.log$/i,
  );
  const crashMatch = uncompressed.match(
    /^crash-(\d{4})-(\d{2})-(\d{2})_(\d{2})\.(\d{2})\.(\d{2})-(client|server)\.txt$/i,
  );

  if (lower === "latest.log") return "Live Session";
  if (lower === "debug.log") return "Debug Session";

  if (archiveMatch) {
    const [, year, month, day, run] = archiveMatch;
    if (!year || !month || !day || !run) return formatDisplayName(fileName);
    return `${formatLogDate(year, month, day)} Run ${Number(run)}`;
  }

  if (crashMatch) {
    const [, year, month, day, hour, minute, second, side] = crashMatch;
    if (!year || !month || !day || !hour || !minute || !second || !side) {
      return formatDisplayName(fileName);
    }

    return `${side[0]?.toUpperCase()}${side.slice(1)} Crash ${formatLogDate(
      year,
      month,
      day,
    )} ${formatLogTime(hour, minute, second)}`;
  }

  if (folderId === "crash-reports") {
    return `Crash Report ${formatDisplayName(fileName)}`;
  }

  return formatDisplayName(fileName);
};

const formatLogFolderDisplayName = (
  folderId: string,
  relativeFolder: string,
): string => {
  if (!relativeFolder) {
    return folderId === "crash-reports" ? "Crash Reports" : "Game Logs";
  }

  return formatDisplayName(basename(relativeFolder));
};

const toIso = (stats: Stats): string => stats.mtime.toISOString();

const createEntry = ({
  displayName,
  enabled = null,
  fileName,
  folder,
  isDirectory,
  kind,
  relativePath,
  stats,
}: {
  displayName?: string;
  enabled?: boolean | null;
  fileName: string;
  folder: string;
  isDirectory: boolean;
  kind: InstanceFileKind;
  relativePath?: string;
  stats: Stats;
}): InstanceFileEntry => ({
  displayName: displayName ?? formatDisplayName(fileName),
  enabled,
  extension: isDirectory ? null : extname(fileName).toLowerCase() || null,
  fileName,
  id: relativePath ? `${kind}:${relativePath}` : `${kind}:${fileName}`,
  isDirectory,
  kind,
  modifiedAt: toIso(stats),
  path: join(folder, fileName),
  relativePath,
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

const listFolderEntriesAsync = async ({
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
}): Promise<Array<InstanceFileEntry>> => {
  if (!existsSync(folder)) return [];

  let dirents: Array<Dirent>;
  try {
    dirents = await readdirAsync(folder, { withFileTypes: true });
  } catch {
    return [];
  }

  const filtered = dirents.filter((entry) => {
    const fileName = entry.name;
    if (!isSafeFileName(fileName)) return false;

    const isDirectory = entry.isDirectory();
    if (isDirectory && !allowDirectories) return false;

    if (!isDirectory && extensions) {
      const extension = extname(fileName).toLowerCase();
      const matchesDisabledMod =
        kind === "mod" &&
        fileName.toLowerCase().endsWith(`.jar${disabledSuffix}`);
      if (!extensions.has(extension) && !matchesDisabledMod) return false;
    }

    return true;
  });

  const results = await Promise.all(
    filtered.map(async (entry): Promise<InstanceFileEntry | null> => {
      const fileName = entry.name;
      const isDirectory = entry.isDirectory();
      const path = join(folder, fileName);

      try {
        const stats = await statAsync(path);
        return createEntry({
          enabled: enabled?.(fileName) ?? null,
          fileName,
          folder,
          isDirectory,
          kind,
          stats: stats as unknown as Stats,
        });
      } catch {
        return null;
      }
    }),
  );

  return results
    .filter((entry): entry is InstanceFileEntry => entry !== null)
    .sort((a, b) => a.displayName.localeCompare(b.displayName));
};

const createLogFileEntry = ({
  fileName,
  folder,
  folderId,
  relativeFilePath,
  stats,
}: {
  fileName: string;
  folder: string;
  folderId: string;
  relativeFilePath: string;
  stats: Stats;
}): InstanceFileEntry =>
  createEntry({
    displayName: formatLogDisplayName(fileName, folderId),
    enabled: null,
    fileName,
    folder,
    isDirectory: false,
    kind: "log",
    relativePath: `${folderId}/${relativeFilePath}`,
    stats,
  });

const getLogRootDefinitions = (
  instance: LauncherInstance,
): Array<{ id: string; label: string; path: string }> => [
  { id: "logs", label: "Game Logs", path: instance.folders.logs },
  {
    id: "crash-reports",
    label: "Crash Reports",
    path: join(instance.gameDirectory, "crash-reports"),
  },
];

const isLogFileName = (fileName: string): boolean =>
  fileExtensions.logs.has(extname(fileName).toLowerCase());

const listInstanceLogFolders = (
  instance: LauncherInstance,
): Array<InstanceLogFolder> => {
  const folders: Array<InstanceLogFolder> = [];
  let indexedFiles = 0;

  for (const root of getLogRootDefinitions(instance)) {
    if (!existsSync(root.path)) continue;
    if (folders.length >= maxLogFolders || indexedFiles >= maxLogFiles) break;

    const visit = (folder: string, relativeFolder: string, depth: number) => {
      if (folders.length >= maxLogFolders || indexedFiles >= maxLogFiles) {
        return;
      }

      let entries: Array<{
        isDirectory: () => boolean;
        isFile: () => boolean;
        name: string;
      }>;

      try {
        entries = readdirSync(folder, { withFileTypes: true });
      } catch {
        return;
      }

      const fileEntries: Array<InstanceFileEntry> = [];
      const childFolders: Array<{ name: string; path: string }> = [];

      for (const entry of entries) {
        if (!isSafeFileName(entry.name)) continue;

        const path = join(folder, entry.name);

        if (entry.isDirectory()) {
          if (depth < maxLogFolderDepth) {
            childFolders.push({ name: entry.name, path });
          }
          continue;
        }

        if (!entry.isFile() || !isLogFileName(entry.name)) continue;
        if (indexedFiles >= maxLogFiles) break;

        let stats: Stats;

        try {
          stats = statSync(path);
        } catch {
          continue;
        }

        const relativeFilePath = relativeFolder
          ? `${relativeFolder}/${entry.name}`
          : entry.name;

        fileEntries.push(
          createLogFileEntry({
            fileName: entry.name,
            folder,
            folderId: root.id,
            relativeFilePath,
            stats,
          }),
        );
        indexedFiles += 1;
      }

      if (fileEntries.length > 0) {
        const folderId = relativeFolder
          ? `${root.id}/${relativeFolder}`
          : root.id;
        folders.push({
          displayName:
            relativeFolder === ""
              ? root.label
              : formatLogFolderDisplayName(root.id, relativeFolder),
          files: fileEntries.sort(
            (a, b) =>
              new Date(b.modifiedAt).getTime() -
              new Date(a.modifiedAt).getTime(),
          ),
          id: folderId,
          path: folder,
        });
      }

      for (const child of childFolders.sort((a, b) =>
        a.name.localeCompare(b.name),
      )) {
        visit(
          child.path,
          relativeFolder ? `${relativeFolder}/${child.name}` : child.name,
          depth + 1,
        );
      }
    };

    visit(root.path, "", 0);
  }

  return folders;
};

const normalizeLogPreviewBytes = (value: number | undefined): number =>
  Math.min(
    maxLogPreviewBytes,
    Math.max(1, Math.floor(value ?? defaultLogPreviewBytes)),
  );

const normalizeLogPreviewLines = (value: number | undefined): number =>
  Math.min(
    maxLogPreviewLines,
    Math.max(1, Math.floor(value ?? defaultLogPreviewLines)),
  );

const normalizeLogLevel = (value: string | undefined): InstanceLogLineLevel => {
  switch (value?.toLowerCase()) {
    case "debug":
      return "debug";
    case "error":
      return "error";
    case "fatal":
      return "fatal";
    case "info":
      return "info";
    case "trace":
      return "trace";
    case "warn":
    case "warning":
      return "warn";
    default:
      return "unknown";
  }
};

type LogLineParts = {
  level: InstanceLogLineLevel;
  message: string;
  source: string | null;
  thread: string | null;
  timestamp: string | null;
};

type LogLineClassification = {
  groupLabel: string | null;
  groupSeed: string | null;
  type: InstanceLogLineType;
};

type LogParseContext = {
  groupKey: string | null;
  groupLabel: string | null;
  level: InstanceLogLineLevel;
  source: string | null;
  thread: string | null;
};

const normalizeLogSource = (value: string | undefined): string | null => {
  const normalized = value?.trim().replace(/\/+$/g, "");
  return normalized ? normalized : null;
};

const parseBracketLogLine = (raw: string): LogLineParts | null => {
  const bracketMatch = raw.match(
    /^\[(?<timestamp>[^\]]+)] \[(?<thread>[^/\]]+)(?:\/(?<level>[A-Za-z]+))?](?: \[(?<source>[^\]]+)])?:? ?(?<message>.*)$/,
  );

  if (!bracketMatch?.groups) return null;

  return {
    level: normalizeLogLevel(bracketMatch.groups.level),
    message: bracketMatch.groups.message ?? "",
    source: normalizeLogSource(bracketMatch.groups.source),
    thread: bracketMatch.groups.thread?.trim() || null,
    timestamp: bracketMatch.groups.timestamp?.trim() || null,
  };
};

const parseLooseLogLine = (raw: string): LogLineParts | null => {
  const looseMatch = raw.match(
    /^(?<timestamp>\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}(?:[.,]\d+)?|\d{2}:\d{2}:\d{2}(?:[.,]\d+)?)\s+\[(?<thread>[^/\]]+)(?:\/(?<level>[A-Za-z]+))?](?:\s+\[(?<source>[^\]]+)])?:?\s*(?<message>.*)$/,
  );

  if (!looseMatch?.groups) return null;

  return {
    level: normalizeLogLevel(looseMatch.groups.level),
    message: looseMatch.groups.message ?? "",
    source: normalizeLogSource(looseMatch.groups.source),
    thread: looseMatch.groups.thread?.trim() || null,
    timestamp: looseMatch.groups.timestamp?.trim() || null,
  };
};

const parseRawLogParts = (raw: string): LogLineParts => {
  const parsed = parseBracketLogLine(raw) ?? parseLooseLogLine(raw);

  if (parsed) return parsed;

  const levelMatch = raw.match(/\b(DEBUG|ERROR|FATAL|INFO|TRACE|WARN)\b/i);

  return {
    level: normalizeLogLevel(levelMatch?.[1]),
    message: raw,
    source: null,
    thread: null,
    timestamp: null,
  };
};

const exceptionNamePattern =
  /\b((?:[a-z_][\w$]*\.)*[A-Z][\w$]*(?:Exception|Error|Throwable))\b/;

const getExceptionName = (value: string): string | null =>
  value.match(exceptionNamePattern)?.[1] ?? null;

const getLogLineTypeLabel = (type: InstanceLogLineType): string => {
  switch (type) {
    case "auth":
      return "Authentication";
    case "crash":
      return "Crash";
    case "exception":
      return "Exception";
    case "game":
      return "Game";
    case "graphics":
      return "Graphics";
    case "io":
      return "File I/O";
    case "java":
      return "Java";
    case "loader":
      return "Loader";
    case "mixin":
      return "Mixin";
    case "mod":
      return "Mod";
    case "network":
      return "Network";
    case "resource":
      return "Resource";
    case "stackTrace":
      return "Stack Trace";
    default:
      return "Raw";
  }
};

const classifyLogLine = ({
  level,
  message,
  raw,
  source,
  thread,
}: LogLineParts & { raw: string }): LogLineClassification => {
  const trimmed = message.trim();
  const searchable = [source, trimmed].join(" ").toLowerCase();
  const rawSearchable = [source, thread, trimmed, raw].join(" ").toLowerCase();
  const exceptionName = getExceptionName(trimmed) ?? getExceptionName(raw);

  if (
    /^---- minecraft crash report ----$/i.test(trimmed) ||
    /^description:/i.test(trimmed) ||
    rawSearchable.includes("crash report")
  ) {
    return { groupLabel: "Crash Report", groupSeed: "crash", type: "crash" };
  }

  if (
    searchable.includes("mixin") ||
    searchable.includes("injection failure") ||
    searchable.includes("refmap")
  ) {
    return { groupLabel: "Mixin", groupSeed: "mixin", type: "mixin" };
  }

  if (
    searchable.includes("fabric loader") ||
    searchable.includes("forge") ||
    searchable.includes("neoforge") ||
    searchable.includes("quilt loader") ||
    searchable.includes("modlauncher") ||
    searchable.includes("launchwrapper")
  ) {
    return { groupLabel: "Loader", groupSeed: "loader", type: "loader" };
  }

  if (
    searchable.includes("mod file") ||
    searchable.includes("mod id") ||
    searchable.includes("mod ") ||
    searchable.includes("mods ")
  ) {
    return { groupLabel: "Mod", groupSeed: "mod", type: "mod" };
  }

  if (
    searchable.includes("missing texture") ||
    searchable.includes("resource") ||
    searchable.includes("resourcepack") ||
    searchable.includes("data pack") ||
    searchable.includes("model") ||
    searchable.includes("recipe") ||
    searchable.includes("tag ")
  ) {
    return { groupLabel: "Resource", groupSeed: "resource", type: "resource" };
  }

  if (
    searchable.includes("opengl") ||
    searchable.includes("glfw") ||
    searchable.includes("shader") ||
    searchable.includes("render") ||
    searchable.includes("gpu")
  ) {
    return { groupLabel: "Graphics", groupSeed: "graphics", type: "graphics" };
  }

  if (
    searchable.includes("unsupportedclassversionerror") ||
    searchable.includes("outofmemoryerror") ||
    searchable.includes("could not reserve enough space") ||
    searchable.includes("invalid maximum heap size") ||
    searchable.includes("unrecognized vm option") ||
    searchable.includes("java runtime") ||
    searchable.includes("java version") ||
    searchable.includes("jvm")
  ) {
    return { groupLabel: "Java", groupSeed: "java", type: "java" };
  }

  if (
    searchable.includes("authentication") ||
    searchable.includes("authlib") ||
    searchable.includes("microsoft") ||
    searchable.includes("xbox") ||
    searchable.includes("login") ||
    searchable.includes("session server")
  ) {
    return { groupLabel: "Authentication", groupSeed: "auth", type: "auth" };
  }

  if (
    searchable.includes("network") ||
    searchable.includes("socket") ||
    searchable.includes("connection") ||
    searchable.includes("packet") ||
    searchable.includes("server")
  ) {
    return { groupLabel: "Network", groupSeed: "network", type: "network" };
  }

  if (
    searchable.includes("failed to read") ||
    searchable.includes("failed to write") ||
    searchable.includes("could not save") ||
    searchable.includes("file not found") ||
    searchable.includes("nosuchfile") ||
    searchable.includes("accessdenied") ||
    searchable.includes("directory")
  ) {
    return { groupLabel: "File I/O", groupSeed: "io", type: "io" };
  }

  if (
    exceptionName ||
    /^caused by:/i.test(trimmed) ||
    /^suppressed:/i.test(trimmed)
  ) {
    const label =
      exceptionName ??
      trimmed.replace(/^(caused by|suppressed):\s*/i, "").split(":")[0] ??
      "Exception";
    return { groupLabel: label, groupSeed: label, type: "exception" };
  }

  if (level === "unknown" && trimmed.length === 0) {
    return { groupLabel: null, groupSeed: null, type: "unknown" };
  }

  return {
    groupLabel: level === "warn" ? "Game Warning" : null,
    groupSeed: level === "warn" ? "game-warning" : null,
    type: level === "unknown" ? "unknown" : "game",
  };
};

const isStackTraceContinuation = (raw: string): boolean =>
  /^\s+at\s+\S+\(/.test(raw) ||
  /^\s*\.\.\. \d+ more/.test(raw) ||
  /^\s*Suppressed:/.test(raw) ||
  /^\s*Caused by:/.test(raw);

const isExceptionTraceHeader = (raw: string): boolean =>
  Boolean(getExceptionName(raw.trim())) && !parseBracketLogLine(raw);

const normalizeGroupSeed = (value: string): string =>
  value
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, "-")
    .replaceAll(/^-+|-+$/g, "")
    .slice(0, 80);

const createLogGroup = ({
  classification,
  level,
  message,
  source,
  thread,
}: {
  classification: LogLineClassification;
  level: InstanceLogLineLevel;
  message: string;
  source: string | null;
  thread: string | null;
}): Pick<InstanceLogLine, "groupKey" | "groupLabel"> => {
  const shouldGroup =
    classification.type !== "game" ||
    level === "warn" ||
    level === "error" ||
    level === "fatal";

  if (!shouldGroup) {
    return { groupKey: null, groupLabel: null };
  }

  const label =
    classification.groupLabel ??
    (level === "error" || level === "fatal"
      ? "Game Error"
      : getLogLineTypeLabel(classification.type));
  const sourceSeed = normalizeGroupSeed(source ?? thread ?? "general");
  const messageSeed = normalizeGroupSeed(
    classification.groupSeed ?? label ?? message,
  );

  return {
    groupKey: `${classification.type}:${sourceSeed}:${messageSeed}`,
    groupLabel: label,
  };
};

const parseLogLine = (
  raw: string,
  lineNumber: number,
  context: LogParseContext | null,
): InstanceLogLine => {
  if (isStackTraceContinuation(raw)) {
    return {
      details: [],
      groupKey: context?.groupKey ?? null,
      groupLabel: context?.groupLabel ?? getLogLineTypeLabel("stackTrace"),
      id: String(lineNumber),
      level:
        context?.level === "fatal" ||
        context?.level === "error" ||
        context?.level === "warn"
          ? context.level
          : "error",
      lineNumber,
      message: raw.trimEnd(),
      raw,
      source: context?.source ?? null,
      thread: context?.thread ?? null,
      timestamp: null,
      type: "stackTrace",
    };
  }

  const parts = parseRawLogParts(raw);
  const classification = classifyLogLine({ ...parts, raw });
  const level =
    parts.level === "unknown" && classification.type === "crash"
      ? "fatal"
      : parts.level === "unknown" && classification.type === "exception"
        ? "error"
        : parts.level;
  const group = createLogGroup({
    classification,
    level,
    message: parts.message,
    source: parts.source,
    thread: parts.thread,
  });

  return {
    ...group,
    details: [],
    id: String(lineNumber),
    level,
    lineNumber,
    message: parts.message,
    raw,
    source: parts.source,
    thread: parts.thread,
    timestamp: parts.timestamp,
    type: classification.type,
  };
};

const readPlainLogTail = (
  path: string,
  stats: Stats,
  maxBytes: number,
): { bytes: Uint8Array; readBytes: number; truncated: boolean } => {
  const readBytes = Math.min(stats.size, maxBytes);
  const start = Math.max(0, stats.size - readBytes);
  const buffer = Buffer.alloc(readBytes);
  const file = openSync(path, "r");

  try {
    readSync(file, buffer, 0, readBytes, start);
  } finally {
    closeSync(file);
  }

  return {
    bytes: buffer,
    readBytes,
    truncated: start > 0,
  };
};

const readCompressedLogPreview = (
  path: string,
  stats: Stats,
  maxBytes: number,
): { bytes: Uint8Array; readBytes: number; truncated: boolean } => {
  if (stats.size > maxCompressedLogBytes) {
    const message = Buffer.from(
      `Compressed log is ${formatBytesForMessage(
        stats.size,
      )}. Open the file directly to inspect the full archive.`,
    );
    return {
      bytes: message,
      readBytes: message.byteLength,
      truncated: true,
    };
  }

  const decompressed = Bun.gunzipSync(readFileSync(path));
  const readBytes = Math.min(decompressed.byteLength, maxBytes);
  const start = Math.max(0, decompressed.byteLength - readBytes);

  return {
    bytes: decompressed.subarray(start),
    readBytes,
    truncated: start > 0,
  };
};

const computeHash = (
  data: Uint8Array,
  algorithm: "sha1" | "sha256" | "sha512",
): string => new Bun.CryptoHasher(algorithm).update(data).digest("hex");

const formatBytesForMessage = (bytes: number): string => {
  if (bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"] as const;
  const index = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
};

const isSafeRelativePath = (value: string): boolean => {
  if (!value || value.includes("\\") || value.includes("\0")) return false;

  return value.split("/").every((segment) => isSafeFileName(segment));
};

const resolveLogFileEntry = (
  instance: LauncherInstance,
  fileId: string,
): InstanceFileEntry => {
  if (!fileId.startsWith("log:")) {
    throw new Error("Log file id is invalid.");
  }

  const relativePath = fileId.slice("log:".length);

  if (!isSafeRelativePath(relativePath)) {
    throw new Error("Log file path is invalid.");
  }

  const [rootId, ...segments] = relativePath.split("/");
  if (!rootId || segments.length === 0) {
    throw new Error("Log file path is invalid.");
  }

  const root = getLogRootDefinitions(instance).find(
    (definition) => definition.id === rootId,
  );

  if (!root) {
    throw new Error("Log folder is invalid.");
  }

  const fileName = segments.at(-1);
  if (!fileName || !isLogFileName(fileName)) {
    throw new Error("Log file type is unsupported.");
  }

  const path = join(root.path, ...segments);
  const stats = statSync(path);

  if (!stats.isFile()) {
    throw new Error("Log file no longer exists.");
  }

  return createLogFileEntry({
    fileName,
    folder: dirname(path),
    folderId: root.id,
    relativeFilePath: segments.join("/"),
    stats,
  });
};

const decodeLogText = (bytes: Uint8Array): string =>
  new TextDecoder("utf-8", { fatal: false }).decode(bytes);

const parseLogPreviewLines = (
  text: string,
  maxLines: number,
): Array<InstanceLogLine> => {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/);
  const nonTrailingLines = lines.at(-1) === "" ? lines.slice(0, -1) : lines;
  const start = Math.max(0, nonTrailingLines.length - maxLines);
  let context: LogParseContext | null = null;
  const parsedLines: Array<InstanceLogLine> = [];

  for (const [index, line] of nonTrailingLines.slice(start).entries()) {
    const raw = line.trimEnd();
    if (!raw.trim()) continue;

    const lastLine = parsedLines.at(-1);

    if (
      lastLine &&
      (isStackTraceContinuation(raw) ||
        (isExceptionTraceHeader(raw) && lastLine.level !== "info"))
    ) {
      lastLine.details.push(raw);
      context = {
        groupKey: lastLine.groupKey,
        groupLabel: lastLine.groupLabel,
        level: lastLine.level,
        source: lastLine.source,
        thread: lastLine.thread,
      };
      continue;
    }

    const parsed = parseLogLine(raw, start + index + 1, context);

    if (parsed.groupKey) {
      context = {
        groupKey: parsed.groupKey,
        groupLabel: parsed.groupLabel,
        level: parsed.level,
        source: parsed.source,
        thread: parsed.thread,
      };
    } else if (parsed.message.trim()) {
      context = null;
    }

    parsedLines.push(parsed);
  }

  return parsedLines;
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

const getServerWorkspaceRoot = (instance: LauncherInstance): string =>
  join(instance.folders.app, serverWorkspaceFolderName);

const normalizeServerName = (name: string | undefined): string => {
  const normalized = (name ?? "").trim() || "Local Server";

  if (normalized.length < 2 || normalized.length > 64) {
    throw new Error("Server name must be between 2 and 64 characters.");
  }

  if (normalized.includes("\0")) {
    throw new Error("Server name is invalid.");
  }

  return normalized;
};

const toServerFolderName = (name: string): string => {
  const normalized = name
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

  return normalized || "server";
};

const getAvailableServerPath = (serverRoot: string, name: string): string => {
  const base = toServerFolderName(name);
  let candidate = join(serverRoot, base);
  let index = 2;

  while (existsSync(candidate)) {
    candidate = join(serverRoot, `${base}-${index}`);
    index += 1;
  }

  return candidate;
};

const createServerEntry = ({
  displayName,
  fileName,
  folder,
  isDirectory,
  relativePath,
  stats,
}: {
  displayName?: string;
  fileName: string;
  folder: string;
  isDirectory: boolean;
  relativePath?: string;
  stats: Stats;
}): InstanceFileEntry =>
  createEntry({
    displayName,
    enabled: null,
    fileName,
    folder,
    isDirectory,
    kind: "serverFile",
    relativePath,
    stats,
  });

const getOptionalFileEntry = (
  folder: string,
  fileName: string,
  displayName?: string,
): InstanceFileEntry | null => {
  const path = join(folder, fileName);

  if (!existsSync(path)) return null;

  const stats = statSync(path);

  return createServerEntry({
    displayName,
    fileName,
    folder,
    isDirectory: stats.isDirectory(),
    stats,
  });
};

const likelyClientOnlyModPatterns: Array<[RegExp, string]> = [
  [/^sodium/i, "Sodium is a client renderer mod."],
  [/^iris/i, "Iris is a client shader mod."],
  [/^modmenu/i, "Mod Menu only affects the client UI."],
  [/^betterf3/i, "BetterF3 only changes the client debug screen."],
  [/^dynamic[-_ ]?fps/i, "Dynamic FPS only changes client performance."],
  [/^entity[-_ ]?culling/i, "Entity Culling only changes client rendering."],
  [/^immediatelyfast/i, "ImmediatelyFast is a client rendering mod."],
  [/^more[-_ ]?culling/i, "More Culling only changes client rendering."],
  [/^reeses[-_ ]?sodium/i, "Reese's Sodium Options is a client UI mod."],
  [/^lambdynamiclights/i, "Dynamic lights are a client visual feature."],
  [/^mouse[-_ ]?tweaks/i, "Mouse Tweaks only changes inventory controls."],
  [/^zoom/i, "Zoom mods are client-side controls."],
  [/^xaero/i, "Map and minimap mods often need a client review first."],
];

const classifyServerCandidate = (
  entry: InstanceFileEntry,
  source: InstanceServerFileCandidate["source"],
): Pick<
  InstanceServerFileCandidate,
  "reason" | "selectedByDefault" | "side"
> => {
  if (source === "config") {
    return {
      reason:
        "Configuration files are copied so server-side mods keep their settings.",
      selectedByDefault: true,
      side: "server",
    };
  }

  if (source === "resourcePack") {
    return {
      reason:
        "Resource packs are client-facing and are listed for review only.",
      selectedByDefault: false,
      side: "optional",
    };
  }

  const baseName = entry.fileName.replace(/\.jar(?:\.disabled)?$/i, "");
  const clientOnlyMatch = likelyClientOnlyModPatterns.find(([pattern]) =>
    pattern.test(baseName),
  );

  if (clientOnlyMatch) {
    return {
      reason: clientOnlyMatch[1],
      selectedByDefault: false,
      side: "clientOnly",
    };
  }

  if (entry.enabled === false) {
    return {
      reason:
        "Disabled mods are not copied unless you enable them in the instance first.",
      selectedByDefault: false,
      side: "unknown",
    };
  }

  return {
    reason:
      "No client-only pattern detected. Copy this mod into the server pack.",
    selectedByDefault: true,
    side: "unknown",
  };
};

const listServerFileCandidates = (
  instance: LauncherInstance,
  mods: Array<InstanceFileEntry>,
  resourcePacks: Array<InstanceFileEntry>,
): Array<InstanceServerFileCandidate> => {
  const configFiles = listFolderEntries({
    allowDirectories: true,
    extensions: serverFileExtensions.config,
    folder: instance.folders.config,
    kind: "serverFile",
  }).map((entry) => ({ ...entry, kind: "serverFile" as const }));

  return [
    ...mods,
    ...configFiles,
    ...resourcePacks.map((entry) => ({
      ...entry,
      kind: "serverFile" as const,
    })),
  ].map((entry) => {
    const source: InstanceServerFileCandidate["source"] = entry.path.startsWith(
      instance.folders.config,
    )
      ? "config"
      : entry.path.startsWith(instance.folders.resourcePacks)
        ? "resourcePack"
        : "mod";
    const classification = classifyServerCandidate(entry, source);

    return {
      entry,
      source,
      ...classification,
    };
  });
};

const listServerWorkspaceMods = (
  serverPath: string,
): Array<InstanceFileEntry> =>
  listFolderEntries({
    extensions: serverFileExtensions.mods,
    folder: join(serverPath, "mods"),
    kind: "serverFile",
  }).map((entry) => ({ ...entry, kind: "serverFile" as const }));

const getServerWorkspace = (
  folder: string,
  name: string,
): InstanceServerWorkspace | null => {
  let stats: Stats;

  try {
    stats = statSync(folder);
  } catch {
    return null;
  }

  if (!stats.isDirectory()) return null;

  const metadataPath = join(folder, serverMetadataFileName);
  let metadataName = name;

  if (existsSync(metadataPath)) {
    try {
      const parsed = JSON.parse(readFileSync(metadataPath, "utf8"));
      if (isRecord(parsed)) {
        metadataName = optionalString(parsed.name) ?? metadataName;
      }
    } catch {
      // Workspace metadata is helpful, but the folder itself is authoritative.
    }
  }

  return {
    createdAt: stats.birthtime.toISOString(),
    eula: getOptionalFileEntry(folder, "eula.txt", "EULA"),
    id: basename(folder),
    installScript: getOptionalFileEntry(
      folder,
      "install-loader.sh",
      "Install Loader",
    ),
    loaderLauncher:
      getOptionalFileEntry(
        folder,
        "fabric-server-launch.jar",
        "Fabric Server",
      ) ??
      getOptionalFileEntry(folder, "quilt-installer.jar", "Quilt Installer") ??
      getOptionalFileEntry(folder, "forge-installer.jar", "Forge Installer") ??
      getOptionalFileEntry(
        folder,
        "neoforge-installer.jar",
        "NeoForge Installer",
      ),
    mods: listServerWorkspaceMods(folder),
    name: metadataName,
    path: folder,
    properties: getOptionalFileEntry(
      folder,
      "server.properties",
      "Server Properties",
    ),
    runScript: getOptionalFileEntry(folder, "start.sh", "Start Server"),
    serverJar: getOptionalFileEntry(folder, "server.jar", "Minecraft Server"),
  };
};

const listServerWorkspaces = (
  instance: LauncherInstance,
): Array<InstanceServerWorkspace> => {
  const serverRoot = getServerWorkspaceRoot(instance);

  if (!existsSync(serverRoot)) return [];

  return readdirSync(serverRoot, { withFileTypes: true })
    .flatMap((entry) => {
      if (!entry.isDirectory() || !isSafeFileName(entry.name)) return [];

      const workspace = getServerWorkspace(
        join(serverRoot, entry.name),
        entry.name,
      );
      return workspace ? [workspace] : [];
    })
    .sort((a, b) => a.name.localeCompare(b.name));
};

const getServerRequirements = (
  instance: LauncherInstance,
  workspaces: Array<InstanceServerWorkspace>,
): Array<InstanceServerRequirement> => {
  const activeWorkspace = workspaces[0] ?? null;
  const serverJarPath = activeWorkspace
    ? join(activeWorkspace.path, "server.jar")
    : null;
  const eulaPath = activeWorkspace
    ? join(activeWorkspace.path, "eula.txt")
    : null;
  const propertiesPath = activeWorkspace
    ? join(activeWorkspace.path, "server.properties")
    : null;

  return [
    {
      description: activeWorkspace
        ? "A server folder exists for this instance."
        : "Create a server to generate an isolated folder for server files.",
      id: "workspace",
      path: activeWorkspace?.path ?? getServerWorkspaceRoot(instance),
      status: activeWorkspace ? "ready" : "missing",
      title: "Server workspace",
    },
    {
      description:
        instance.loader === "vanilla"
          ? "Vanilla servers can use the downloaded Mojang server jar."
          : `${instance.loader} servers need a matching loader launcher or installer.`,
      id: "serverJar",
      path: serverJarPath,
      status:
        activeWorkspace?.serverJar || activeWorkspace?.loaderLauncher
          ? "ready"
          : instance.loader === "vanilla"
            ? "missing"
            : "warning",
      title: "Server runtime",
    },
    {
      description: activeWorkspace?.eula
        ? "EULA file is present. Review it before starting the server."
        : "Minecraft requires eula.txt before a server can start.",
      id: "eula",
      path: eulaPath,
      status: activeWorkspace?.eula ? "ready" : "missing",
      title: "Minecraft EULA",
    },
    {
      description: activeWorkspace?.properties
        ? "Server properties are ready to edit."
        : "Create a server to generate a readable server.properties file.",
      id: "properties",
      path: propertiesPath,
      status: activeWorkspace?.properties ? "ready" : "missing",
      title: "Server settings",
    },
  ];
};

const getInstanceServerManager = ({
  instance,
  mods,
  resourcePacks,
}: {
  instance: LauncherInstance;
  mods: Array<InstanceFileEntry>;
  resourcePacks: Array<InstanceFileEntry>;
}): InstanceServerManager => {
  const workspaces = listServerWorkspaces(instance);

  return {
    candidates: listServerFileCandidates(instance, mods, resourcePacks),
    defaultServerName: `${instance.name} Server`,
    requirements: getServerRequirements(instance, workspaces),
    serverRoot: getServerWorkspaceRoot(instance),
    workspaces,
  };
};

const copyCandidateToServer = (
  candidate: InstanceServerFileCandidate,
  serverPath: string,
): InstanceFileEntry => {
  const targetFolder =
    candidate.source === "config"
      ? join(serverPath, "config")
      : candidate.source === "resourcePack"
        ? join(serverPath, "resourcepacks")
        : join(serverPath, "mods");
  const targetPath = join(targetFolder, candidate.entry.fileName);

  mkdirSync(targetFolder, { recursive: true });

  if (candidate.entry.isDirectory) {
    cpSync(candidate.entry.path, targetPath, { recursive: true });
  } else {
    copyFileSync(candidate.entry.path, targetPath);
  }

  const stats = statSync(targetPath);

  return createServerEntry({
    fileName: candidate.entry.fileName,
    folder: targetFolder,
    isDirectory: stats.isDirectory(),
    stats,
  });
};

const writeServerTextFile = (path: string, content: string): void => {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content, { flag: "wx" });
};

const writeExecutableServerScript = (path: string, content: string): void => {
  writeServerTextFile(path, content);
  chmodSync(path, 0o755);
};

const fetchServerJson = async (url: string): Promise<unknown> => {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `Server metadata request failed: ${response.status} ${response.statusText}`,
    );
  }

  return response.json();
};

const getFabricInstallerVersion = async (): Promise<string> => {
  const parsed = await fetchServerJson(
    "https://meta.fabricmc.net/v2/versions/installer",
  );

  if (!Array.isArray(parsed)) {
    throw new Error("Fabric installer metadata is invalid.");
  }

  for (const entry of parsed) {
    if (!isRecord(entry)) continue;

    const version = optionalString(entry.version);
    if (version) return version;
  }

  throw new Error("No Fabric installer versions are available.");
};

const downloadUrlToFile = async (url: string, path: string): Promise<void> => {
  const parsedUrl = new URL(url);

  if (parsedUrl.protocol !== "https:") {
    throw new Error("Server download URL must use HTTPS.");
  }

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `Server download failed: ${response.status} ${response.statusText}`,
    );
  }

  writeDownloadedFile(path, new Uint8Array(await response.arrayBuffer()));
};

const downloadFabricServerLauncher = async (
  instance: LauncherInstance,
  serverPath: string,
): Promise<string> => {
  const loaderVersion = instance.loaderVersion?.trim();

  if (!loaderVersion) {
    throw new Error("Select a Fabric loader version before creating a server.");
  }

  const installerVersion = await getFabricInstallerVersion();
  const targetPath = join(serverPath, "fabric-server-launch.jar");
  const url = `https://meta.fabricmc.net/v2/versions/loader/${encodeURIComponent(
    instance.versionId,
  )}/${encodeURIComponent(loaderVersion)}/${encodeURIComponent(
    installerVersion,
  )}/server/jar`;

  await downloadUrlToFile(url, targetPath);

  return "fabric-server-launch.jar";
};

const copyForgeLikeInstaller = async (
  instance: LauncherInstance,
  serverPath: string,
): Promise<string> => {
  const versionDetails = await getMinecraftVersionDetails({
    refresh: false,
    versionId: instance.versionId,
  });
  const modLoader = await resolveModLoader(instance, versionDetails);

  if (!modLoader?.installerPath) {
    throw new Error(`No ${instance.loader} server installer is available.`);
  }

  const fileName =
    instance.loader === "neoforge"
      ? "neoforge-installer.jar"
      : "forge-installer.jar";

  copyFileSync(modLoader.installerPath, join(serverPath, fileName));

  return fileName;
};

const downloadQuiltInstaller = async (serverPath: string): Promise<string> => {
  const fileName = "quilt-installer.jar";

  await downloadUrlToFile(
    "https://quiltmc.org/api/v1/download-latest-installer/java-universal",
    join(serverPath, fileName),
  );

  return fileName;
};

const setupModLoaderServer = async (
  instance: LauncherInstance,
  serverPath: string,
): Promise<string> => {
  if (instance.loader === "vanilla") {
    await downloadServerJar(instance, serverPath);
    return "server.jar";
  }

  if (instance.loader === "fabric") {
    return downloadFabricServerLauncher(instance, serverPath);
  }

  if (instance.loader === "quilt") {
    return downloadQuiltInstaller(serverPath);
  }

  return copyForgeLikeInstaller(instance, serverPath);
};

const getServerRunCommand = (
  instance: LauncherInstance,
  launcherFileName: string,
): string => {
  if (instance.loader === "quilt") {
    return "java -jar quilt-server-launch.jar nogui";
  }

  if (instance.loader === "forge" || instance.loader === "neoforge") {
    return "java @user_jvm_args.txt @libraries/net/minecraftforge/forge/*/unix_args.txt nogui";
  }

  return `java -Xmx${instance.memoryMaxMb}M -Xms${instance.memoryMinMb}M -jar ${launcherFileName} nogui`;
};

const writeServerScripts = (
  instance: LauncherInstance,
  serverPath: string,
  launcherFileName: string,
): void => {
  const runCommand = getServerRunCommand(instance, launcherFileName);

  writeExecutableServerScript(
    join(serverPath, "start.sh"),
    [
      "#!/usr/bin/env sh",
      "set -eu",
      `cd "$(dirname "$0")"`,
      runCommand,
      "",
    ].join("\n"),
  );

  if (instance.loader === "forge" || instance.loader === "neoforge") {
    writeExecutableServerScript(
      join(serverPath, "install-loader.sh"),
      [
        "#!/usr/bin/env sh",
        "set -eu",
        `cd "$(dirname "$0")"`,
        `java -jar ${launcherFileName} --installServer`,
        "",
      ].join("\n"),
    );
    writeExecutableServerScript(
      join(serverPath, "start.sh"),
      [
        "#!/usr/bin/env sh",
        "set -eu",
        `cd "$(dirname "$0")"`,
        'if [ ! -f "./run.sh" ]; then',
        '  echo "Run ./install-loader.sh before starting this server."',
        "  exit 1",
        "fi",
        "./run.sh",
        "",
      ].join("\n"),
    );
    writeServerTextFile(
      join(serverPath, "user_jvm_args.txt"),
      [`-Xms${instance.memoryMinMb}M`, `-Xmx${instance.memoryMaxMb}M`, ""].join(
        "\n",
      ),
    );
  }

  if (instance.loader === "quilt") {
    writeExecutableServerScript(
      join(serverPath, "install-loader.sh"),
      [
        "#!/usr/bin/env sh",
        "set -eu",
        `cd "$(dirname "$0")"`,
        `java -jar ${launcherFileName} install server ${instance.versionId} --download-server`,
        "",
      ].join("\n"),
    );
  }
};

const downloadServerJar = async (
  instance: LauncherInstance,
  serverPath: string,
): Promise<void> => {
  if (instance.loader !== "vanilla") return;

  const details = await getMinecraftVersionDetails({
    refresh: false,
    versionId: instance.versionId,
  });
  const serverDownload = details.downloads?.server;

  if (!serverDownload?.url) return;

  const response = await fetch(serverDownload.url);

  if (!response.ok) {
    throw new Error(
      `Server jar download failed: ${response.status} ${response.statusText}`,
    );
  }

  writeDownloadedFile(
    join(serverPath, "server.jar"),
    new Uint8Array(await response.arrayBuffer()),
  );
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

const getModrinthTargetFolder = (
  category: ModrinthCategory,
  instance: LauncherInstance | null,
): string => {
  if (category === "modpacks") {
    const folder = join(
      getLauncherDirectories().downloads,
      "modrinth",
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
    default:
      throw new Error("Modrinth category is not supported.");
  }
};

const sanitizeModrinthFileName = (input: DownloadModrinthFileInput): string => {
  const fallbackName = `${input.projectSlug || input.projectId}-${input.file.id}${
    fallbackModrinthExtensionByCategory[input.category]
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

  if (!allowedModrinthExtensions[input.category].has(extension)) {
    throw new Error(
      `${getModrinthCategoryLabel(input.category)} downloads must use ${[
        ...allowedModrinthExtensions[input.category],
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

const getModrinthCategoryLabel = (category: ModrinthCategory): string => {
  if (category === "mods") return "Mod";
  if (category === "modpacks") return "Modpack";
  if (category === "resource-packs") return "Resource pack";
  return "Shader";
};

const getCurseForgeProgressItemId = (
  input: DownloadCurseForgeFileInput,
): string => `curseforge:${input.projectId}:${input.file.id}`;

const getModrinthProgressItemId = (input: DownloadModrinthFileInput): string =>
  `modrinth:${input.projectId}:${input.file.id}`;

const getCurseForgeProgressFileLabel = (
  input: DownloadCurseForgeFileInput,
): string =>
  basename(
    (
      input.file.fileName ||
      input.file.displayName ||
      `${input.projectName}.jar`
    ).replaceAll("\\", "/"),
  );

const getModrinthProgressFileLabel = (
  input: DownloadModrinthFileInput,
): string =>
  basename(
    (
      input.file.fileName ||
      input.file.displayName ||
      `${input.projectName}.mrpack`
    ).replaceAll("\\", "/"),
  );

const emitCurseForgeProgress = (
  options: DownloadCurseForgeFileOptions,
  event: CurseForgeDownloadProgressEvent,
): void => {
  try {
    options.onProgress?.(event);
  } catch {
    // Progress updates should never fail the actual install.
  }
};

const emitModrinthProgress = (
  options: DownloadModrinthFileOptions,
  event: CurseForgeDownloadProgressEvent,
): void => {
  try {
    options.onProgress?.(event);
  } catch {
    // Progress updates should never fail the actual install.
  }
};

const parseContentLength = (value: string | null): number | null => {
  if (!value?.trim()) return null;

  const parsed = Number(value);

  return Number.isFinite(parsed) && parsed >= 0 ? Math.trunc(parsed) : null;
};

const concatDownloadChunks = (
  chunks: Array<Uint8Array>,
  totalBytes: number,
): Uint8Array => {
  const data = new Uint8Array(totalBytes);
  let offset = 0;

  for (const chunk of chunks) {
    data.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return data;
};

const readDownloadResponse = async ({
  input,
  maxBytes,
  options,
  response,
}: {
  input: DownloadCurseForgeFileInput;
  maxBytes: number;
  options: DownloadCurseForgeFileOptions;
  response: Response;
}): Promise<Uint8Array> => {
  const itemId = getCurseForgeProgressItemId(input);
  const itemKind = getCurseForgeCategoryLabel(input.category);
  const itemLabel = getCurseForgeProgressFileLabel(input);
  const declaredBytes = parseContentLength(
    response.headers.get("content-length"),
  );

  if (declaredBytes !== null && declaredBytes > maxBytes) {
    throw new Error("CurseForge file is too large to download.");
  }

  emitCurseForgeProgress(options, {
    activeLabel: itemLabel,
    item: {
      downloadedBytes: 0,
      id: itemId,
      kind: itemKind,
      label: itemLabel,
      status: "running",
      totalBytes: declaredBytes,
    },
  });

  if (!response.body) {
    const data = new Uint8Array(await response.arrayBuffer());

    if (data.byteLength > maxBytes) {
      throw new Error("CurseForge file is too large to download.");
    }

    emitCurseForgeProgress(options, {
      activeLabel: itemLabel,
      item: {
        downloadedBytes: data.byteLength,
        id: itemId,
        kind: itemKind,
        label: itemLabel,
        progress: 100,
        status: "completed",
        totalBytes: declaredBytes ?? data.byteLength,
      },
    });

    return data;
  }

  const reader = response.body.getReader();
  const chunks: Array<Uint8Array> = [];
  let downloadedBytes = 0;

  try {
    for (;;) {
      const { done, value } = await reader.read();

      if (done) break;
      if (!value) continue;

      const chunk = value instanceof Uint8Array ? value : new Uint8Array(value);
      downloadedBytes += chunk.byteLength;

      if (downloadedBytes > maxBytes) {
        throw new Error("CurseForge file is too large to download.");
      }

      chunks.push(chunk);
      emitCurseForgeProgress(options, {
        activeLabel: itemLabel,
        item: {
          downloadedBytes,
          id: itemId,
          kind: itemKind,
          label: itemLabel,
          status: "running",
          totalBytes: declaredBytes,
        },
      });
    }
  } finally {
    reader.releaseLock();
  }

  const data = concatDownloadChunks(chunks, downloadedBytes);
  emitCurseForgeProgress(options, {
    activeLabel: itemLabel,
    item: {
      downloadedBytes,
      id: itemId,
      kind: itemKind,
      label: itemLabel,
      progress: 100,
      status: "completed",
      totalBytes: declaredBytes ?? downloadedBytes,
    },
  });

  return data;
};

const fetchCurseForgeDownload = async (
  input: DownloadCurseForgeFileInput,
  options: DownloadCurseForgeFileOptions,
): Promise<Uint8Array> => {
  const downloadUrl =
    input.file.downloadUrl?.trim() ||
    `https://www.curseforge.com/api/v1/mods/${input.projectId}/files/${input.file.id}/download`;

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

  try {
    return await readDownloadResponse({ input, maxBytes, options, response });
  } catch (error) {
    emitCurseForgeProgress(options, {
      activeLabel: getCurseForgeProgressFileLabel(input),
      item: {
        error: error instanceof Error ? error.message : "Download failed.",
        id: getCurseForgeProgressItemId(input),
        kind: getCurseForgeCategoryLabel(input.category),
        label: getCurseForgeProgressFileLabel(input),
        status: "failed",
      },
    });
    throw error;
  }
};

const fetchModrinthDownloadUrl = async ({
  itemId,
  itemKind,
  itemLabel,
  maxBytes,
  options,
  url,
}: {
  itemId: string;
  itemKind: string;
  itemLabel: string;
  maxBytes: number;
  options: DownloadModrinthFileOptions;
  url: string;
}): Promise<Uint8Array> => {
  const downloadUrl = new URL(url);

  if (downloadUrl.protocol !== "https:") {
    throw new Error("Modrinth download URL must use HTTPS.");
  }

  const controller = new AbortController();
  const timeoutMs = Math.max(1, options.requestTimeoutMs ?? 60_000);
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const fetcher = options.fetcher ?? fetch;
  let response: Response;

  emitModrinthProgress(options, {
    activeLabel: itemLabel,
    item: {
      downloadedBytes: 0,
      id: itemId,
      kind: itemKind,
      label: itemLabel,
      status: "running",
      totalBytes: null,
    },
  });

  try {
    response = await fetcher(downloadUrl, { signal: controller.signal });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(
        `Modrinth download timed out after ${Math.round(timeoutMs / 1000)} seconds.`,
      );
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    throw new Error(
      `Modrinth download failed: ${response.status} ${response.statusText}`,
    );
  }

  const declaredBytes = parseContentLength(
    response.headers.get("content-length"),
  );

  if (declaredBytes !== null && declaredBytes > maxBytes) {
    throw new Error("Modrinth file is too large to download.");
  }

  const data = new Uint8Array(await response.arrayBuffer());

  if (data.byteLength > maxBytes) {
    throw new Error("Modrinth file is too large to download.");
  }

  emitModrinthProgress(options, {
    activeLabel: itemLabel,
    item: {
      downloadedBytes: data.byteLength,
      id: itemId,
      kind: itemKind,
      label: itemLabel,
      progress: 100,
      status: "completed",
      totalBytes: declaredBytes ?? data.byteLength,
    },
  });

  return data;
};

const fetchModrinthDownload = async (
  input: DownloadModrinthFileInput,
  options: DownloadModrinthFileOptions,
): Promise<Uint8Array> => {
  const maxBytes = Math.max(1, options.maxBytes ?? maxCurseForgeDownloadBytes);

  try {
    return await fetchModrinthDownloadUrl({
      itemId: getModrinthProgressItemId(input),
      itemKind: getModrinthCategoryLabel(input.category),
      itemLabel: getModrinthProgressFileLabel(input),
      maxBytes,
      options,
      url: input.file.downloadUrl,
    });
  } catch (error) {
    emitModrinthProgress(options, {
      activeLabel: getModrinthProgressFileLabel(input),
      item: {
        error: error instanceof Error ? error.message : "Download failed.",
        id: getModrinthProgressItemId(input),
        kind: getModrinthCategoryLabel(input.category),
        label: getModrinthProgressFileLabel(input),
        status: "failed",
      },
    });
    throw error;
  }
};

const writeDownloadedFile = (path: string, data: Uint8Array): void => {
  mkdirSync(dirname(path), { recursive: true });

  const tempPath = `${path}.download-${process.pid}-${crypto.randomUUID()}.tmp`;

  try {
    writeFileSync(tempPath, data, { flag: "wx" });
    renameSync(tempPath, path);
  } finally {
    if (existsSync(tempPath)) {
      unlinkSync(tempPath);
    }
  }
};

const mediaExtensionByContentType: Record<string, string> = {
  "image/gif": ".gif",
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

const getMediaExtension = (url: URL, contentType: string | null): string => {
  const extension = extname(url.pathname).toLowerCase();

  if ([".gif", ".jpeg", ".jpg", ".png", ".webp"].includes(extension)) {
    return extension === ".jpeg" ? ".jpg" : extension;
  }

  const normalizedContentType = contentType?.split(";")[0]?.trim() ?? "";

  return mediaExtensionByContentType[normalizedContentType] ?? ".png";
};

const fetchMediaAsset = async (
  sourceUrl: string,
  options: DownloadCurseForgeFileOptions,
): Promise<{ data: Uint8Array; extension: string }> => {
  const url = new URL(sourceUrl);

  if (url.protocol !== "https:") {
    throw new Error("CurseForge artwork URL must use HTTPS.");
  }

  const controller = new AbortController();
  const timeoutMs = Math.max(1, options.requestTimeoutMs ?? 30_000);
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const fetcher = options.fetcher ?? fetch;
  let response: Response;

  try {
    response = await fetcher(url, { signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    throw new Error(
      `CurseForge artwork download failed: ${response.status} ${response.statusText}`,
    );
  }

  const contentLength = parseContentLength(
    response.headers.get("content-length"),
  );

  if (contentLength !== null && contentLength > maxCurseForgeMediaBytes) {
    throw new Error("CurseForge artwork is too large to download.");
  }

  const data = new Uint8Array(await response.arrayBuffer());

  if (data.byteLength > maxCurseForgeMediaBytes) {
    throw new Error("CurseForge artwork is too large to download.");
  }

  return {
    data,
    extension: getMediaExtension(url, response.headers.get("content-type")),
  };
};

const saveCurseForgeMediaAsset = async (
  instance: LauncherInstance,
  sourceUrl: string | null | undefined,
  baseName: string,
  options: DownloadCurseForgeFileOptions,
): Promise<string | null> => {
  if (!sourceUrl) return null;

  try {
    const asset = await fetchMediaAsset(sourceUrl, options);
    const path = join(instance.folders.media, `${baseName}${asset.extension}`);
    writeDownloadedFile(path, asset.data);

    return Bun.pathToFileURL(path).toString();
  } catch {
    return null;
  }
};

const saveCurseForgeMediaAssets = async (
  instance: LauncherInstance,
  input: DownloadCurseForgeFileInput,
  options: DownloadCurseForgeFileOptions,
): Promise<{ bannerUrl: string | null; iconUrl: string | null }> => {
  const iconUrl = await saveCurseForgeMediaAsset(
    instance,
    input.projectLogoUrl,
    "curseforge-icon",
    options,
  );
  const bannerUrl = await saveCurseForgeMediaAsset(
    instance,
    input.projectScreenshotUrls?.[0],
    "curseforge-banner",
    options,
  );

  return { bannerUrl, iconUrl };
};

const saveModrinthMediaAssets = async (
  instance: LauncherInstance,
  input: DownloadModrinthFileInput,
  options: DownloadModrinthFileOptions,
): Promise<{ bannerUrl: string | null; iconUrl: string | null }> => {
  const iconUrl = await saveCurseForgeMediaAsset(
    instance,
    input.projectLogoUrl,
    "modrinth-icon",
    options,
  );
  const bannerUrl = await saveCurseForgeMediaAsset(
    instance,
    input.projectScreenshotUrls?.[0],
    "modrinth-banner",
    options,
  );

  return { bannerUrl, iconUrl };
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

const getModpackArchivePath = (
  instance: LauncherInstance,
  fileName: string,
): string => join(instance.folders.cache, "curseforge", fileName);

const getModpackManifestPath = (instance: LauncherInstance): string =>
  join(instance.folders.metadata, curseForgeModpackManifestFileName);

const writeModpackManifestCopy = (
  instance: LauncherInstance,
  archiveData: Uint8Array,
): string => {
  const manifest = readZipJson(archiveData, "manifest.json");
  const path = getModpackManifestPath(instance);

  writeDownloadedFile(
    path,
    new TextEncoder().encode(`${JSON.stringify(manifest, null, 2)}\n`),
  );

  return path;
};

const extractModpackOverrides = (
  instance: LauncherInstance,
  archiveData: Uint8Array,
  overridesFolder: string | null,
): string | null => {
  if (!overridesFolder) return null;

  const prefix = `${overridesFolder.replace(/\/+$/g, "")}/`;
  const entries = listZipEntries(archiveData);

  for (const entry of entries) {
    if (!entry.name.startsWith(prefix)) continue;

    const relativePath = entry.name.slice(prefix.length);
    if (!relativePath || !isSafeZipPath(relativePath)) continue;

    const targetPath = join(instance.gameDirectory, ...relativePath.split("/"));
    if (!isPathInside(instance.gameDirectory, targetPath)) continue;

    writeDownloadedFile(targetPath, entry.data);
  }

  return join(instance.gameDirectory, prefix.slice(0, -1));
};

const removeManagedModFiles = (instance: LauncherInstance): void => {
  if (!existsSync(instance.folders.mods)) return;

  for (const entry of readdirSync(instance.folders.mods, {
    withFileTypes: true,
  })) {
    if (!entry.isFile() || !isSafeFileName(entry.name)) continue;
    if (
      !entry.name.toLowerCase().endsWith(".jar") &&
      !entry.name.toLowerCase().endsWith(".jar.disabled")
    ) {
      continue;
    }

    unlinkSync(join(instance.folders.mods, entry.name));
  }
};

type InstanceUpdateSnapshotFile = {
  modifiedAt: string;
  path: string;
  sizeBytes: number;
};

type InstanceUpdateSnapshot = {
  createdAt: string;
  files: {
    config: Array<InstanceUpdateSnapshotFile>;
    mods: Array<InstanceUpdateSnapshotFile>;
    resourcePacks: Array<InstanceUpdateSnapshotFile>;
    saves: Array<InstanceUpdateSnapshotFile>;
    shaderPacks: Array<InstanceUpdateSnapshotFile>;
  };
  id: string;
  instanceId: string;
  modpack: LauncherInstanceModpack | null;
  reason: {
    fromFileId: string;
    fromVersion?: string;
    kind: "modpack-update";
    toFileId: string;
    toVersion?: string;
  };
  recipeRevisionId: string | null;
};

const toSnapshotRelativePath = (
  instance: LauncherInstance,
  path: string,
): string | null => {
  const relativePath = relative(resolve(instance.gameDirectory), resolve(path));

  if (
    !relativePath ||
    relativePath.startsWith("..") ||
    isAbsolute(relativePath)
  ) {
    return null;
  }

  return relativePath
    .split(/[\\/]+/)
    .filter(Boolean)
    .join("/");
};

const listSnapshotFiles = (
  instance: LauncherInstance,
  folder: string,
): Array<InstanceUpdateSnapshotFile> => {
  const files: Array<InstanceUpdateSnapshotFile> = [];

  const visit = (directory: string): void => {
    let entries: Array<Dirent>;

    try {
      entries = readdirSync(directory, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (!isSafeFileName(entry.name) || entry.isSymbolicLink()) continue;

      const path = join(directory, entry.name);

      if (entry.isDirectory()) {
        visit(path);
        continue;
      }

      if (!entry.isFile()) continue;

      const relativePath = toSnapshotRelativePath(instance, path);
      if (!relativePath) continue;

      const stats = statSync(path);
      files.push({
        modifiedAt: stats.mtime.toISOString(),
        path: relativePath,
        sizeBytes: stats.size,
      });
    }
  };

  visit(folder);

  return files.sort((a, b) => a.path.localeCompare(b.path));
};

const writeInstanceUpdateSnapshot = ({
  instance,
  targetFile,
}: {
  instance: LauncherInstance;
  targetFile: DownloadCurseForgeFileInput["file"];
}): string | null => {
  if (!instance.modpack) return null;

  const createdAt = new Date().toISOString();
  const recipeRevision = readInstanceRecipeRevision(instance);
  const snapshot: InstanceUpdateSnapshot = {
    createdAt,
    files: {
      config: listSnapshotFiles(instance, instance.folders.config),
      mods: listSnapshotFiles(instance, instance.folders.mods),
      resourcePacks: listSnapshotFiles(
        instance,
        instance.folders.resourcePacks,
      ),
      saves: listSnapshotFiles(instance, instance.folders.saves),
      shaderPacks: listSnapshotFiles(instance, instance.folders.shaderPacks),
    },
    id: `snapshot_${crypto.randomUUID()}`,
    instanceId: instance.id,
    modpack: instance.modpack,
    reason: {
      fromFileId: instance.modpack.fileId,
      fromVersion: instance.modpack.version,
      kind: "modpack-update",
      toFileId: String(targetFile.id),
      toVersion: targetFile.displayName || undefined,
    },
    recipeRevisionId: recipeRevision?.id ?? null,
  };
  const safeCreatedAt = createdAt.replaceAll(/[:.]/g, "-");
  const path = join(
    instance.folders.metadata,
    "update-snapshots",
    `${safeCreatedAt}-${snapshot.id}.json`,
  );

  writeDownloadedFile(
    path,
    new TextEncoder().encode(`${JSON.stringify(snapshot, null, 2)}\n`),
  );

  return path;
};

const getInstallableDependencyCategory = (
  section: Awaited<ReturnType<typeof getCurseForgeProject>>["section"],
): Exclude<CurseForgeCategory, "modpacks"> | null => {
  if (
    section === "mods" ||
    section === "resource-packs" ||
    section === "shaders" ||
    section === "worlds"
  ) {
    return section;
  }

  return null;
};

const inferDependencyCategoryFromFileName = (
  fileName: string,
): Exclude<CurseForgeCategory, "modpacks"> | null => {
  const extension = extname(fileName).toLowerCase();

  if (extension === ".jar") return "mods";
  if (extension === ".mcworld") return "worlds";

  return null;
};

const createDependencyInstallInput = ({
  category,
  file,
  instance,
  projectName,
  projectId,
  projectSlug,
}: {
  category: Exclude<CurseForgeCategory, "modpacks">;
  file: Awaited<ReturnType<typeof getCurseForgeProjectFile>>;
  instance: LauncherInstance;
  projectName?: string;
  projectId: number;
  projectSlug?: string;
}): DownloadCurseForgeFileInput => ({
  category,
  file,
  instanceId: instance.id,
  projectId,
  projectName: projectName || file.displayName || file.fileName,
  projectSlug,
});

const createModpackDependencyInstallInput = async ({
  dependency,
  file,
  instance,
  options,
}: {
  dependency: CurseForgeModpackManifestFile;
  file: Awaited<ReturnType<typeof getCurseForgeProjectFile>>;
  instance: LauncherInstance;
  options: DownloadCurseForgeFileOptions;
}): Promise<DownloadCurseForgeFileInput> => {
  const inferredCategory = inferDependencyCategoryFromFileName(file.fileName);

  if (inferredCategory) {
    return createDependencyInstallInput({
      category: inferredCategory,
      file,
      instance,
      projectId: dependency.projectID,
    });
  }

  const project = await getCurseForgeProject(dependency.projectID, options);
  const category = getInstallableDependencyCategory(project.section);

  if (!category) {
    throw new Error("CurseForge dependency category is not supported.");
  }

  return createDependencyInstallInput({
    category,
    file,
    instance,
    projectId: dependency.projectID,
    projectName: project.name,
    projectSlug: project.slug,
  });
};

const installModpackDependencies = async (
  instance: LauncherInstance,
  manifest: ParsedCurseForgeModpackManifest,
  options: DownloadCurseForgeFileOptions,
): Promise<{
  installedFiles: number;
  skippedDependencies: Array<SkippedCurseForgeModpackDependency>;
  skippedFiles: number;
}> => {
  let installedFiles = 0;
  let skippedFiles = 0;
  const skippedDependencies: Array<SkippedCurseForgeModpackDependency> = [];
  const requiredDependencies = manifest.files.filter(
    (dependency) => dependency.required,
  );

  emitCurseForgeProgress(options, {
    items: requiredDependencies.map((dependency) => ({
      id: `curseforge:${dependency.projectID}:${dependency.fileID}`,
      kind: "Mod",
      label: `Project ${dependency.projectID} file ${dependency.fileID}`,
      status: "queued",
    })),
    totalItems: 1 + requiredDependencies.length,
  });

  for (const dependency of manifest.files) {
    if (!dependency.required) {
      skippedFiles += 1;
      continue;
    }

    const dependencyItemId = `curseforge:${dependency.projectID}:${dependency.fileID}`;
    let dependencyLabel = `Project ${dependency.projectID} file ${dependency.fileID}`;
    let skippedDependency: SkippedCurseForgeModpackDependency | null = null;

    try {
      const file = await getCurseForgeProjectFile(
        dependency.projectID,
        dependency.fileID,
        options,
      );
      dependencyLabel = file.fileName || file.displayName || dependencyLabel;

      const installInput = await createModpackDependencyInstallInput({
        dependency,
        file,
        instance,
        options,
      });
      const fileName = sanitizeCurseForgeFileName(installInput);
      skippedDependency =
        installInput.category === "modpacks"
          ? null
          : {
              category: installInput.category,
              fileId: String(file.id),
              fileName,
              projectId: String(dependency.projectID),
            };
      const data = await fetchCurseForgeDownload(installInput, options);

      await installCurseForgeFileData(
        installInput,
        { allowManagedInstance: true, data, fileName },
        options,
      );
      installedFiles += 1;
    } catch {
      skippedFiles += 1;
      if (skippedDependency) {
        skippedDependencies.push(skippedDependency);
      }
      emitCurseForgeProgress(options, {
        item: {
          error: null,
          id: dependencyItemId,
          kind: "Mod",
          label: dependencyLabel,
          progress: 100,
          status: "skipped",
        },
      });
    }
  }

  return { installedFiles, skippedDependencies, skippedFiles };
};

const installCurseForgeModpackData = async (
  input: DownloadCurseForgeFileInput,
  { data, fileName, replacingInstance }: InstallCurseForgeFileDataOptions,
  options: DownloadCurseForgeFileOptions,
): Promise<DownloadCurseForgeFileResult> => {
  const manifest = parseCurseForgeModpackManifest(data);
  const now = new Date().toISOString();
  let instance = replacingInstance
    ? updateLauncherInstance({
        confirmRuntimeCompatibility: true,
        instanceId: replacingInstance.id,
        loader: manifest.modLoader,
        loaderVersion: manifest.modLoaderVersion,
        memoryMaxMb:
          manifest.recommendedMemoryMb === null
            ? undefined
            : Math.max(
                replacingInstance.memoryMaxMb,
                manifest.recommendedMemoryMb,
              ),
        versionId: manifest.minecraftVersion,
      })
    : createLauncherInstance({
        bannerUrl: input.projectScreenshotUrls?.[0] ?? undefined,
        iconUrl: input.projectLogoUrl ?? undefined,
        loader: manifest.modLoader,
        loaderVersion: manifest.modLoaderVersion ?? undefined,
        memoryMaxMb: manifest.recommendedMemoryMb ?? 4096,
        name: manifest.name ?? input.projectName,
        versionId: manifest.minecraftVersion,
      });

  if (replacingInstance) {
    removeManagedModFiles(instance);
  }

  const artifactPath = getModpackArchivePath(instance, fileName);
  writeDownloadedFile(artifactPath, data);
  const manifestPath = writeModpackManifestCopy(instance, data);
  const overridesPath = extractModpackOverrides(
    instance,
    data,
    manifest.overrides,
  );
  const dependencyResult = await installModpackDependencies(
    instance,
    manifest,
    options,
  );
  const media = await saveCurseForgeMediaAssets(instance, input, options);
  const existingIconUrl =
    replacingInstance?.modpack?.iconUrl ?? replacingInstance?.iconUrl ?? null;
  const existingBannerUrl =
    replacingInstance?.modpack?.bannerUrl ??
    replacingInstance?.bannerUrl ??
    null;
  const iconUrl = replacingInstance
    ? (media.iconUrl ?? existingIconUrl ?? input.projectLogoUrl ?? null)
    : (media.iconUrl ?? input.projectLogoUrl ?? null);
  const bannerUrl = replacingInstance
    ? (media.bannerUrl ??
      existingBannerUrl ??
      input.projectScreenshotUrls?.[0] ??
      null)
    : (media.bannerUrl ?? input.projectScreenshotUrls?.[0] ?? null);
  const installedItem: InstalledCurseForgeFile = {
    category: "modpacks",
    fileId: String(input.file.id),
    fileName,
    installedAt: replacingInstance?.modpack?.installedAt ?? now,
    name: input.projectName.trim() || manifest.name || fileName,
    projectId: String(input.projectId),
    slug: input.projectSlug?.trim() || undefined,
    version: input.file.displayName || manifest.version || undefined,
  };
  const modpack: LauncherInstanceModpack = {
    artifactPath,
    bannerUrl,
    fileId: installedItem.fileId,
    fileName,
    iconUrl,
    installedAt: installedItem.installedAt,
    installedFiles: dependencyResult.installedFiles,
    locked: true,
    manifestPath,
    name: installedItem.name,
    overridesPath,
    projectId: installedItem.projectId,
    skippedFiles: dependencyResult.skippedFiles,
    slug: installedItem.slug,
    source: "curseforge",
    updatedAt: now,
    version: installedItem.version,
    websiteUrl: input.projectWebsiteUrl ?? null,
  };

  instance = setLauncherInstanceModpack({
    bannerUrl,
    iconUrl,
    instanceId: instance.id,
    modpack,
  });

  const metadata = readCurseForgeMetadata(instance);
  metadata.modpacks = [installedItem];
  writeCurseForgeMetadata(instance, metadata);
  writeCurseForgeRecipeRevision({
    archiveData: data,
    fileName,
    input,
    installedFiles: Object.values(metadata).flatMap((items) => items ?? []),
    instance,
    manifest,
    skippedFiles: dependencyResult.skippedDependencies,
  });

  return {
    category: "modpacks",
    content: await getInstanceContent({ instanceId: instance.id }),
    fileName,
    instance,
    installedItem,
    path: artifactPath,
  };
};

const installCurseForgeFileData = async (
  input: DownloadCurseForgeFileInput,
  options: InstallCurseForgeFileDataOptions & {
    allowManagedInstance?: boolean;
  },
  downloadOptions: DownloadCurseForgeFileOptions,
): Promise<DownloadCurseForgeFileResult> => {
  const { allowManagedInstance = false, data, fileName } = options;
  const category = input.category;
  const instance =
    category === "modpacks" ? null : getInstanceOrThrow(input.instanceId ?? "");

  if (category === "modpacks") {
    return installCurseForgeModpackData(input, options, downloadOptions);
  }

  if (!instance) {
    throw new Error("Select an instance before downloading this content.");
  }

  if (
    category === "mods" &&
    instance?.modpack?.locked &&
    !allowManagedInstance
  ) {
    throw new Error(
      "Mods for this instance are managed by its linked modpack. Update the modpack instead.",
    );
  }

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
    content: await getInstanceContent({ instanceId: instance.id }),
    fileName,
    instance: null,
    installedItem,
    path,
  };
};

const getModrinthModpackArchivePath = (
  instance: LauncherInstance,
  fileName: string,
): string => join(instance.folders.cache, "modrinth", fileName);

const getModrinthModpackManifestPath = (instance: LauncherInstance): string =>
  join(instance.folders.metadata, "modrinth-index.json");

const writeModrinthModpackManifestCopy = (
  instance: LauncherInstance,
  archiveData: Uint8Array,
): string => {
  const manifest = readZipJson(archiveData, "modrinth.index.json");
  const path = getModrinthModpackManifestPath(instance);

  writeDownloadedFile(
    path,
    new TextEncoder().encode(`${JSON.stringify(manifest, null, 2)}\n`),
  );

  return path;
};

const extractModrinthOverrides = (
  instance: LauncherInstance,
  archiveData: Uint8Array,
): string | null => {
  const prefix = "overrides/";
  const entries = listZipEntries(archiveData);
  let extracted = false;

  for (const entry of entries) {
    if (!entry.name.startsWith(prefix)) continue;

    const relativePath = entry.name.slice(prefix.length);
    if (!relativePath || !isSafeZipPath(relativePath)) continue;

    const targetPath = join(instance.gameDirectory, ...relativePath.split("/"));
    if (!isPathInside(instance.gameDirectory, targetPath)) continue;

    writeDownloadedFile(targetPath, entry.data);
    extracted = true;
  }

  return extracted ? join(instance.gameDirectory, "overrides") : null;
};

const verifyModrinthFileHash = (
  file: ModrinthModpackManifestFile,
  data: Uint8Array,
): void => {
  const algorithm = file.hashes.sha512
    ? "sha512"
    : file.hashes.sha1
      ? "sha1"
      : null;
  const expected = algorithm ? file.hashes[algorithm] : null;

  if (!algorithm || !expected) return;

  const actual = computeHash(data, algorithm);

  if (actual.toLowerCase() !== expected.toLowerCase()) {
    throw new Error(`${file.path} failed Modrinth hash verification.`);
  }
};

const installModrinthModpackFiles = async (
  instance: LauncherInstance,
  manifest: ParsedModrinthModpackManifest,
  options: DownloadModrinthFileOptions,
): Promise<{
  installedFiles: number;
  installedFilePaths: Set<string>;
  skippedFilePaths: Set<string>;
}> => {
  const installedFilePaths = new Set<string>();
  const skippedFilePaths = new Set<string>();

  emitModrinthProgress(options, {
    items: manifest.files.map((file) => ({
      id: `modrinth:${file.path}`,
      kind: "Modpack file",
      label: basename(file.path.replaceAll("\\", "/")),
      status: "queued",
      totalBytes: file.fileSize,
    })),
    totalItems: 1 + manifest.files.length,
  });

  for (const file of manifest.files) {
    const itemId = `modrinth:${file.path}`;
    const itemLabel = basename(file.path.replaceAll("\\", "/"));

    try {
      const data = await fetchModrinthDownloadUrl({
        itemId,
        itemKind: "Modpack file",
        itemLabel,
        maxBytes: Math.max(1, options.maxBytes ?? maxCurseForgeDownloadBytes),
        options,
        url: file.downloads[0] ?? "",
      });

      verifyModrinthFileHash(file, data);

      const targetPath = join(instance.gameDirectory, ...file.path.split("/"));
      if (!isPathInside(instance.gameDirectory, targetPath)) {
        throw new Error(`${file.path} is outside the instance directory.`);
      }

      writeDownloadedFile(targetPath, data);
      installedFilePaths.add(file.path);
    } catch {
      skippedFilePaths.add(file.path);
      emitModrinthProgress(options, {
        item: {
          error: null,
          id: itemId,
          kind: "Modpack file",
          label: itemLabel,
          progress: 100,
          status: "skipped",
        },
      });
    }
  }

  return {
    installedFiles: installedFilePaths.size,
    installedFilePaths,
    skippedFilePaths,
  };
};

const installModrinthModpackData = async (
  input: DownloadModrinthFileInput,
  { data, fileName }: InstallCurseForgeFileDataOptions,
  options: DownloadModrinthFileOptions,
): Promise<DownloadModrinthFileResult> => {
  const manifest = parseModrinthModpackManifest(data);
  const now = new Date().toISOString();
  let instance = createLauncherInstance({
    bannerUrl: input.projectScreenshotUrls?.[0] ?? undefined,
    iconUrl: input.projectLogoUrl ?? undefined,
    loader: manifest.modLoader,
    loaderVersion: manifest.modLoaderVersion ?? undefined,
    memoryMaxMb: 4096,
    name: manifest.name ?? input.projectName,
    versionId: manifest.minecraftVersion,
  });
  const artifactPath = getModrinthModpackArchivePath(instance, fileName);
  writeDownloadedFile(artifactPath, data);
  const manifestPath = writeModrinthModpackManifestCopy(instance, data);
  const overridesPath = extractModrinthOverrides(instance, data);
  const dependencyResult = await installModrinthModpackFiles(
    instance,
    manifest,
    options,
  );
  const media = await saveModrinthMediaAssets(instance, input, options);
  const iconUrl = media.iconUrl ?? input.projectLogoUrl ?? null;
  const bannerUrl = media.bannerUrl ?? input.projectScreenshotUrls?.[0] ?? null;
  const modpack: LauncherInstanceModpack = {
    artifactPath,
    bannerUrl,
    fileId: input.file.id,
    fileName,
    iconUrl,
    installedAt: now,
    installedFiles: dependencyResult.installedFiles,
    locked: true,
    manifestPath,
    name: input.projectName.trim() || manifest.name || fileName,
    overridesPath,
    projectId: input.projectId,
    skippedFiles: dependencyResult.skippedFilePaths.size,
    slug: input.projectSlug?.trim() || undefined,
    source: "modrinth",
    updatedAt: now,
    version: input.file.versionNumber || manifest.version || undefined,
    websiteUrl: input.projectWebsiteUrl ?? null,
  };

  instance = setLauncherInstanceModpack({
    bannerUrl,
    iconUrl,
    instanceId: instance.id,
    modpack,
  });
  writeModrinthRecipeRevision({
    archiveData: data,
    fileName,
    input,
    instance,
    manifest,
    skippedFilePaths: dependencyResult.skippedFilePaths,
  });

  return {
    category: "modpacks",
    content: await getInstanceContent({ instanceId: instance.id }),
    fileName,
    instance,
    path: artifactPath,
  };
};

const installModrinthFileData = async (
  input: DownloadModrinthFileInput,
  options: InstallCurseForgeFileDataOptions,
  downloadOptions: DownloadModrinthFileOptions,
): Promise<DownloadModrinthFileResult> => {
  const category = input.category;
  const instance =
    category === "modpacks" ? null : getInstanceOrThrow(input.instanceId ?? "");

  if (category === "modpacks") {
    return installModrinthModpackData(input, options, downloadOptions);
  }

  if (!instance) {
    throw new Error("Select an instance before downloading this content.");
  }

  if (category === "mods" && instance?.modpack?.locked) {
    throw new Error(
      "Mods for this instance are managed by its linked modpack. Update the modpack instead.",
    );
  }

  const folder = getModrinthTargetFolder(category, instance);
  const path = join(folder, options.fileName);

  writeDownloadedFile(path, options.data);

  return {
    category,
    content: await getInstanceContent({ instanceId: instance.id }),
    fileName: options.fileName,
    instance: null,
    path,
  };
};

export const getInstanceContent = async ({
  instanceId,
}: GetInstanceContentInput): Promise<InstanceContent> => {
  const instance = getInstanceOrThrow(instanceId);

  const [
    mods,
    resourcePacks,
    shaderPacks,
    screenshots,
    worlds,
    logFolders,
    curseForge,
    launchAttempts,
  ] = await Promise.all([
    listFolderEntriesAsync({
      enabled: isEnabledModFile,
      extensions: fileExtensions.mods,
      folder: instance.folders.mods,
      kind: "mod",
    }).then((entries) => entries.filter((entry) => entry.enabled !== null)),
    listFolderEntriesAsync({
      allowDirectories: true,
      extensions: fileExtensions.resourcePacks,
      folder: instance.folders.resourcePacks,
      kind: "resourcePack",
    }),
    listFolderEntriesAsync({
      allowDirectories: true,
      extensions: fileExtensions.shaderPacks,
      folder: instance.folders.shaderPacks,
      kind: "shaderPack",
    }),
    listFolderEntriesAsync({
      extensions: fileExtensions.screenshots,
      folder: instance.folders.screenshots,
      kind: "screenshot",
    }).then((entries) =>
      entries.sort(
        (a, b) =>
          new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime(),
      ),
    ),
    listFolderEntriesAsync({
      allowDirectories: true,
      folder: instance.folders.saves,
      kind: "world",
    }),
    Promise.resolve(listInstanceLogFolders(instance)),
    Promise.resolve(readCurseForgeMetadata(instance)),
    Promise.resolve(
      readLaunchAttemptRecords(instance, {
        limit: maxLaunchAttemptsInContent,
      }),
    ),
  ]);

  const logs = logFolders
    .flatMap((folder) => folder.files)
    .sort(
      (a, b) =>
        new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime(),
    );
  const serverManager = getInstanceServerManager({
    instance,
    mods,
    resourcePacks,
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
    curseForge,
    instanceId: instance.id,
    launchAttempts,
    logFolders,
    logs,
    mods,
    refreshedAt: new Date().toISOString(),
    recipe: getInstanceRecipeSummary(instance),
    resourcePacks,
    screenshots,
    serverManager,
    serverList: getServerListEntry(instance.gameDirectory),
    shaderPacks,
    worlds,
  };
};

export const createInstanceServer = async (
  input: CreateInstanceServerInput,
): Promise<CreateInstanceServerResult> => {
  const instance = getInstanceOrThrow(input.instanceId);
  const name = normalizeServerName(input.name);
  const serverRoot = getServerWorkspaceRoot(instance);
  const serverPath = getAvailableServerPath(serverRoot, name);

  mkdirSync(serverPath, { recursive: true });

  try {
    const content = await getInstanceContent({ instanceId: instance.id });
    const candidates = content.serverManager.candidates;
    const selectedCandidates = candidates.filter(
      (candidate) =>
        candidate.selectedByDefault ||
        (input.includeClientOnlyMods && candidate.side === "clientOnly"),
    );
    const skippedFiles = candidates.filter(
      (candidate) => !selectedCandidates.includes(candidate),
    );
    const copiedFiles: Array<InstanceFileEntry> = [];

    for (const candidate of selectedCandidates) {
      copiedFiles.push(copyCandidateToServer(candidate, serverPath));
    }

    writeServerTextFile(
      join(serverPath, "server.properties"),
      [
        `level-name=${instance.name.replace(/[=\r\n]/g, " ").trim() || "world"}`,
        "motd=Nyxen local server",
        "online-mode=true",
        "enable-command-block=false",
        "allow-flight=false",
        "server-port=25565",
        "",
      ].join("\n"),
    );
    writeServerTextFile(
      join(serverPath, "eula.txt"),
      `# Review https://aka.ms/MinecraftEULA before changing this value.\neula=${
        input.acceptEula ? "true" : "false"
      }\n`,
    );
    writeServerTextFile(
      join(serverPath, "README.txt"),
      [
        `${name}`,
        "",
        `Source instance: ${instance.name}`,
        `Minecraft: ${instance.versionId}`,
        `Loader: ${instance.loader}${instance.loaderVersion ? ` ${instance.loaderVersion}` : ""}`,
        "",
        instance.loader === "vanilla"
          ? "Run start.sh after reviewing eula.txt."
          : `Run install-loader.sh once to set up the ${instance.loader} server, then run start.sh.`,
        "",
      ].join("\n"),
    );
    writeServerTextFile(
      join(serverPath, serverMetadataFileName),
      `${JSON.stringify(
        {
          createdAt: new Date().toISOString(),
          instanceId: instance.id,
          loader: instance.loader,
          loaderVersion: instance.loaderVersion,
          name,
          schemaVersion: 1,
          sourceInstanceName: instance.name,
          versionId: instance.versionId,
        },
        null,
        2,
      )}\n`,
    );

    const launcherFileName = await setupModLoaderServer(instance, serverPath);
    writeServerScripts(instance, serverPath, launcherFileName);

    const nextContent = await getInstanceContent({ instanceId: instance.id });
    const server =
      nextContent.serverManager.workspaces.find(
        (workspace) => workspace.path === serverPath,
      ) ?? getServerWorkspace(serverPath, name);

    if (!server) {
      throw new Error("Server workspace could not be created.");
    }

    return {
      content: nextContent,
      copiedFiles,
      server,
      skippedFiles,
    };
  } catch (error) {
    try {
      if (existsSync(serverPath)) {
        rmSync(serverPath, { force: true, recursive: true });
      }
    } catch {
      // Ignore cleanup errors to surface the original creation error.
    }
    throw error;
  }
};

export const deleteInstanceServer = async ({
  instanceId,
  serverId,
}: DeleteInstanceServerInput): Promise<DeleteInstanceServerResult> => {
  const instance = getInstanceOrThrow(instanceId);
  const normalizedServerId = assertSafeFileName(serverId);
  const serverRoot = getServerWorkspaceRoot(instance);
  const serverPath = join(serverRoot, normalizedServerId);

  if (!isPathInside(serverRoot, serverPath)) {
    throw new Error("Server path is invalid.");
  }

  if (!existsSync(serverPath)) {
    return {
      content: await getInstanceContent({ instanceId: instance.id }),
      deleted: false,
      serverId: normalizedServerId,
    };
  }

  const stats = statSync(serverPath);

  if (!stats.isDirectory()) {
    throw new Error("Server path is not a folder.");
  }

  rmSync(serverPath, { force: true, recursive: true });

  return {
    content: await getInstanceContent({ instanceId: instance.id }),
    deleted: true,
    serverId: normalizedServerId,
  };
};

export const getInstanceLogFile = ({
  fileId,
  instanceId,
  maxBytes,
  maxLines,
}: GetInstanceLogFileInput): InstanceLogFilePreview => {
  const instance = getInstanceOrThrow(instanceId);
  const entry = resolveLogFileEntry(instance, fileId);
  const stats = statSync(entry.path);
  const previewBytes = normalizeLogPreviewBytes(maxBytes);
  const previewLines = normalizeLogPreviewLines(maxLines);
  const preview = entry.fileName.toLowerCase().endsWith(".gz")
    ? readCompressedLogPreview(entry.path, stats, previewBytes)
    : readPlainLogTail(entry.path, stats, previewBytes);
  const lines = parseLogPreviewLines(
    decodeLogText(preview.bytes),
    previewLines,
  );

  return {
    entry,
    lines,
    readBytes: preview.readBytes,
    refreshedAt: new Date().toISOString(),
    summary: {
      errors: lines.filter(
        (line) =>
          line.type !== "stackTrace" &&
          (line.level === "error" || line.level === "fatal"),
      ).length,
      totalLines: lines.length,
      warnings: lines.filter(
        (line) => line.type !== "stackTrace" && line.level === "warn",
      ).length,
    },
    totalBytes: stats.size,
    truncated: preview.truncated,
  };
};

export const downloadCurseForgeFile = async (
  input: DownloadCurseForgeFileInput,
  options: DownloadCurseForgeFileOptions = {},
): Promise<DownloadCurseForgeFileResult> => {
  const fileName = sanitizeCurseForgeFileName(input);
  const data = await fetchCurseForgeDownload(input, options);

  return installCurseForgeFileData(input, { data, fileName }, options);
};

export const downloadModrinthFile = async (
  input: DownloadModrinthFileInput,
  options: DownloadModrinthFileOptions = {},
): Promise<DownloadModrinthFileResult> => {
  const fileName = sanitizeModrinthFileName(input);
  const data = await fetchModrinthDownload(input, options);

  return installModrinthFileData(input, { data, fileName }, options);
};

export const installDownloadedCurseForgeFile = async (
  input: InstallDownloadedCurseForgeFileInput,
  options: DownloadCurseForgeFileOptions = {},
): Promise<InstallDownloadedCurseForgeFileResult> => {
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
    ...(await installCurseForgeFileData(
      input,
      {
        data: new Uint8Array(readFileSync(sourcePath)),
        fileName,
      },
      options,
    )),
    sourcePath,
  };
};

export const setInstanceModEnabled = async ({
  enabled,
  fileName,
  instanceId,
}: SetInstanceModEnabledInput): Promise<InstanceContent> => {
  const instance = getInstanceOrThrow(instanceId);

  if (instance.modpack?.locked) {
    throw new Error(
      "Mods for this instance are managed by its linked modpack. Update the modpack instead.",
    );
  }

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

export const getInstanceModpackUpdate = async (
  { instanceId }: GetInstanceModpackUpdateInput,
  options: DownloadCurseForgeFileOptions = {},
): Promise<InstanceModpackUpdate> => {
  const instance = getInstanceOrThrow(instanceId);
  const current = instance.modpack;
  const checkedAt = new Date().toISOString();

  if (!current) {
    throw new Error("This instance is not linked to a CurseForge modpack.");
  }

  const latest = await getCurseForgeProject(current.projectId, options);
  const latestFileId = latest.latestFile?.id
    ? String(latest.latestFile.id)
    : null;

  return {
    checkedAt,
    current,
    instanceId: instance.id,
    latest,
    reason: latestFileId ? null : "CurseForge did not return a latest file.",
    updateAvailable: Boolean(latestFileId && latestFileId !== current.fileId),
  };
};

export const updateInstanceModpack = async (
  { instanceId }: UpdateInstanceModpackInput,
  options: DownloadCurseForgeFileOptions = {},
): Promise<UpdateInstanceModpackResult> => {
  const instance = getInstanceOrThrow(instanceId);
  const update = await getInstanceModpackUpdate({ instanceId }, options);
  const latest = update.latest;
  const latestFile = latest?.latestFile;

  if (!latest || !latestFile || !update.updateAvailable) {
    return {
      content: await getInstanceContent({ instanceId }),
      instance,
      update,
    };
  }

  const input: DownloadCurseForgeFileInput = {
    category: "modpacks",
    file: latestFile,
    instanceId,
    projectId: latest.id,
    projectLogoUrl: latest.logoUrl,
    projectName: latest.name,
    projectScreenshotUrls: latest.screenshotUrls,
    projectSlug: latest.slug,
    projectWebsiteUrl: latest.websiteUrl,
  };
  const fileName = sanitizeCurseForgeFileName(input);
  writeInstanceUpdateSnapshot({ instance, targetFile: latestFile });
  const data = await fetchCurseForgeDownload(input, options);
  const result = await installCurseForgeModpackData(
    input,
    { data, fileName, replacingInstance: instance },
    options,
  );
  const updatedInstance = result.instance;

  if (!updatedInstance?.modpack) {
    throw new Error("Modpack update did not return an updated instance.");
  }

  return {
    content: result.content ?? (await getInstanceContent({ instanceId })),
    instance: updatedInstance,
    update: {
      checkedAt: new Date().toISOString(),
      current: updatedInstance.modpack,
      instanceId,
      latest,
      reason: null,
      updateAvailable: false,
    },
  };
};
