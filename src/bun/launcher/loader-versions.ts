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

type CacheEntry = { versions: LoaderVersionSummary[]; expiresAt: number };
const cache = new Map<string, CacheEntry>();
const TTL = 5 * 60 * 1000;

const cached = (key: string): LoaderVersionSummary[] | null => {
  const e = cache.get(key);
  return e && Date.now() < e.expiresAt ? e.versions : null;
};

const store = (key: string, versions: LoaderVersionSummary[]): void => {
  cache.set(key, { versions, expiresAt: Date.now() + TTL });
};

const getText = async (url: string): Promise<string> => {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status} fetching ${url}`);
  return r.text();
};

const getJson = async <T>(url: string): Promise<T> => {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status} fetching ${url}`);
  return r.json() as Promise<T>;
};

const xmlVersions = (xml: string): string[] =>
  [...xml.matchAll(/<version>([\w.+\-]+?)<\/version>/g)]
    .map((m) => m[1])
    .filter(Boolean);

const listFabric = async (mcVersion: string): Promise<LoaderVersionSummary[]> => {
  const key = `fabric:${mcVersion}`;
  const hit = cached(key);
  if (hit) return hit;

  const data = await getJson<Array<{ loader: { version: string; stable: boolean } }>>(
    `${FABRIC_META}/versions/loader/${encodeURIComponent(mcVersion)}`,
  );
  const versions = data.map((e) => ({ id: e.loader.version, stable: e.loader.stable }));
  store(key, versions);
  return versions;
};

const listQuilt = async (mcVersion: string): Promise<LoaderVersionSummary[]> => {
  const key = `quilt:${mcVersion}`;
  const hit = cached(key);
  if (hit) return hit;

  const data = await getJson<Array<{ loader: { version: string } }>>(
    `${QUILT_META}/versions/loader/${encodeURIComponent(mcVersion)}`,
  );
  const versions = data.map((e) => ({ id: e.loader.version, stable: true }));
  store(key, versions);
  return versions;
};

const listForge = async (mcVersion: string): Promise<LoaderVersionSummary[]> => {
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
  const m = mcVersion.match(/^1\.(\d+)(?:\.(\d+))?$/);
  if (!m) return null;
  const major = Number(m[1]);
  const minor = Number(m[2] ?? 0);
  if (major === 20 && minor === 1) return "47.";
  if (major >= 20) return `${major}.${minor}.`;
  return null;
};

const listNeoForge = async (mcVersion: string): Promise<LoaderVersionSummary[]> => {
  const prefix = neoforgePrefix(mcVersion);
  if (!prefix) return [];

  const key = `neoforge:${mcVersion}`;
  const hit = cached(key);
  if (hit) return hit;

  const xml = await getText(NEOFORGE_MAVEN);
  const versions = xmlVersions(xml)
    .filter((v) => v.startsWith(prefix))
    .map((v) => ({ id: v, stable: !v.includes("beta") && !v.includes("alpha") }))
    .reverse();

  store(key, versions);
  return versions;
};

export const listLoaderVersions = async (
  input: ListLoaderVersionsInput,
): Promise<LoaderVersionSummary[]> => {
  const { loader, mcVersion } = input;
  if (loader === "vanilla" || !mcVersion.trim()) return [];

  switch (loader) {
    case "fabric": return listFabric(mcVersion);
    case "quilt": return listQuilt(mcVersion);
    case "forge": return listForge(mcVersion);
    case "neoforge": return listNeoForge(mcVersion);
    default: return [];
  }
};
