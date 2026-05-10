import { chmodSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join, posix, win32 } from "node:path";
import { APP_CHANNEL, APP_IDENTIFIER } from "../../shared/constants";
import type {
  LauncherDirectories,
  LauncherInstanceFolders,
} from "../../shared/types";

type DefaultDataRootOptions = {
  env?: Partial<Record<string, string | undefined>>;
  home?: string;
  platform?: NodeJS.Platform;
};

const joinForPlatform = (
  platform: NodeJS.Platform,
  ...segments: Array<string>
): string =>
  platform === "win32" ? win32.join(...segments) : posix.join(...segments);

export const getDefaultDataDirectory = ({
  env = process.env,
  home = homedir(),
  platform = process.platform,
}: DefaultDataRootOptions = {}): string => {
  switch (platform) {
    case "darwin":
      return joinForPlatform(platform, home, "Library", "Application Support");
    case "win32":
      return (
        env.LOCALAPPDATA?.trim() ||
        joinForPlatform(
          platform,
          env.USERPROFILE?.trim() || home,
          "AppData",
          "Local",
        )
      );
    default:
      return (
        env.XDG_DATA_HOME?.trim() ||
        joinForPlatform(platform, home, ".local", "share")
      );
  }
};

export const getDefaultDataRoot = (
  options: DefaultDataRootOptions = {},
): string => {
  const platform = options.platform ?? process.platform;

  return joinForPlatform(
    platform,
    getDefaultDataDirectory({ ...options, platform }),
    APP_IDENTIFIER,
    APP_CHANNEL,
  );
};

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

  return configuredRoot ? configuredRoot : getDefaultDataRoot();
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

export const getInstanceGameDirectory = (instanceId: string): string =>
  join(getInstanceDirectory(instanceId), ".minecraft");

export const getInstanceFolders = (
  instanceId: string,
): LauncherInstanceFolders => {
  const root = getInstanceDirectory(instanceId);
  const app = join(root, ".nyxen");
  const game = join(root, ".minecraft");

  return {
    app,
    cache: join(app, "cache"),
    config: join(game, "config"),
    game,
    logs: join(game, "logs"),
    media: join(app, "media"),
    metadata: join(app, "metadata"),
    mods: join(game, "mods"),
    resourcePacks: join(game, "resourcepacks"),
    root,
    saves: join(game, "saves"),
    screenshots: join(game, "screenshots"),
    shaderPacks: join(game, "shaderpacks"),
  };
};

export const ensureInstanceFolders = (
  instanceId: string,
): LauncherInstanceFolders => {
  const folders = getInstanceFolders(instanceId);

  for (const directory of Object.values(folders)) {
    ensurePrivateDirectory(directory);
  }

  return folders;
};

export const getInstanceMetadataPath = (instanceId: string): string =>
  join(getInstanceFolders(instanceId).metadata, "instance.json");

export const getVersionDirectory = (versionId: string): string =>
  join(
    getLauncherDirectories().versions,
    normalizeLauncherPathSegment(versionId, "Minecraft version id"),
  );
