import { createHash, randomUUID } from "node:crypto";
import {
  type Dirent,
  existsSync,
  readdirSync,
  readFileSync,
  renameSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import type {
  DownloadCurseForgeFileInput,
  DownloadModrinthFileInput,
  InstalledCurseForgeFile,
  InstanceRecipeDriftItem,
  InstanceRecipeDriftStatus,
  InstanceRecipeFilePolicy,
  InstanceRecipeFileSource,
  InstanceRecipeRevision,
  InstanceRecipeSummary,
  LauncherInstance,
} from "../../shared/types";
import { ensurePrivateDirectory, ensurePrivateFile } from "./paths";
import { listZipEntries } from "./zip";

type ModrinthRecipeManifestFile = {
  downloads: Array<string>;
  fileSize: number | null;
  hashes: {
    sha1?: string;
    sha512?: string;
  };
  path: string;
};

type ModrinthRecipeManifest = {
  files: Array<ModrinthRecipeManifestFile>;
  minecraftVersion: string;
  modLoader: LauncherInstance["loader"];
  modLoaderVersion: string | null;
  name: string | null;
  version: string | null;
};

type WriteModrinthRecipeRevisionInput = {
  archiveData: Uint8Array;
  fileName: string;
  input: DownloadModrinthFileInput;
  instance: LauncherInstance;
  manifest: ModrinthRecipeManifest;
  skippedFilePaths: Set<string>;
};

type CurseForgeRecipeManifestFile = {
  fileID: number;
  projectID: number;
  required: boolean;
};

type CurseForgeRecipeManifest = {
  files: Array<CurseForgeRecipeManifestFile>;
  minecraftVersion: string;
  modLoader: LauncherInstance["loader"];
  modLoaderVersion: string | null;
  name: string | null;
  overrides: string | null;
  recommendedMemoryMb: number | null;
  version: string | null;
};

type CurseForgeRecipeProviderFile = Pick<
  InstalledCurseForgeFile,
  "category" | "fileId" | "fileName" | "projectId"
>;

type WriteCurseForgeRecipeRevisionInput = {
  archiveData: Uint8Array;
  fileName: string;
  input: DownloadCurseForgeFileInput;
  installedFiles: Array<InstalledCurseForgeFile>;
  instance: LauncherInstance;
  manifest: CurseForgeRecipeManifest;
  skippedFiles: Array<CurseForgeRecipeProviderFile>;
};

const recipeRevisionFileName = "recipe-revision.json";
const maxDriftItems = 100;
const scannedRecipeRoots = new Set([
  "config",
  "mods",
  "resourcepacks",
  "shaderpacks",
]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const optionalString = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim() ? value.trim() : undefined;

const isSafeRecipePath = (value: string): boolean =>
  !value.includes("\\") &&
  !value.includes("\0") &&
  value
    .split("/")
    .every(
      (segment) => segment.length > 0 && segment !== "." && segment !== "..",
    );

const normalizeRecipePath = (value: string): string | null => {
  const normalized = value.replaceAll("\\", "/").replaceAll(/^\/+/g, "");

  return normalized && isSafeRecipePath(normalized) ? normalized : null;
};

const toGameRelativePath = (
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

  return normalizeRecipePath(relativePath.split(sep).join("/"));
};

const hashBytes = (data: Uint8Array, algorithm: "sha1" | "sha512"): string =>
  createHash(algorithm).update(data).digest("hex");

const hashFile = (path: string): { sha1: string; sha512: string } => {
  const data = readFileSync(path);

  return {
    sha1: hashBytes(data, "sha1"),
    sha512: hashBytes(data, "sha512"),
  };
};

const getRecipeRevisionPath = (instance: LauncherInstance): string =>
  join(instance.folders.metadata, recipeRevisionFileName);

const writeRecipeRevision = (
  instance: LauncherInstance,
  revision: InstanceRecipeRevision,
): void => {
  const path = getRecipeRevisionPath(instance);
  const tempPath = `${path}.write-${process.pid}-${randomUUID()}.tmp`;

  ensurePrivateDirectory(dirname(path));

  try {
    writeFileSync(tempPath, `${JSON.stringify(revision, null, 2)}\n`, {
      flag: "wx",
    });
    ensurePrivateFile(tempPath);
    renameSync(tempPath, path);
    ensurePrivateFile(path);
  } finally {
    if (existsSync(tempPath)) {
      unlinkSync(tempPath);
    }
  }
};

const parseRecipeRevision = (value: unknown): InstanceRecipeRevision | null => {
  if (!isRecord(value) || value.schemaVersion !== 1) return null;
  if (!optionalString(value.id) || !optionalString(value.instanceId)) {
    return null;
  }
  if (!Array.isArray(value.files) || !Array.isArray(value.overrides)) {
    return null;
  }

  return value as InstanceRecipeRevision;
};

export const readInstanceRecipeRevision = (
  instance: LauncherInstance,
): InstanceRecipeRevision | null => {
  const path = getRecipeRevisionPath(instance);

  if (!existsSync(path)) return null;

  try {
    return parseRecipeRevision(JSON.parse(readFileSync(path, "utf8")));
  } catch {
    return null;
  }
};

const getOverrideEntries = (
  archiveData: Uint8Array,
  overridesFolder = "overrides",
): InstanceRecipeRevision["overrides"] => {
  const normalizedFolder = normalizeRecipePath(overridesFolder);
  if (!normalizedFolder) return [];

  const prefix = `${normalizedFolder}/`;

  return listZipEntries(archiveData).flatMap((entry) => {
    if (!entry.name.startsWith(prefix)) return [];

    const path = normalizeRecipePath(entry.name.slice(prefix.length));
    if (!path) return [];

    return [
      {
        hashes: {
          sha1: hashBytes(entry.data, "sha1"),
          sha512: hashBytes(entry.data, "sha512"),
        },
        path,
        policy: "mutable-config" as const,
        sizeBytes: entry.data.byteLength,
      },
    ];
  });
};

const getCurseForgeRecipePath = (
  file: CurseForgeRecipeProviderFile,
): string | null => {
  const root =
    file.category === "mods"
      ? "mods"
      : file.category === "resource-packs"
        ? "resourcepacks"
        : file.category === "shaders"
          ? "shaderpacks"
          : file.category === "worlds"
            ? "saves"
            : null;

  return root ? normalizeRecipePath(`${root}/${file.fileName}`) : null;
};

const getRecipeFileMetadata = (
  instance: LauncherInstance,
  relativePath: string,
): {
  hashes: { sha1: string; sha512: string };
  sizeBytes: number;
} | null => {
  const path = join(instance.gameDirectory, ...relativePath.split("/"));

  if (!existsSync(path)) return null;

  try {
    return {
      hashes: hashFile(path),
      sizeBytes: statSync(path).size,
    };
  } catch {
    return null;
  }
};

export const writeCurseForgeRecipeRevision = ({
  archiveData,
  fileName,
  input,
  installedFiles,
  instance,
  manifest,
  skippedFiles,
}: WriteCurseForgeRecipeRevisionInput): InstanceRecipeRevision => {
  const previousRevision = readInstanceRecipeRevision(instance);
  const manifestFileIds = new Set(
    manifest.files.map((file) => `${file.projectID}:${file.fileID}`),
  );
  const now = new Date().toISOString();
  const toRecipeFile = (
    file: CurseForgeRecipeProviderFile,
    optional: boolean,
  ): InstanceRecipeRevision["files"] => {
    if (!manifestFileIds.has(`${file.projectId}:${file.fileId}`)) return [];

    const path = getCurseForgeRecipePath(file);
    if (!path) return [];

    const metadata = optional ? null : getRecipeFileMetadata(instance, path);

    return [
      {
        downloadUrls: [],
        hashes: metadata?.hashes ?? {},
        optional,
        path,
        policy: "managed" as const,
        providerFileId: file.fileId,
        providerProjectId: file.projectId,
        sizeBytes: metadata?.sizeBytes ?? null,
        source: "curseforge" as const,
      },
    ];
  };
  const files = [
    ...installedFiles.flatMap((file) => toRecipeFile(file, false)),
    ...skippedFiles.flatMap((file) => toRecipeFile(file, true)),
  ];
  const revision: InstanceRecipeRevision = {
    createdAt: now,
    files,
    id: `recipe_${randomUUID()}`,
    instanceId: instance.id,
    overrides: getOverrideEntries(archiveData, manifest.overrides ?? undefined),
    previousRevisionId: previousRevision?.id ?? null,
    runtime: {
      javaComponent: null,
      javaMajorVersion: null,
      loader: manifest.modLoader,
      loaderVersion: manifest.modLoaderVersion,
      minecraftVersionId: manifest.minecraftVersion,
    },
    schemaVersion: 1,
    source: {
      fileId: String(input.file.id),
      fileName,
      kind: "curseforge",
      projectId: String(input.projectId),
      slug: input.projectSlug?.trim() || undefined,
      version: input.file.displayName || manifest.version || undefined,
      websiteUrl: input.projectWebsiteUrl ?? null,
    },
  };

  writeRecipeRevision(instance, revision);

  return revision;
};

export const writeModrinthRecipeRevision = ({
  archiveData,
  fileName,
  input,
  instance,
  manifest,
  skippedFilePaths,
}: WriteModrinthRecipeRevisionInput): InstanceRecipeRevision => {
  const previousRevision = readInstanceRecipeRevision(instance);
  const now = new Date().toISOString();
  const revision: InstanceRecipeRevision = {
    createdAt: now,
    files: manifest.files.map((file) => ({
      downloadUrls: file.downloads,
      hashes: file.hashes,
      optional: skippedFilePaths.has(file.path),
      path: file.path,
      policy: "managed",
      providerProjectId: input.projectId,
      sizeBytes: file.fileSize,
      source: "modrinth",
    })),
    id: `recipe_${randomUUID()}`,
    instanceId: instance.id,
    overrides: getOverrideEntries(archiveData),
    previousRevisionId: previousRevision?.id ?? null,
    runtime: {
      javaComponent: null,
      javaMajorVersion: null,
      loader: manifest.modLoader,
      loaderVersion: manifest.modLoaderVersion,
      minecraftVersionId: manifest.minecraftVersion,
    },
    schemaVersion: 1,
    source: {
      fileId: input.file.id,
      fileName,
      kind: "modrinth",
      projectId: input.projectId,
      slug: input.projectSlug?.trim() || undefined,
      version: input.file.versionNumber || manifest.version || undefined,
      websiteUrl: input.projectWebsiteUrl ?? null,
    },
  };

  writeRecipeRevision(instance, revision);

  return revision;
};

const addDriftItem = (
  drift: Array<InstanceRecipeDriftItem>,
  item: InstanceRecipeDriftItem,
): void => {
  if (drift.length < maxDriftItems) {
    drift.push(item);
  }
};

const scanRecipeFiles = (
  instance: LauncherInstance,
): Map<string, { path: string; sizeBytes: number }> => {
  const files = new Map<string, { path: string; sizeBytes: number }>();

  const visit = (path: string): void => {
    let entries: Array<Dirent>;

    try {
      entries = readdirSync(path, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (entry.isSymbolicLink()) continue;

      const childPath = join(path, entry.name);

      if (entry.isDirectory()) {
        visit(childPath);
        continue;
      }

      if (!entry.isFile()) continue;

      const relativePath = toGameRelativePath(instance, childPath);
      if (!relativePath) continue;

      const topLevel = relativePath.split("/")[0] ?? "";
      if (!scannedRecipeRoots.has(topLevel)) continue;

      const stats = statSync(childPath);
      files.set(relativePath, { path: childPath, sizeBytes: stats.size });
    }
  };

  visit(instance.gameDirectory);

  return files;
};

const compareExpectedFile = ({
  drift,
  expectedPath,
  filePath,
  hashes,
  optional,
  policy,
  sizeBytes,
  source,
}: {
  drift: Array<InstanceRecipeDriftItem>;
  expectedPath: string;
  filePath: string;
  hashes: { sha1?: string; sha512?: string };
  optional: boolean;
  policy: InstanceRecipeFilePolicy;
  sizeBytes: number | null;
  source: InstanceRecipeFileSource;
}): InstanceRecipeDriftStatus | null => {
  if (!existsSync(filePath)) {
    addDriftItem(drift, {
      path: expectedPath,
      policy,
      sizeBytes,
      source,
      status: optional ? "optionalMissing" : "missing",
    });
    return optional ? "optionalMissing" : "missing";
  }

  const expectedHash = hashes.sha512 ?? hashes.sha1;
  const expectedAlgorithm = hashes.sha512
    ? "sha512"
    : hashes.sha1
      ? "sha1"
      : null;

  if (!expectedHash || !expectedAlgorithm) {
    addDriftItem(drift, {
      path: expectedPath,
      policy,
      sizeBytes,
      source,
      status: "weaklyVerified",
    });
    return "weaklyVerified";
  }

  const actual = hashFile(filePath);
  const actualHash =
    expectedAlgorithm === "sha512" ? actual.sha512 : actual.sha1;

  if (actualHash.toLowerCase() === expectedHash.toLowerCase()) {
    return null;
  }

  addDriftItem(drift, {
    actualSha1: actual.sha1,
    actualSha512: actual.sha512,
    expectedSha1: hashes.sha1,
    expectedSha512: hashes.sha512,
    path: expectedPath,
    policy,
    sizeBytes,
    source,
    status: "changed",
  });

  return "changed";
};

export const getInstanceRecipeSummary = (
  instance: LauncherInstance,
): InstanceRecipeSummary | null => {
  const revision = readInstanceRecipeRevision(instance);

  if (!revision) return null;

  const drift: Array<InstanceRecipeDriftItem> = [];
  const trackedPaths = new Set<string>();
  let changed = 0;
  let missing = 0;
  let optionalMissing = 0;
  let weaklyVerified = 0;

  for (const file of revision.files) {
    const path = normalizeRecipePath(file.path);
    if (!path) continue;

    trackedPaths.add(path);
    const status = compareExpectedFile({
      drift,
      expectedPath: path,
      filePath: join(instance.gameDirectory, ...path.split("/")),
      hashes: file.hashes,
      optional: file.optional,
      policy: file.policy,
      sizeBytes: file.sizeBytes,
      source: file.source,
    });

    if (status === "changed") changed += 1;
    if (status === "missing") missing += 1;
    if (status === "optionalMissing") optionalMissing += 1;
    if (status === "weaklyVerified") weaklyVerified += 1;
  }

  for (const override of revision.overrides) {
    const path = normalizeRecipePath(override.path);
    if (!path) continue;

    trackedPaths.add(path);
    const status = compareExpectedFile({
      drift,
      expectedPath: path,
      filePath: join(instance.gameDirectory, ...path.split("/")),
      hashes: override.hashes,
      optional: false,
      policy: override.policy,
      sizeBytes: override.sizeBytes,
      source: "local",
    });

    if (status === "changed") changed += 1;
    if (status === "missing") missing += 1;
    if (status === "weaklyVerified") weaklyVerified += 1;
  }

  let added = 0;

  for (const [path, file] of scanRecipeFiles(instance)) {
    if (trackedPaths.has(path)) continue;

    added += 1;
    addDriftItem(drift, {
      path,
      policy: "local-only",
      sizeBytes: file.sizeBytes,
      source: "local",
      status: "added",
    });
  }

  const status =
    missing > 0 || changed > 0 || added > 0
      ? "drifted"
      : optionalMissing > 0
        ? "incomplete"
        : weaklyVerified > 0
          ? "weaklyVerified"
          : "clean";

  return {
    counts: {
      added,
      changed,
      managedFiles: revision.files.length,
      missing,
      optionalMissing,
      overrides: revision.overrides.length,
      weaklyVerified,
    },
    drift,
    revision,
    status,
  };
};
