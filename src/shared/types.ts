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
  gameArgs: Array<string>;
  gameDirectory: string;
  iconUrl: string | null;
  id: string;
  javaArgs: Array<string>;
  javaExecutable: string | null;
  lastLaunchedAt: string | null;
  loader: ModLoader;
  loaderVersion: string | null;
  memoryMaxMb: number;
  memoryMinMb: number;
  name: string;
  profileId: string | null;
  updatedAt: string;
  versionId: string;
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
    | "library"
    | "nativeLibrary"
    | "versionMetadata";
  path: string;
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
    natives: string;
  };
  instance: LauncherInstance;
  java: {
    executable: string;
    memoryMaxMb: number;
    memoryMinMb: number;
  };
  legacyArgFormat: boolean;
  minecraft: {
    assetIndexId: string | null;
    mainClass: string | null;
    versionId: string;
  };
  missingArtifacts: Array<LaunchPlanMissingArtifact>;
  nativeArtifactPaths: Array<string>;
  profile: LauncherProfile | null;
  warnings: Array<string>;
};

export type DownloadArtifactsInput = {
  plan: LaunchPlan;
};

export type DownloadArtifactsResult = {
  failed: Array<{ error: string; id: string }>;
  succeeded: number;
};

export type LaunchInstanceInput = {
  plan: LaunchPlan;
};

export type LaunchInstanceResult = {
  pid: number;
};

export type CreateLaunchPlanInput = {
  instanceId: string;
  profileId?: string;
  refreshVersionDetails?: boolean;
};

export type LoaderVersionSummary = {
  id: string;
  stable: boolean;
};

export type ListLoaderVersionsInput = {
  loader: ModLoader;
  mcVersion: string;
};
