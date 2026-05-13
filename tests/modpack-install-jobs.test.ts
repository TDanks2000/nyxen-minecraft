import { describe, expect, test } from "bun:test";
import type { DownloadQueueJob, LauncherInstance } from "../src/shared/types";
import {
  getActiveModpackInstallJobs,
  isActiveModpackDownloadJob,
  isCompletedModpackDownloadJob,
} from "../src/views/main/features/instances/modpack-install-jobs";

const createInstance = (
  overrides: Partial<LauncherInstance> = {},
): LauncherInstance => ({
  bannerUrl: null,
  createdAt: "2024-01-01T00:00:00Z",
  folders: {
    app: "/instances/one/.nyxen",
    cache: "/instances/one/.nyxen/cache",
    config: "/instances/one/config",
    game: "/instances/one",
    logs: "/instances/one/logs",
    media: "/instances/one/.nyxen/media",
    metadata: "/instances/one/.nyxen/metadata",
    mods: "/instances/one/mods",
    resourcePacks: "/instances/one/resourcepacks",
    root: "/instances/one",
    saves: "/instances/one/saves",
    screenshots: "/instances/one/screenshots",
    shaderPacks: "/instances/one/shaderpacks",
  },
  gameArgs: [],
  gameDirectory: "/instances/one",
  iconUrl: null,
  id: "instance-1",
  instanceDirectory: "/instances/one",
  javaArgs: [],
  javaExecutable: null,
  lastLaunchedAt: null,
  loader: "fabric",
  loaderVersion: null,
  memoryMaxMb: 4096,
  memoryMinMb: 1024,
  metadataPath: "/instances/one/.nyxen/metadata/instance.json",
  modpack: {
    artifactPath: "/instances/one/.nyxen/cache/pack.mrpack",
    bannerUrl: null,
    fileId: "version-1",
    fileName: "pack.mrpack",
    iconUrl: null,
    installedAt: "2024-01-01T00:00:00Z",
    installedFiles: 1,
    locked: true,
    manifestPath: "/instances/one/.nyxen/metadata/modpack.json",
    name: "Installed Pack",
    overridesPath: null,
    projectId: "project-1",
    skippedFiles: 0,
    source: "modrinth",
    updatedAt: "2024-01-01T00:00:00Z",
    websiteUrl: null,
  },
  name: "Installed Pack",
  profileId: null,
  updatedAt: "2024-01-01T00:00:00Z",
  versionId: "1.20.4",
  ...overrides,
});

const createModpackJob = (
  overrides: Partial<DownloadQueueJob> = {},
): DownloadQueueJob => ({
  activeLabel: "Downloading pack files",
  completedAt: null,
  createdAt: "2024-01-01T00:00:00Z",
  error: null,
  id: "job-1",
  items: [],
  metadata: {
    category: "modpacks",
    fileId: "version-1",
    imageUrl: null,
    kind: "modrinthFile",
    projectId: "project-1",
    targetInstanceId: null,
  },
  progress: 50,
  result: null,
  source: "modrinth",
  startedAt: "2024-01-01T00:00:00Z",
  status: "running",
  subtitle: "Modrinth",
  title: "Installed Pack",
  totalItems: 0,
  updatedAt: "2024-01-01T00:00:00Z",
  ...overrides,
});

describe("modpack install job helpers", () => {
  test("keeps active modpack jobs unmatched until an instance exists", () => {
    const job = createModpackJob();

    expect(isActiveModpackDownloadJob(job)).toBe(true);
    expect(getActiveModpackInstallJobs([job], [])).toEqual({
      byInstanceId: new Map(),
      unmatchedJobs: [job],
    });
  });

  test("matches active modpack jobs by target instance and prefers running jobs", () => {
    const instance = createInstance();
    const queuedJob = createModpackJob({
      id: "queued",
      metadata: {
        category: "modpacks",
        fileId: "version-1",
        imageUrl: null,
        kind: "modrinthFile",
        projectId: "project-1",
        targetInstanceId: instance.id,
      },
      status: "queued",
    });
    const runningJob = createModpackJob({
      id: "running",
      metadata: {
        category: "modpacks",
        fileId: "version-2",
        imageUrl: null,
        kind: "modrinthFile",
        projectId: "project-1",
        targetInstanceId: instance.id,
      },
      status: "running",
    });

    const result = getActiveModpackInstallJobs(
      [queuedJob, runningJob],
      [instance],
    );

    expect(result.byInstanceId.get(instance.id)?.id).toBe("running");
    expect(result.unmatchedJobs).toEqual([]);
  });

  test("matches active modpack jobs by installed project id", () => {
    const instance = createInstance();
    const job = createModpackJob({
      metadata: {
        category: "modpacks",
        fileId: "version-1",
        imageUrl: null,
        kind: "modrinthFile",
        projectId: "project-1",
        targetInstanceId: null,
      },
    });

    const result = getActiveModpackInstallJobs([job], [instance]);

    expect(result.byInstanceId.get(instance.id)).toBe(job);
    expect(result.unmatchedJobs).toEqual([]);
  });

  test("only treats completed modpack jobs with created instances as refresh-worthy", () => {
    const instance = createInstance();
    const completedWithInstance = createModpackJob({
      completedAt: "2024-01-01T00:01:00Z",
      progress: 100,
      result: {
        kind: "modrinthFile",
        result: {
          category: "modpacks",
          content: null,
          fileName: "pack.mrpack",
          instance,
          path: "/downloads/pack.mrpack",
        },
      },
      status: "completed",
    });
    const completedWithoutInstance = createModpackJob({
      completedAt: "2024-01-01T00:01:00Z",
      progress: 100,
      result: {
        kind: "modrinthFile",
        result: {
          category: "mods",
          content: null,
          fileName: "mod.jar",
          instance: null,
          path: "/downloads/mod.jar",
        },
      },
      status: "completed",
    });

    expect(isCompletedModpackDownloadJob(completedWithInstance)).toBe(true);
    expect(isCompletedModpackDownloadJob(completedWithoutInstance)).toBe(false);
  });
});
