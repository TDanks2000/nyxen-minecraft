import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { LaunchPlanMissingArtifact } from "../../shared/types";

const assetObjectBaseUrl = "https://resources.download.minecraft.net";
const sha1Pattern = /^[a-f0-9]{40}$/i;

type AssetIndexObject = {
  hash: string;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const toAssetIndexObject = (value: unknown): AssetIndexObject | null => {
  if (!isRecord(value)) return null;

  const hash = typeof value.hash === "string" ? value.hash.toLowerCase() : "";

  if (!sha1Pattern.test(hash)) return null;

  return { hash };
};

export const getAssetObjectPath = (assetsRoot: string, hash: string): string =>
  join(assetsRoot, "objects", hash.slice(0, 2), hash);

export const getAssetObjectUrl = (hash: string): string =>
  `${assetObjectBaseUrl}/${hash.slice(0, 2)}/${hash}`;

export const collectAssetObjectArtifacts = ({
  assetsRoot,
  indexId,
  indexPath,
  missingOnly = false,
}: {
  assetsRoot: string;
  indexId: string;
  indexPath: string;
  missingOnly?: boolean;
}): Array<LaunchPlanMissingArtifact> => {
  const parsed: unknown = JSON.parse(readFileSync(indexPath, "utf8"));

  if (!isRecord(parsed) || !isRecord(parsed.objects)) {
    throw new Error(`Asset index ${indexId} is invalid.`);
  }

  const artifacts: Array<LaunchPlanMissingArtifact> = [];
  const seenHashes = new Set<string>();

  for (const value of Object.values(parsed.objects)) {
    const object = toAssetIndexObject(value);

    if (!object || seenHashes.has(object.hash)) continue;

    seenHashes.add(object.hash);

    const path = getAssetObjectPath(assetsRoot, object.hash);

    if (missingOnly && existsSync(path)) continue;

    artifacts.push({
      id: `asset:${object.hash}`,
      kind: "assetObject",
      path,
      sha1: object.hash,
      url: getAssetObjectUrl(object.hash),
    });
  }

  return artifacts;
};

export const collectMissingAssetObjectArtifacts = (input: {
  assetsRoot: string;
  indexId: string;
  indexPath: string;
}): Array<LaunchPlanMissingArtifact> =>
  collectAssetObjectArtifacts({ ...input, missingOnly: true });
