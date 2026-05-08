import type {
  ListLoaderVersionsInput,
  LoaderVersionSummary,
} from "../../shared/types";

const FABRIC_META = "https://meta.fabricmc.net/v2";
const QUILT_META = "https://meta.quiltmc.org/v3";
const FORGE_MAVEN =
  "https://maven.minecraftforge.net/net/minecraftforge/forge/maven-metadata.xml";
const NEOFORGE_MAVEN =
  "https://maven.neoforged.net/releases/net/neoforged/neoforge/maven-metadata.xml";

type CacheEntry = { versions: Array<LoaderVersionSummary>; expiresAt: number };
const cache = new Map<string, CacheEntry>();
const TTL = 5 * 60 * 1000;
const DEFAULT_LOADER_REQUEST_TIMEOUT_MS = 15_000;

const cached = (key: string): Array<LoaderVersionSummary> | null => {
  const e = cache.get(key);
  return e && Date.now() < e.expiresAt ? e.versions : null;
};

const store = (key: string, versions: Array<LoaderVersionSummary>): void => {
  cache.set(key, { versions, expiresAt: Date.now() + TTL });
};

const getLoaderRequestTimeoutMs = (): number => {
  const configured = Number(process.env.NYXEN_LOADER_REQUEST_TIMEOUT_MS ?? "");

  if (!Number.isFinite(configured) || configured <= 0) {
    return DEFAULT_LOADER_REQUEST_TIMEOUT_MS;
  }

  return Math.max(1_000, Math.trunc(configured));
};

const fetchLoaderMetadata = async (url: string): Promise<Response> => {
  const parsedUrl = new URL(url);

  if (parsedUrl.protocol !== "https:") {
    throw new Error("Loader metadata URL must use HTTPS.");
  }

  const timeoutMs = getLoaderRequestTimeoutMs();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { signal: controller.signal });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(
        `Loader metadata request timed out after ${Math.round(
          timeoutMs / 1000,
        )} seconds.`,
      );
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
};

const getText = async (url: string): Promise<string> => {
  const r = await fetchLoaderMetadata(url);
  if (!r.ok) throw new Error(`HTTP ${r.status} fetching ${url}`);
  return r.text();
};

const getJsonOrEmpty = async <T>(
  url: string,
  emptyStatuses: Array<number>,
): Promise<T | null> => {
  const r = await fetchLoaderMetadata(url);
  if (emptyStatuses.includes(r.status)) return null;
  if (!r.ok) throw new Error(`HTTP ${r.status} fetching ${url}`);
  return r.json() as Promise<T>;
};

const xmlVersions = (xml: string): Array<string> =>
  [...xml.matchAll(/<version>([\w.+-]+?)<\/version>/g)]
    .map((m) => m[1])
    .filter((v): v is string => !!v);

const listFabric = async (
  mcVersion: string,
): Promise<Array<LoaderVersionSummary>> => {
  const key = `fabric:${mcVersion}`;
  const hit = cached(key);
  if (hit) return hit;

  const data = await getJsonOrEmpty<
    Array<{ loader: { version: string; stable: boolean } }>
  >(
    `${FABRIC_META}/versions/loader/${encodeURIComponent(mcVersion)}`,
    [400, 404],
  );
  const versions =
    data?.map((e) => ({ id: e.loader.version, stable: e.loader.stable })) ?? [];
  store(key, versions);
  return versions;
};

const listQuilt = async (
  mcVersion: string,
): Promise<Array<LoaderVersionSummary>> => {
  const key = `quilt:${mcVersion}`;
  const hit = cached(key);
  if (hit) return hit;

  const data = await getJsonOrEmpty<Array<{ loader: { version: string } }>>(
    `${QUILT_META}/versions/loader/${encodeURIComponent(mcVersion)}`,
    [400, 404],
  );
  const versions =
    data?.map((e) => ({
      id: e.loader.version,
      stable:
        !e.loader.version.includes("beta") &&
        !e.loader.version.includes("alpha"),
    })) ?? [];
  store(key, versions);
  return versions;
};

const listForge = async (
  mcVersion: string,
): Promise<Array<LoaderVersionSummary>> => {
  const key = `forge:${mcVersion}`;
  const hit = cached(key);
  if (hit) return hit;

  const xml = await getText(FORGE_MAVEN);
  const prefix = `${mcVersion}-`;
  const versions = xmlVersions(xml)
    .filter((v) => v.startsWith(prefix))
    .map((v) => {
      const id = v.slice(prefix.length);
      return { id, stable: !id.includes("beta") && !id.includes("alpha") };
    })
    .reverse();

  store(key, versions);
  return versions;
};

const neoforgePrefix = (mcVersion: string): string | null => {
  // Old Minecraft versioning: 1.x.y (e.g. 1.21.4)
  const m = mcVersion.match(/^1\.(\d+)(?:\.(\d+))?$/);
  if (m) {
    const major = Number(m[1]);
    const minor = Number(m[2] ?? 0);
    if (major === 20 && minor === 1) return "47.";
    if (major >= 20) return `${major}.${minor}.`;
    return null;
  }

  // New Minecraft epoch versioning: e.g. "26.1" or "26.1.2"
  // NeoForge mirrors the first two version components as prefix (e.g. "26.1.")
  const m2 = mcVersion.match(/^(\d+)\.(\d+)/);
  if (m2 && Number(m2[1]) >= 26) return `${m2[1]}.${m2[2]}.`;

  return null;
};

const listNeoForge = async (
  mcVersion: string,
): Promise<Array<LoaderVersionSummary>> => {
  const prefix = neoforgePrefix(mcVersion);
  if (!prefix) return [];

  const key = `neoforge:${mcVersion}`;
  const hit = cached(key);
  if (hit) return hit;

  const xml = await getText(NEOFORGE_MAVEN);
  const versions = xmlVersions(xml)
    .filter((v) => v.startsWith(prefix))
    .map((v) => ({
      id: v,
      stable: !v.includes("beta") && !v.includes("alpha"),
    }))
    .reverse();

  store(key, versions);
  return versions;
};

export const listLoaderVersions = async (
  input: ListLoaderVersionsInput,
): Promise<Array<LoaderVersionSummary>> => {
  const { loader, mcVersion } = input;
  if (loader === "vanilla" || !mcVersion.trim()) return [];

  switch (loader) {
    case "fabric":
      return listFabric(mcVersion);
    case "quilt":
      return listQuilt(mcVersion);
    case "forge":
      return listForge(mcVersion);
    case "neoforge":
      return listNeoForge(mcVersion);
    default:
      return [];
  }
};
