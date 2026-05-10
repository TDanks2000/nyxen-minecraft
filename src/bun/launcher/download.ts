import { spawnSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import {
  chmodSync,
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
import { collectMissingAssetObjectArtifacts } from "./assets";
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
  installerRunner?: (input: {
    javaExecutable: string;
    installerPath: string;
    launcherRoot: string;
  }) => Promise<void> | void;
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

const makeExecutable = (path: string): void => {
  if (process.platform !== "win32") {
    chmodSync(path, 0o755);
  }
};

const writeArtifactFile = (
  path: string,
  data: Uint8Array,
  executable = false,
): void => {
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

  if (executable) {
    makeExecutable(path);
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

  writeArtifactFile(artifact.path, data, artifact.executable);
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

const runModLoaderInstaller = async (
  plan: LaunchPlan,
  options: DownloadOptions,
): Promise<void> => {
  const installerPath = plan.modLoader.installerPath;

  if (!installerPath) {
    throw new Error("No mod loader installer is available for this plan.");
  }

  if (!existsSync(installerPath)) {
    throw new Error("Mod loader installer has not been downloaded.");
  }

  if (options.installerRunner) {
    await options.installerRunner({
      installerPath,
      javaExecutable: plan.java.executable,
      launcherRoot: plan.directories.root,
    });
    return;
  }

  const result = spawnSync(
    plan.java.executable,
    ["-jar", installerPath, "--installClient", plan.directories.root],
    {
      cwd: plan.directories.root,
      encoding: "utf8",
      timeout: 10 * 60 * 1000,
    },
  );

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    const detail = (result.stderr || result.stdout || "").trim();

    throw new Error(
      detail
        ? `Mod loader installer failed: ${detail}`
        : "Mod loader installer failed.",
    );
  }
};

export const downloadArtifacts = async (
  plan: LaunchPlan,
  options: DownloadOptions = {},
): Promise<DownloadArtifactsResult> => {
  const failed: Array<{ error: string; id: string }> = [];
  let succeeded = 0;
  const artifacts = uniqueArtifacts(plan.missingArtifacts);
  const downloadArtifact = async (
    artifact: LaunchPlanMissingArtifact,
  ): Promise<void> => {
    try {
      assertArtifactStoragePath(artifact);

      if (existsSync(artifact.path)) {
        if (artifact.executable) {
          makeExecutable(artifact.path);
        }
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
  };
  const immediatelyDownloadable = artifacts.filter(
    (artifact) => artifact.url || existsSync(artifact.path),
  );
  const installerGenerated = artifacts.filter(
    (artifact) => !artifact.url && !existsSync(artifact.path),
  );

  await runWithConcurrency(
    immediatelyDownloadable,
    getDownloadConcurrency(options),
    downloadArtifact,
  );

  const assetObjectArtifacts = uniqueArtifacts(
    artifacts
      .filter((artifact) => artifact.kind === "assetIndex")
      .flatMap((artifact) => {
        if (!existsSync(artifact.path)) return [];

        try {
          return collectMissingAssetObjectArtifacts({
            assetsRoot: plan.directories.assets,
            indexId: artifact.id,
            indexPath: artifact.path,
          });
        } catch (error) {
          failed.push({
            error:
              error instanceof Error
                ? error.message
                : "Asset index could not be read",
            id: artifact.id,
          });
          return [];
        }
      }),
  );

  await runWithConcurrency(
    assetObjectArtifacts,
    getDownloadConcurrency(options),
    downloadArtifact,
  );

  if (installerGenerated.length > 0) {
    if (plan.modLoader.installerPath) {
      try {
        await runModLoaderInstaller(plan, options);
      } catch (error) {
        for (const artifact of installerGenerated) {
          failed.push({
            error:
              error instanceof Error
                ? error.message
                : "Mod loader installer failed",
            id: artifact.id,
          });
        }
      }
    } else {
      for (const artifact of installerGenerated) {
        failed.push({
          error: `No download URL for ${artifact.id}`,
          id: artifact.id,
        });
      }
    }

    for (const artifact of installerGenerated) {
      try {
        assertArtifactStoragePath(artifact);

        if (!existsSync(artifact.path)) {
          if (!failed.some((failure) => failure.id === artifact.id)) {
            failed.push({
              error: "Mod loader installer did not create this artifact.",
              id: artifact.id,
            });
          }
          continue;
        }

        if (artifact.executable) {
          makeExecutable(artifact.path);
        }
        succeeded++;
      } catch (error) {
        failed.push({
          error: error instanceof Error ? error.message : "Download failed",
          id: artifact.id,
        });
      }
    }
  }

  // Extract native JARs after all downloads complete
  const downloadedNatives = plan.nativeArtifactPaths.filter(existsSync);
  extractNatives(downloadedNatives, plan.directories.natives);

  return { failed, succeeded };
};
