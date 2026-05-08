import {
  existsSync,
  mkdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import type {
  GetMinecraftVersionDetailsInput,
  ListMinecraftVersionsInput,
  MinecraftVersionDetails,
  MinecraftVersionManifest,
  MinecraftVersionSummary,
} from "../../shared/types";
import { db } from "../db/client";
import * as schema from "../db/schema";
import { ensureLauncherDirectories, getVersionDirectory } from "./paths";

export const MINECRAFT_VERSION_MANIFEST_URL =
  "https://piston-meta.mojang.com/mc/game/version_manifest_v2.json";

const manifestVersionSchema = z.object({
  complianceLevel: z.number().int().optional(),
  id: z.string().min(1),
  releaseTime: z.string().min(1),
  sha1: z.string().optional(),
  time: z.string().min(1),
  type: z.string().min(1),
  url: z.string().url(),
});

const versionManifestSchema = z.object({
  latest: z.object({
    release: z.string().min(1),
    snapshot: z.string().min(1),
  }),
  versions: z.array(manifestVersionSchema),
});

const downloadSchema = z.object({
  path: z.string().optional(),
  sha1: z.string().optional(),
  size: z.number().int().optional(),
  url: z.string().url().optional(),
});

const librarySchema = z.object({
  downloads: z
    .object({
      artifact: downloadSchema.optional(),
      classifiers: z.record(z.string(), downloadSchema).optional(),
    })
    .optional(),
  name: z.string().min(1),
  natives: z.record(z.string(), z.string()).optional(),
  rules: z
    .array(
      z.object({
        action: z.string(),
        os: z
          .object({
            arch: z.string().optional(),
            name: z.string().optional(),
            version: z.string().optional(),
          })
          .optional(),
      }),
    )
    .optional(),
});

const versionDetailsSchema = z.object({
  arguments: z
    .object({
      game: z.array(z.unknown()).optional(),
      jvm: z.array(z.unknown()).optional(),
    })
    .optional(),
  assetIndex: z
    .object({
      id: z.string().min(1),
      sha1: z.string().optional(),
      size: z.number().int().optional(),
      totalSize: z.number().int().optional(),
      url: z.string().url().optional(),
    })
    .optional(),
  assets: z.string().optional(),
  downloads: z.record(z.string(), downloadSchema).optional(),
  id: z.string().min(1),
  libraries: z.array(librarySchema).optional(),
  mainClass: z.string().optional(),
  minecraftArguments: z.string().optional(),
  type: z.string().min(1),
});

type Fetcher = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

type VersionServiceOptions = {
  fetcher?: Fetcher;
  manifestUrl?: string;
  now?: () => Date;
};

type VersionRow = typeof schema.minecraftVersions.$inferSelect;
type ManifestRow = typeof schema.minecraftVersionManifests.$inferSelect;
type VersionDetailsDocument = z.infer<typeof versionDetailsSchema>;

const normalizeLimit = (limit: number | undefined): number => {
  if (!Number.isFinite(limit)) {
    return 250;
  }

  return Math.max(1, Math.min(2000, Math.trunc(limit ?? 250)));
};

const toVersionSummary = (row: VersionRow): MinecraftVersionSummary => ({
  complianceLevel: row.complianceLevel,
  id: row.id,
  releaseTime: row.releaseTime,
  sha1: row.sha1,
  time: row.time,
  type: row.type,
  url: row.url,
});

const emptyManifest = (
  sourceUrl = MINECRAFT_VERSION_MANIFEST_URL,
): MinecraftVersionManifest => ({
  cached: false,
  latest: {
    release: null,
    snapshot: null,
  },
  refreshedAt: null,
  sourceUrl,
  versions: [],
});

const fetchJson = async (
  url: string,
  options: VersionServiceOptions,
): Promise<unknown> => {
  const requester = options.fetcher ?? fetch;
  const response = await requester(url);

  if (!response.ok) {
    throw new Error(
      `Minecraft metadata request failed: ${response.status} ${response.statusText}`,
    );
  }

  return response.json();
};

const getManifestRow = (): ManifestRow | null =>
  db
    .select()
    .from(schema.minecraftVersionManifests)
    .where(eq(schema.minecraftVersionManifests.id, "main"))
    .get() ?? null;

const getVersionRow = (versionId: string): VersionRow | null =>
  db
    .select()
    .from(schema.minecraftVersions)
    .where(eq(schema.minecraftVersions.id, versionId))
    .get() ?? null;

export const getMinecraftVersionSummary = (
  versionId: string,
): MinecraftVersionSummary | null => {
  const version = getVersionRow(versionId.trim());

  return version ? toVersionSummary(version) : null;
};

export const listMinecraftVersions = (
  input: ListMinecraftVersionsInput = null,
): Array<MinecraftVersionSummary> => {
  const includeHistorical = input?.includeHistorical ?? false;
  const includeSnapshots = input?.includeSnapshots ?? true;
  const limit = normalizeLimit(input?.limit);

  return db
    .select()
    .from(schema.minecraftVersions)
    .orderBy(desc(schema.minecraftVersions.releaseTime))
    .all()
    .filter((version) => {
      if (!includeSnapshots && version.type === "snapshot") {
        return false;
      }

      return includeHistorical || !version.type.startsWith("old_");
    })
    .slice(0, limit)
    .map(toVersionSummary);
};

export const getMinecraftVersionManifest = (
  input: ListMinecraftVersionsInput = null,
): MinecraftVersionManifest => {
  const manifest = getManifestRow();

  if (!manifest) {
    return emptyManifest();
  }

  return {
    cached: true,
    latest: {
      release: manifest.latestRelease,
      snapshot: manifest.latestSnapshot,
    },
    refreshedAt: manifest.refreshedAt,
    sourceUrl: manifest.sourceUrl,
    versions: listMinecraftVersions(input),
  };
};

export const refreshMinecraftVersionManifest = async (
  options: VersionServiceOptions = {},
): Promise<MinecraftVersionManifest> => {
  ensureLauncherDirectories();

  const sourceUrl = options.manifestUrl ?? MINECRAFT_VERSION_MANIFEST_URL;
  const received = await fetchJson(sourceUrl, options);
  const parsed = versionManifestSchema.parse(received);
  const refreshedAt = (options.now?.() ?? new Date()).toISOString();

  db.transaction((transaction) => {
    transaction
      .insert(schema.minecraftVersionManifests)
      .values({
        id: "main",
        latestRelease: parsed.latest.release,
        latestSnapshot: parsed.latest.snapshot,
        refreshedAt,
        sourceUrl,
      })
      .onConflictDoUpdate({
        set: {
          latestRelease: parsed.latest.release,
          latestSnapshot: parsed.latest.snapshot,
          refreshedAt,
          sourceUrl,
        },
        target: schema.minecraftVersionManifests.id,
      })
      .run();

    for (const version of parsed.versions) {
      transaction
        .insert(schema.minecraftVersions)
        .values({
          complianceLevel: version.complianceLevel ?? null,
          id: version.id,
          manifestUpdatedAt: refreshedAt,
          releaseTime: version.releaseTime,
          sha1: version.sha1 ?? null,
          time: version.time,
          type: version.type,
          url: version.url,
        })
        .onConflictDoUpdate({
          set: {
            complianceLevel: version.complianceLevel ?? null,
            manifestUpdatedAt: refreshedAt,
            releaseTime: version.releaseTime,
            sha1: version.sha1 ?? null,
            time: version.time,
            type: version.type,
            url: version.url,
          },
          target: schema.minecraftVersions.id,
        })
        .run();
    }
  });

  return getMinecraftVersionManifest();
};

const getVersionDetailsPath = (versionId: string): string =>
  join(getVersionDirectory(versionId), `${versionId}.json`);

const toVersionDetails = (
  document: VersionDetailsDocument,
  path: string,
  sourceUrl: string,
  cachedAt: string,
): MinecraftVersionDetails => ({
  arguments: document.arguments,
  assetIndex: document.assetIndex,
  assets: document.assets,
  cachedAt,
  downloads: document.downloads,
  id: document.id,
  libraries: document.libraries ?? [],
  mainClass: document.mainClass,
  minecraftArguments: document.minecraftArguments,
  path,
  sourceUrl,
  type: document.type,
});

const readVersionDetails = (
  path: string,
  sourceUrl: string,
): MinecraftVersionDetails => {
  const parsed = versionDetailsSchema.parse(
    JSON.parse(readFileSync(path, "utf8")),
  );

  return toVersionDetails(
    parsed,
    path,
    sourceUrl,
    statSync(path).mtime.toISOString(),
  );
};

export const getMinecraftVersionDetails = async (
  input: GetMinecraftVersionDetailsInput,
  options: VersionServiceOptions = {},
): Promise<MinecraftVersionDetails> => {
  const versionId = input.versionId.trim();

  if (!versionId) {
    throw new Error("Minecraft version id is required.");
  }

  const version = getVersionRow(versionId);

  if (!version) {
    throw new Error(
      "Refresh the Minecraft version manifest before selecting this version.",
    );
  }

  const detailsPath = getVersionDetailsPath(versionId);

  if (!input.refresh && existsSync(detailsPath)) {
    return readVersionDetails(detailsPath, version.url);
  }

  mkdirSync(getVersionDirectory(versionId), { recursive: true });

  const received = await fetchJson(version.url, options);
  const parsed = versionDetailsSchema.parse(received);
  const cachedAt = (options.now?.() ?? new Date()).toISOString();

  writeFileSync(detailsPath, `${JSON.stringify(received, null, 2)}\n`);

  return toVersionDetails(parsed, detailsPath, version.url, cachedAt);
};
