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
  media: string;
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

export type CurseForgeCategory =
  | "mods"
  | "modpacks"
  | "resource-packs"
  | "shaders"
  | "worlds";

export type CurseForgeProjectSection = CurseForgeCategory;

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
  classIds: Record<CurseForgeCategory, number>;
  configured: boolean;
  gameId: number;
  keySource: "CURSEFORGE_API_KEY" | "NYXEN_CURSEFORGE_API_KEY" | null;
  modClassId: number;
  modpackClassId: number;
  resourcePackClassId: number;
  shaderClassId: number;
  worldClassId: number;
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
  screenshotUrls: Array<string>;
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

export type LauncherInstanceModpack = {
  artifactPath: string;
  bannerUrl: string | null;
  fileId: string;
  fileName: string;
  iconUrl: string | null;
  installedAt: string;
  installedFiles: number;
  locked: true;
  manifestPath: string;
  name: string;
  overridesPath: string | null;
  projectId: string;
  skippedFiles: number;
  slug?: string;
  source: "curseforge";
  updatedAt: string;
  version?: string;
  websiteUrl: string | null;
};

export type LauncherInstance = {
  bannerUrl: string | null;
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
  modpack: LauncherInstanceModpack | null;
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
  relativePath?: string;
  sizeBytes: number;
};

export type InstanceLogFolder = {
  displayName: string;
  files: Array<InstanceFileEntry>;
  id: string;
  path: string;
};

export type InstanceLogLineLevel =
  | "debug"
  | "error"
  | "fatal"
  | "info"
  | "trace"
  | "unknown"
  | "warn";

export type InstanceLogLineType =
  | "auth"
  | "crash"
  | "exception"
  | "game"
  | "graphics"
  | "io"
  | "loader"
  | "mixin"
  | "mod"
  | "network"
  | "resource"
  | "stackTrace"
  | "unknown";

export type InstanceLogLine = {
  details: Array<string>;
  groupKey: string | null;
  groupLabel: string | null;
  id: string;
  level: InstanceLogLineLevel;
  lineNumber: number;
  message: string;
  raw: string;
  source: string | null;
  thread: string | null;
  timestamp: string | null;
  type: InstanceLogLineType;
};

export type InstanceLogFilePreview = {
  entry: InstanceFileEntry;
  lines: Array<InstanceLogLine>;
  readBytes: number;
  refreshedAt: string;
  summary: {
    errors: number;
    totalLines: number;
    warnings: number;
  };
  totalBytes: number;
  truncated: boolean;
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
  curseForge: Partial<
    Record<CurseForgeCategory, Array<InstalledCurseForgeFile>>
  >;
  instanceId: string;
  logFolders: Array<InstanceLogFolder>;
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

export type GetInstanceLogFileInput = {
  fileId: string;
  instanceId: string;
  maxBytes?: number;
  maxLines?: number;
};

export type SetInstanceModEnabledInput = {
  enabled: boolean;
  fileName: string;
  instanceId: string;
};

export type InstalledCurseForgeFile = {
  category: CurseForgeCategory;
  fileId: string;
  fileName: string;
  installedAt: string;
  name: string;
  projectId: string;
  slug?: string;
  version?: string;
};

export type DownloadCurseForgeFileInput = {
  category: CurseForgeCategory;
  file: CurseForgeProjectFileSummary;
  instanceId?: string;
  projectLogoUrl?: string | null;
  projectId: number;
  projectName: string;
  projectScreenshotUrls?: Array<string>;
  projectSlug?: string;
  projectWebsiteUrl?: string | null;
};

export type DownloadCurseForgeFileResult = {
  category: CurseForgeCategory;
  content: InstanceContent | null;
  fileName: string;
  instance: LauncherInstance | null;
  installedItem: InstalledCurseForgeFile | null;
  path: string;
};

export type InstallDownloadedCurseForgeFileInput =
  DownloadCurseForgeFileInput & {
    downloadsDirectory?: string;
  };

export type InstallDownloadedCurseForgeFileResult =
  DownloadCurseForgeFileResult & {
    sourcePath: string;
  };

export type CreateLauncherInstanceInput = {
  bannerUrl?: string;
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

export type UpdateLauncherInstanceInput = {
  bannerUrl?: string | null;
  confirmRuntimeCompatibility?: boolean;
  gameArgs?: Array<string>;
  iconUrl?: string | null;
  instanceId: string;
  javaArgs?: Array<string>;
  javaExecutable?: string | null;
  loader?: ModLoader;
  loaderVersion?: string | null;
  memoryMaxMb?: number;
  memoryMinMb?: number;
  name?: string;
  profileId?: string | null;
  versionId?: string;
};

export type DeleteLauncherInstanceInput = {
  deleteFiles?: boolean;
  instanceId: string;
};

export type DeleteLauncherInstanceResult = {
  deleted: boolean;
  deletedFiles: boolean;
  instanceId: string;
};

export type GetInstanceModpackUpdateInput = {
  instanceId: string;
};

export type InstanceModpackUpdate = {
  checkedAt: string;
  current: LauncherInstanceModpack;
  instanceId: string;
  latest: CurseForgeProjectSummary | null;
  reason: string | null;
  updateAvailable: boolean;
};

export type UpdateInstanceModpackInput = {
  instanceId: string;
};

export type UpdateInstanceModpackResult = {
  content: InstanceContent;
  instance: LauncherInstance;
  update: InstanceModpackUpdate;
};

export type LaunchPlanMissingArtifact = {
  id: string;
  kind:
    | "assetIndex"
    | "assetObject"
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

export type DownloadQueueJobStatus =
  | "queued"
  | "running"
  | "completed"
  | "failed";

export type DownloadQueueItemStatus =
  | "queued"
  | "running"
  | "completed"
  | "failed";

export type DownloadQueueItem = {
  error: string | null;
  id: string;
  kind: string;
  label: string;
  status: DownloadQueueItemStatus;
};

export type DownloadQueueJobResult =
  | {
      kind: "launchArtifacts";
      result: DownloadArtifactsResult;
    }
  | {
      kind: "curseForgeFile";
      result: DownloadCurseForgeFileResult;
    }
  | {
      kind: "minecraftVersionManifest";
      result: MinecraftVersionManifest;
    };

export type DownloadQueueJob = {
  completedAt: string | null;
  createdAt: string;
  error: string | null;
  id: string;
  items: Array<DownloadQueueItem>;
  result: DownloadQueueJobResult | null;
  source: "launch" | "curseforge";
  startedAt: string | null;
  status: DownloadQueueJobStatus;
  subtitle: string;
  title: string;
  totalItems: number;
  updatedAt: string;
};

export type EnqueueDownloadJobInput =
  | {
      input: DownloadArtifactsInput;
      kind: "launchArtifacts";
    }
  | {
      input: DownloadCurseForgeFileInput;
      kind: "curseForgeFile";
    }
  | {
      input: null;
      kind: "minecraftVersionManifest";
    };

export type ClearDownloadJobInput = {
  jobId: string;
};

export type LaunchInstanceInput = CreateLaunchPlanInput | { plan: LaunchPlan };

export type RunningLaunch = {
  instanceId: string;
  pid: number;
  startedAt: string;
};

export type LaunchInstanceResult = RunningLaunch;

export type StopLaunchInstanceInput = {
  instanceId: string;
};

export type StopLaunchInstanceResult = {
  instanceId: string;
  pid: number | null;
  stopped: boolean;
};

export type LoaderVersionSummary = {
  id: string;
  stable: boolean;
};

export type ListLoaderVersionsInput = {
  loader: ModLoader;
  mcVersion: string;
};
