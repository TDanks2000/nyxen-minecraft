import { createHash } from "node:crypto";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { spawnSync } from "node:child_process";
import type {
  DownloadArtifactsResult,
  LaunchPlan,
  LaunchPlanMissingArtifact,
} from "../../shared/types";

const verifySha1 = (data: Uint8Array, expected: string): boolean =>
  createHash("sha1").update(data).digest("hex") === expected;

const downloadOne = async (
  artifact: LaunchPlanMissingArtifact,
): Promise<void> => {
  if (!artifact.url) {
    throw new Error(`No download URL for ${artifact.id}`);
  }

  const response = await fetch(artifact.url);

  if (!response.ok) {
    throw new Error(
      `HTTP ${response.status} downloading ${artifact.id} from ${artifact.url}`,
    );
  }

  const data = new Uint8Array(await response.arrayBuffer());

  if (artifact.sha1 && !verifySha1(data, artifact.sha1)) {
    throw new Error(`Checksum mismatch for ${artifact.id}`);
  }

  mkdirSync(dirname(artifact.path), { recursive: true });
  writeFileSync(artifact.path, data);
};

const extractNatives = (jarPaths: Array<string>, nativesDir: string): void => {
  if (jarPaths.length === 0) {
    return;
  }

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

    if (process.platform === "win32") {
      spawnSync(
        "powershell",
        [
          "-Command",
          `$zip=[System.IO.Compression.ZipFile]::OpenRead('${jarPath}');` +
            `$zip.Entries | Where-Object {$_.Name -match '\\.(dll)$'} |` +
            ` ForEach-Object { [System.IO.Compression.ZipFileExtensions]::ExtractToFile($_, '${nativesDir}\\'+$_.Name, $true) };` +
            `$zip.Dispose()`,
        ],
        { timeout: 30_000 },
      );
    } else {
      spawnSync(
        "unzip",
        ["-o", "-q", jarPath, ...nativeGlobs, "-d", nativesDir],
        { timeout: 30_000 },
      );
    }
  }
};

export const downloadArtifacts = async (
  plan: LaunchPlan,
): Promise<DownloadArtifactsResult> => {
  const failed: Array<{ error: string; id: string }> = [];
  let succeeded = 0;

  for (const artifact of plan.missingArtifacts) {
    if (existsSync(artifact.path)) {
      succeeded++;
      continue;
    }

    try {
      await downloadOne(artifact);
      succeeded++;
    } catch (error) {
      failed.push({
        error: error instanceof Error ? error.message : "Download failed",
        id: artifact.id,
      });
    }
  }

  // Extract native JARs after all downloads complete
  const downloadedNatives = plan.nativeArtifactPaths.filter(existsSync);
  extractNatives(downloadedNatives, plan.directories.natives);

  return { failed, succeeded };
};
