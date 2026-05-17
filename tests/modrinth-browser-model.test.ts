import { describe, expect, test } from "bun:test";
import type {
  InstanceContent,
  InstanceFileEntry,
  ModrinthProjectSummary,
} from "../src/shared/types";
import type { SelectedInstance } from "../src/views/main/features/curseforge/curseforge-browser-types";
import {
  findInstalledModrinthItem,
  getModrinthActionState,
  isModrinthCategoryAvailable,
  isModrinthItemCompatible,
} from "../src/views/main/features/modrinth/modrinth-browser-model";

const selectedInstance: SelectedInstance = {
  id: "instance-1",
  loader: "fabric",
  minecraftVersion: "1.20.4",
  name: "Fabric Client",
};

const createProject = (
  overrides: Partial<ModrinthProjectSummary> = {},
): ModrinthProjectSummary => ({
  authors: ["Author"],
  categories: ["fabric"],
  dateModified: "2024-01-01T00:00:00Z",
  downloadCount: 1200,
  follows: 100,
  gameVersions: ["1.20.4"],
  id: "project-id",
  isAvailable: true,
  latestFile: {
    displayName: "Project 1.20.4",
    downloadUrl: "https://cdn.modrinth.test/project.jar",
    fileDate: "2024-01-01T00:00:00Z",
    fileName: "project.jar",
    gameVersions: ["1.20.4"],
    hashes: {},
    id: "version-id",
    modLoaders: ["fabric"],
    releaseType: "release",
    sizeBytes: 42,
    versionNumber: "1.0.0",
  },
  logoUrl: null,
  modLoaders: ["fabric"],
  name: "Project",
  screenshotUrls: [],
  section: "mods",
  slug: "project",
  summary: "A test project.",
  websiteUrl: "https://modrinth.com/mod/project",
  ...overrides,
});

const createFileEntry = (
  overrides: Partial<InstanceFileEntry> = {},
): InstanceFileEntry => ({
  displayName: "Project",
  enabled: true,
  extension: ".jar",
  fileName: "project.jar",
  id: "mod:project.jar",
  isDirectory: false,
  kind: "mod",
  modifiedAt: "2024-01-01T00:00:00Z",
  path: "/instances/fabric/mods/project.jar",
  sizeBytes: 42,
  ...overrides,
});

const createContent = (
  overrides: Partial<InstanceContent> = {},
): InstanceContent => ({
  counts: {
    disabledMods: 0,
    enabledMods: 1,
    logs: 0,
    mods: 1,
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
  mods: [createFileEntry()],
  refreshedAt: "2024-01-01T00:00:00Z",
  recipe: null,
  resourcePacks: [],
  screenshots: [],
  serverManager: {
    candidates: [],
    defaultServerName: "Instance Server",
    requirements: [],
    serverRoot: "/instances/fabric/nyxen/servers",
    workspaces: [],
  },
  serverList: null,
  shaderPacks: [],
  worlds: [],
  ...overrides,
});

describe("modrinth browser model", () => {
  test("matches installed Modrinth content by latest file name", () => {
    expect(
      findInstalledModrinthItem(createProject(), "mods", createContent())
        ?.fileName,
    ).toBe("project.jar");
  });

  test("marks items as requiring instance selection before install actions", () => {
    expect(
      getModrinthActionState({
        category: "mods",
        failed: false,
        installedItem: null,
        item: createProject(),
        pending: false,
        selectedInstance: null,
      }),
    ).toBe("select-instance");
  });

  test("treats modpacks as library-level installs instead of instance content", () => {
    const modpack = createProject({ section: "modpacks" });

    expect(isModrinthCategoryAvailable("modpacks", null)).toBe(true);
    expect(isModrinthCategoryAvailable("modpacks", selectedInstance)).toBe(
      false,
    );
    expect(isModrinthItemCompatible(modpack, "modpacks", null)).toBe(true);
    expect(
      isModrinthItemCompatible(modpack, "modpacks", selectedInstance),
    ).toBe(false);
    expect(
      getModrinthActionState({
        category: "modpacks",
        failed: false,
        installedItem: null,
        item: modpack,
        pending: false,
        selectedInstance: null,
      }),
    ).toBe("install");
  });

  test("detects incompatible Minecraft versions and loaders", () => {
    expect(
      isModrinthItemCompatible(
        createProject({
          gameVersions: ["1.19.4"],
          latestFile: {
            displayName: "Project 1.19.4",
            downloadUrl: "https://cdn.modrinth.test/project.jar",
            fileDate: "2024-01-01T00:00:00Z",
            fileName: "project.jar",
            gameVersions: ["1.19.4"],
            hashes: {},
            id: "version-id",
            modLoaders: ["fabric"],
            releaseType: "release",
            sizeBytes: 42,
            versionNumber: "1.0.0",
          },
        }),
        "mods",
        selectedInstance,
      ),
    ).toBe(false);

    expect(
      isModrinthItemCompatible(
        createProject({ modLoaders: ["forge"] }),
        "mods",
        selectedInstance,
      ),
    ).toBe(false);
  });

  test("marks matching installed files as already installed", () => {
    const project = createProject();
    const installedItem = findInstalledModrinthItem(
      project,
      "mods",
      createContent(),
    );

    expect(
      getModrinthActionState({
        category: "mods",
        failed: false,
        installedItem,
        item: project,
        pending: false,
        selectedInstance,
      }),
    ).toBe("installed");
  });
});
