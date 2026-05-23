import {
  existsSync,
  readFileSync,
  renameSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { and, desc, eq, ne, notLike, sql } from "drizzle-orm";
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
import {
  ensureLauncherDirectories,
  ensurePrivateDirectory,
  ensurePrivateFile,
  getVersionDirectory,
  isLauncherPathSegment,
  normalizeLauncherPathSegment,
} from "./paths";

export const MINECRAFT_VERSION_MANIFEST_URL =
  "https://piston-meta.mojang.com/mc/game/version_manifest_v2.json";

const manifestVersionSchema = z.object({
  complianceLevel: z.number().int().optional(),
  id: z.string().min(1).refine(isLauncherPathSegment, {
    message: "Version id cannot contain path separators.",
  }),
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
  id: z.string().min(1).refine(isLauncherPathSegment, {
    message: "Version details id cannot contain path separators.",
  }),
  javaVersion: z
    .object({
      component: z.string().min(1),
      majorVersion: z.number().int().positive(),
    })
    .optional(),
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
  requestTimeoutMs?: number;
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

const getRequestTimeoutMs = (options: VersionServiceOptions): number => {
  if (options.requestTimeoutMs !== undefined) {
    return Math.max(1, Math.trunc(options.requestTimeoutMs));
  }

  const configured = Number(
    process.env.NYXEN_METADATA_REQUEST_TIMEOUT_MS ?? "",
  );

  if (!Number.isFinite(configured) || configured <= 0) {
    return 20_000;
  }

  return Math.max(1_000, Math.trunc(configured));
};

const fetchJson = async (
  url: string,
  options: VersionServiceOptions,
): Promise<unknown> => {
  const requester = options.fetcher ?? fetch;
  const parsedUrl = new URL(url);

  if (parsedUrl.protocol !== "https:") {
    throw new Error("Minecraft metadata URL must use HTTPS.");
  }

  const controller = new AbortController();
  const timeoutMs = getRequestTimeoutMs(options);
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;

  try {
    response = await requester(url, { signal: controller.signal });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(
        `Minecraft metadata request timed out after ${Math.round(
          timeoutMs / 1000,
        )} seconds.`,
      );
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }

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
  const version = getVersionRow(
    normalizeLauncherPathSegment(versionId, "Minecraft version id"),
  );

  return version ? toVersionSummary(version) : null;
};

export const listMinecraftVersions = (
  input: ListMinecraftVersionsInput = null,
): Array<MinecraftVersionSummary> => {
  const includeHistorical = input?.includeHistorical ?? false;
  const includeSnapshots = input?.includeSnapshots ?? true;
  const limit = normalizeLimit(input?.limit);

  const where = and(
    includeSnapshots
      ? undefined
      : ne(schema.minecraftVersions.type, "snapshot"),
    includeHistorical
      ? undefined
      : notLike(schema.minecraftVersions.type, "old_%"),
  );

  return db
    .select()
    .from(schema.minecraftVersions)
    .where(where)
    .orderBy(desc(schema.minecraftVersions.releaseTime))
    .limit(limit)
    .all()
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

  const versionChunkSize = 100;

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

    for (let i = 0; i < parsed.versions.length; i += versionChunkSize) {
      const chunk = parsed.versions.slice(i, i + versionChunkSize);

      transaction
        .insert(schema.minecraftVersions)
        .values(
          chunk.map((version) => ({
            complianceLevel: version.complianceLevel ?? null,
            id: version.id,
            manifestUpdatedAt: refreshedAt,
            releaseTime: version.releaseTime,
            sha1: version.sha1 ?? null,
            time: version.time,
            type: version.type,
            url: version.url,
          })),
        )
        .onConflictDoUpdate({
          set: {
            complianceLevel: sql`excluded.compliance_level`,
            manifestUpdatedAt: sql`excluded.manifest_updated_at`,
            releaseTime: sql`excluded.release_time`,
            sha1: sql`excluded.sha1`,
            time: sql`excluded.time`,
            type: sql`excluded.type`,
            url: sql`excluded.url`,
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
  javaVersion: document.javaVersion,
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

const writeVersionDetails = (path: string, document: unknown): void => {
  const tempPath = `${path}.write-${process.pid}-${crypto.randomUUID()}.tmp`;

  ensurePrivateDirectory(dirname(path));

  try {
    writeFileSync(tempPath, `${JSON.stringify(document, null, 2)}\n`, {
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

export const getMinecraftVersionDetails = async (
  input: GetMinecraftVersionDetailsInput,
  options: VersionServiceOptions = {},
): Promise<MinecraftVersionDetails> => {
  const versionId = normalizeLauncherPathSegment(
    input.versionId,
    "Minecraft version id",
  );

  const version = getVersionRow(versionId);

  if (!version) {
    throw new Error(
      "Refresh the Minecraft version manifest before selecting this version.",
    );
  }

  const detailsPath = getVersionDetailsPath(versionId);

  if (!input.refresh && existsSync(detailsPath)) {
    try {
      return readVersionDetails(detailsPath, version.url);
    } catch {
      // Corrupt caches should recover automatically on the next metadata read.
    }
  }

  ensurePrivateDirectory(getVersionDirectory(versionId));

  const received = await fetchJson(version.url, options);
  const parsed = versionDetailsSchema.parse(received);

  if (parsed.id !== versionId) {
    throw new Error("Minecraft version metadata id does not match request.");
  }

  const cachedAt = (options.now?.() ?? new Date()).toISOString();

  writeVersionDetails(detailsPath, received);

  return toVersionDetails(parsed, detailsPath, version.url, cachedAt);
};
