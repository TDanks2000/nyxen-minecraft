import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { asc, eq } from "drizzle-orm";
import type {
  CreateLauncherInstanceInput,
  LauncherInstance,
  ModLoader,
} from "../../shared/types";
import { db } from "../db/client";
import * as schema from "../db/schema";
import { getInstanceDirectory, normalizeLauncherPathSegment } from "./paths";
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

const normalizeIconUrl = (iconUrl: string | undefined): string | null => {
  const normalized = iconUrl?.trim();

  if (!normalized) {
    return null;
  }

  if (normalized.length > 2048 || normalized.includes("\0")) {
    throw new Error("Instance icon URL is invalid.");
  }

  const url = new URL(normalized);

  if (url.protocol !== "https:") {
    throw new Error("Instance icon URL must use HTTPS.");
  }

  return url.toString();
};

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

const toInstance = (row: InstanceRow): LauncherInstance => ({
  createdAt: row.createdAt,
  gameArgs: parseStringArray(row.gameArgs),
  gameDirectory: row.gameDirectory,
  iconUrl: row.iconUrl,
  id: row.id,
  javaArgs: parseStringArray(row.javaArgs),
  javaExecutable: row.javaExecutable,
  lastLaunchedAt: row.lastLaunchedAt,
  loader: row.loader as ModLoader,
  loaderVersion: row.loaderVersion,
  memoryMaxMb: row.memoryMaxMb,
  memoryMinMb: row.memoryMinMb,
  name: row.name,
  profileId: row.profileId,
  updatedAt: row.updatedAt,
  versionId: row.versionId,
});

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
  const gameDirectory = getInstanceDirectory(instanceId);
  const instance = {
    createdAt: now,
    gameArgs: JSON.stringify(normalizeStringArray(input.gameArgs, "Game args")),
    gameDirectory,
    iconUrl: normalizeIconUrl(input.iconUrl),
    id: instanceId,
    javaArgs: JSON.stringify(normalizeStringArray(input.javaArgs, "Java args")),
    javaExecutable: normalizeJavaExecutable(input.javaExecutable),
    lastLaunchedAt: null,
    loader: normalizeLoader(input.loader),
    loaderVersion: normalizeOptionalText(input.loaderVersion, "Loader version"),
    memoryMaxMb,
    memoryMinMb,
    name: normalizeName(input.name),
    profileId: normalizeProfileId(input.profileId),
    updatedAt: now,
    versionId,
  };

  mkdirSync(gameDirectory, { recursive: true });
  db.insert(schema.launcherInstances).values(instance).run();

  return toInstance(instance);
};
