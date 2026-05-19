import { randomUUID } from "node:crypto";
import {
  existsSync,
  readdirSync,
  renameSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname, isAbsolute } from "node:path";
import { pathToFileURL } from "node:url";
import { asc, eq } from "drizzle-orm";
import type {
  CreateLauncherInstanceInput,
  DeleteLauncherInstanceInput,
  DeleteLauncherInstanceResult,
  LauncherInstance,
  LauncherInstanceModpack,
  ModLoader,
  UpdateLauncherInstanceInput,
} from "../../shared/types";
import { db } from "../db/client";
import * as schema from "../db/schema";
import {
  ensureInstanceFolders,
  ensurePrivateDirectory,
  ensurePrivateFile,
  getInstanceDirectory,
  getInstanceMetadataPath,
  normalizeLauncherPathSegment,
} from "./paths";
import { getLauncherProfile } from "./profiles";
import { normalizeJavaExecutable } from "./validation";

type InstanceRow = typeof schema.launcherInstances.$inferSelect;

const modLoaders = new Set<ModLoader>([
  "fabric",
  "forge",
  "neoforge",
  "quilt",
  "vanilla",
]);

const normalizeName = (name: string): string => {
  const normalized = name.trim();

  if (
    normalized.length < 2 ||
    normalized.length > 64 ||
    normalized.includes("\0")
  ) {
    throw new Error("Instance name must be between 2 and 64 characters.");
  }

  return normalized;
};

const normalizeVersionId = (versionId: string): string =>
  normalizeLauncherPathSegment(versionId, "Minecraft version id");

const normalizeLoader = (loader: ModLoader | undefined): ModLoader => {
  if (!loader) {
    return "vanilla";
  }

  if (!modLoaders.has(loader)) {
    throw new Error("Unsupported mod loader.");
  }

  return loader;
};

const normalizeMemory = (
  value: number | undefined,
  fallback: number,
): number => {
  if (!Number.isFinite(value)) {
    return fallback;
  }

  return Math.max(256, Math.min(65_536, Math.trunc(value ?? fallback)));
};

const normalizeStringArray = (
  values: Array<string> | undefined,
  label: string,
): Array<string> => {
  if (values === undefined) {
    return [];
  }

  if (!Array.isArray(values)) {
    throw new Error(`${label} must be a list of strings.`);
  }

  if (values.length > 128) {
    throw new Error(`${label} cannot contain more than 128 entries.`);
  }

  return values
    .map((value) => {
      if (typeof value !== "string") {
        throw new Error(`${label} must only contain strings.`);
      }

      const normalized = value.trim();

      if (normalized.length > 512 || normalized.includes("\0")) {
        throw new Error(`${label} contains an invalid argument.`);
      }

      return normalized;
    })
    .filter((value) => value.length > 0);
};

const normalizeMediaUrl = (
  value: string | undefined,
  label: string,
): string | null => {
  const normalized = value?.trim();

  if (!normalized) {
    return null;
  }

  if (normalized.length > 2048 || normalized.includes("\0")) {
    throw new Error(`${label} is invalid.`);
  }

  const url = isAbsolute(normalized)
    ? pathToFileURL(normalized)
    : new URL(normalized);

  if (url.protocol !== "https:" && url.protocol !== "file:") {
    throw new Error(`${label} must use HTTPS or file URLs.`);
  }

  return url.toString();
};

const normalizeIconUrl = (iconUrl: string | undefined): string | null =>
  normalizeMediaUrl(iconUrl, "Instance icon URL");

const normalizeBannerUrl = (bannerUrl: string | undefined): string | null =>
  normalizeMediaUrl(bannerUrl, "Instance banner URL");

const normalizeOptionalText = (
  value: string | undefined,
  label: string,
): string | null => {
  const normalized = value?.trim();

  if (!normalized) {
    return null;
  }

  if (normalized.length > 256 || normalized.includes("\0")) {
    throw new Error(`${label} is invalid.`);
  }

  return normalized;
};

const parseStringArray = (value: string): Array<string> => {
  try {
    const parsed: unknown = JSON.parse(value);

    if (Array.isArray(parsed)) {
      return parsed.filter((item): item is string => typeof item === "string");
    }
  } catch {
    return [];
  }

  return [];
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const optionalString = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim() ? value.trim() : undefined;

const parseModpackMetadata = (
  value: string | null,
): LauncherInstanceModpack | null => {
  if (!value) return null;

  let parsed: unknown;

  try {
    parsed = JSON.parse(value);
  } catch {
    return null;
  }

  if (
    !isRecord(parsed) ||
    (parsed.source !== "curseforge" && parsed.source !== "modrinth")
  ) {
    return null;
  }

  const artifactPath = optionalString(parsed.artifactPath);
  const fileId = optionalString(parsed.fileId);
  const fileName = optionalString(parsed.fileName);
  const installedAt = optionalString(parsed.installedAt);
  const manifestPath = optionalString(parsed.manifestPath);
  const name = optionalString(parsed.name);
  const projectId = optionalString(parsed.projectId);
  const updatedAt = optionalString(parsed.updatedAt);

  if (
    !artifactPath ||
    !fileId ||
    !fileName ||
    !installedAt ||
    !manifestPath ||
    !name ||
    !projectId ||
    !updatedAt
  ) {
    return null;
  }

  return {
    artifactPath,
    bannerUrl: optionalString(parsed.bannerUrl) ?? null,
    fileId,
    fileName,
    iconUrl: optionalString(parsed.iconUrl) ?? null,
    installedAt,
    installedFiles:
      typeof parsed.installedFiles === "number" ? parsed.installedFiles : 0,
    locked: true,
    manifestPath,
    name,
    overridesPath: optionalString(parsed.overridesPath) ?? null,
    projectId,
    skippedFiles:
      typeof parsed.skippedFiles === "number" ? parsed.skippedFiles : 0,
    slug: optionalString(parsed.slug),
    source: parsed.source,
    updatedAt,
    version: optionalString(parsed.version),
    websiteUrl: optionalString(parsed.websiteUrl) ?? null,
  };
};

const serializeModpackMetadata = (
  modpack: LauncherInstanceModpack | null,
): string | null => (modpack ? JSON.stringify(modpack) : null);

const countLocalModFiles = (instanceId: string): number => {
  const modsFolder = ensureInstanceFolders(instanceId).mods;

  return readdirSync(modsFolder, { withFileTypes: true }).filter(
    (entry) =>
      entry.isFile() &&
      (entry.name.endsWith(".jar") || entry.name.endsWith(".jar.disabled")),
  ).length;
};

const getLauncherInstanceRowOrThrow = (instanceId: string): InstanceRow => {
  const normalizedId = instanceId.trim();

  if (!normalizedId) {
    throw new Error("Launcher instance id is required.");
  }

  const row =
    db
      .select()
      .from(schema.launcherInstances)
      .where(eq(schema.launcherInstances.id, normalizedId))
      .get() ?? null;

  if (!row) {
    throw new Error("Launcher instance does not exist.");
  }

  return row;
};

const writeInstanceMetadata = (instance: LauncherInstance): void => {
  const metadataPath = instance.metadataPath;
  const tempPath = `${metadataPath}.write-${process.pid}-${randomUUID()}.tmp`;
  const metadata = {
    app: {
      name: "nyxen",
      schemaVersion: 1,
    },
    bannerUrl: instance.bannerUrl,
    folders: instance.folders,
    gameDirectory: instance.gameDirectory,
    iconUrl: instance.iconUrl,
    instanceDirectory: instance.instanceDirectory,
    instanceId: instance.id,
    loader: instance.loader,
    loaderVersion: instance.loaderVersion,
    modpack: instance.modpack,
    name: instance.name,
    updatedAt: instance.updatedAt,
    versionId: instance.versionId,
  };

  ensurePrivateDirectory(dirname(metadataPath));

  try {
    writeFileSync(tempPath, `${JSON.stringify(metadata, null, 2)}\n`, {
      flag: "wx",
    });
    ensurePrivateFile(tempPath);
    renameSync(tempPath, metadataPath);
    ensurePrivateFile(metadataPath);
  } finally {
    if (existsSync(tempPath)) {
      unlinkSync(tempPath);
    }
  }
};

const toInstance = (row: InstanceRow): LauncherInstance => {
  const folders = ensureInstanceFolders(row.id);
  const instance = {
    bannerUrl: row.bannerUrl,
    createdAt: row.createdAt,
    folders,
    gameArgs: parseStringArray(row.gameArgs),
    gameDirectory: folders.game,
    iconUrl: row.iconUrl,
    id: row.id,
    instanceDirectory: folders.root,
    javaArgs: parseStringArray(row.javaArgs),
    javaExecutable: row.javaExecutable,
    lastLaunchedAt: row.lastLaunchedAt,
    loader: row.loader as ModLoader,
    loaderVersion: row.loaderVersion,
    metadataPath: getInstanceMetadataPath(row.id),
    memoryMaxMb: row.memoryMaxMb,
    memoryMinMb: row.memoryMinMb,
    modpack: parseModpackMetadata(row.modpackMetadata),
    name: row.name,
    profileId: row.profileId,
    updatedAt: row.updatedAt,
    versionId: row.versionId,
  };

  // Self-heal: only write the on-disk metadata if it's missing. Mutation paths
  // call writeInstanceMetadata explicitly when fields actually change.
  if (!existsSync(instance.metadataPath)) {
    writeInstanceMetadata(instance);
  }

  return instance;
};

const persistInstance = (row: InstanceRow): LauncherInstance => {
  const instance = toInstance(row);
  writeInstanceMetadata(instance);
  return instance;
};

const assertVersionExists = (versionId: string): void => {
  const version =
    db
      .select({ id: schema.minecraftVersions.id })
      .from(schema.minecraftVersions)
      .where(eq(schema.minecraftVersions.id, versionId))
      .get() ?? null;

  if (!version) {
    throw new Error(
      "Refresh the Minecraft version manifest before creating this instance.",
    );
  }
};

const normalizeProfileId = (profileId: string | undefined): string | null => {
  const normalizedProfileId = profileId?.trim();

  if (!normalizedProfileId) {
    return null;
  }

  if (!getLauncherProfile(normalizedProfileId)) {
    throw new Error("Selected launcher profile does not exist.");
  }

  return normalizedProfileId;
};

export const listLauncherInstances = (): Array<LauncherInstance> =>
  db
    .select()
    .from(schema.launcherInstances)
    .orderBy(asc(schema.launcherInstances.name))
    .all()
    .map(toInstance);

export const getLauncherInstance = (
  instanceId: string,
): LauncherInstance | null => {
  const normalizedId = instanceId.trim();

  if (!normalizedId) {
    return null;
  }

  const row =
    db
      .select()
      .from(schema.launcherInstances)
      .where(eq(schema.launcherInstances.id, normalizedId))
      .get() ?? null;

  return row ? toInstance(row) : null;
};

export const markLauncherInstanceLaunched = (
  instanceId: string,
  launchedAt = new Date().toISOString(),
): void => {
  const normalizedId = instanceId.trim();

  if (!normalizedId) return;

  db.update(schema.launcherInstances)
    .set({
      lastLaunchedAt: launchedAt,
      updatedAt: launchedAt,
    })
    .where(eq(schema.launcherInstances.id, normalizedId))
    .run();
};

export const createLauncherInstance = (
  input: CreateLauncherInstanceInput,
): LauncherInstance => {
  const versionId = normalizeVersionId(input.versionId);
  assertVersionExists(versionId);

  const memoryMinMb = normalizeMemory(input.memoryMinMb, 512);
  const memoryMaxMb = Math.max(
    memoryMinMb,
    normalizeMemory(input.memoryMaxMb, 4096),
  );
  const now = new Date().toISOString();
  const instanceId = `instance_${randomUUID()}`;
  const folders = ensureInstanceFolders(instanceId);
  const instance = {
    bannerUrl: normalizeBannerUrl(input.bannerUrl),
    createdAt: now,
    gameArgs: JSON.stringify(normalizeStringArray(input.gameArgs, "Game args")),
    gameDirectory: folders.game,
    iconUrl: normalizeIconUrl(input.iconUrl),
    id: instanceId,
    javaArgs: JSON.stringify(normalizeStringArray(input.javaArgs, "Java args")),
    javaExecutable: normalizeJavaExecutable(input.javaExecutable),
    lastLaunchedAt: null,
    loader: normalizeLoader(input.loader),
    loaderVersion: normalizeOptionalText(input.loaderVersion, "Loader version"),
    memoryMaxMb,
    memoryMinMb,
    modpackMetadata: null,
    name: normalizeName(input.name),
    profileId: normalizeProfileId(input.profileId),
    updatedAt: now,
    versionId,
  };

  db.insert(schema.launcherInstances).values(instance).run();

  return persistInstance(instance);
};

export const updateLauncherInstance = (
  input: UpdateLauncherInstanceInput,
): LauncherInstance => {
  const existing = getLauncherInstanceRowOrThrow(input.instanceId);
  const versionId =
    input.versionId === undefined
      ? existing.versionId
      : normalizeVersionId(input.versionId);

  assertVersionExists(versionId);

  const memoryMinMb = normalizeMemory(input.memoryMinMb, existing.memoryMinMb);
  const memoryMaxMb = Math.max(
    memoryMinMb,
    normalizeMemory(input.memoryMaxMb, existing.memoryMaxMb),
  );
  const now = new Date().toISOString();
  const values = {
    bannerUrl:
      input.bannerUrl === undefined
        ? existing.bannerUrl
        : normalizeBannerUrl(input.bannerUrl ?? undefined),
    gameArgs:
      input.gameArgs === undefined
        ? existing.gameArgs
        : JSON.stringify(normalizeStringArray(input.gameArgs, "Game args")),
    iconUrl:
      input.iconUrl === undefined
        ? existing.iconUrl
        : normalizeIconUrl(input.iconUrl ?? undefined),
    javaArgs:
      input.javaArgs === undefined
        ? existing.javaArgs
        : JSON.stringify(normalizeStringArray(input.javaArgs, "Java args")),
    javaExecutable:
      input.javaExecutable === undefined
        ? existing.javaExecutable
        : normalizeJavaExecutable(input.javaExecutable ?? undefined),
    loader:
      input.loader === undefined
        ? (existing.loader as ModLoader)
        : normalizeLoader(input.loader),
    loaderVersion:
      input.loaderVersion === undefined
        ? existing.loaderVersion
        : normalizeOptionalText(
            input.loaderVersion ?? undefined,
            "Loader version",
          ),
    memoryMaxMb,
    memoryMinMb,
    name: input.name === undefined ? existing.name : normalizeName(input.name),
    profileId:
      input.profileId === undefined
        ? existing.profileId
        : normalizeProfileId(input.profileId ?? undefined),
    updatedAt: now,
    versionId,
  };
  const runtimeChanged =
    values.versionId !== existing.versionId ||
    values.loader !== existing.loader ||
    values.loaderVersion !== existing.loaderVersion;

  if (
    runtimeChanged &&
    input.confirmRuntimeCompatibility !== true &&
    countLocalModFiles(existing.id) > 0
  ) {
    throw new Error(
      "Confirm mod compatibility before changing Minecraft version or mod loader.",
    );
  }

  const updated = {
    ...existing,
    ...values,
  };

  db.update(schema.launcherInstances)
    .set(values)
    .where(eq(schema.launcherInstances.id, existing.id))
    .run();

  return persistInstance(updated);
};

export const setLauncherInstanceModpack = ({
  bannerUrl,
  iconUrl,
  instanceId,
  modpack,
}: {
  bannerUrl?: string | null;
  iconUrl?: string | null;
  instanceId: string;
  modpack: LauncherInstanceModpack | null;
}): LauncherInstance => {
  const existing = getLauncherInstanceRowOrThrow(instanceId);
  const now = new Date().toISOString();
  const values = {
    bannerUrl:
      bannerUrl === undefined
        ? existing.bannerUrl
        : normalizeBannerUrl(bannerUrl ?? undefined),
    iconUrl:
      iconUrl === undefined
        ? existing.iconUrl
        : normalizeIconUrl(iconUrl ?? undefined),
    modpackMetadata: serializeModpackMetadata(modpack),
    updatedAt: now,
  };
  const updated = {
    ...existing,
    ...values,
  };

  db.update(schema.launcherInstances)
    .set(values)
    .where(eq(schema.launcherInstances.id, existing.id))
    .run();

  return persistInstance(updated);
};

export const deleteLauncherInstance = (
  input: DeleteLauncherInstanceInput,
): DeleteLauncherInstanceResult => {
  const existing = getLauncherInstanceRowOrThrow(input.instanceId);
  const deleteFiles = input.deleteFiles === true;

  if (deleteFiles) {
    rmSync(getInstanceDirectory(existing.id), { force: true, recursive: true });
  }

  db.delete(schema.launcherInstances)
    .where(eq(schema.launcherInstances.id, existing.id))
    .run();

  return {
    deleted: true,
    deletedFiles: deleteFiles,
    instanceId: existing.id,
  };
};
