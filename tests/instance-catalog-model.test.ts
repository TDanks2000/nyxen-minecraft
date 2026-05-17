import { describe, expect, test } from "bun:test";
import type { InstanceContent, LauncherInstance } from "../src/shared/types";
import { getModManagementState } from "../src/views/main/features/instances/instance-catalog-model";

const createInstance = (
  overrides: Partial<LauncherInstance> = {},
): LauncherInstance =>
  ({
    bannerUrl: null,
    createdAt: "2024-01-01T00:00:00Z",
    folders: {
      app: "/instances/one/app",
      cache: "/instances/one/cache",
      config: "/instances/one/config",
      game: "/instances/one/game",
      logs: "/instances/one/logs",
      media: "/instances/one/media",
      metadata: "/instances/one/metadata",
      mods: "/instances/one/mods",
      resourcePacks: "/instances/one/resourcepacks",
      root: "/instances/one",
      saves: "/instances/one/saves",
      screenshots: "/instances/one/screenshots",
      shaderPacks: "/instances/one/shaderpacks",
    },
    gameArgs: [],
    gameDirectory: "/instances/one/game",
    iconUrl: null,
    id: "instance-1",
    instanceDirectory: "/instances/one",
    javaArgs: [],
    javaExecutable: null,
    lastLaunchedAt: null,
    loader: "fabric",
    loaderVersion: null,
    memoryMaxMb: 4096,
    memoryMinMb: 512,
    metadataPath: "/instances/one/metadata/instance.json",
    modpack: null,
    name: "Fabric Client",
    profileId: null,
    updatedAt: "2024-01-01T00:00:00Z",
    versionId: "1.20.4",
    ...overrides,
  }) satisfies LauncherInstance;

const createContent = (
  overrides: Partial<InstanceContent> = {},
): InstanceContent => ({
  counts: {
    disabledMods: 0,
    enabledMods: 0,
    logs: 0,
    mods: 0,
    resourcePacks: 0,
    screenshots: 0,
    shaderPacks: 0,
    worlds: 0,
  },
  curseForge: {},
  instanceId: "instance-1",
  launchAttempts: [],
  logFolders: [],
  logs: [],
  mods: [],
  refreshedAt: "2024-01-01T00:00:00Z",
  recipe: null,
  resourcePacks: [],
  screenshots: [],
  serverManager: {
    candidates: [],
    defaultServerName: "Fabric Client Server",
    requirements: [],
    serverRoot: "/instances/one/app/servers",
    workspaces: [],
  },
  serverList: null,
  shaderPacks: [],
  worlds: [],
  ...overrides,
});

describe("instance catalog model", () => {
  test("keeps mod controls disabled until content is loaded", () => {
    expect(
      getModManagementState({
        content: null,
        contentLoading: true,
        instance: createInstance(),
      }),
    ).toEqual({
      controlsDisabled: true,
      managedByModpack: false,
      reason: "loading",
    });
  });

  test("keeps mod controls disabled for linked modpack instances", () => {
    expect(
      getModManagementState({
        content: createContent(),
        contentLoading: false,
        instance: createInstance({
          modpack: {
            artifactPath: "/instances/one/cache/pack.zip",
            bannerUrl: null,
            fileId: "222",
            fileName: "pack.zip",
            iconUrl: null,
            installedAt: "2024-01-01T00:00:00Z",
            installedFiles: 1,
            locked: true,
            manifestPath: "/instances/one/metadata/manifest.json",
            name: "Managed Pack",
            overridesPath: null,
            projectId: "111",
            skippedFiles: 0,
            source: "curseforge",
            updatedAt: "2024-01-01T00:00:00Z",
            websiteUrl: null,
          },
        }),
      }),
    ).toMatchObject({
      controlsDisabled: true,
      managedByModpack: true,
      reason: "modpack",
    });
  });

  test("treats CurseForge modpack metadata as managed while instance data catches up", () => {
    expect(
      getModManagementState({
        content: createContent({
          curseForge: {
            modpacks: [
              {
                category: "modpacks",
                fileId: "222",
                fileName: "pack.zip",
                installedAt: "2024-01-01T00:00:00Z",
                name: "Managed Pack",
                projectId: "111",
              },
            ],
          },
        }),
        contentLoading: false,
        instance: createInstance(),
      }),
    ).toMatchObject({
      controlsDisabled: true,
      managedByModpack: true,
      reason: "modpack",
    });
  });

  test("enables mod controls for loaded unmanaged content", () => {
    expect(
      getModManagementState({
        content: createContent(),
        contentLoading: false,
        instance: createInstance(),
      }),
    ).toEqual({
      controlsDisabled: false,
      managedByModpack: false,
      reason: null,
    });
  });
});
