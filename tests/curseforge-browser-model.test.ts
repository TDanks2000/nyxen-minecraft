import { describe, expect, test } from "bun:test";
import type { CurseForgeProjectSummary } from "../src/shared/types";
import {
  categoryRequiresInstanceTarget,
  findInstalledCurseForgeItem,
  getCurseForgeActionState,
  getCurseForgeExpectedFileName,
  hasCurseForgeUpdateAvailable,
  isCurseForgeCategoryAvailable,
  isCurseForgeItemCompatible,
  requiresManualCurseForgeDownload,
} from "../src/views/main/features/curseforge/curseforge-browser-model";
import type {
  InstalledContentByCategory,
  SelectedInstance,
} from "../src/views/main/features/curseforge/curseforge-browser-types";

const selectedInstance: SelectedInstance = {
  id: "instance-1",
  loader: "fabric",
  minecraftVersion: "1.20.4",
  name: "Fabric Client",
};

const createProject = (
  overrides: Partial<CurseForgeProjectSummary> = {},
): CurseForgeProjectSummary => ({
  allowDistribution: true,
  authors: ["Author"],
  categories: ["Utility"],
  classId: 6,
  dateModified: "2024-01-01T00:00:00Z",
  downloadCount: 1200,
  gameVersions: ["1.20.4"],
  id: 100,
  isAvailable: true,
  isFeatured: false,
  latestFile: {
    displayName: "Project 1.20.4",
    downloadUrl: null,
    fileDate: "2024-01-01T00:00:00Z",
    fileName: "project.jar",
    gameVersions: ["1.20.4", "Fabric"],
    id: 200,
    modLoaders: ["fabric"],
    releaseType: "release",
  },
  logoUrl: null,
  modLoaders: ["fabric"],
  name: "Project",
  section: "mods",
  slug: "project",
  summary: "A test project.",
  websiteUrl: null,
  ...overrides,
});

describe("curseforge browser model", () => {
  test("matches installed content by stable identifiers only", () => {
    const project = createProject({ name: "Same Display Name" });
    const installedContent: InstalledContentByCategory = {
      mods: [
        {
          category: "mods",
          name: "Same Display Name",
          projectId: "different-project",
        },
        {
          category: "mods",
          name: "Matched by slug",
          projectId: "another-project",
          slug: "project",
        },
      ],
    };

    expect(
      findInstalledCurseForgeItem(project, "mods", installedContent)?.name,
    ).toBe("Matched by slug");
  });

  test("marks items as requiring instance selection before install actions", () => {
    expect(
      getCurseForgeActionState({
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

    expect(categoryRequiresInstanceTarget("modpacks")).toBe(false);
    expect(categoryRequiresInstanceTarget("mods")).toBe(true);
    expect(isCurseForgeCategoryAvailable("modpacks", null)).toBe(true);
    expect(isCurseForgeCategoryAvailable("modpacks", selectedInstance)).toBe(
      false,
    );
    expect(isCurseForgeItemCompatible(modpack, "modpacks", null)).toBe(true);
    expect(
      isCurseForgeItemCompatible(modpack, "modpacks", selectedInstance),
    ).toBe(false);
    expect(
      getCurseForgeActionState({
        category: "modpacks",
        failed: false,
        installedItem: null,
        item: modpack,
        pending: false,
        selectedInstance: null,
      }),
    ).toBe("install");
    expect(
      getCurseForgeActionState({
        category: "modpacks",
        failed: false,
        installedItem: null,
        item: modpack,
        pending: false,
        selectedInstance,
      }),
    ).toBe("incompatible");
  });

  test("detects incompatible Minecraft versions and loaders", () => {
    expect(
      isCurseForgeItemCompatible(
        createProject({
          gameVersions: ["1.19.4"],
          latestFile: {
            displayName: "Project 1.19.4",
            downloadUrl: null,
            fileDate: "2024-01-01T00:00:00Z",
            fileName: "project.jar",
            gameVersions: ["1.19.4", "Fabric"],
            id: 200,
            modLoaders: ["fabric"],
            releaseType: "release",
          },
        }),
        "mods",
        selectedInstance,
      ),
    ).toBe(false);

    expect(
      isCurseForgeItemCompatible(
        createProject({ modLoaders: ["forge"] }),
        "mods",
        selectedInstance,
      ),
    ).toBe(false);
  });

  test("reports update availability from CurseForge file ids", () => {
    const project = createProject();
    const installedItem = {
      category: "mods" as const,
      fileId: "199",
      name: "Project",
      projectId: "100",
      slug: "project",
    };

    expect(hasCurseForgeUpdateAvailable(project, installedItem)).toBe(true);
    expect(
      getCurseForgeActionState({
        category: "mods",
        failed: false,
        installedItem,
        item: project,
        pending: false,
        selectedInstance,
      }),
    ).toBe("update-available");
  });

  test("detects manual download requirements from missing download URLs", () => {
    const directProject = createProject({
      latestFile: {
        displayName: "Direct Mod",
        downloadUrl: "https://downloads.example.test/direct.jar",
        fileDate: "2024-02-01T00:00:00Z",
        fileName: "direct.jar",
        gameVersions: ["1.20.4"],
        id: 123,
        modLoaders: ["fabric"],
        releaseType: "release",
      },
    });
    const manualProject = createProject({
      latestFile: {
        displayName: "Manual Mod",
        downloadUrl: null,
        fileDate: "2024-02-01T00:00:00Z",
        fileName: "manual.jar",
        gameVersions: ["1.20.4"],
        id: 456,
        modLoaders: ["fabric"],
        releaseType: "release",
      },
    });

    expect(requiresManualCurseForgeDownload(directProject)).toBe(false);
    expect(requiresManualCurseForgeDownload(manualProject)).toBe(true);
    expect(getCurseForgeExpectedFileName(manualProject)).toBe("manual.jar");
  });
});
