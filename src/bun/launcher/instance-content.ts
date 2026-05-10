import { randomUUID } from "node:crypto";
import {
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  readdirSync,
  readFileSync,
  readSync,
  renameSync,
  type Stats,
  statSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
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
import { pathToFileURL } from "node:url";
import { gunzipSync } from "node:zlib";
import type {
  CurseForgeCategory,
  DownloadCurseForgeFileInput,
  DownloadCurseForgeFileResult,
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
  LauncherInstance,
  LauncherInstanceModpack,
  SetInstanceModEnabledInput,
  UpdateInstanceModpackInput,
  UpdateInstanceModpackResult,
} from "../../shared/types";
import type { CurseForgeOptions } from "./curseforge";
import { getCurseForgeProject, getCurseForgeProjectFile } from "./curseforge";
import {
  createLauncherInstance,
  getLauncherInstance,
  setLauncherInstanceModpack,
  updateLauncherInstance,
} from "./instances";
import { ensurePrivateDirectory, getLauncherDirectories } from "./paths";
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

type DownloadCurseForgeFileOptions = CurseForgeOptions & {
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

type ParsedCurseForgeModpackManifest = {
  files: Array<CurseForgeModpackManifestFile>;
  minecraftVersion: string;
  modLoader: LauncherInstance["loader"];
  modLoaderVersion: string | null;
  name: string | null;
  overrides: string | null;
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
    version: optionalString(parsed.version) ?? null,
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

  const decompressed = gunzipSync(readFileSync(path));
  const readBytes = Math.min(decompressed.byteLength, maxBytes);
  const start = Math.max(0, decompressed.byteLength - readBytes);

  return {
    bytes: decompressed.subarray(start),
    readBytes,
    truncated: start > 0,
  };
};

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

const getCurseForgeProgressItemId = (
  input: DownloadCurseForgeFileInput,
): string => `curseforge:${input.projectId}:${input.file.id}`;

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

    return pathToFileURL(path).toString();
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
): Promise<{ installedFiles: number; skippedFiles: number }> => {
  let installedFiles = 0;
  let skippedFiles = 0;
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

    try {
      const file = await getCurseForgeProjectFile(
        dependency.projectID,
        dependency.fileID,
        options,
      );
      dependencyLabel = file.fileName || file.displayName || dependencyLabel;

      if (!file.downloadUrl) {
        skippedFiles += 1;
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
        continue;
      }

      const installInput = await createModpackDependencyInstallInput({
        dependency,
        file,
        instance,
        options,
      });
      const fileName = sanitizeCurseForgeFileName(installInput);
      const data = await fetchCurseForgeDownload(installInput, options);

      await installCurseForgeFileData(
        installInput,
        { allowManagedInstance: true, data, fileName },
        options,
      );
      installedFiles += 1;
    } catch {
      skippedFiles += 1;
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

  return { installedFiles, skippedFiles };
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
        versionId: manifest.minecraftVersion,
      })
    : createLauncherInstance({
        bannerUrl: input.projectScreenshotUrls?.[0] ?? undefined,
        iconUrl: input.projectLogoUrl ?? undefined,
        loader: manifest.modLoader,
        loaderVersion: manifest.modLoaderVersion ?? undefined,
        memoryMaxMb: 4096,
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

  return {
    category: "modpacks",
    content: getInstanceContent({ instanceId: instance.id }),
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
    content: getInstanceContent({ instanceId: instance.id }),
    fileName,
    instance: null,
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
  const logFolders = listInstanceLogFolders(instance);
  const logs = logFolders
    .flatMap((folder) => folder.files)
    .sort(
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
    logFolders,
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

export const setInstanceModEnabled = ({
  enabled,
  fileName,
  instanceId,
}: SetInstanceModEnabledInput): InstanceContent => {
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
      content: getInstanceContent({ instanceId }),
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
    content: result.content ?? getInstanceContent({ instanceId }),
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
