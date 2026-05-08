import { spawnSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname } from "node:path";
import type {
  DownloadArtifactsResult,
  LaunchPlan,
  LaunchPlanMissingArtifact,
} from "../../shared/types";
import {
  assertArtifactStoragePath,
  assertNativeJarPath,
  assertNativesDirectory,
} from "./validation";

type DownloadFetcher = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

type DownloadOptions = {
  concurrency?: number;
  fetcher?: DownloadFetcher;
  requestTimeoutMs?: number;
};

const DEFAULT_DOWNLOAD_CONCURRENCY = 6;
const DEFAULT_DOWNLOAD_TIMEOUT_MS = 60_000;

const verifySha1 = (data: Uint8Array, expected: string): boolean =>
  createHash("sha1").update(data).digest("hex") === expected;

const getDownloadConcurrency = (options: DownloadOptions): number => {
  const configured =
    options.concurrency ?? Number(process.env.NYXEN_DOWNLOAD_CONCURRENCY ?? "");

  if (!Number.isFinite(configured) || configured <= 0) {
    return DEFAULT_DOWNLOAD_CONCURRENCY;
  }

  return Math.max(1, Math.min(16, Math.trunc(configured)));
};

const getDownloadTimeoutMs = (options: DownloadOptions): number => {
  if (options.requestTimeoutMs !== undefined) {
    return Math.max(1, Math.trunc(options.requestTimeoutMs));
  }

  const configured = Number(
    process.env.NYXEN_DOWNLOAD_REQUEST_TIMEOUT_MS ?? "",
  );

  if (!Number.isFinite(configured) || configured <= 0) {
    return DEFAULT_DOWNLOAD_TIMEOUT_MS;
  }

  return Math.max(1_000, Math.trunc(configured));
};

const fetchArtifact = async (
  artifact: LaunchPlanMissingArtifact,
  options: DownloadOptions,
): Promise<Response> => {
  if (!artifact.url) {
    throw new Error(`No download URL for ${artifact.id}`);
  }

  const url = new URL(artifact.url);

  if (url.protocol !== "https:") {
    throw new Error(`Download URL for ${artifact.id} must use HTTPS`);
  }

  const controller = new AbortController();
  const timeoutMs = getDownloadTimeoutMs(options);
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const fetcher = options.fetcher ?? fetch;

  try {
    return await fetcher(url, { signal: controller.signal });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(
        `Timed out downloading ${artifact.id} after ${Math.round(
          timeoutMs / 1000,
        )} seconds`,
      );
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
};

const writeArtifactFile = (path: string, data: Uint8Array): void => {
  mkdirSync(dirname(path), { recursive: true });

  const tempPath = `${path}.download-${process.pid}-${randomUUID()}.tmp`;

  try {
    writeFileSync(tempPath, data, { flag: "wx" });
    renameSync(tempPath, path);
  } finally {
    if (existsSync(tempPath)) {
      unlinkSync(tempPath);
    }
  }
};

const downloadOne = async (
  artifact: LaunchPlanMissingArtifact,
  options: DownloadOptions,
): Promise<void> => {
  assertArtifactStoragePath(artifact);

  const response = await fetchArtifact(artifact, options);

  if (!response.ok) {
    throw new Error(
      `HTTP ${response.status} downloading ${artifact.id} from ${artifact.url}`,
    );
  }

  const data = new Uint8Array(await response.arrayBuffer());

  if (artifact.sha1 && !verifySha1(data, artifact.sha1)) {
    throw new Error(`Checksum mismatch for ${artifact.id}`);
  }

  writeArtifactFile(artifact.path, data);
};

const quotePowerShellString = (value: string): string =>
  `'${value.replaceAll("'", "''")}'`;

const extractNatives = (jarPaths: Array<string>, nativesDir: string): void => {
  if (jarPaths.length === 0) {
    return;
  }

  assertNativesDirectory(nativesDir);
  mkdirSync(nativesDir, { recursive: true });

  const nativeGlobs =
    process.platform === "win32"
      ? ["*.dll"]
      : process.platform === "darwin"
        ? ["*.dylib", "*.jnilib"]
        : ["*.so", "*.so.*"];

  for (const jarPath of jarPaths) {
    if (!existsSync(jarPath)) {
      continue;
    }

    assertNativeJarPath(jarPath);

    if (process.platform === "win32") {
      const quotedJarPath = quotePowerShellString(jarPath);
      const quotedNativesDir = quotePowerShellString(`${nativesDir}\\`);

      spawnSync(
        "powershell",
        [
          "-Command",
          `$zip=[System.IO.Compression.ZipFile]::OpenRead(${quotedJarPath});` +
            `$zip.Entries | Where-Object {$_.Name -match '\\.(dll)$'} |` +
            ` ForEach-Object { [System.IO.Compression.ZipFileExtensions]::ExtractToFile($_, ${quotedNativesDir}+$_.Name, $true) };` +
            `$zip.Dispose()`,
        ],
        { timeout: 30_000 },
      );
    } else {
      spawnSync(
        "unzip",
        ["-o", "-q", "-j", jarPath, ...nativeGlobs, "-d", nativesDir],
        { timeout: 30_000 },
      );
    }
  }
};

const uniqueArtifacts = (
  artifacts: Array<LaunchPlanMissingArtifact>,
): Array<LaunchPlanMissingArtifact> => {
  const seen = new Set<string>();
  const unique: Array<LaunchPlanMissingArtifact> = [];

  for (const artifact of artifacts) {
    const key = `${artifact.kind}:${artifact.path}`;

    if (!seen.has(key)) {
      seen.add(key);
      unique.push(artifact);
    }
  }

  return unique;
};

const runWithConcurrency = async <T>(
  values: Array<T>,
  concurrency: number,
  worker: (value: T) => Promise<void>,
): Promise<void> => {
  let nextIndex = 0;
  const workerCount = Math.min(concurrency, values.length);

  await Promise.all(
    Array.from({ length: workerCount }, async () => {
      while (nextIndex < values.length) {
        const value = values[nextIndex] as T;
        nextIndex += 1;
        await worker(value);
      }
    }),
  );
};

export const downloadArtifacts = async (
  plan: LaunchPlan,
  options: DownloadOptions = {},
): Promise<DownloadArtifactsResult> => {
  const failed: Array<{ error: string; id: string }> = [];
  let succeeded = 0;
  const artifacts = uniqueArtifacts(plan.missingArtifacts);

  await runWithConcurrency(
    artifacts,
    getDownloadConcurrency(options),
    async (artifact) => {
      try {
        assertArtifactStoragePath(artifact);

        if (existsSync(artifact.path)) {
          succeeded++;
          return;
        }

        await downloadOne(artifact, options);
        succeeded++;
      } catch (error) {
        failed.push({
          error: error instanceof Error ? error.message : "Download failed",
          id: artifact.id,
        });
      }
    },
  );

  // Extract native JARs after all downloads complete
  const downloadedNatives = plan.nativeArtifactPaths.filter(existsSync);
  extractNatives(downloadedNatives, plan.directories.natives);

  return { failed, succeeded };
};
