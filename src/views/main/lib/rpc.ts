import { Electroview } from "electrobun/view";
import {
  APP_IDENTIFIER,
  APP_NAME,
  MAIN_VIEW_RPC_MAX_REQUEST_TIME_MS,
} from "@/shared/constants";
import type { MainViewRPC } from "@/shared/rpc/types";
import type {
  AppEnvironment,
  ClearLauncherStorageResult,
  CurseForgeProjectSummary,
  CurseForgeSearchResult,
  CurseForgeStatus,
  DatabaseStatus,
  DownloadArtifactsResult,
  DownloadModrinthFileResult,
  DownloadQueueJob,
  GetInstanceLogFileInput,
  InstanceContent,
  InstanceFileEntry,
  InstanceLogFilePreview,
  LauncherDirectories,
  LauncherInstance,
  LauncherInstanceFolders,
  LauncherProfile,
  LauncherStatus,
  LaunchPlan,
  MinecraftVersionDetails,
  MinecraftVersionManifest,
  MinecraftVersionSummary,
  ModLoader,
  ModrinthProjectSummary,
  ModrinthSearchResult,
  ModrinthStatus,
  RunningLaunch,
  SettingsStatus,
} from "@/shared/types";

const viewRpc = Electroview.defineRPC<MainViewRPC>({
  handlers: {
    messages: {
      logToWebview: ({ message }) => {
        console.log(`[bun] ${message}`);
      },
    },
    requests: {
      getViewStatus: () => ({ ready: true }),
    },
  },
  maxRequestTime: MAIN_VIEW_RPC_MAX_REQUEST_TIME_MS,
});

type ViewRpcClient = typeof viewRpc;
type RequestProxy = ViewRpcClient["requestProxy"];

const previewRoot = "/tmp/Nyxen Minecraft Dev Preview";
const previewNow = new Date("2026-05-11T12:00:00.000Z");

const isoHoursAgo = (hours: number): string =>
  new Date(previewNow.getTime() - hours * 60 * 60 * 1000).toISOString();

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const getPreviewModCount = (): number | null => {
  if (typeof window === "undefined") return null;

  const raw = new URLSearchParams(window.location.search).get(
    "nyxenPreviewMods",
  );
  if (!raw) return null;

  const value = Number.parseInt(raw, 10);
  if (!Number.isFinite(value)) return null;

  return Math.max(0, Math.min(value, 2_000));
};

const makeDirectories = (): LauncherDirectories => ({
  assets: `${previewRoot}/assets`,
  downloads: `${previewRoot}/downloads`,
  instances: `${previewRoot}/instances`,
  libraries: `${previewRoot}/libraries`,
  logs: `${previewRoot}/logs`,
  root: previewRoot,
  runtimes: `${previewRoot}/runtimes`,
  temp: `${previewRoot}/temp`,
  versions: `${previewRoot}/versions`,
});

const makeFolders = (instanceId: string): LauncherInstanceFolders => {
  const root = `${previewRoot}/instances/${instanceId}`;

  return {
    app: `${root}/nyxen`,
    cache: `${root}/nyxen/cache`,
    config: `${root}/minecraft/config`,
    game: `${root}/minecraft`,
    logs: `${root}/minecraft/logs`,
    media: `${root}/nyxen/media`,
    metadata: `${root}/nyxen/metadata`,
    mods: `${root}/minecraft/mods`,
    resourcePacks: `${root}/minecraft/resourcepacks`,
    root,
    saves: `${root}/minecraft/saves`,
    screenshots: `${root}/minecraft/screenshots`,
    shaderPacks: `${root}/minecraft/shaderpacks`,
  };
};

const createPreviewInstance = ({
  id,
  lastLaunchedAt,
  loader,
  loaderVersion,
  memoryMaxMb,
  modpack,
  name,
  updatedAt,
  versionId,
}: {
  id: string;
  lastLaunchedAt: string | null;
  loader: ModLoader;
  loaderVersion: string | null;
  memoryMaxMb: number;
  modpack: LauncherInstance["modpack"];
  name: string;
  updatedAt: string;
  versionId: string;
}): LauncherInstance => {
  const folders = makeFolders(id);

  return {
    bannerUrl: null,
    createdAt: isoHoursAgo(24 * 14),
    folders,
    gameArgs: [],
    gameDirectory: folders.game,
    iconUrl: null,
    id,
    instanceDirectory: folders.root,
    javaArgs: [],
    javaExecutable: null,
    lastLaunchedAt,
    loader,
    loaderVersion,
    memoryMaxMb,
    memoryMinMb: 512,
    metadataPath: `${folders.metadata}/instance.json`,
    modpack,
    name,
    profileId: "preview-profile",
    updatedAt,
    versionId,
  };
};

const previewProfile: LauncherProfile = {
  accountId: "00000000-0000-4000-8000-preview000001",
  authExpiresAt: isoHoursAgo(-12),
  authRefreshable: true,
  createdAt: isoHoursAgo(24 * 8),
  displayName: "PreviewPlayer",
  entitlements: ["game_minecraft", "product_minecraft"],
  id: "preview-profile",
  kind: "microsoft",
  ownershipCheckedAt: isoHoursAgo(3),
  skinUrl: null,
  updatedAt: isoHoursAgo(3),
};

let previewInstances: Array<LauncherInstance> = [
  createPreviewInstance({
    id: "fabric-performance-lab",
    lastLaunchedAt: isoHoursAgo(2),
    loader: "fabric",
    loaderVersion: "0.16.10",
    memoryMaxMb: 6144,
    modpack: null,
    name: "Fabric Performance Lab",
    updatedAt: isoHoursAgo(2),
    versionId: "1.21.6",
  }),
  createPreviewInstance({
    id: "vault-hunters-preview",
    lastLaunchedAt: isoHoursAgo(35),
    loader: "forge",
    loaderVersion: "52.0.21",
    memoryMaxMb: 8192,
    modpack: {
      artifactPath: `${previewRoot}/downloads/Vault-Hunters.zip`,
      bannerUrl: null,
      fileId: "6001042",
      fileName: "Vault-Hunters-Preview.zip",
      iconUrl: null,
      installedAt: isoHoursAgo(24 * 5),
      installedFiles: 146,
      locked: true,
      manifestPath: `${previewRoot}/instances/vault-hunters-preview/nyxen/metadata/manifest.json`,
      name: "Vault Hunters Preview",
      overridesPath: null,
      projectId: "711537",
      skippedFiles: 3,
      slug: "vault-hunters-official-modpack",
      source: "curseforge",
      updatedAt: isoHoursAgo(8),
      version: "3.16.2",
      websiteUrl:
        "https://www.curseforge.com/minecraft/modpacks/vault-hunters-official-modpack",
    },
    name: "Vault Hunters Preview",
    updatedAt: isoHoursAgo(8),
    versionId: "1.20.1",
  }),
];

const previewFile = ({
  displayName,
  fileName,
  instance,
  kind,
  modifiedAt,
  relativePath,
  sizeBytes,
  isDirectory = false,
  enabled = null,
}: {
  displayName: string;
  enabled?: boolean | null;
  fileName: string;
  instance: LauncherInstance;
  isDirectory?: boolean;
  kind: InstanceFileEntry["kind"];
  modifiedAt: string;
  relativePath: string;
  sizeBytes: number;
}): InstanceFileEntry => ({
  displayName,
  enabled,
  extension: isDirectory ? null : (fileName.split(".").pop() ?? null),
  fileName,
  id: `${instance.id}:${kind}:${relativePath}`,
  isDirectory,
  kind,
  modifiedAt,
  path: `${instance.gameDirectory}/${relativePath}`,
  relativePath,
  sizeBytes,
});

const makeContent = (instance: LauncherInstance): InstanceContent => {
  const logs = [
    previewFile({
      displayName: "Latest Log",
      fileName: "latest.log",
      instance,
      kind: "log",
      modifiedAt: instance.lastLaunchedAt ?? instance.updatedAt,
      relativePath: "logs/latest.log",
      sizeBytes: 228_412,
    }),
  ];
  const previewModCount = getPreviewModCount();
  const mods =
    instance.loader === "vanilla"
      ? []
      : Array.from({ length: previewModCount ?? 2 }, (_, index) =>
          previewFile({
            displayName:
              index === 0
                ? "Sodium"
                : index === 1
                  ? "Debug HUD"
                  : `Local Mod ${String(index + 1).padStart(3, "0")}`,
            enabled: index % 7 !== 1,
            fileName:
              index === 0
                ? "sodium-fabric.jar"
                : index === 1
                  ? "debug-hud.disabled"
                  : `local-mod-${String(index + 1).padStart(3, "0")}.jar`,
            instance,
            kind: "mod",
            modifiedAt: isoHoursAgo(6 + index),
            relativePath:
              index === 0
                ? "mods/sodium-fabric.jar"
                : index === 1
                  ? "mods/debug-hud.disabled"
                  : `mods/local-mod-${String(index + 1).padStart(3, "0")}.jar`,
            sizeBytes: 320_000 + index * 24_117,
          }),
        );
  const worlds = [
    previewFile({
      displayName: "Overworld QA Save",
      fileName: "Overworld QA Save",
      instance,
      isDirectory: true,
      kind: "world",
      modifiedAt: isoHoursAgo(4),
      relativePath: "saves/Overworld QA Save",
      sizeBytes: 43_229_184,
    }),
  ];
  const screenshots = [
    previewFile({
      displayName: "Base build checkpoint",
      fileName: "2026-05-11_11.38.21.png",
      instance,
      kind: "screenshot",
      modifiedAt: isoHoursAgo(1),
      relativePath: "screenshots/2026-05-11_11.38.21.png",
      sizeBytes: 812_432,
    }),
  ];

  return {
    counts: {
      disabledMods: mods.filter((mod) => mod.enabled === false).length,
      enabledMods: mods.filter((mod) => mod.enabled).length,
      logs: logs.length,
      mods: mods.length,
      resourcePacks: 1,
      screenshots: screenshots.length,
      shaderPacks: 1,
      worlds: worlds.length,
    },
    curseForge: instance.modpack
      ? {
          modpacks: [
            {
              category: "modpacks",
              fileId: instance.modpack.fileId,
              fileName: instance.modpack.fileName,
              installedAt: instance.modpack.installedAt,
              name: instance.modpack.name,
              projectId: instance.modpack.projectId,
              slug: instance.modpack.slug,
              version: instance.modpack.version,
            },
          ],
        }
      : {},
    instanceId: instance.id,
    logFolders: [
      {
        displayName: "Game Logs",
        files: logs,
        id: `${instance.id}:logs`,
        path: instance.folders.logs,
      },
    ],
    logs,
    mods,
    refreshedAt: isoHoursAgo(0.2),
    recipe: null,
    resourcePacks: [
      previewFile({
        displayName: "High Contrast UI",
        fileName: "high-contrast-ui.zip",
        instance,
        kind: "resourcePack",
        modifiedAt: isoHoursAgo(20),
        relativePath: "resourcepacks/high-contrast-ui.zip",
        sizeBytes: 4_511_012,
      }),
    ],
    screenshots,
    serverList: previewFile({
      displayName: "Servers",
      fileName: "servers.dat",
      instance,
      kind: "serverList",
      modifiedAt: isoHoursAgo(48),
      relativePath: "servers.dat",
      sizeBytes: 2048,
    }),
    shaderPacks: [
      previewFile({
        displayName: "Complementary Reimagined",
        fileName: "ComplementaryReimagined.zip",
        instance,
        kind: "shaderPack",
        modifiedAt: isoHoursAgo(14),
        relativePath: "shaderpacks/ComplementaryReimagined.zip",
        sizeBytes: 3_010_443,
      }),
    ],
    worlds,
  };
};

let previewSettings: SettingsStatus = {
  path: `${previewRoot}/settings.json`,
  storage: "json",
  updatedAt: isoHoursAgo(1),
  values: {
    "launcher.javaManagement": "app-controlled",
    "launcher.lowEndMode": false,
    "launcher.showSnapshots": false,
    "ui.compactMode": false,
  },
};

let previewDownloads: Array<DownloadQueueJob> = [
  {
    activeLabel: "Mojang Java runtime",
    completedAt: null,
    createdAt: isoHoursAgo(0.5),
    error: null,
    id: "preview-download-runtime",
    items: [
      {
        downloadedBytes: 52_428_800,
        error: null,
        id: "java-runtime-linux",
        kind: "javaRuntime",
        label: "Java runtime 21",
        progress: 72,
        status: "running",
        totalBytes: 72_817_664,
      },
      {
        downloadedBytes: 4_200_000,
        error: null,
        id: "libraries",
        kind: "library",
        label: "Launch libraries",
        progress: 100,
        status: "completed",
        totalBytes: 4_200_000,
      },
    ],
    metadata: { kind: "launchArtifacts" },
    progress: 78,
    result: null,
    source: "launch",
    startedAt: isoHoursAgo(0.4),
    status: "running",
    subtitle: "Preparing Fabric Performance Lab",
    title: "Launch files",
    totalItems: 2,
    updatedAt: isoHoursAgo(0.1),
  },
];

const versions: Array<MinecraftVersionSummary> = [
  {
    complianceLevel: 1,
    id: "1.21.6",
    releaseTime: "2026-04-30T10:00:00.000Z",
    sha1: "preview",
    time: "2026-04-30T10:00:00.000Z",
    type: "release",
    url: "https://piston-meta.mojang.com/mc/game/version_manifest_v2.json",
  },
  {
    complianceLevel: 1,
    id: "1.21.5",
    releaseTime: "2026-03-25T10:00:00.000Z",
    sha1: "preview",
    time: "2026-03-25T10:00:00.000Z",
    type: "release",
    url: "https://piston-meta.mojang.com/mc/game/version_manifest_v2.json",
  },
  {
    complianceLevel: 1,
    id: "1.20.1",
    releaseTime: "2023-06-12T13:25:51.000Z",
    sha1: "preview",
    time: "2023-06-12T13:25:51.000Z",
    type: "release",
    url: "https://piston-meta.mojang.com/mc/game/version_manifest_v2.json",
  },
  {
    complianceLevel: 1,
    id: "26w19a",
    releaseTime: "2026-05-06T11:00:00.000Z",
    sha1: "preview",
    time: "2026-05-06T11:00:00.000Z",
    type: "snapshot",
    url: "https://piston-meta.mojang.com/mc/game/version_manifest_v2.json",
  },
];

const getManifest = (): MinecraftVersionManifest => ({
  cached: true,
  latest: {
    release: "1.21.6",
    snapshot: "26w19a",
  },
  refreshedAt: isoHoursAgo(1),
  sourceUrl: "https://piston-meta.mojang.com/mc/game/version_manifest_v2.json",
  versions,
});

const getStatus = (): LauncherStatus => ({
  capabilities: [
    {
      id: "version-metadata-cache",
      ready: true,
      title: "Minecraft version metadata cache",
    },
    { id: "profile-store", ready: true, title: "Local launcher profile store" },
    { id: "instance-store", ready: true, title: "Persistent instance store" },
    { id: "launch-planning", ready: true, title: "Launch preflight planning" },
    {
      id: "microsoft-auth",
      ready: true,
      title: "Microsoft account ownership verification",
    },
    {
      id: "modrinth-api",
      ready: true,
      title: "Modrinth catalog API",
    },
  ],
  counts: {
    instances: previewInstances.length,
    profiles: 1,
    versions: versions.length,
  },
  directories: makeDirectories(),
  manifest: {
    latestRelease: "1.21.6",
    latestSnapshot: "26w19a",
    refreshedAt: isoHoursAgo(1),
    sourceUrl:
      "https://piston-meta.mojang.com/mc/game/version_manifest_v2.json",
  },
});

const makeLaunchPlan = (instance: LauncherInstance): LaunchPlan => {
  const directories = makeDirectories();

  return {
    arguments: {
      game: ["--username", previewProfile.displayName],
      jvm: [`-Xmx${instance.memoryMaxMb}M`],
    },
    classpath: [`${directories.versions}/${instance.versionId}/client.jar`],
    createdAt: new Date().toISOString(),
    directories: {
      ...directories,
      game: instance.folders.game,
      instance: instance.folders.root,
      instanceCache: instance.folders.cache,
      instanceConfig: instance.folders.config,
      instanceLogs: instance.folders.logs,
      instanceMetadata: instance.folders.metadata,
      mods: instance.folders.mods,
      natives: `${instance.folders.cache}/natives`,
      resourcePacks: instance.folders.resourcePacks,
      saves: instance.folders.saves,
      screenshots: instance.folders.screenshots,
      shaderPacks: instance.folders.shaderPacks,
    },
    instance,
    java: {
      component: "java-runtime-gamma",
      detectedMajorVersion: null,
      detectedVersion: null,
      detectionError: null,
      executable: `${directories.runtimes}/java-runtime-gamma/bin/java`,
      management: "app-controlled",
      majorVersion: 21,
      memoryMaxMb: instance.memoryMaxMb,
      memoryMinMb: instance.memoryMinMb,
      runtimeDirectory: `${directories.runtimes}/java-runtime-gamma`,
      runtimePlatform: "linux",
      runtimeVersion: "21.0.5",
    },
    legacyArgFormat: false,
    minecraft: {
      assetIndexId: instance.versionId,
      baseVersionId: instance.versionId,
      mainClass: "net.minecraft.client.main.Main",
      versionId: instance.versionId,
    },
    missingArtifacts: [
      {
        executable: true,
        id: "java-runtime-gamma",
        kind: "javaRuntime",
        path: `${directories.runtimes}/java-runtime-gamma/bin/java`,
      },
      {
        id: `client:${instance.versionId}`,
        kind: "clientJar",
        path: `${directories.versions}/${instance.versionId}/client.jar`,
        url: "https://piston-data.mojang.com/preview/client.jar",
      },
    ],
    modLoader: {
      installerPath: null,
      installerUrl: null,
      kind: instance.loader,
      minecraftVersionId: instance.versionId,
      version: instance.loaderVersion,
    },
    nativeArtifactPaths: [],
    profile: previewProfile,
    warnings: [
      "Preview mode uses local mock data. Start the Electrobun app for real launches.",
    ],
  };
};

const previewCurseForgeProject = (
  id: number,
  name: string,
  section: CurseForgeProjectSummary["section"],
): CurseForgeProjectSummary => ({
  allowDistribution: true,
  authors: ["CurseForge Preview"],
  categories: ["Adventure", "Performance"],
  classId: section === "modpacks" ? 4471 : 6,
  dateModified: isoHoursAgo(9),
  downloadCount: 12_840_000,
  gameVersions: ["1.21.6", "1.20.1"],
  id,
  isAvailable: true,
  isFeatured: true,
  latestFile: {
    displayName: `${name} 1.0.0`,
    downloadUrl: "https://edge.forgecdn.net/files/preview/download.jar",
    fileDate: isoHoursAgo(9),
    fileName: `${name.toLowerCase().replaceAll(" ", "-")}.jar`,
    gameVersions: ["1.21.6"],
    id: id * 10,
    modLoaders: ["fabric"],
    releaseType: "release",
  },
  logoUrl: null,
  modLoaders: ["fabric", "forge"],
  name,
  screenshotUrls: [],
  section,
  slug: name.toLowerCase().replaceAll(" ", "-"),
  summary:
    "Preview catalog result with compatibility, downloads, and install state for UI testing.",
  websiteUrl: `https://www.curseforge.com/minecraft/${section}/${name
    .toLowerCase()
    .replaceAll(" ", "-")}`,
});

const previewModrinthProject = (
  id: string,
  name: string,
  section: ModrinthProjectSummary["section"],
): ModrinthProjectSummary => ({
  authors: ["Modrinth Preview"],
  categories: ["Adventure", "Performance"],
  dateModified: isoHoursAgo(6),
  downloadCount: 8_420_000,
  follows: 121_000,
  gameVersions: ["1.21.6", "1.20.1"],
  id,
  isAvailable: true,
  latestFile: {
    displayName: `${name} 1.0.0`,
    downloadUrl: "https://cdn.modrinth.com/data/preview/modpack.mrpack",
    fileDate: isoHoursAgo(6),
    fileName: `${name.toLowerCase().replaceAll(" ", "-")}.mrpack`,
    gameVersions: ["1.21.6"],
    hashes: {},
    id: `${id}-version`,
    modLoaders: ["fabric"],
    releaseType: "release",
    sizeBytes: 1,
    versionNumber: "1.0.0",
  },
  logoUrl: null,
  modLoaders: ["fabric", "forge"],
  name,
  screenshotUrls: [],
  section,
  slug: name.toLowerCase().replaceAll(" ", "-"),
  summary:
    "Preview Modrinth catalog result with compatibility, downloads, and install state for UI testing.",
  websiteUrl: `https://modrinth.com/${
    section === "modpacks" ? "modpack" : "mod"
  }/${name.toLowerCase().replaceAll(" ", "-")}`,
});

const createPreviewRpc = (): ViewRpcClient => {
  const requestProxy: RequestProxy = {
    clearDownloadJob: async ({ jobId }) => {
      previewDownloads = previewDownloads.filter((job) => job.id !== jobId);
      return clone(previewDownloads);
    },
    clearFinishedDownloadJobs: async () => {
      previewDownloads = previewDownloads.filter(
        (job) => job.status === "queued" || job.status === "running",
      );
      return clone(previewDownloads);
    },
    clearLauncherCache: async () => ({
      clearedAt: new Date().toISOString(),
      kind: "cache",
      removedPaths: [`${previewRoot}/versions`, `${previewRoot}/libraries`],
      resetTables: ["minecraft_versions"],
    }),
    clearLauncherData: async () => {
      previewInstances = [];
      previewDownloads = [];

      return {
        clearedAt: new Date().toISOString(),
        kind: "data",
        removedPaths: [previewRoot],
        resetTables: ["launcher_instances", "launcher_profiles"],
      } satisfies ClearLauncherStorageResult;
    },
    closeWindow: async () => null,
    completeMicrosoftProfileLogin: async () => ({
      profile: previewProfile,
      status: "complete",
    }),
    createLaunchPlan: async ({ instanceId }) => {
      const instance = previewInstances.find((item) => item.id === instanceId);
      if (!instance) throw new Error("Launcher instance does not exist.");
      return makeLaunchPlan(instance);
    },
    createLauncherInstance: async (input) => {
      const id = input.name
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      const instance = createPreviewInstance({
        id: id || `instance-${previewInstances.length + 1}`,
        lastLaunchedAt: null,
        loader: input.loader ?? "vanilla",
        loaderVersion: input.loaderVersion ?? null,
        memoryMaxMb: input.memoryMaxMb ?? 4096,
        modpack: null,
        name: input.name,
        updatedAt: new Date().toISOString(),
        versionId: input.versionId,
      });

      previewInstances = [instance, ...previewInstances];
      return clone(instance);
    },
    createLauncherProfile: async (input) => ({
      ...previewProfile,
      accountId: input.accountId ?? previewProfile.accountId,
      displayName: input.displayName,
      id: `profile-${Date.now()}`,
      kind: input.kind ?? "offline",
    }),
    deleteLauncherInstance: async ({ deleteFiles = false, instanceId }) => {
      previewInstances = previewInstances.filter(
        (instance) => instance.id !== instanceId,
      );
      return { deleted: true, deletedFiles: deleteFiles, instanceId };
    },
    downloadArtifacts: async () =>
      ({ failed: [], succeeded: 2 }) satisfies DownloadArtifactsResult,
    downloadCurseForgeFile: async (input) => ({
      category: input.category,
      content: null,
      fileName: input.file.fileName,
      instance: null,
      installedItem: null,
      path: `${previewRoot}/downloads/${input.file.fileName}`,
    }),
    downloadModrinthFile: async (input) =>
      ({
        category: input.category,
        content: null,
        fileName: input.file.fileName,
        instance: null,
        path: `${previewRoot}/downloads/${input.file.fileName}`,
      }) satisfies DownloadModrinthFileResult,
    enqueueDownloadJob: async (input) => {
      const job: DownloadQueueJob = {
        activeLabel:
          input.kind === "launchArtifacts"
            ? "Preview artifact download"
            : "Preview catalog download",
        completedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        error: null,
        id: `preview-job-${Date.now()}`,
        items: [
          {
            downloadedBytes: 1,
            error: null,
            id: "preview-item",
            kind: input.kind,
            label: "Preview file",
            progress: 100,
            status: "completed",
            totalBytes: 1,
          },
        ],
        metadata:
          input.kind === "curseForgeFile"
            ? {
                category: input.input.category,
                fileId: input.input.file.id,
                imageUrl: input.input.projectLogoUrl ?? null,
                kind: "curseForgeFile",
                projectId: input.input.projectId,
                targetInstanceId: input.input.instanceId ?? null,
              }
            : input.kind === "modrinthFile"
              ? {
                  category: input.input.category,
                  fileId: input.input.file.id,
                  imageUrl: input.input.projectLogoUrl ?? null,
                  kind: "modrinthFile",
                  projectId: input.input.projectId,
                  targetInstanceId: input.input.instanceId ?? null,
                }
              : { kind: input.kind },
        progress: 100,
        result:
          input.kind === "launchArtifacts"
            ? {
                kind: "launchArtifacts",
                result: { failed: [], succeeded: 2 },
              }
            : input.kind === "minecraftVersionManifest"
              ? { kind: "minecraftVersionManifest", result: getManifest() }
              : input.kind === "modrinthFile"
                ? {
                    kind: "modrinthFile",
                    result: {
                      category: input.input.category,
                      content: null,
                      fileName: input.input.file.fileName,
                      instance: null,
                      path: `${previewRoot}/downloads/${input.input.file.fileName}`,
                    },
                  }
                : null,
        source:
          input.kind === "curseForgeFile"
            ? "curseforge"
            : input.kind === "modrinthFile"
              ? "modrinth"
              : "launch",
        startedAt: new Date().toISOString(),
        status: "completed",
        subtitle: "Preview mode",
        title:
          input.kind === "launchArtifacts"
            ? "Launch files"
            : input.kind === "minecraftVersionManifest"
              ? "Minecraft versions"
              : input.kind === "modrinthFile"
                ? "Modrinth file"
                : "CurseForge file",
        totalItems: 1,
        updatedAt: new Date().toISOString(),
      };

      previewDownloads = [job, ...previewDownloads];
      return clone(job);
    },
    exportInstanceRecipe: async ({ instanceId }) => {
      const instance = previewInstances.find((item) => item.id === instanceId);
      if (!instance) throw new Error("Launcher instance does not exist.");

      const exportedAt = new Date().toISOString();
      const recipe = {
        app: {
          name: "nyxen" as const,
          schemaVersion: 1 as const,
        },
        checksum: {
          algorithm: "sha256" as const,
          covers: "recipe" as const,
          value: "preview-checksum",
        },
        exportedAt,
        recipe: {
          createdAt: exportedAt,
          files: [],
          id: `preview-recipe-${instance.id}`,
          overrides: [],
          runtime: {
            javaComponent: null,
            javaMajorVersion: null,
            loader: instance.loader,
            loaderVersion: instance.loaderVersion,
            minecraftVersionId: instance.versionId,
          },
          schemaVersion: 1 as const,
          source: { kind: "manual" as const },
        },
        schemaVersion: 1 as const,
        sourceInstance: {
          loader: instance.loader,
          loaderVersion: instance.loaderVersion,
          name: instance.name,
          versionId: instance.versionId,
        },
        warnings: [],
      };

      return {
        path: `${instance.folders.metadata}/recipe-exports/${instance.id}-preview-recipe.json`,
        recipe,
      };
    },
    exportInstanceSupportBundle: async ({ instanceId }) => {
      const instance = previewInstances.find((item) => item.id === instanceId);
      if (!instance) throw new Error("Launcher instance does not exist.");

      const createdAt = new Date().toISOString();
      const content = makeContent(instance);
      const bundle = {
        content: {
          counts: content.counts,
          logs: content.logs.map(
            ({ displayName, fileName, modifiedAt, sizeBytes }) => ({
              displayName,
              fileName,
              modifiedAt,
              sizeBytes,
            }),
          ),
          recipe: content.recipe
            ? {
                counts: content.recipe.counts,
                revisionId: content.recipe.revision.id,
                source: content.recipe.revision.source.kind,
                status: content.recipe.status,
              }
            : null,
        },
        createdAt,
        instance: {
          id: instance.id,
          loader: instance.loader,
          loaderVersion: instance.loaderVersion,
          name: instance.name,
          versionId: instance.versionId,
        },
        launchAttempts: [],
        launchPlanSummary: null,
        logs: [],
        redacted: true as const,
        redactions: {
          count: 0,
          kinds: [],
        },
        schemaVersion: 1 as const,
      };

      return {
        bundle,
        path: `${instance.folders.metadata}/support-bundles/${instance.id}-preview-support-bundle.json`,
      };
    },
    getCurseForgeStatus: async () =>
      ({
        baseUrl: "https://api.curseforge.com/v1",
        classIds: {
          mods: 6,
          modpacks: 4471,
          "resource-packs": 12,
          shaders: 6552,
          worlds: 17,
        },
        configured: true,
        gameId: 432,
        keySource: "NYXEN_CURSEFORGE_API_KEY",
        modClassId: 6,
        modpackClassId: 4471,
        resourcePackClassId: 12,
        shaderClassId: 6552,
        worldClassId: 17,
      }) satisfies CurseForgeStatus,
    getModrinthStatus: async () =>
      ({
        baseUrl: "https://api.modrinth.com/v2",
        configured: true,
        projectTypes: {
          mods: "mod",
          modpacks: "modpack",
          "resource-packs": "resourcepack",
          shaders: "shader",
        },
      }) satisfies ModrinthStatus,
    getDatabaseStatus: async () =>
      ({
        driver: "bun:sqlite",
        path: `${previewRoot}/nyxen.sqlite`,
        records: 42,
      }) satisfies DatabaseStatus,
    getEnvironment: async () =>
      ({
        appName: APP_NAME,
        platform: "linux",
        startedAt: isoHoursAgo(1),
      }) satisfies AppEnvironment,
    getInstanceContent: async ({ instanceId }) => {
      const instance = previewInstances.find((item) => item.id === instanceId);
      if (!instance) throw new Error("Launcher instance not found.");
      return makeContent(instance);
    },
    getInstanceLogFile: async ({
      fileId,
      instanceId,
    }: GetInstanceLogFileInput) => {
      const instance = previewInstances.find((item) => item.id === instanceId);
      if (!instance) throw new Error("Launcher instance not found.");
      const entry =
        makeContent(instance).logs.find((log) => log.id === fileId) ??
        makeContent(instance).logs[0];
      if (!entry) throw new Error("Log file no longer exists.");

      return {
        entry,
        lines: [
          {
            details: [],
            groupKey: null,
            groupLabel: null,
            id: "line-1",
            level: "info",
            lineNumber: 1,
            message: "Preview launch initialized.",
            raw: "[12:00:00] [Render thread/INFO]: Preview launch initialized.",
            source: "Minecraft",
            thread: "Render thread",
            timestamp: "12:00:00",
            type: "game",
          },
          {
            details: [],
            groupKey: "mod-loader",
            groupLabel: "Mod loader",
            id: "line-2",
            level: "warn",
            lineNumber: 2,
            message: "Preview mode is using mock launcher data.",
            raw: "[12:00:01] [Render thread/WARN]: Preview mode is using mock launcher data.",
            source: "Nyxen",
            thread: "Render thread",
            timestamp: "12:00:01",
            type: "loader",
          },
        ],
        readBytes: 512,
        refreshedAt: new Date().toISOString(),
        summary: { errors: 0, totalLines: 2, warnings: 1 },
        totalBytes: entry.sizeBytes,
        truncated: false,
      } satisfies InstanceLogFilePreview;
    },
    getInstanceModpackUpdate: async ({ instanceId }) => {
      const instance = previewInstances.find((item) => item.id === instanceId);
      if (!instance?.modpack) {
        throw new Error("This instance is not linked to a CurseForge modpack.");
      }

      return {
        checkedAt: new Date().toISOString(),
        current: instance.modpack,
        instanceId,
        latest: previewCurseForgeProject(
          Number(instance.modpack.projectId),
          instance.modpack.name,
          "modpacks",
        ),
        reason: null,
        updateAvailable: false,
      };
    },
    getLauncherStatus: async () => getStatus(),
    getMinecraftVersionDetails: async ({ versionId }) =>
      ({
        arguments: { game: [], jvm: [] },
        assetIndex: {
          id: versionId,
          sha1: "preview",
          size: 1,
          totalSize: 1,
          url: "https://piston-meta.mojang.com/preview/assets.json",
        },
        cachedAt: isoHoursAgo(1),
        downloads: {
          client: {
            path: `${previewRoot}/versions/${versionId}/client.jar`,
            sha1: "preview",
            size: 1,
            url: "https://piston-data.mojang.com/preview/client.jar",
          },
        },
        id: versionId,
        javaVersion: { component: "java-runtime-gamma", majorVersion: 21 },
        libraries: [],
        mainClass: "net.minecraft.client.main.Main",
        path: `${previewRoot}/versions/${versionId}/${versionId}.json`,
        sourceUrl: "https://piston-meta.mojang.com/preview/version.json",
        type: "release",
      }) satisfies MinecraftVersionDetails,
    getSettingsStatus: async () => clone(previewSettings),
    getSystemMemory: async () => ({ totalMb: 16_384 }),
    getWindowState: async () => ({ maximized: false, minimized: false }),
    greet: async ({ name }) => ({ greeting: `Hello ${name}` }),
    installDownloadedCurseForgeFile: async (input) => ({
      category: input.category,
      content: null,
      fileName: input.file.fileName,
      instance: null,
      installedItem: null,
      path: `${previewRoot}/downloads/${input.file.fileName}`,
      sourcePath: `${previewRoot}/downloads/${input.file.fileName}`,
    }),
    launchInstance: async (input) => {
      const instanceId =
        "plan" in input ? input.plan.instance.id : input.instanceId;
      return {
        instanceId,
        pid: 4242,
        startedAt: new Date().toISOString(),
      } satisfies RunningLaunch;
    },
    listDownloadJobs: async () => clone(previewDownloads),
    listLauncherInstances: async () => clone(previewInstances),
    listLauncherProfiles: async () => [clone(previewProfile)],
    listLoaderVersions: async ({ loader }) =>
      loader === "vanilla"
        ? []
        : [
            { id: loader === "fabric" ? "0.16.10" : "52.0.21", stable: true },
            { id: loader === "fabric" ? "0.16.9" : "52.0.20", stable: true },
          ],
    listMinecraftVersions: async (input) =>
      versions.filter(
        (version) => input?.includeSnapshots || version.type !== "snapshot",
      ),
    listRunningLaunches: async () => [],
    minimizeWindow: async () => ({ maximized: false, minimized: true }),
    openExternal: async ({ url }) => {
      console.info(`[preview] openExternal ${url}`);
      return { opened: true };
    },
    pollMicrosoftProfileSignIn: async () => ({
      message: "Preview sign-in complete.",
      status: "signedIn",
    }),
    refreshMinecraftVersionManifest: async () => getManifest(),
    resolveMediaUrl: async ({ url }) => {
      if (!url.startsWith("file:")) return { url };

      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720"><rect width="1280" height="720" fill="#132013"/><path d="M0 520h1280v200H0z" fill="#263d22"/><path d="M160 440h240v120H160zM448 360h160v200H448zM736 300h280v260H736z" fill="#7a8f55"/><path d="M0 580h1280" stroke="#b7d46a" stroke-width="12"/><text x="64" y="112" fill="#f1f5d5" font-family="monospace" font-size="44" font-weight="700">Nyxen Preview Screenshot</text></svg>`;

      return {
        url: `data:image/svg+xml,${encodeURIComponent(svg)}`,
      };
    },
    searchCurseForgeProjects: async (input) => {
      const section = input?.section ?? "modpacks";
      const data = [
        previewCurseForgeProject(348521, "Performance Plus", section),
        previewCurseForgeProject(711537, "Vault Hunters Preview", section),
      ];

      return {
        data,
        pagination: {
          index: input?.index ?? 0,
          pageSize: input?.pageSize ?? 20,
          resultCount: data.length,
          totalCount: data.length,
        },
        source: {
          classId: section === "modpacks" ? 4471 : 6,
          gameId: 432,
          section,
        },
      } satisfies CurseForgeSearchResult;
    },
    searchModrinthProjects: async (input) => {
      const section = input?.section ?? "modpacks";
      const data = [
        previewModrinthProject("AABBCCDD", "Performance Plus", section),
        previewModrinthProject("MMNNOOPP", "Vault Hunters Preview", section),
      ];

      return {
        data,
        pagination: {
          index: input?.index ?? 0,
          pageSize: input?.pageSize ?? 20,
          resultCount: data.length,
          totalCount: data.length,
        },
        source: {
          baseUrl: "https://api.modrinth.com/v2",
          section,
        },
      } satisfies ModrinthSearchResult;
    },
    setInstanceModEnabled: async ({ enabled, fileName, instanceId }) => {
      const instance = previewInstances.find((item) => item.id === instanceId);
      if (!instance) throw new Error("Launcher instance not found.");
      const content = makeContent(instance);

      return {
        ...content,
        mods: content.mods.map((mod) =>
          mod.fileName === fileName ? { ...mod, enabled } : mod,
        ),
      };
    },
    startMicrosoftProfileLogin: async () => ({
      deviceCode: "preview-device-code",
      expiresAt: isoHoursAgo(-1),
      intervalSeconds: 1,
      message: "Use PREVIEW-CODE in the browser.",
      userCode: "PREVIEW-CODE",
      verificationUri: "https://www.microsoft.com/link",
      verificationUriComplete: null,
    }),
    stopLaunchInstance: async ({ instanceId }) => ({
      instanceId,
      pid: 4242,
      stopped: true,
    }),
    toggleMaximizeWindow: async () => ({ maximized: false, minimized: false }),
    updateInstanceModpack: async ({ instanceId }) => {
      const instance = previewInstances.find((item) => item.id === instanceId);
      if (!instance?.modpack) {
        throw new Error("This instance is not linked to a CurseForge modpack.");
      }

      const content = makeContent(instance);
      const update = {
        checkedAt: new Date().toISOString(),
        current: instance.modpack,
        instanceId,
        latest: previewCurseForgeProject(
          Number(instance.modpack.projectId),
          instance.modpack.name,
          "modpacks",
        ),
        reason: null,
        updateAvailable: false,
      };

      return { content, instance, update };
    },
    updateLauncherInstance: async (input) => {
      const index = previewInstances.findIndex(
        (instance) => instance.id === input.instanceId,
      );
      if (index < 0) throw new Error("Launcher instance does not exist.");

      const current = previewInstances[index];
      if (!current) throw new Error("Launcher instance does not exist.");
      const next: LauncherInstance = {
        ...current,
        bannerUrl:
          input.bannerUrl === undefined ? current.bannerUrl : input.bannerUrl,
        gameArgs: input.gameArgs ?? current.gameArgs,
        iconUrl: input.iconUrl === undefined ? current.iconUrl : input.iconUrl,
        javaArgs: input.javaArgs ?? current.javaArgs,
        javaExecutable:
          input.javaExecutable === undefined
            ? current.javaExecutable
            : input.javaExecutable,
        loader: input.loader ?? current.loader,
        loaderVersion:
          input.loaderVersion === undefined
            ? current.loaderVersion
            : input.loaderVersion,
        memoryMaxMb: input.memoryMaxMb ?? current.memoryMaxMb,
        memoryMinMb: input.memoryMinMb ?? current.memoryMinMb,
        name: input.name ?? current.name,
        profileId:
          input.profileId === undefined ? current.profileId : input.profileId,
        updatedAt: new Date().toISOString(),
        versionId: input.versionId ?? current.versionId,
      };

      previewInstances = previewInstances.map((instance, itemIndex) =>
        itemIndex === index ? next : instance,
      );

      return clone(next);
    },
    updateSetting: async ({ key, value }) => {
      previewSettings = {
        ...previewSettings,
        updatedAt: new Date().toISOString(),
        values: {
          ...previewSettings.values,
          [key]: value,
        },
      };

      return clone(previewSettings);
    },
  };

  return {
    requestProxy,
    sendProxy: {
      logToBun: ({ message }: { message: string }) => {
        console.info(`[preview] ${message}`);
      },
    },
  } as unknown as ViewRpcClient;
};

const isElectrobunWebview = (): boolean =>
  typeof window !== "undefined" && Boolean(window.__electrobun);

export const electroview = isElectrobunWebview()
  ? new Electroview({ rpc: viewRpc })
  : null;

const rpcClient = electroview?.rpc ?? createPreviewRpc();

if (!isElectrobunWebview()) {
  console.info(
    `${APP_NAME} is running with browser preview data for ${APP_IDENTIFIER}.`,
  );
}

export const rpc = rpcClient;
