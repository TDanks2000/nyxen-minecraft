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
import { getInstanceDirectory } from "./paths";
import { getLauncherProfile } from "./profiles";

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

  if (normalized.length < 2 || normalized.length > 64) {
    throw new Error("Instance name must be between 2 and 64 characters.");
  }

  return normalized;
};

const normalizeVersionId = (versionId: string): string => {
  const normalized = versionId.trim();

  if (!normalized) {
    throw new Error("Minecraft version id is required.");
  }

  return normalized;
};

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
): Array<string> =>
  values?.map((value) => value.trim()).filter((value) => value.length > 0) ??
  [];

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
    gameArgs: JSON.stringify(normalizeStringArray(input.gameArgs)),
    gameDirectory,
    iconUrl: input.iconUrl?.trim() || null,
    id: instanceId,
    javaArgs: JSON.stringify(normalizeStringArray(input.javaArgs)),
    javaExecutable: input.javaExecutable?.trim() || null,
    lastLaunchedAt: null,
    loader: normalizeLoader(input.loader),
    loaderVersion: input.loaderVersion?.trim() || null,
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
