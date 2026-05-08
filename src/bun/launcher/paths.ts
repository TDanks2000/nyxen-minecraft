import { chmodSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { APP_CHANNEL, APP_IDENTIFIER } from "../../shared/constants";
import type { LauncherDirectories } from "../../shared/types";

const defaultDataDirectory = (): string => {
  switch (process.platform) {
    case "darwin":
      return join(homedir(), "Library", "Application Support");
    case "win32":
      return (
        process.env.LOCALAPPDATA?.trim() ||
        join(process.env.USERPROFILE?.trim() || homedir(), "AppData", "Local")
      );
    default:
      return (
        process.env.XDG_DATA_HOME?.trim() || join(homedir(), ".local", "share")
      );
  }
};

const defaultDataRoot = (): string =>
  join(defaultDataDirectory(), APP_IDENTIFIER, APP_CHANNEL);

export const ensurePrivateDirectory = (directory: string): void => {
  mkdirSync(directory, { mode: 0o700, recursive: true });

  if (process.platform !== "win32") {
    chmodSync(directory, 0o700);
  }
};

export const ensurePrivateFile = (path: string): void => {
  if (process.platform !== "win32") {
    chmodSync(path, 0o600);
  }
};

export const normalizeLauncherPathSegment = (
  value: string,
  label: string,
): string => {
  const normalized = value.trim();

  if (
    !normalized ||
    normalized === "." ||
    normalized === ".." ||
    normalized.includes("/") ||
    normalized.includes("\\") ||
    normalized.includes("\0")
  ) {
    throw new Error(`${label} cannot contain path separators.`);
  }

  return normalized;
};

export const isLauncherPathSegment = (value: string): boolean => {
  try {
    normalizeLauncherPathSegment(value, "Path segment");
    return true;
  } catch {
    return false;
  }
};

export const getDataRoot = (): string => {
  const configuredRoot = process.env.NYXEN_DATA_DIR?.trim();

  return configuredRoot ? configuredRoot : defaultDataRoot();
};

export const getLauncherRoot = (): string => join(getDataRoot(), "launcher");

export const getLauncherDirectories = (): LauncherDirectories => {
  const root = getLauncherRoot();

  return {
    assets: join(root, "assets"),
    downloads: join(root, "downloads"),
    instances: join(root, "instances"),
    libraries: join(root, "libraries"),
    logs: join(root, "logs"),
    root,
    runtimes: join(root, "runtimes"),
    temp: join(root, "temp"),
    versions: join(root, "versions"),
  };
};

export const ensureLauncherDirectories = (): LauncherDirectories => {
  const directories = getLauncherDirectories();

  for (const directory of Object.values(directories)) {
    ensurePrivateDirectory(directory);
  }

  return directories;
};

export const getInstanceDirectory = (instanceId: string): string =>
  join(
    getLauncherDirectories().instances,
    normalizeLauncherPathSegment(instanceId, "Launcher instance id"),
  );

export const getVersionDirectory = (versionId: string): string =>
  join(
    getLauncherDirectories().versions,
    normalizeLauncherPathSegment(versionId, "Minecraft version id"),
  );
