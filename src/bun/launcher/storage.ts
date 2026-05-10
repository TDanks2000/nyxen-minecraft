import { existsSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import type {
  ClearLauncherStorageResult,
  LauncherDirectories,
} from "../../shared/types";
import { ensureLauncherDirectories, getLauncherDirectories } from "./paths";

const cacheDirectoryKeys = [
  "assets",
  "downloads",
  "libraries",
  "runtimes",
  "temp",
  "versions",
] as const;

const launcherDataTables = [
  "app_metadata",
  "launcher_instances",
  "launcher_profiles",
  "minecraft_version_manifests",
  "minecraft_versions",
] as const;

type LauncherCachePathOptions = {
  directories?: LauncherDirectories;
  instanceDirectoryNames?: Array<string>;
};

const uniquePaths = (paths: Array<string>): Array<string> => [
  ...new Set(paths),
];

const getInstanceDirectoryNames = (
  instancesDirectory: string,
): Array<string> => {
  if (!existsSync(instancesDirectory)) {
    return [];
  }

  return readdirSync(instancesDirectory, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
};

export const getLauncherCachePaths = ({
  directories = getLauncherDirectories(),
  instanceDirectoryNames = getInstanceDirectoryNames(directories.instances),
}: LauncherCachePathOptions = {}): Array<string> =>
  uniquePaths([
    ...cacheDirectoryKeys.map((key) => directories[key]),
    ...instanceDirectoryNames.map((instanceDirectoryName) =>
      join(directories.instances, instanceDirectoryName, ".nyxen", "cache"),
    ),
  ]);

export const getLauncherDataPaths = (
  directories: LauncherDirectories = getLauncherDirectories(),
): Array<string> => [directories.root];

const removeExistingPaths = (paths: Array<string>): Array<string> => {
  const removedPaths: Array<string> = [];

  for (const path of uniquePaths(paths)) {
    if (!existsSync(path)) continue;

    rmSync(path, { force: true, recursive: true });
    removedPaths.push(path);
  }

  return removedPaths;
};

const assertNoActiveLauncherWork = async (): Promise<void> => {
  const [{ listDownloadJobs }, { listRunningLaunches }] = await Promise.all([
    import("./download-queue"),
    import("./executor"),
  ]);
  const activeDownloads = listDownloadJobs().filter(
    (job) => job.status === "queued" || job.status === "running",
  );

  if (activeDownloads.length > 0) {
    throw new Error("Wait for downloads to finish before clearing storage.");
  }

  if (listRunningLaunches().length > 0) {
    throw new Error("Stop running Minecraft before clearing storage.");
  }
};

const resetLauncherDatabase = async (): Promise<void> => {
  const [{ db }, schema] = await Promise.all([
    import("../db/client"),
    import("../db/schema"),
  ]);

  db.transaction((transaction) => {
    transaction.delete(schema.launcherInstances).run();
    transaction.delete(schema.launcherProfiles).run();
    transaction.delete(schema.minecraftVersions).run();
    transaction.delete(schema.minecraftVersionManifests).run();
    transaction.delete(schema.appMetadata).run();
  });
};

export const clearLauncherCache =
  async (): Promise<ClearLauncherStorageResult> => {
    await assertNoActiveLauncherWork();

    const directories = getLauncherDirectories();
    const removedPaths = removeExistingPaths(
      getLauncherCachePaths({ directories }),
    );

    ensureLauncherDirectories();

    return {
      clearedAt: new Date().toISOString(),
      kind: "cache",
      removedPaths,
      resetTables: [],
    };
  };

export const clearLauncherData =
  async (): Promise<ClearLauncherStorageResult> => {
    await assertNoActiveLauncherWork();

    const directories = getLauncherDirectories();
    const removedPaths = removeExistingPaths(getLauncherDataPaths(directories));

    await resetLauncherDatabase();
    ensureLauncherDirectories();

    return {
      clearedAt: new Date().toISOString(),
      kind: "data",
      removedPaths,
      resetTables: [...launcherDataTables],
    };
  };
