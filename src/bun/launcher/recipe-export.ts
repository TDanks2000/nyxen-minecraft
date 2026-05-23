import { existsSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type {
  ExportedInstanceRecipe,
  ExportedInstanceRecipeWarningCode,
  ExportInstanceRecipeInput,
  ExportInstanceRecipeResult,
  InstanceRecipeRevision,
} from "../../shared/types";
import { readInstanceRecipeRevision } from "./instance-recipes";
import { getLauncherInstance } from "./instances";
import { ensurePrivateDirectory, ensurePrivateFile } from "./paths";

const portableRecipeSchemaVersion = 1;

const safeExportName = (value: string): string =>
  value
    .trim()
    .replaceAll(/[^a-zA-Z0-9._-]+/g, "-")
    .replaceAll(/^-+|-+$/g, "")
    .slice(0, 80) || "recipe";

const stableJsonStringify = (value: unknown): string => {
  if (Array.isArray(value)) {
    return `[${value
      .map((item) => (item === undefined ? "null" : stableJsonStringify(item)))
      .join(",")}]`;
  }

  if (value && typeof value === "object") {
    return `{${Object.entries(value)
      .filter(([, item]) => item !== undefined)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(
        ([key, item]) => `${JSON.stringify(key)}:${stableJsonStringify(item)}`,
      )
      .join(",")}}`;
  }

  return JSON.stringify(value);
};

const countWeaklyVerifiedFiles = (recipe: InstanceRecipeRevision): number =>
  recipe.files.filter(
    (file) => !file.hashes.sha1?.trim() && !file.hashes.sha512?.trim(),
  ).length;

const countLocalOnlyFiles = (recipe: InstanceRecipeRevision): number =>
  recipe.files.filter(
    (file) => file.policy === "local-only" || file.source === "local",
  ).length;

const countUnavailableFiles = (recipe: InstanceRecipeRevision): number =>
  recipe.files.filter(
    (file) =>
      file.source !== "local" &&
      file.policy === "managed" &&
      file.downloadUrls.length === 0 &&
      !file.providerProjectId &&
      !file.providerFileId,
  ).length;

const countBlockedFiles = (recipe: InstanceRecipeRevision): number =>
  recipe.files.filter(
    (file) =>
      file.source !== "local" &&
      file.optional &&
      file.downloadUrls.length === 0 &&
      Boolean(file.providerProjectId || file.providerFileId),
  ).length;

const countPrivateFiles = (recipe: InstanceRecipeRevision): number =>
  recipe.files.filter((file) => file.source === "local").length;

const createExportWarnings = (
  recipe: InstanceRecipeRevision,
): ExportedInstanceRecipe["warnings"] => {
  const counts: Array<{
    code: ExportedInstanceRecipeWarningCode;
    count: number;
    message: string;
  }> = [
    {
      code: "weaklyVerifiedFiles",
      count: countWeaklyVerifiedFiles(recipe),
      message:
        "Some recipe files do not include provider hashes and can only be weakly verified.",
    },
    {
      code: "optionalFiles",
      count: recipe.files.filter((file) => file.optional).length,
      message:
        "Some recipe files were optional or skipped and may not download for another user.",
    },
    {
      code: "unavailableFiles",
      count: countUnavailableFiles(recipe),
      message:
        "Some provider files do not include download URLs or provider ids, so an importer may be unable to resolve them.",
    },
    {
      code: "blockedFiles",
      count: countBlockedFiles(recipe),
      message:
        "Some provider files were skipped or blocked during install and may require manual resolution.",
    },
    {
      code: "privateFiles",
      count: countPrivateFiles(recipe),
      message:
        "Some files came from local/private sources and are not included in the shareable recipe.",
    },
    {
      code: "localOnlyFiles",
      count: countLocalOnlyFiles(recipe),
      message:
        "Some recipe files are local-only and are not portable without a private bundle.",
    },
  ];

  return counts.filter((warning) => warning.count > 0);
};

const createPortableRecipe = (
  recipe: InstanceRecipeRevision,
): ExportedInstanceRecipe["recipe"] => {
  const {
    instanceId: _instanceId,
    previousRevisionId: _previousRevisionId,
    ...portableRecipe
  } = recipe;

  return portableRecipe;
};

const createRecipeChecksum = (
  recipe: ExportedInstanceRecipe["recipe"],
): ExportedInstanceRecipe["checksum"] => ({
  algorithm: "sha256",
  covers: "recipe",
  value: new Bun.CryptoHasher("sha256")
    .update(stableJsonStringify(recipe))
    .digest("hex"),
});

export const exportInstanceRecipe = ({
  instanceId,
}: ExportInstanceRecipeInput): ExportInstanceRecipeResult => {
  const normalizedInstanceId = instanceId.trim();

  if (!normalizedInstanceId) {
    throw new Error("Launcher instance id is required.");
  }

  const instance = getLauncherInstance(normalizedInstanceId);

  if (!instance) {
    throw new Error("Launcher instance does not exist.");
  }

  const revision = readInstanceRecipeRevision(instance);

  if (!revision) {
    throw new Error("Instance does not have a recipe revision to export.");
  }

  const exportedAt = new Date().toISOString();
  const portableRecipe = createPortableRecipe(revision);
  const recipe: ExportedInstanceRecipe = {
    app: {
      name: "nyxen",
      schemaVersion: portableRecipeSchemaVersion,
    },
    checksum: createRecipeChecksum(portableRecipe),
    exportedAt,
    recipe: portableRecipe,
    schemaVersion: portableRecipeSchemaVersion,
    sourceInstance: {
      loader: instance.loader,
      loaderVersion: instance.loaderVersion,
      name: instance.name,
      versionId: instance.versionId,
    },
    warnings: createExportWarnings(revision),
  };
  const directory = join(instance.folders.metadata, "recipe-exports");
  const path = join(
    directory,
    `${safeExportName(instance.name)}-${safeExportName(revision.id)}-${crypto.randomUUID()}.json`,
  );
  const tempPath = `${path}.write-${process.pid}-${crypto.randomUUID()}.tmp`;

  ensurePrivateDirectory(dirname(path));

  try {
    writeFileSync(tempPath, `${JSON.stringify(recipe, null, 2)}\n`, {
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

  return { path, recipe };
};
