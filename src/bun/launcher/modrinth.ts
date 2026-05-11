import { z } from "zod";
import type {
  ModLoader,
  ModrinthProjectFileSummary,
  ModrinthProjectSection,
  ModrinthProjectSummary,
  ModrinthSearchResult,
  ModrinthSortField,
  ModrinthStatus,
  SearchModrinthProjectsInput,
} from "../../shared/types";

export const MODRINTH_API_BASE_URL = "https://api.modrinth.com/v2";

const modrinthProjectTypeBySection: Record<
  ModrinthProjectSection,
  "mod" | "modpack" | "resourcepack" | "shader"
> = {
  mods: "mod",
  modpacks: "modpack",
  "resource-packs": "resourcepack",
  shaders: "shader",
};

type Fetcher = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

export type ModrinthOptions = {
  baseUrl?: string;
  fetcher?: Fetcher;
  requestTimeoutMs?: number;
};

type NormalizedSearchInput = {
  gameVersion: string | null;
  index: number;
  loader: ModLoader | null;
  pageSize: number;
  query: string | null;
  section: ModrinthProjectSection;
  sortField: ModrinthSortField;
};

const DEFAULT_MODRINTH_REQUEST_TIMEOUT_MS = 20_000;

const modrinthSortByInput: Record<ModrinthSortField, string> = {
  downloads: "downloads",
  follows: "follows",
  newest: "newest",
  relevance: "relevance",
  updated: "updated",
};

const releaseTypeSchema = z
  .string()
  .transform((value): ModrinthProjectFileSummary["releaseType"] => {
    if (value === "alpha" || value === "beta" || value === "release") {
      return value;
    }

    return "unknown";
  });

const searchHitSchema = z
  .object({
    author: z.string().optional(),
    categories: z.array(z.string()).optional(),
    date_created: z.string().nullable().optional(),
    date_modified: z.string().nullable().optional(),
    description: z.string().optional(),
    display_categories: z.array(z.string()).optional(),
    downloads: z.number().optional(),
    follows: z.number().optional(),
    gallery: z.array(z.string()).optional(),
    icon_url: z.string().nullable().optional(),
    latest_version: z.string().nullable().optional(),
    project_id: z.string(),
    project_type: z.enum(["mod", "modpack", "resourcepack", "shader"]),
    slug: z.string(),
    title: z.string(),
    versions: z.array(z.string()).optional(),
  })
  .passthrough();

const searchResponseSchema = z.object({
  hits: z.array(searchHitSchema),
  limit: z.number().int().optional(),
  offset: z.number().int().optional(),
  total_hits: z.number().int().optional(),
});

const fileSchema = z
  .object({
    filename: z.string(),
    hashes: z
      .object({
        sha1: z.string().optional(),
        sha512: z.string().optional(),
      })
      .passthrough()
      .optional(),
    primary: z.boolean().optional(),
    size: z.number().optional(),
    url: z.string(),
  })
  .passthrough();

const versionSchema = z
  .object({
    date_published: z.string().nullable().optional(),
    files: z.array(fileSchema).optional(),
    game_versions: z.array(z.string()).optional(),
    id: z.string(),
    loaders: z.array(z.string()).optional(),
    name: z.string().optional(),
    version_number: z.string().optional(),
    version_type: releaseTypeSchema,
  })
  .passthrough();

const versionsResponseSchema = z.array(versionSchema);

export const getModrinthStatus = (): ModrinthStatus => ({
  baseUrl: MODRINTH_API_BASE_URL,
  configured: true,
  projectTypes: modrinthProjectTypeBySection,
});

const getRequestTimeoutMs = (options: ModrinthOptions = {}): number => {
  if (options.requestTimeoutMs !== undefined) {
    return Math.max(1, Math.trunc(options.requestTimeoutMs));
  }

  const configured = Number(
    process.env.NYXEN_MODRINTH_REQUEST_TIMEOUT_MS ?? "",
  );

  if (!Number.isFinite(configured) || configured <= 0) {
    return DEFAULT_MODRINTH_REQUEST_TIMEOUT_MS;
  }

  return Math.max(1_000, Math.trunc(configured));
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
  input: SearchModrinthProjectsInput,
): NormalizedSearchInput => {
  const section = input?.section ?? "modpacks";

  if (!Object.hasOwn(modrinthProjectTypeBySection, section)) {
    throw new Error("Modrinth section is not supported.");
  }

  const pageSize = Math.max(1, Math.min(50, clampInt(input?.pageSize, 24)));
  const index = Math.max(
    0,
    Math.min(10_000 - pageSize, clampInt(input?.index, 0)),
  );
  const gameVersion = normalizeOptionalText(
    input?.gameVersion,
    "Modrinth game version",
    64,
  );
  const query = normalizeOptionalText(
    input?.query,
    "Modrinth search query",
    128,
  );
  const requestedLoader = input?.loader;
  const loader =
    requestedLoader && requestedLoader !== "vanilla" ? requestedLoader : null;

  return {
    gameVersion,
    index,
    loader,
    pageSize,
    query,
    section,
    sortField: input?.sortField ?? "downloads",
  };
};

const buildApiUrl = (path: string, options: ModrinthOptions): URL => {
  const baseUrl = new URL(options.baseUrl ?? MODRINTH_API_BASE_URL);

  if (baseUrl.protocol !== "https:") {
    throw new Error("Modrinth API base URL must use HTTPS.");
  }

  return new URL(path, baseUrl);
};

const buildSearchUrl = (
  input: NormalizedSearchInput,
  options: ModrinthOptions,
): URL => {
  const url = buildApiUrl("/v2/search", options);
  const facets = [
    [`project_type:${modrinthProjectTypeBySection[input.section]}`],
  ];

  if (input.gameVersion) {
    facets.push([`versions:${input.gameVersion}`]);
  }

  if (input.loader) {
    facets.push([`categories:${input.loader}`]);
  }

  url.searchParams.set("facets", JSON.stringify(facets));
  url.searchParams.set("index", modrinthSortByInput[input.sortField]);
  url.searchParams.set("limit", String(input.pageSize));
  url.searchParams.set("offset", String(input.index));

  if (input.query) {
    url.searchParams.set("query", input.query);
  }

  return url;
};

const buildVersionsUrl = (
  projectIdOrSlug: string,
  input: NormalizedSearchInput,
  options: ModrinthOptions,
): URL => {
  const encodedProject = encodeURIComponent(projectIdOrSlug);
  const url = buildApiUrl(`/v2/project/${encodedProject}/version`, options);

  url.searchParams.set("include_changelog", "false");

  if (input.gameVersion) {
    url.searchParams.set("game_versions", JSON.stringify([input.gameVersion]));
  }

  if (input.loader) {
    url.searchParams.set("loaders", JSON.stringify([input.loader]));
  }

  return url;
};

const fetchModrinthJson = async (
  url: URL,
  options: ModrinthOptions,
): Promise<unknown> => {
  const controller = new AbortController();
  const timeoutMs = getRequestTimeoutMs(options);
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const fetcher = options.fetcher ?? fetch;
  let response: Response;

  try {
    response = await fetcher(url, {
      headers: {
        accept: "application/json",
        "user-agent": "Nyxen Minecraft Launcher (Modrinth catalog)",
      },
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(
        `Modrinth request timed out after ${Math.round(
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
      `Modrinth request failed: ${response.status} ${response.statusText}`,
    );
  }

  return response.json();
};

const loaderFromText = (value: string): ModLoader | null => {
  const normalized = value.trim().toLowerCase();

  if (normalized === "fabric") return "fabric";
  if (normalized === "forge") return "forge";
  if (normalized === "neoforge") return "neoforge";
  if (normalized === "quilt") return "quilt";
  if (normalized === "minecraft") return "vanilla";

  return null;
};

const unique = <T>(values: Array<T>): Array<T> => [...new Set(values)];

const mapLoaders = (values: Array<string>): Array<ModLoader> =>
  unique(
    values.map(loaderFromText).filter((value): value is ModLoader => !!value),
  );

const pickPrimaryFile = (
  version: z.infer<typeof versionSchema>,
): z.infer<typeof fileSchema> | null => {
  const files = version.files ?? [];

  return files.find((file) => file.primary) ?? files[0] ?? null;
};

const mapVersionFile = (
  version: z.infer<typeof versionSchema>,
): ModrinthProjectFileSummary | null => {
  const file = pickPrimaryFile(version);

  if (!file) return null;

  return {
    displayName: version.name ?? file.filename,
    downloadUrl: file.url,
    fileDate: version.date_published ?? null,
    fileName: file.filename,
    gameVersions: version.game_versions ?? [],
    hashes: {
      sha1: file.hashes?.sha1,
      sha512: file.hashes?.sha512,
    },
    id: version.id,
    modLoaders: mapLoaders(version.loaders ?? []),
    releaseType: version.version_type,
    sizeBytes: Math.max(0, Math.trunc(file.size ?? 0)),
    versionNumber: version.version_number ?? version.name ?? version.id,
  };
};

const getLatestFile = async (
  hit: z.infer<typeof searchHitSchema>,
  input: NormalizedSearchInput,
  options: ModrinthOptions,
): Promise<ModrinthProjectFileSummary | null> => {
  try {
    const response = versionsResponseSchema.parse(
      await fetchModrinthJson(
        buildVersionsUrl(hit.project_id, input, options),
        options,
      ),
    );
    const listedVersion = response.find(
      (version) => (version.files ?? []).length > 0,
    );

    return listedVersion ? mapVersionFile(listedVersion) : null;
  } catch {
    return null;
  }
};

const mapSection = (
  projectType: z.infer<typeof searchHitSchema>["project_type"],
): ModrinthProjectSection => {
  if (projectType === "mod") return "mods";
  if (projectType === "modpack") return "modpacks";
  if (projectType === "resourcepack") return "resource-packs";
  return "shaders";
};

const mapProject = (
  hit: z.infer<typeof searchHitSchema>,
  latestFile: ModrinthProjectFileSummary | null,
): ModrinthProjectSummary => ({
  authors: hit.author ? [hit.author] : [],
  categories: unique(hit.display_categories ?? hit.categories ?? []),
  dateModified: hit.date_modified ?? hit.date_created ?? null,
  downloadCount: hit.downloads ?? 0,
  follows: hit.follows ?? 0,
  gameVersions: hit.versions ?? latestFile?.gameVersions ?? [],
  id: hit.project_id,
  isAvailable: Boolean(latestFile),
  latestFile,
  logoUrl: hit.icon_url ?? null,
  modLoaders: unique([
    ...mapLoaders(hit.categories ?? []),
    ...(latestFile?.modLoaders ?? []),
  ]),
  name: hit.title,
  screenshotUrls: hit.gallery ?? [],
  section: mapSection(hit.project_type),
  slug: hit.slug,
  summary: hit.description ?? "",
  websiteUrl: `https://modrinth.com/${hit.project_type}/${hit.slug}`,
});

export const searchModrinthProjects = async (
  input: SearchModrinthProjectsInput,
  options: ModrinthOptions = {},
): Promise<ModrinthSearchResult> => {
  const normalizedInput = normalizeSearchInput(input);
  const response = searchResponseSchema.parse(
    await fetchModrinthJson(buildSearchUrl(normalizedInput, options), options),
  );
  const latestFiles = await Promise.all(
    response.hits.map((hit) => getLatestFile(hit, normalizedInput, options)),
  );

  return {
    data: response.hits.map((hit, index) =>
      mapProject(hit, latestFiles[index] ?? null),
    ),
    pagination: {
      index: response.offset ?? normalizedInput.index,
      pageSize: response.limit ?? normalizedInput.pageSize,
      resultCount: response.hits.length,
      totalCount: response.total_hits ?? response.hits.length,
    },
    source: {
      baseUrl: options.baseUrl ?? MODRINTH_API_BASE_URL,
      section: normalizedInput.section,
    },
  };
};
