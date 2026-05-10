import { isAbsolute, posix, relative, resolve } from "node:path";
import type { LaunchPlanMissingArtifact } from "../../shared/types";
import { getLauncherDirectories } from "./paths";

const javaExecutableNames = new Set(["java", "java.exe", "javaw", "javaw.exe"]);

export const normalizeJavaExecutable = (
  value: string | null | undefined,
): string | null => {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value !== "string") {
    throw new Error("Java executable must be a string.");
  }

  const normalized = value.trim();

  if (!normalized) {
    return null;
  }

  if (
    normalized.length > 512 ||
    normalized.includes("\0") ||
    /[\r\n]/.test(normalized)
  ) {
    throw new Error("Java executable path is invalid.");
  }

  const executableName = posix
    .basename(normalized.replaceAll("\\", "/"))
    .toLowerCase();

  if (!javaExecutableNames.has(executableName)) {
    throw new Error("Java executable must point to java or javaw.");
  }

  return normalized;
};

export const assertJavaExecutable = (value: string): void => {
  normalizeJavaExecutable(value);
};

export const normalizeArtifactRelativePath = (
  value: string,
  context: string,
): string => {
  if (typeof value !== "string") {
    throw new Error(`${context} path must be a string.`);
  }

  const raw = value.trim().replaceAll("\\", "/");

  if (!raw || raw.includes("\0") || posix.isAbsolute(raw)) {
    throw new Error(`${context} path must be relative to launcher storage.`);
  }

  const normalized = posix.normalize(raw);

  if (
    normalized === "." ||
    normalized === ".." ||
    normalized.startsWith("../")
  ) {
    throw new Error(`${context} path cannot leave launcher storage.`);
  }

  return normalized;
};

export const joinArtifactPath = (
  root: string,
  relativePath: string,
  context: string,
): string => {
  const normalized = normalizeArtifactRelativePath(relativePath, context);

  return resolve(root, ...normalized.split("/"));
};

export const isPathInsideDirectory = (
  path: string,
  directory: string,
): boolean => {
  const resolvedPath = resolve(path);
  const resolvedDirectory = resolve(directory);
  const offset = relative(resolvedDirectory, resolvedPath);

  return offset === "" || (!offset.startsWith("..") && !isAbsolute(offset));
};

export const assertPathInsideDirectory = (
  path: string,
  directory: string,
  label: string,
): void => {
  if (!isPathInsideDirectory(path, directory)) {
    throw new Error(`${label} must stay inside launcher storage.`);
  }
};

export const assertArtifactStoragePath = (
  artifact: LaunchPlanMissingArtifact,
): void => {
  const directories = getLauncherDirectories();
  const root =
    artifact.kind === "assetIndex" || artifact.kind === "assetObject"
      ? directories.assets
      : artifact.kind === "javaRuntime"
        ? directories.runtimes
        : artifact.kind === "modLoaderInstaller"
          ? directories.downloads
          : artifact.kind === "library" || artifact.kind === "nativeLibrary"
            ? directories.libraries
            : directories.versions;

  assertPathInsideDirectory(
    artifact.path,
    root,
    `Artifact ${artifact.id} ${artifact.kind}`,
  );
};

export const assertNativeJarPath = (path: string): void => {
  assertPathInsideDirectory(
    path,
    getLauncherDirectories().libraries,
    "Native library archive",
  );
};

export const assertNativesDirectory = (path: string): void => {
  assertPathInsideDirectory(
    path,
    getLauncherDirectories().temp,
    "Native extraction directory",
  );
};
