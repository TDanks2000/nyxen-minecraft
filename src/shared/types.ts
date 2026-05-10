export type AppEnvironment = {
  appName: string;
  platform: NodeJS.Platform;
  startedAt: string;
};

export type DatabaseStatus = {
  driver: "bun:sqlite" | "drizzle";
  path: string;
  records: number;
};

export type SettingValue = string | number | boolean | null;

export type AppSettings = Record<string, SettingValue>;

export type JavaManagementMode = "app-controlled" | "auto";

export type SettingsStatus = {
  path: string;
  storage: "json" | "database";
  updatedAt: string;
  values: AppSettings;
};

export type LauncherDirectories = {
  root: string;
  instances: string;
  versions: string;
  libraries: string;
  assets: string;
  runtimes: string;
  downloads: string;
  logs: string;
  temp: string;
};

export type LauncherInstanceFolders = {
  root: string;
  app: string;
  cache: string;
  metadata: string;
  game: string;
  mods: string;
  config: string;
  resourcePacks: string;
  shaderPacks: string;
  saves: string;
  screenshots: string;
  logs: string;
};

export type LauncherStatus = {
  capabilities: Array<{
    id: string;
    ready: boolean;
    title: string;
  }>;
  counts: {
    instances: number;
    profiles: number;
    versions: number;
  };
  directories: LauncherDirectories;
  manifest: {
    latestRelease: string | null;
    latestSnapshot: string | null;
    refreshedAt: string | null;
    sourceUrl: string;
  };
};

export type CurseForgeProjectSection = "modpacks" | "mods";

export type CurseForgeSortField =
  | "downloads"
  | "featured"
  | "lastUpdated"
  | "name"
  | "popularity"
  | "rating"
  | "released";

export type CurseForgeStatus = {
  baseUrl: string;
  configured: boolean;
  gameId: number;
  keySource: "CURSEFORGE_API_KEY" | "NYXEN_CURSEFORGE_API_KEY" | null;
  modClassId: number;
  modpackClassId: number;
};

export type SearchCurseForgeProjectsInput = {
  gameVersion?: string;
  index?: number;
  loader?: ModLoader;
  pageSize?: number;
  query?: string;
  section?: CurseForgeProjectSection;
  sortField?: CurseForgeSortField;
  sortOrder?: "asc" | "desc";
} | null;

export type CurseForgeProjectFileSummary = {
  displayName: string;
  downloadUrl: string | null;
  fileDate: string | null;
  fileName: string;
  gameVersions: Array<string>;
  id: number;
  modLoaders: Array<ModLoader>;
  releaseType: "alpha" | "beta" | "release" | "unknown";
};

export type CurseForgeProjectSummary = {
  allowDistribution: boolean | null;
  authors: Array<string>;
  categories: Array<string>;
  classId: number | null;
  dateModified: string | null;
  downloadCount: number;
  gameVersions: Array<string>;
  id: number;
  isAvailable: boolean;
  isFeatured: boolean;
  latestFile: CurseForgeProjectFileSummary | null;
  logoUrl: string | null;
  modLoaders: Array<ModLoader>;
  name: string;
  section: CurseForgeProjectSection | "unknown";
  slug: string;
  summary: string;
  websiteUrl: string | null;
};

export type CurseForgeSearchResult = {
  data: Array<CurseForgeProjectSummary>;
  pagination: {
    index: number;
    pageSize: number;
    resultCount: number;
    totalCount: number;
  };
  source: {
    classId: number;
    gameId: number;
    section: CurseForgeProjectSection;
  };
};

export type MinecraftVersionSummary = {
  complianceLevel: number | null;
  id: string;
  releaseTime: string;
  sha1: string | null;
  time: string;
  type: string;
  url: string;
};

export type MinecraftVersionManifest = {
  cached: boolean;
  latest: {
    release: string | null;
    snapshot: string | null;
  };
  refreshedAt: string | null;
  sourceUrl: string;
  versions: Array<MinecraftVersionSummary>;
};

export type ListMinecraftVersionsInput = {
  includeHistorical?: boolean;
  includeSnapshots?: boolean;
  limit?: number;
} | null;

export type MinecraftDownload = {
  path?: string;
  sha1?: string;
  size?: number;
  url?: string;
};

export type MinecraftAssetIndex = {
  id: string;
  sha1?: string;
  size?: number;
  totalSize?: number;
  url?: string;
};

export type MinecraftLibrary = {
  downloads?: {
    artifact?: MinecraftDownload;
    classifiers?: Record<string, MinecraftDownload>;
  };
  name: string;
  natives?: Record<string, string>;
  rules?: Array<{
    action: string;
    os?: {
      arch?: string;
      name?: string;
      version?: string;
    };
  }>;
  url?: string;
};

export type MinecraftVersionDetails = {
  arguments?: {
    game?: Array<unknown>;
    jvm?: Array<unknown>;
  };
  assetIndex?: MinecraftAssetIndex;
  assets?: string;
  cachedAt: string;
  downloads?: Record<string, MinecraftDownload>;
  id: string;
  javaVersion?: {
    component: string;
    majorVersion: number;
  };
  libraries: Array<MinecraftLibrary>;
  mainClass?: string;
  minecraftArguments?: string;
  path: string;
  sourceUrl: string;
  type: string;
};

export type GetMinecraftVersionDetailsInput = {
  refresh?: boolean;
  versionId: string;
};

export type LauncherProfileKind = "microsoft" | "offline";

export type LauncherProfile = {
  accountId: string | null;
  authExpiresAt: string | null;
  createdAt: string;
  displayName: string;
  entitlements: Array<string>;
  id: string;
  kind: LauncherProfileKind;
  ownershipCheckedAt: string | null;
  skinUrl: string | null;
  updatedAt: string;
};

export type CreateLauncherProfileInput = {
  accountId?: string;
  displayName: string;
  kind?: LauncherProfileKind;
};

export type MicrosoftProfileLoginStart = {
  deviceCode: string;
  expiresAt: string;
  intervalSeconds: number;
  message: string;
  userCode: string;
  verificationUri: string;
  verificationUriComplete: string | null;
};

export type CompleteMicrosoftProfileLoginInput = {
  deviceCode: string;
};

export type MicrosoftProfileSignInStatus =
  | {
      message: string;
      retryAfterSeconds: number;
      status: "pending";
    }
  | {
      message: string;
      status: "signedIn";
    };

export type MicrosoftProfileLoginResult =
  | {
      message: string;
      retryAfterSeconds: number;
      status: "pending";
    }
  | {
      profile: LauncherProfile;
      status: "complete";
    };

export type ModLoader = "fabric" | "forge" | "neoforge" | "quilt" | "vanilla";

export type LauncherInstance = {
  createdAt: string;
  folders: LauncherInstanceFolders;
  gameArgs: Array<string>;
  gameDirectory: string;
  iconUrl: string | null;
  id: string;
  instanceDirectory: string;
  javaArgs: Array<string>;
  javaExecutable: string | null;
  lastLaunchedAt: string | null;
  loader: ModLoader;
  loaderVersion: string | null;
  metadataPath: string;
  memoryMaxMb: number;
  memoryMinMb: number;
  name: string;
  profileId: string | null;
  updatedAt: string;
  versionId: string;
};

export type InstanceFileKind =
  | "log"
  | "mod"
  | "resourcePack"
  | "screenshot"
  | "serverList"
  | "shaderPack"
  | "world";

export type InstanceFileEntry = {
  displayName: string;
  enabled: boolean | null;
  extension: string | null;
  fileName: string;
  id: string;
  isDirectory: boolean;
  kind: InstanceFileKind;
  modifiedAt: string;
  path: string;
  sizeBytes: number;
};

export type InstanceContent = {
  counts: {
    disabledMods: number;
    enabledMods: number;
    logs: number;
    mods: number;
    resourcePacks: number;
    screenshots: number;
    shaderPacks: number;
    worlds: number;
  };
  instanceId: string;
  logs: Array<InstanceFileEntry>;
  mods: Array<InstanceFileEntry>;
  refreshedAt: string;
  resourcePacks: Array<InstanceFileEntry>;
  screenshots: Array<InstanceFileEntry>;
  serverList: InstanceFileEntry | null;
  shaderPacks: Array<InstanceFileEntry>;
  worlds: Array<InstanceFileEntry>;
};

export type GetInstanceContentInput = {
  instanceId: string;
};

export type SetInstanceModEnabledInput = {
  enabled: boolean;
  fileName: string;
  instanceId: string;
};

export type CreateLauncherInstanceInput = {
  gameArgs?: Array<string>;
  iconUrl?: string;
  javaArgs?: Array<string>;
  javaExecutable?: string;
  loader?: ModLoader;
  loaderVersion?: string;
  memoryMaxMb?: number;
  memoryMinMb?: number;
  name: string;
  profileId?: string;
  versionId: string;
};

export type LaunchPlanMissingArtifact = {
  id: string;
  kind:
    | "assetIndex"
    | "clientJar"
    | "javaRuntime"
    | "library"
    | "modLoaderInstaller"
    | "nativeLibrary"
    | "versionMetadata";
  path: string;
  executable?: boolean;
  sha1?: string;
  url?: string;
};

export type LaunchPlan = {
  arguments: {
    game: Array<unknown>;
    jvm: Array<unknown>;
  };
  classpath: Array<string>;
  createdAt: string;
  directories: LauncherDirectories & {
    game: string;
    instance: string;
    instanceCache: string;
    instanceConfig: string;
    instanceLogs: string;
    instanceMetadata: string;
    mods: string;
    natives: string;
    resourcePacks: string;
    saves: string;
    screenshots: string;
    shaderPacks: string;
  };
  instance: LauncherInstance;
  java: {
    component: string | null;
    executable: string;
    management: JavaManagementMode;
    majorVersion: number | null;
    memoryMaxMb: number;
    memoryMinMb: number;
    runtimeDirectory: string | null;
    runtimePlatform: string | null;
    runtimeVersion: string | null;
  };
  legacyArgFormat: boolean;
  minecraft: {
    assetIndexId: string | null;
    baseVersionId: string;
    mainClass: string | null;
    versionId: string;
  };
  missingArtifacts: Array<LaunchPlanMissingArtifact>;
  modLoader: {
    installerPath: string | null;
    installerUrl: string | null;
    kind: ModLoader;
    minecraftVersionId: string;
    version: string | null;
  };
  nativeArtifactPaths: Array<string>;
  profile: LauncherProfile | null;
  warnings: Array<string>;
};

export type CreateLaunchPlanInput = {
  instanceId: string;
  profileId?: string;
  refreshVersionDetails?: boolean;
};

export type DownloadArtifactsInput =
  | CreateLaunchPlanInput
  | { plan: LaunchPlan };

export type DownloadArtifactsResult = {
  failed: Array<{ error: string; id: string }>;
  succeeded: number;
};

export type LaunchInstanceInput = CreateLaunchPlanInput | { plan: LaunchPlan };

export type LaunchInstanceResult = {
  pid: number;
};

export type LoaderVersionSummary = {
  id: string;
  stable: boolean;
};

export type ListLoaderVersionsInput = {
  loader: ModLoader;
  mcVersion: string;
};
