import { mkdirSync } from "node:fs";
import { join } from "node:path";
import type { LauncherDirectories } from "../../shared/types";

const defaultDataRoot = (): string => join(process.cwd(), "data");

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
    mkdirSync(directory, { recursive: true });
  }

  return directories;
};

export const getInstanceDirectory = (instanceId: string): string =>
  join(getLauncherDirectories().instances, instanceId);

export const getVersionDirectory = (versionId: string): string =>
  join(getLauncherDirectories().versions, versionId);
