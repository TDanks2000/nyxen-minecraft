import { z } from "zod";
import type {
  CurseForgeProjectFileSummary,
  CurseForgeProjectSection,
  CurseForgeProjectSummary,
  CurseForgeSearchResult,
  CurseForgeSortField,
  CurseForgeStatus,
  ModLoader,
  SearchCurseForgeProjectsInput,
} from "../../shared/types";

export const CURSEFORGE_API_BASE_URL = "https://api.curseforge.com";
export const CURSEFORGE_MINECRAFT_GAME_ID = 432;
export const CURSEFORGE_MOD_CLASS_ID = 6;
export const CURSEFORGE_MODPACK_CLASS_ID = 4471;
export const CURSEFORGE_RESOURCE_PACK_CLASS_ID = 12;
export const CURSEFORGE_SHADER_CLASS_ID = 6552;
export const CURSEFORGE_WORLD_CLASS_ID = 17;

const curseForgeClassIdBySection: Record<CurseForgeProjectSection, number> = {
  mods: CURSEFORGE_MOD_CLASS_ID,
  modpacks: CURSEFORGE_MODPACK_CLASS_ID,
  "resource-packs": CURSEFORGE_RESOURCE_PACK_CLASS_ID,
  shaders: CURSEFORGE_SHADER_CLASS_ID,
  worlds: CURSEFORGE_WORLD_CLASS_ID,
};

type Fetcher = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

export type CurseForgeOptions = {
  apiKey?: string;
  baseUrl?: string;
  fetcher?: Fetcher;
  requestTimeoutMs?: number;
};

type ApiKeyInfo = {
  key: string | null;
  source: CurseForgeStatus["keySource"];
};

type NormalizedSearchInput = {
  classId: number;
  gameVersion: string | null;
  index: number;
  loader: ModLoader | null;
  pageSize: number;
  query: string | null;
  section: CurseForgeProjectSection;
  sortField: CurseForgeSortField | null;
  sortOrder: "asc" | "desc" | null;
};

const DEFAULT_CURSEFORGE_REQUEST_TIMEOUT_MS = 20_000;

const modLoaderTypeByLoader: Partial<Record<ModLoader, number>> = {
  fabric: 4,
  forge: 1,
  neoforge: 6,
  quilt: 5,
};

const loaderByModLoaderType = new Map<number, ModLoader>([
  [1, "forge"],
  [4, "fabric"],
  [5, "quilt"],
  [6, "neoforge"],
]);

const sortFieldByInput: Record<CurseForgeSortField, number> = {
  downloads: 6,
  featured: 1,
  lastUpdated: 3,
  name: 4,
  popularity: 2,
  rating: 12,
  released: 11,
};

const releaseTypeById: Record<
  number,
  CurseForgeProjectFileSummary["releaseType"]
> = {
  1: "release",
  2: "beta",
  3: "alpha",
};

const linkSchema = z
  .object({
    websiteUrl: z.string().nullable().optional(),
  })
  .passthrough();

const assetSchema = z
  .object({
    thumbnailUrl: z.string().nullable().optional(),
    url: z.string().nullable().optional(),
  })
  .passthrough();

const categorySchema = z
  .object({
    name: z.string().optional(),
  })
  .passthrough();

const authorSchema = z
  .object({
    name: z.string().optional(),
  })
  .passthrough();

const fileSchema = z
  .object({
    displayName: z.string().optional(),
    downloadUrl: z.string().nullable().optional(),
    fileDate: z.string().nullable().optional(),
    fileName: z.string().optional(),
    gameVersions: z.array(z.string()).optional(),
    id: z.number().int(),
    releaseType: z.number().int().optional(),
  })
  .passthrough();

const fileIndexSchema = z
  .object({
    fileId: z.number().int().optional(),
    filename: z.string().optional(),
    gameVersion: z.string().optional(),
    modLoader: z.number().int().optional(),
    releaseType: z.number().int().optional(),
  })
  .passthrough();

const modSchema = z
  .object({
    allowModDistribution: z.boolean().nullable().optional(),
    authors: z.array(authorSchema).optional(),
    categories: z.array(categorySchema).optional(),
    classId: z.number().int().nullable().optional(),
    dateModified: z.string().nullable().optional(),
    downloadCount: z.number().optional(),
    id: z.number().int(),
    isAvailable: z.boolean().optional(),
    isFeatured: z.boolean().optional(),
    latestFiles: z.array(fileSchema).optional(),
    latestFilesIndexes: z.array(fileIndexSchema).optional(),
    links: linkSchema.optional(),
    logo: assetSchema.nullable().optional(),
    name: z.string(),
    screenshots: z.array(assetSchema).optional(),
    slug: z.string().optional(),
    summary: z.string().optional(),
  })
  .passthrough();

const searchResponseSchema = z.object({
  data: z.array(modSchema),
  pagination: z
    .object({
      index: z.number().int().optional(),
      pageSize: z.number().int().optional(),
      resultCount: z.number().int().optional(),
      totalCount: z.number().int().optional(),
    })
    .optional(),
});

const projectResponseSchema = z.object({
  data: modSchema,
});

const projectFileResponseSchema = z.object({
  data: fileSchema,
});

export const getCurseForgeApiKeyInfo = (): ApiKeyInfo => {
  const nyxenKey = Bun.env.NYXEN_CURSEFORGE_API_KEY?.trim();

  if (nyxenKey) {
    return { key: nyxenKey, source: "NYXEN_CURSEFORGE_API_KEY" };
  }

  const genericKey = Bun.env.CURSEFORGE_API_KEY?.trim();

  if (genericKey) {
    return { key: genericKey, source: "CURSEFORGE_API_KEY" };
  }

  return { key: null, source: null };
};

export const getCurseForgeStatus = (): CurseForgeStatus => {
  const apiKey = getCurseForgeApiKeyInfo();

  return {
    baseUrl: CURSEFORGE_API_BASE_URL,
    classIds: curseForgeClassIdBySection,
    configured: !!apiKey.key,
    gameId: CURSEFORGE_MINECRAFT_GAME_ID,
    keySource: apiKey.source,
    modClassId: CURSEFORGE_MOD_CLASS_ID,
    modpackClassId: CURSEFORGE_MODPACK_CLASS_ID,
    resourcePackClassId: CURSEFORGE_RESOURCE_PACK_CLASS_ID,
    shaderClassId: CURSEFORGE_SHADER_CLASS_ID,
    worldClassId: CURSEFORGE_WORLD_CLASS_ID,
  };
};

const getRequestTimeoutMs = (options: CurseForgeOptions = {}): number => {
  if (options.requestTimeoutMs !== undefined) {
    return Math.max(1, Math.trunc(options.requestTimeoutMs));
  }

  const configured = Number(
    process.env.NYXEN_CURSEFORGE_REQUEST_TIMEOUT_MS ?? "",
  );

  if (!Number.isFinite(configured) || configured <= 0) {
    return DEFAULT_CURSEFORGE_REQUEST_TIMEOUT_MS;
  }

  return Math.max(1_000, Math.trunc(configured));
};

const getApiKey = (options: CurseForgeOptions): string => {
  const optionKey = options.apiKey?.trim();

  if (optionKey) {
    return optionKey;
  }

  const envKey = getCurseForgeApiKeyInfo().key;

  if (!envKey) {
    throw new Error(
      "CurseForge API key is not configured. Set NYXEN_CURSEFORGE_API_KEY to enable CurseForge catalog requests.",
    );
  }

  return envKey;
};

const normalizeOptionalText = (
  value: string | undefined,
  label: string,
  maxLength: number,
): string | null => {
  const normalized = value?.trim();

  if (!normalized) {
    return null;
  }

  if (normalized.length > maxLength || normalized.includes("\0")) {
    throw new Error(`${label} is invalid.`);
  }

  return normalized;
};

const clampInt = (value: number | undefined, fallback: number): number => {
  if (!Number.isFinite(value)) {
    return fallback;
  }

  return Math.trunc(value ?? fallback);
};

const normalizeSearchInput = (
  input: SearchCurseForgeProjectsInput,
): NormalizedSearchInput => {
  const section = input?.section ?? "modpacks";

  if (!Object.hasOwn(curseForgeClassIdBySection, section)) {
    throw new Error("CurseForge section is not supported.");
  }

  const pageSize = Math.max(1, Math.min(50, clampInt(input?.pageSize, 24)));
  const index = Math.max(
    0,
    Math.min(10_000 - pageSize, clampInt(input?.index, 0)),
  );
  const gameVersion = normalizeOptionalText(
    input?.gameVersion,
    "CurseForge game version",
    64,
  );
  const query = normalizeOptionalText(
    input?.query,
    "CurseForge search query",
    128,
  );
  const requestedLoader = input?.loader;
  const loader =
    requestedLoader && requestedLoader !== "vanilla" ? requestedLoader : null;

  if (loader && !modLoaderTypeByLoader[loader]) {
    throw new Error("Unsupported CurseForge mod loader filter.");
  }

  if (loader && !gameVersion) {
    throw new Error(
      "CurseForge loader filtering requires a Minecraft game version.",
    );
  }

  return {
    classId: curseForgeClassIdBySection[section],
    gameVersion,
    index,
    loader,
    pageSize,
    query,
    section,
    sortField: input?.sortField ?? null,
    sortOrder: input?.sortOrder ?? null,
  };
};

const buildSearchUrl = (
  input: NormalizedSearchInput,
  options: CurseForgeOptions,
): URL => {
  const baseUrl = new URL(options.baseUrl ?? CURSEFORGE_API_BASE_URL);

  if (baseUrl.protocol !== "https:") {
    throw new Error("CurseForge API base URL must use HTTPS.");
  }

  const url = new URL("/v1/mods/search", baseUrl);

  url.searchParams.set("gameId", String(CURSEFORGE_MINECRAFT_GAME_ID));
  url.searchParams.set("classId", String(input.classId));
  url.searchParams.set("index", String(input.index));
  url.searchParams.set("pageSize", String(input.pageSize));

  if (input.query) {
    url.searchParams.set("searchFilter", input.query);
  }

  if (input.gameVersion) {
    url.searchParams.set("gameVersion", input.gameVersion);
  }

  if (input.loader) {
    url.searchParams.set(
      "modLoaderType",
      String(modLoaderTypeByLoader[input.loader]),
    );
  }

  if (input.sortField) {
    url.searchParams.set(
      "sortField",
      String(sortFieldByInput[input.sortField]),
    );
  }

  if (input.sortOrder) {
    url.searchParams.set("sortOrder", input.sortOrder);
  }

  return url;
};

const fetchCurseForgeJson = async (
  url: URL,
  options: CurseForgeOptions,
): Promise<unknown> => {
  const apiKey = getApiKey(options);
  const controller = new AbortController();
  const timeoutMs = getRequestTimeoutMs(options);
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const fetcher = options.fetcher ?? fetch;

  let response: Response;

  try {
    response = await fetcher(url, {
      headers: {
        accept: "application/json",
        "x-api-key": apiKey,
      },
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(
        `CurseForge request timed out after ${Math.round(
          timeoutMs / 1000,
        )} seconds.`,
      );
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }

  if (response.status === 401 || response.status === 403) {
    throw new Error("CurseForge API rejected the configured API key.");
  }

  if (!response.ok) {
    throw new Error(
      `CurseForge request failed: ${response.status} ${response.statusText}`,
    );
  }

  return response.json();
};

const sectionFromClassId = (
  classId: number | null | undefined,
): CurseForgeProjectSummary["section"] => {
  const entry = Object.entries(curseForgeClassIdBySection).find(
    ([, sectionClassId]) => sectionClassId === classId,
  );

  return entry?.[0] ? (entry[0] as CurseForgeProjectSection) : "unknown";
};

const loaderFromText = (value: string): ModLoader | null => {
  const normalized = value.trim().toLowerCase();

  if (normalized === "fabric") return "fabric";
  if (normalized === "forge") return "forge";
  if (normalized === "neoforge") return "neoforge";
  if (normalized === "quilt") return "quilt";

  return null;
};

const unique = <T>(values: Array<T>): Array<T> => [...new Set(values)];

const mapLoaders = (
  gameVersions: Array<string>,
  indexes: Array<z.infer<typeof fileIndexSchema>>,
): Array<ModLoader> =>
  unique([
    ...indexes
      .map((index) =>
        typeof index.modLoader === "number"
          ? loaderByModLoaderType.get(index.modLoader)
          : null,
      )
      .filter((value): value is ModLoader => !!value),
    ...gameVersions
      .map(loaderFromText)
      .filter((value): value is ModLoader => !!value),
  ]);

const mapFile = (
  file: z.infer<typeof fileSchema>,
  indexes: Array<z.infer<typeof fileIndexSchema>>,
): CurseForgeProjectFileSummary => {
  const matchingIndexes = indexes.filter((index) => index.fileId === file.id);
  const gameVersions = unique([
    ...(file.gameVersions ?? []),
    ...matchingIndexes
      .map((index) => index.gameVersion)
      .filter((value): value is string => !!value),
  ]);

  return {
    displayName: file.displayName ?? file.fileName ?? String(file.id),
    downloadUrl: file.downloadUrl ?? null,
    fileDate: file.fileDate ?? null,
    fileName: file.fileName ?? file.displayName ?? String(file.id),
    gameVersions,
    id: file.id,
    modLoaders: mapLoaders(gameVersions, matchingIndexes),
    releaseType: releaseTypeById[file.releaseType ?? 0] ?? "unknown",
  };
};

const mapProject = (
  mod: z.infer<typeof modSchema>,
): CurseForgeProjectSummary => {
  const latestFiles = mod.latestFiles ?? [];
  const latestFileIndexes = mod.latestFilesIndexes ?? [];
  const latestFile = latestFiles[0]
    ? mapFile(latestFiles[0], latestFileIndexes)
    : null;
  const gameVersions = unique([
    ...(latestFile?.gameVersions ?? []),
    ...latestFileIndexes
      .map((index) => index.gameVersion)
      .filter((value): value is string => !!value),
  ]);

  return {
    allowDistribution: mod.allowModDistribution ?? null,
    authors: unique(
      (mod.authors ?? [])
        .map((author) => author.name)
        .filter((value): value is string => !!value),
    ),
    categories: unique(
      (mod.categories ?? [])
        .map((category) => category.name)
        .filter((value): value is string => !!value),
    ),
    classId: mod.classId ?? null,
    dateModified: mod.dateModified ?? null,
    downloadCount: mod.downloadCount ?? 0,
    gameVersions,
    id: mod.id,
    isAvailable: mod.isAvailable ?? true,
    isFeatured: mod.isFeatured ?? false,
    latestFile,
    logoUrl: mod.logo?.url ?? null,
    modLoaders: mapLoaders(gameVersions, latestFileIndexes),
    name: mod.name,
    screenshotUrls: unique(
      (mod.screenshots ?? [])
        .flatMap((asset) => [asset.url, asset.thumbnailUrl])
        .filter((value): value is string => !!value),
    ),
    section: sectionFromClassId(mod.classId),
    slug: mod.slug ?? String(mod.id),
    summary: mod.summary ?? "",
    websiteUrl: mod.links?.websiteUrl ?? null,
  };
};

export const searchCurseForgeProjects = async (
  input: SearchCurseForgeProjectsInput,
  options: CurseForgeOptions = {},
): Promise<CurseForgeSearchResult> => {
  const normalizedInput = normalizeSearchInput(input);
  const url = buildSearchUrl(normalizedInput, options);
  const response = searchResponseSchema.parse(
    await fetchCurseForgeJson(url, options),
  );

  return {
    data: response.data.map(mapProject),
    pagination: {
      index: response.pagination?.index ?? normalizedInput.index,
      pageSize: response.pagination?.pageSize ?? normalizedInput.pageSize,
      resultCount: response.pagination?.resultCount ?? response.data.length,
      totalCount: response.pagination?.totalCount ?? response.data.length,
    },
    source: {
      classId: normalizedInput.classId,
      gameId: CURSEFORGE_MINECRAFT_GAME_ID,
      section: normalizedInput.section,
    },
  };
};

const normalizeCurseForgeId = (
  value: number | string,
  label: string,
): number => {
  const id = typeof value === "number" ? value : Number(value);

  if (!Number.isInteger(id) || id <= 0) {
    throw new Error(`${label} is invalid.`);
  }

  return id;
};

const buildProjectUrl = (
  projectId: number | string,
  options: CurseForgeOptions,
): URL => {
  const baseUrl = new URL(options.baseUrl ?? CURSEFORGE_API_BASE_URL);

  if (baseUrl.protocol !== "https:") {
    throw new Error("CurseForge API base URL must use HTTPS.");
  }

  return new URL(
    `/v1/mods/${normalizeCurseForgeId(projectId, "CurseForge project id")}`,
    baseUrl,
  );
};

const buildProjectFileUrl = (
  projectId: number | string,
  fileId: number | string,
  options: CurseForgeOptions,
): URL => {
  const projectUrl = buildProjectUrl(projectId, options);

  return new URL(
    `${projectUrl.pathname}/files/${normalizeCurseForgeId(
      fileId,
      "CurseForge file id",
    )}`,
    projectUrl,
  );
};

export const getCurseForgeProject = async (
  projectId: number | string,
  options: CurseForgeOptions = {},
): Promise<CurseForgeProjectSummary> => {
  const response = projectResponseSchema.parse(
    await fetchCurseForgeJson(buildProjectUrl(projectId, options), options),
  );

  return mapProject(response.data);
};

export const getCurseForgeProjectFile = async (
  projectId: number | string,
  fileId: number | string,
  options: CurseForgeOptions = {},
): Promise<CurseForgeProjectFileSummary> => {
  const response = projectFileResponseSchema.parse(
    await fetchCurseForgeJson(
      buildProjectFileUrl(projectId, fileId, options),
      options,
    ),
  );

  return mapFile(response.data, []);
};
