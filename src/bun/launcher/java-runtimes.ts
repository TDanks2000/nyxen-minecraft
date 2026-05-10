import { createHash, randomUUID } from "node:crypto";
import {
  chmodSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  statSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, posix } from "node:path";
import { z } from "zod";
import type {
  LaunchPlanMissingArtifact,
  MinecraftVersionDetails,
} from "../../shared/types";
import {
  ensurePrivateDirectory,
  ensurePrivateFile,
  getLauncherDirectories,
  normalizeLauncherPathSegment,
} from "./paths";
import {
  assertPathInsideDirectory,
  joinArtifactPath,
  normalizeArtifactRelativePath,
} from "./validation";

export const JAVA_RUNTIME_MANIFEST_URL =
  "https://piston-meta.mojang.com/v1/products/java-runtime/2ec0cc96c44e5a76b9c8b7c39df7210883d12871/all.json";

type Fetcher = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

type JavaRuntimeOptions = {
  fetcher?: Fetcher;
  manifestCacheTtlMs?: number;
  manifestUrl?: string;
  requestTimeoutMs?: number;
};

type RequiredJavaVersion = {
  component: string;
  majorVersion: number;
};

export type ManagedJavaRuntime = RequiredJavaVersion & {
  directory: string;
  executable: string;
  missingArtifacts: Array<LaunchPlanMissingArtifact>;
  platform: string;
  versionName: string;
};

const runtimeManifestPointerSchema = z.object({
  sha1: z.string().optional(),
  size: z.number().int().optional(),
  url: z.string().url(),
});

const runtimeEntrySchema = z.object({
  manifest: runtimeManifestPointerSchema,
  version: z.object({
    name: z.string().min(1),
    released: z.string().optional(),
  }),
});

const runtimeManifestSchema = z.record(
  z.string(),
  z.record(z.string(), z.array(runtimeEntrySchema)),
);

const runtimeDownloadSchema = z.object({
  sha1: z.string().optional(),
  size: z.number().int().optional(),
  url: z.string().url().optional(),
});

const runtimeFileSchema = z.object({
  downloads: z
    .object({
      raw: runtimeDownloadSchema.optional(),
    })
    .optional(),
  executable: z.boolean().optional(),
  target: z.string().optional(),
  type: z.string().min(1),
});

const runtimePackageManifestSchema = z.object({
  files: z.record(z.string(), runtimeFileSchema),
});

type RuntimeManifest = z.infer<typeof runtimeManifestSchema>;
type RuntimeEntry = z.infer<typeof runtimeEntrySchema>;
type RuntimePackageManifest = z.infer<typeof runtimePackageManifestSchema>;

const getRequestTimeoutMs = (options: JavaRuntimeOptions): number => {
  if (options.requestTimeoutMs !== undefined) {
    return Math.max(1, Math.trunc(options.requestTimeoutMs));
  }

  const configured = Number(process.env.NYXEN_JAVA_RUNTIME_TIMEOUT_MS ?? "");

  if (!Number.isFinite(configured) || configured <= 0) {
    return 20_000;
  }

  return Math.max(1_000, Math.trunc(configured));
};

const getManifestCacheTtlMs = (options: JavaRuntimeOptions): number => {
  if (options.manifestCacheTtlMs !== undefined) {
    return Math.max(0, Math.trunc(options.manifestCacheTtlMs));
  }

  const configured = Number(
    process.env.NYXEN_JAVA_RUNTIME_MANIFEST_CACHE_TTL_MS ?? "",
  );

  if (!Number.isFinite(configured) || configured <= 0) {
    return 24 * 60 * 60 * 1000;
  }

  return Math.trunc(configured);
};

const fetchJson = async (
  url: string,
  options: JavaRuntimeOptions,
): Promise<unknown> => {
  const parsedUrl = new URL(url);

  if (parsedUrl.protocol !== "https:") {
    throw new Error("Java runtime metadata URL must use HTTPS.");
  }

  const requester = options.fetcher ?? fetch;
  const controller = new AbortController();
  const timeoutMs = getRequestTimeoutMs(options);
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;

  try {
    response = await requester(url, { signal: controller.signal });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(
        `Java runtime metadata request timed out after ${Math.round(
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
      `Java runtime metadata request failed: ${response.status} ${response.statusText}`,
    );
  }

  return response.json();
};

const readCachedJson = (path: string): unknown =>
  JSON.parse(readFileSync(path, "utf8"));

const pathEntryExists = (path: string): boolean => {
  try {
    lstatSync(path);
    return true;
  } catch (error) {
    const code =
      error && typeof error === "object" && "code" in error
        ? error.code
        : undefined;

    if (code === "ENOENT") {
      return false;
    }

    throw error;
  }
};

const cacheNameForUrl = (url: string): string => {
  if (url === JAVA_RUNTIME_MANIFEST_URL) {
    return "java-runtime-all.json";
  }

  const hash = createHash("sha1").update(url).digest("hex").slice(0, 12);

  return `java-runtime-all-${hash}.json`;
};

const legacyRuntimeMetadataFilePattern =
  /^java-runtime-all(?:-[a-f0-9]{12})?\.json$/;

const migrateLegacyRuntimeMetadataCache = (runtimesDirectory: string): void => {
  if (!existsSync(runtimesDirectory)) {
    return;
  }

  const metadataDirectory = join(runtimesDirectory, "_meta");
  const entries = readdirSync(runtimesDirectory, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isFile() || !legacyRuntimeMetadataFilePattern.test(entry.name)) {
      continue;
    }

    const legacyPath = join(runtimesDirectory, entry.name);
    const migratedPath = join(metadataDirectory, entry.name);

    ensurePrivateDirectory(metadataDirectory);

    if (existsSync(migratedPath)) {
      unlinkSync(legacyPath);
      continue;
    }

    renameSync(legacyPath, migratedPath);
    ensurePrivateFile(migratedPath);
  }
};

const isCacheFresh = (path: string, maxAgeMs: number): boolean => {
  if (!existsSync(path)) {
    return false;
  }

  if (!Number.isFinite(maxAgeMs)) {
    return true;
  }

  return Date.now() - statSync(path).mtimeMs <= maxAgeMs;
};

const readUsableCache = (
  path: string,
  maxAgeMs: number,
): { found: false } | { found: true; value: unknown } => {
  if (!isCacheFresh(path, maxAgeMs)) {
    return { found: false };
  }

  try {
    return { found: true, value: readCachedJson(path) };
  } catch {
    return { found: false };
  }
};

const writeCachedJson = (path: string, value: unknown): void => {
  ensurePrivateDirectory(dirname(path));

  const tempPath = `${path}.write-${process.pid}-${randomUUID()}.tmp`;

  try {
    writeFileSync(tempPath, `${JSON.stringify(value, null, 2)}\n`, {
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

const readOrFetchJson = async (
  url: string,
  cachePath: string,
  options: JavaRuntimeOptions,
  cacheMaxAgeMs: number,
): Promise<unknown> => {
  const cached = readUsableCache(cachePath, cacheMaxAgeMs);

  if (cached.found) {
    return cached.value;
  }

  try {
    const received = await fetchJson(url, options);
    writeCachedJson(cachePath, received);
    return received;
  } catch (error) {
    if (existsSync(cachePath)) {
      return readCachedJson(cachePath);
    }

    throw error;
  }
};

export const getJavaRuntimePlatform = (
  platform: NodeJS.Platform = process.platform,
  arch: string = process.arch,
): string => {
  if (platform === "win32") {
    if (arch === "arm64") return "windows-arm64";
    if (arch === "ia32" || arch === "x32") return "windows-x86";
    return "windows-x64";
  }

  if (platform === "darwin") {
    return arch === "arm64" ? "mac-os-arm64" : "mac-os";
  }

  return arch === "ia32" || arch === "x32" ? "linux-i386" : "linux";
};

const componentFromMajorVersion = (
  majorVersion: number,
  versionType: string,
): string => {
  if (majorVersion <= 8) return "jre-legacy";
  if (majorVersion <= 16) return "java-runtime-alpha";
  if (majorVersion <= 17 && versionType === "snapshot") {
    return "java-runtime-gamma-snapshot";
  }
  if (majorVersion <= 17) return "java-runtime-gamma";
  if (majorVersion <= 21) return "java-runtime-delta";
  return "java-runtime-epsilon";
};

export const getRequiredJavaVersion = (
  versionDetails: Pick<MinecraftVersionDetails, "javaVersion" | "type">,
): RequiredJavaVersion => {
  const majorVersion = versionDetails.javaVersion?.majorVersion ?? 8;
  const component =
    versionDetails.javaVersion?.component ??
    componentFromMajorVersion(majorVersion, versionDetails.type);

  return {
    component: normalizeLauncherPathSegment(
      component,
      "Java runtime component",
    ),
    majorVersion,
  };
};

const getRuntimeManifest = async (
  options: JavaRuntimeOptions,
): Promise<RuntimeManifest> => {
  const directories = getLauncherDirectories();
  const manifestUrl = options.manifestUrl ?? JAVA_RUNTIME_MANIFEST_URL;
  migrateLegacyRuntimeMetadataCache(directories.runtimes);
  const manifest = await readOrFetchJson(
    manifestUrl,
    join(directories.runtimes, "_meta", cacheNameForUrl(manifestUrl)),
    options,
    getManifestCacheTtlMs(options),
  );

  return runtimeManifestSchema.parse(manifest);
};

const releasedAt = (runtime: RuntimeEntry): number => {
  const timestamp = Date.parse(runtime.version.released ?? "");

  return Number.isFinite(timestamp) ? timestamp : 0;
};

const selectRuntimeEntry = (
  manifest: RuntimeManifest,
  platform: string,
  component: string,
): RuntimeEntry => {
  const platformRuntimes = manifest[platform];

  if (!platformRuntimes) {
    throw new Error(`Managed Java runtimes are not available for ${platform}.`);
  }

  const runtime = [...(platformRuntimes[component] ?? [])].sort((a, b) => {
    const releaseSort = releasedAt(b) - releasedAt(a);

    if (releaseSort !== 0) {
      return releaseSort;
    }

    return b.version.name.localeCompare(a.version.name, undefined, {
      numeric: true,
      sensitivity: "base",
    });
  })[0];

  if (!runtime) {
    throw new Error(
      `Managed Java runtime ${component} is not available for ${platform}.`,
    );
  }

  return runtime;
};

const getRuntimePackageManifest = async (
  runtime: RuntimeEntry,
  runtimeDirectory: string,
  options: JavaRuntimeOptions,
): Promise<RuntimePackageManifest> => {
  const manifest = await readOrFetchJson(
    runtime.manifest.url,
    join(runtimeDirectory, "runtime-manifest.json"),
    options,
    Number.POSITIVE_INFINITY,
  );

  return runtimePackageManifestSchema.parse(manifest);
};

const makeExecutable = (path: string): void => {
  if (process.platform !== "win32") {
    chmodSync(path, 0o755);
  }
};

const createRuntimeLink = (
  runtimeDirectory: string,
  relativePath: string,
  target: string | undefined,
): void => {
  if (!target || process.platform === "win32") {
    return;
  }

  const rawTarget = target.trim().replaceAll("\\", "/");

  if (posix.isAbsolute(rawTarget)) {
    throw new Error("Java runtime link target path must be relative.");
  }

  const linkPath = joinArtifactPath(
    runtimeDirectory,
    relativePath,
    "Java runtime link",
  );
  const normalizedTarget = normalizeArtifactRelativePath(
    posix.join(posix.dirname(relativePath), rawTarget),
    "Java runtime link target",
  );
  const targetPath = joinArtifactPath(
    runtimeDirectory,
    normalizedTarget,
    "Java runtime link target",
  );

  assertPathInsideDirectory(
    targetPath,
    runtimeDirectory,
    "Java runtime link target",
  );

  if (pathEntryExists(linkPath)) {
    return;
  }

  mkdirSync(dirname(linkPath), { recursive: true });
  symlinkSync(targetPath, linkPath);
};

const chooseJavaExecutable = (
  files: RuntimePackageManifest["files"],
): string => {
  const candidates = Object.entries(files)
    .filter(([, file]) => file.type === "file" && file.executable)
    .map(([relativePath]) =>
      normalizeArtifactRelativePath(relativePath, "Java runtime executable"),
    )
    .filter((relativePath) => {
      const name = posix.basename(relativePath).toLowerCase();
      return name === "java" || name === "java.exe" || name === "javaw.exe";
    });

  const preferred = process.platform === "win32" ? "javaw.exe" : "java";

  return (
    candidates.find(
      (relativePath) =>
        posix.basename(relativePath).toLowerCase() === preferred,
    ) ??
    candidates.find((relativePath) =>
      ["java", "java.exe"].includes(posix.basename(relativePath).toLowerCase()),
    ) ??
    candidates[0] ??
    ""
  );
};

const createRuntimeArtifacts = (
  packageManifest: RuntimePackageManifest,
  runtimeDirectory: string,
  component: string,
  versionName: string,
): {
  executable: string;
  missingArtifacts: Array<LaunchPlanMissingArtifact>;
} => {
  const missingArtifacts: Array<LaunchPlanMissingArtifact> = [];
  const javaExecutableRelativePath = chooseJavaExecutable(
    packageManifest.files,
  );

  if (!javaExecutableRelativePath) {
    throw new Error("Managed Java runtime manifest does not include java.");
  }

  for (const [rawRelativePath, file] of Object.entries(packageManifest.files)) {
    const relativePath = normalizeArtifactRelativePath(
      rawRelativePath,
      "Java runtime file",
    );

    if (file.type === "directory") {
      ensurePrivateDirectory(
        joinArtifactPath(
          runtimeDirectory,
          relativePath,
          "Java runtime directory",
        ),
      );
      continue;
    }

    if (file.type === "link") {
      createRuntimeLink(runtimeDirectory, relativePath, file.target);
      continue;
    }

    if (file.type !== "file") {
      continue;
    }

    const rawDownload = file.downloads?.raw;

    if (!rawDownload?.url) {
      throw new Error(
        `Managed Java runtime file ${relativePath} does not include a raw download.`,
      );
    }

    const path = joinArtifactPath(
      runtimeDirectory,
      relativePath,
      "Java runtime file",
    );

    if (existsSync(path)) {
      if (file.executable) {
        makeExecutable(path);
      }
      continue;
    }

    missingArtifacts.push({
      executable: file.executable ?? false,
      id: `${component}:${versionName}:${relativePath}`,
      kind: "javaRuntime",
      path,
      sha1: rawDownload.sha1,
      url: rawDownload.url,
    });
  }

  return {
    executable: joinArtifactPath(
      runtimeDirectory,
      javaExecutableRelativePath,
      "Java runtime executable",
    ),
    missingArtifacts,
  };
};

export const resolveManagedJavaRuntime = async (
  requiredJava: RequiredJavaVersion,
  options: JavaRuntimeOptions = {},
): Promise<ManagedJavaRuntime> => {
  const platform = getJavaRuntimePlatform();
  const runtimeManifest = await getRuntimeManifest(options);
  const runtime = selectRuntimeEntry(
    runtimeManifest,
    platform,
    requiredJava.component,
  );
  const versionName = normalizeLauncherPathSegment(
    runtime.version.name,
    "Java runtime version",
  );
  const directories = getLauncherDirectories();
  const runtimeDirectory = join(
    directories.runtimes,
    platform,
    requiredJava.component,
    versionName,
  );

  ensurePrivateDirectory(runtimeDirectory);

  const packageManifest = await getRuntimePackageManifest(
    runtime,
    runtimeDirectory,
    options,
  );
  const artifacts = createRuntimeArtifacts(
    packageManifest,
    runtimeDirectory,
    requiredJava.component,
    versionName,
  );

  return {
    component: requiredJava.component,
    directory: runtimeDirectory,
    executable: artifacts.executable,
    majorVersion: requiredJava.majorVersion,
    missingArtifacts: artifacts.missingArtifacts,
    platform,
    versionName,
  };
};
