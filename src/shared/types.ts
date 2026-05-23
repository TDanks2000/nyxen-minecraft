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

export type AppTheme =
  | "dark"
  | "midnight"
  | "forest"
  | "amber"
  | "light"
  | "system";

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

export type LauncherStorageClearKind = "cache" | "data";

export type ClearLauncherStorageResult = {
  clearedAt: string;
  kind: LauncherStorageClearKind;
  removedPaths: Array<string>;
  resetTables: Array<string>;
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

export type ModrinthCategory =
  | "mods"
  | "modpacks"
  | "resource-packs"
  | "shaders";

export type ModrinthProjectSection = ModrinthCategory;

export type ModrinthSortField =
  | "downloads"
  | "follows"
  | "newest"
  | "relevance"
  | "updated";

export type ModrinthStatus = {
  baseUrl: string;
  configured: true;
  projectTypes: Record<
    ModrinthCategory,
    "mod" | "modpack" | "resourcepack" | "shader"
  >;
};

export type SearchModrinthProjectsInput = {
  gameVersion?: string;
  index?: number;
  loader?: ModLoader;
  pageSize?: number;
  query?: string;
  section?: ModrinthProjectSection;
  sortField?: ModrinthSortField;
} | null;

export type ModrinthProjectFileSummary = {
  displayName: string;
  downloadUrl: string;
  fileDate: string | null;
  fileName: string;
  gameVersions: Array<string>;
  hashes: {
    sha1?: string;
    sha512?: string;
  };
  id: string;
  modLoaders: Array<ModLoader>;
  releaseType: "alpha" | "beta" | "release" | "unknown";
  sizeBytes: number;
  versionNumber: string;
};

export type ModrinthProjectSummary = {
  authors: Array<string>;
  categories: Array<string>;
  dateModified: string | null;
  downloadCount: number;
  follows: number;
  gameVersions: Array<string>;
  id: string;
  isAvailable: boolean;
  latestFile: ModrinthProjectFileSummary | null;
  logoUrl: string | null;
  modLoaders: Array<ModLoader>;
  name: string;
  screenshotUrls: Array<string>;
  section: ModrinthProjectSection;
  slug: string;
  summary: string;
  websiteUrl: string;
};

export type ModrinthSearchResult = {
  data: Array<ModrinthProjectSummary>;
  pagination: {
    index: number;
    pageSize: number;
    resultCount: number;
    totalCount: number;
  };
  source: {
    baseUrl: string;
    section: ModrinthProjectSection;
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
  authRefreshable?: boolean;
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
  source: "curseforge" | "modrinth";
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
  | "serverFile"
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
  | "java"
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

export type InstanceServerFileSide =
  | "clientOnly"
  | "optional"
  | "server"
  | "unknown";

export type InstanceServerFileCandidate = {
  entry: InstanceFileEntry;
  reason: string;
  selectedByDefault: boolean;
  side: InstanceServerFileSide;
  source: "config" | "mod" | "resourcePack";
};

export type InstanceServerRequirementStatus = "missing" | "ready" | "warning";

export type InstanceServerRequirement = {
  description: string;
  id: string;
  path: string | null;
  status: InstanceServerRequirementStatus;
  title: string;
};

export type InstanceServerWorkspace = {
  createdAt: string | null;
  eula: InstanceFileEntry | null;
  id: string;
  installScript: InstanceFileEntry | null;
  loaderLauncher: InstanceFileEntry | null;
  mods: Array<InstanceFileEntry>;
  name: string;
  path: string;
  properties: InstanceFileEntry | null;
  runScript: InstanceFileEntry | null;
  serverJar: InstanceFileEntry | null;
};

export type InstanceServerManager = {
  candidates: Array<InstanceServerFileCandidate>;
  defaultServerName: string;
  requirements: Array<InstanceServerRequirement>;
  serverRoot: string;
  workspaces: Array<InstanceServerWorkspace>;
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
  launchAttempts: Array<LaunchAttemptRecord>;
  logFolders: Array<InstanceLogFolder>;
  logs: Array<InstanceFileEntry>;
  mods: Array<InstanceFileEntry>;
  refreshedAt: string;
  recipe: InstanceRecipeSummary | null;
  resourcePacks: Array<InstanceFileEntry>;
  screenshots: Array<InstanceFileEntry>;
  serverManager: InstanceServerManager;
  serverList: InstanceFileEntry | null;
  shaderPacks: Array<InstanceFileEntry>;
  worlds: Array<InstanceFileEntry>;
};

export type ExportInstanceSupportBundleInput = {
  instanceId: string;
  maxLogLines?: number;
  maxLogs?: number;
};

export type InstanceSupportBundle = {
  content: {
    counts: InstanceContent["counts"];
    logs: Array<
      Pick<
        InstanceFileEntry,
        "displayName" | "fileName" | "modifiedAt" | "sizeBytes"
      >
    >;
    recipe: {
      counts: InstanceRecipeSummary["counts"];
      revisionId: string;
      source: InstanceRecipeSummary["revision"]["source"]["kind"];
      status: InstanceRecipeSummary["status"];
    } | null;
  };
  createdAt: string;
  instance: Pick<
    LauncherInstance,
    "id" | "loader" | "loaderVersion" | "name" | "versionId"
  >;
  launchAttempts: Array<LaunchAttemptRecord>;
  launchPlanSummary: LaunchPlanSummary | null;
  logs: Array<{
    entry: Pick<
      InstanceFileEntry,
      "displayName" | "fileName" | "modifiedAt" | "sizeBytes"
    >;
    lines: Array<
      Pick<
        InstanceLogLine,
        | "details"
        | "groupLabel"
        | "level"
        | "lineNumber"
        | "message"
        | "source"
        | "thread"
        | "timestamp"
        | "type"
      >
    >;
    readBytes: number;
    summary: InstanceLogFilePreview["summary"];
    totalBytes: number;
    truncated: boolean;
  }>;
  redacted: true;
  redactions: {
    count: number;
    kinds: Array<"dataRootPath" | "databaseFile" | "homePath" | "secretValue">;
  };
  schemaVersion: 1;
};

export type ExportInstanceSupportBundleResult = {
  bundle: InstanceSupportBundle;
  path: string;
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

export type CreateInstanceServerInput = {
  acceptEula?: boolean;
  includeClientOnlyMods?: boolean;
  instanceId: string;
  name?: string;
};

export type CreateInstanceServerResult = {
  content: InstanceContent;
  copiedFiles: Array<InstanceFileEntry>;
  server: InstanceServerWorkspace;
  skippedFiles: Array<InstanceServerFileCandidate>;
};

export type DeleteInstanceServerInput = {
  instanceId: string;
  serverId: string;
};

export type DeleteInstanceServerResult = {
  content: InstanceContent;
  deleted: boolean;
  serverId: string;
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

export type DownloadModrinthFileInput = {
  category: ModrinthCategory;
  file: ModrinthProjectFileSummary;
  instanceId?: string;
  projectId: string;
  projectLogoUrl?: string | null;
  projectName: string;
  projectScreenshotUrls?: Array<string>;
  projectSlug?: string;
  projectWebsiteUrl?: string | null;
};

export type DownloadModrinthFileResult = {
  category: ModrinthCategory;
  content: InstanceContent | null;
  fileName: string;
  instance: LauncherInstance | null;
  path: string;
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

export type InstanceRecipeFilePolicy =
  | "generated"
  | "local-only"
  | "managed"
  | "mutable-config";

export type InstanceRecipeFileSource =
  | "curseforge"
  | "generated"
  | "local"
  | "modrinth";

export type InstanceRecipeRevision = {
  createdAt: string;
  files: Array<{
    downloadUrls: Array<string>;
    hashes: {
      sha1?: string;
      sha512?: string;
    };
    optional: boolean;
    path: string;
    policy: InstanceRecipeFilePolicy;
    providerFileId?: string;
    providerProjectId?: string;
    sizeBytes: number | null;
    source: InstanceRecipeFileSource;
  }>;
  id: string;
  instanceId: string;
  overrides: Array<{
    hashes: {
      sha1?: string;
      sha512?: string;
    };
    path: string;
    policy: Extract<
      InstanceRecipeFilePolicy,
      "local-only" | "managed" | "mutable-config"
    >;
    sizeBytes: number | null;
  }>;
  previousRevisionId: string | null;
  runtime: {
    javaComponent: string | null;
    javaMajorVersion: number | null;
    loader: ModLoader;
    loaderVersion: string | null;
    minecraftVersionId: string;
  };
  schemaVersion: 1;
  source:
    | { kind: "manual" }
    | {
        fileId: string;
        fileName: string;
        kind: "curseforge";
        projectId: string;
        slug?: string;
        version?: string;
        websiteUrl?: string | null;
      }
    | {
        fileId: string;
        fileName: string;
        kind: "modrinth";
        projectId: string;
        slug?: string;
        version?: string;
        websiteUrl?: string | null;
      };
};

export type InstanceRecipeDriftStatus =
  | "added"
  | "changed"
  | "missing"
  | "optionalMissing"
  | "weaklyVerified";

export type InstanceRecipeDriftItem = {
  actualSha1?: string;
  actualSha512?: string;
  expectedSha1?: string;
  expectedSha512?: string;
  path: string;
  policy: InstanceRecipeFilePolicy;
  sizeBytes: number | null;
  source: InstanceRecipeFileSource;
  status: InstanceRecipeDriftStatus;
};

export type InstanceRecipeSummary = {
  counts: {
    added: number;
    changed: number;
    managedFiles: number;
    missing: number;
    optionalMissing: number;
    overrides: number;
    weaklyVerified: number;
  };
  drift: Array<InstanceRecipeDriftItem>;
  revision: InstanceRecipeRevision;
  status: "clean" | "drifted" | "incomplete" | "weaklyVerified";
};

export type ExportInstanceRecipeInput = {
  instanceId: string;
};

export type ExportedInstanceRecipeWarningCode =
  | "blockedFiles"
  | "localOnlyFiles"
  | "optionalFiles"
  | "privateFiles"
  | "unavailableFiles"
  | "weaklyVerifiedFiles";

export type ExportedInstanceRecipe = {
  app: {
    name: "nyxen";
    schemaVersion: 1;
  };
  checksum: {
    algorithm: "sha256";
    covers: "recipe";
    value: string;
  };
  exportedAt: string;
  recipe: Omit<InstanceRecipeRevision, "instanceId" | "previousRevisionId">;
  sourceInstance: Pick<
    LauncherInstance,
    "loader" | "loaderVersion" | "name" | "versionId"
  >;
  warnings: Array<{
    code: ExportedInstanceRecipeWarningCode;
    count: number;
    message: string;
  }>;
  schemaVersion: 1;
};

export type ExportInstanceRecipeResult = {
  path: string;
  recipe: ExportedInstanceRecipe;
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
    detectedMajorVersion: number | null;
    detectedVersion: string | null;
    detectionError: string | null;
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

export type LaunchPlanSummary = {
  counts: {
    classpathEntries: number;
    gameArguments: number;
    jvmArguments: number;
    missingArtifacts: number;
    nativeArtifacts: number;
    warnings: number;
  };
  createdAt: string;
  id: string;
  instance: {
    id: string;
    loader: ModLoader;
    loaderVersion: string | null;
    name: string;
    versionId: string;
  };
  java: {
    component: string | null;
    detectedMajorVersion: number | null;
    detectedVersion: string | null;
    detectionError: string | null;
    executable: string;
    management: JavaManagementMode;
    majorVersion: number | null;
    memoryMaxMb: number;
    memoryMinMb: number;
    runtimePlatform: string | null;
    runtimeVersion: string | null;
  };
  minecraft: LaunchPlan["minecraft"];
  missingArtifacts: Array<LaunchPlanMissingArtifact>;
  modLoader: LaunchPlan["modLoader"];
  profile: {
    displayName: string;
    id: string;
    kind: LauncherProfile["kind"];
  } | null;
  schemaVersion: 1;
  warnings: Array<string>;
};

export type LaunchAttemptOutcomeReason =
  | "launchError"
  | "missingArtifacts"
  | "missingModpackDependencies"
  | "missingProfile";

export type LaunchAttemptOutcome = {
  message: string;
  missingArtifactCount?: number;
  missingModpackDependencyCount?: number;
  pid?: number;
  reason: LaunchAttemptOutcomeReason | null;
  startedAt?: string;
  status: "blocked" | "failed" | "started";
};

export type LaunchRepairCategory =
  | "corruptFiles"
  | "javaLaunch"
  | "missingFiles"
  | "missingModpackDependency"
  | "nativeExtraction"
  | "staleAuth"
  | "unknown"
  | "wrongJava";

export type LaunchRepairActionId =
  | "downloadMissingArtifacts"
  | "inspectLaunchLog"
  | "redownloadCorruptArtifacts"
  | "reextractNatives"
  | "reinstallModpack"
  | "selectJavaRuntime"
  | "signInMicrosoft";

export type LaunchRepairSuggestion = {
  actionId: LaunchRepairActionId;
  category: LaunchRepairCategory;
  confidence: "high" | "low" | "medium";
  evidence: Array<string>;
  nextAction: string;
  safeToAutomate: boolean;
  title: string;
};

export type LaunchAttemptRecord = {
  createdAt: string;
  id: string;
  instance: LaunchPlanSummary["instance"];
  outcome: LaunchAttemptOutcome;
  planSummary: LaunchPlanSummary;
  repair: LaunchRepairSuggestion | null;
  schemaVersion: 1;
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
  | "failed"
  | "skipped";

export type DownloadQueueItem = {
  downloadedBytes: number;
  error: string | null;
  id: string;
  kind: string;
  label: string;
  progress: number | null;
  status: DownloadQueueItemStatus;
  totalBytes: number | null;
};

export type DownloadQueueJobMetadata =
  | {
      category: CurseForgeCategory;
      fileId: number;
      imageUrl: string | null;
      kind: "curseForgeFile";
      projectId: number;
      targetInstanceId: string | null;
    }
  | {
      category: ModrinthCategory;
      fileId: string;
      imageUrl: string | null;
      kind: "modrinthFile";
      projectId: string;
      targetInstanceId: string | null;
    }
  | {
      kind: "launchArtifacts" | "minecraftVersionManifest";
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
      kind: "modrinthFile";
      result: DownloadModrinthFileResult;
    }
  | {
      kind: "minecraftVersionManifest";
      result: MinecraftVersionManifest;
    };

export type DownloadQueueJob = {
  activeLabel: string | null;
  completedAt: string | null;
  createdAt: string;
  error: string | null;
  id: string;
  items: Array<DownloadQueueItem>;
  metadata: DownloadQueueJobMetadata;
  progress: number | null;
  result: DownloadQueueJobResult | null;
  source: "launch" | "curseforge" | "modrinth";
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
      input: DownloadModrinthFileInput;
      kind: "modrinthFile";
    }
  | {
      input: null;
      kind: "minecraftVersionManifest";
    };

export type ClearDownloadJobInput = {
  jobId: string;
};

export type ResolveMediaUrlInput = {
  url: string;
};

export type ResolveMediaUrlResult = {
  url: string;
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
