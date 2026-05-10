import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import {
  getLauncherCachePaths,
  getLauncherDataPaths,
} from "../src/bun/launcher/storage";
import type { LauncherDirectories } from "../src/shared/types";

const directories: LauncherDirectories = {
  assets: "/tmp/nyxen/launcher/assets",
  downloads: "/tmp/nyxen/launcher/downloads",
  instances: "/tmp/nyxen/launcher/instances",
  libraries: "/tmp/nyxen/launcher/libraries",
  logs: "/tmp/nyxen/launcher/logs",
  root: "/tmp/nyxen/launcher",
  runtimes: "/tmp/nyxen/launcher/runtimes",
  temp: "/tmp/nyxen/launcher/temp",
  versions: "/tmp/nyxen/launcher/versions",
};

describe("launcher storage maintenance", () => {
  test("targets rebuildable launcher cache without deleting instances", () => {
    const cachePaths = getLauncherCachePaths({
      directories,
      instanceDirectoryNames: ["instance_one", "instance_two"],
    });

    expect(cachePaths).toContain(directories.assets);
    expect(cachePaths).toContain(directories.downloads);
    expect(cachePaths).toContain(directories.libraries);
    expect(cachePaths).toContain(directories.runtimes);
    expect(cachePaths).toContain(directories.temp);
    expect(cachePaths).toContain(directories.versions);
    expect(cachePaths).toContain(
      join(directories.instances, "instance_one", ".nyxen", "cache"),
    );
    expect(cachePaths).toContain(
      join(directories.instances, "instance_two", ".nyxen", "cache"),
    );
    expect(cachePaths).not.toContain(directories.instances);
    expect(cachePaths).not.toContain(directories.logs);
    expect(cachePaths).not.toContain(directories.root);
  });

  test("targets the launcher root for full data clearing", () => {
    expect(getLauncherDataPaths(directories)).toEqual([directories.root]);
  });
});
