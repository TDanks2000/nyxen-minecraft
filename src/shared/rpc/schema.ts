import type { RPCSchema } from "electrobun";
import type {
  AppEnvironment,
  ClearDownloadJobInput,
  ClearLauncherStorageResult,
  CompleteMicrosoftProfileLoginInput,
  CreateLauncherInstanceInput,
  CreateLauncherProfileInput,
  CreateLaunchPlanInput,
  CurseForgeSearchResult,
  CurseForgeStatus,
  DatabaseStatus,
  DeleteLauncherInstanceInput,
  DeleteLauncherInstanceResult,
  DownloadArtifactsInput,
  DownloadArtifactsResult,
  DownloadCurseForgeFileInput,
  DownloadCurseForgeFileResult,
  DownloadModrinthFileInput,
  DownloadModrinthFileResult,
  DownloadQueueJob,
  EnqueueDownloadJobInput,
  ExportInstanceRecipeInput,
  ExportInstanceRecipeResult,
  ExportInstanceSupportBundleInput,
  ExportInstanceSupportBundleResult,
  GetInstanceContentInput,
  GetInstanceLogFileInput,
  GetInstanceModpackUpdateInput,
  GetMinecraftVersionDetailsInput,
  InstallDownloadedCurseForgeFileInput,
  InstallDownloadedCurseForgeFileResult,
  InstanceContent,
  InstanceLogFilePreview,
  InstanceModpackUpdate,
  LauncherInstance,
  LauncherProfile,
  LauncherStatus,
  LaunchInstanceInput,
  LaunchInstanceResult,
  LaunchPlan,
  ListLoaderVersionsInput,
  ListMinecraftVersionsInput,
  LoaderVersionSummary,
  MicrosoftProfileLoginResult,
  MicrosoftProfileLoginStart,
  MicrosoftProfileSignInStatus,
  MinecraftVersionDetails,
  MinecraftVersionManifest,
  MinecraftVersionSummary,
  ModrinthSearchResult,
  ModrinthStatus,
  ResolveMediaUrlInput,
  ResolveMediaUrlResult,
  RunningLaunch,
  SearchCurseForgeProjectsInput,
  SearchModrinthProjectsInput,
  SetInstanceModEnabledInput,
  SettingsStatus,
  SettingValue,
  StopLaunchInstanceInput,
  StopLaunchInstanceResult,
  UpdateInstanceModpackInput,
  UpdateInstanceModpackResult,
  UpdateLauncherInstanceInput,
} from "../types";

export type MainViewRPC = {
  bun: RPCSchema<{
    messages: {
      logToBun: {
        message: string;
      };
    };
    requests: {
      getEnvironment: {
        params: null;
        response: AppEnvironment;
      };
      greet: {
        params: {
          name: string;
        };
        response: {
          greeting: string;
        };
      };
      getDatabaseStatus: {
        params: null;
        response: DatabaseStatus;
      };
      getLauncherStatus: {
        params: null;
        response: LauncherStatus;
      };
      getCurseForgeStatus: {
        params: null;
        response: CurseForgeStatus;
      };
      searchCurseForgeProjects: {
        params: SearchCurseForgeProjectsInput;
        response: CurseForgeSearchResult;
      };
      getModrinthStatus: {
        params: null;
        response: ModrinthStatus;
      };
      searchModrinthProjects: {
        params: SearchModrinthProjectsInput;
        response: ModrinthSearchResult;
      };
      refreshMinecraftVersionManifest: {
        params: null;
        response: MinecraftVersionManifest;
      };
      listMinecraftVersions: {
        params: ListMinecraftVersionsInput;
        response: Array<MinecraftVersionSummary>;
      };
      getMinecraftVersionDetails: {
        params: GetMinecraftVersionDetailsInput;
        response: MinecraftVersionDetails;
      };
      createLauncherProfile: {
        params: CreateLauncherProfileInput;
        response: LauncherProfile;
      };
      startMicrosoftProfileLogin: {
        params: null;
        response: MicrosoftProfileLoginStart;
      };
      completeMicrosoftProfileLogin: {
        params: CompleteMicrosoftProfileLoginInput;
        response: MicrosoftProfileLoginResult;
      };
      pollMicrosoftProfileSignIn: {
        params: CompleteMicrosoftProfileLoginInput;
        response: MicrosoftProfileSignInStatus;
      };
      listLauncherProfiles: {
        params: null;
        response: Array<LauncherProfile>;
      };
      createLauncherInstance: {
        params: CreateLauncherInstanceInput;
        response: LauncherInstance;
      };
      updateLauncherInstance: {
        params: UpdateLauncherInstanceInput;
        response: LauncherInstance;
      };
      deleteLauncherInstance: {
        params: DeleteLauncherInstanceInput;
        response: DeleteLauncherInstanceResult;
      };
      listLauncherInstances: {
        params: null;
        response: Array<LauncherInstance>;
      };
      getInstanceContent: {
        params: GetInstanceContentInput;
        response: InstanceContent;
      };
      getInstanceLogFile: {
        params: GetInstanceLogFileInput;
        response: InstanceLogFilePreview;
      };
      setInstanceModEnabled: {
        params: SetInstanceModEnabledInput;
        response: InstanceContent;
      };
      getInstanceModpackUpdate: {
        params: GetInstanceModpackUpdateInput;
        response: InstanceModpackUpdate;
      };
      updateInstanceModpack: {
        params: UpdateInstanceModpackInput;
        response: UpdateInstanceModpackResult;
      };
      exportInstanceRecipe: {
        params: ExportInstanceRecipeInput;
        response: ExportInstanceRecipeResult;
      };
      exportInstanceSupportBundle: {
        params: ExportInstanceSupportBundleInput;
        response: ExportInstanceSupportBundleResult;
      };
      createLaunchPlan: {
        params: CreateLaunchPlanInput;
        response: LaunchPlan;
      };
      enqueueDownloadJob: {
        params: EnqueueDownloadJobInput;
        response: DownloadQueueJob;
      };
      listDownloadJobs: {
        params: null;
        response: Array<DownloadQueueJob>;
      };
      clearDownloadJob: {
        params: ClearDownloadJobInput;
        response: Array<DownloadQueueJob>;
      };
      clearFinishedDownloadJobs: {
        params: null;
        response: Array<DownloadQueueJob>;
      };
      clearLauncherCache: {
        params: null;
        response: ClearLauncherStorageResult;
      };
      clearLauncherData: {
        params: null;
        response: ClearLauncherStorageResult;
      };
      downloadArtifacts: {
        params: DownloadArtifactsInput;
        response: DownloadArtifactsResult;
      };
      downloadCurseForgeFile: {
        params: DownloadCurseForgeFileInput;
        response: DownloadCurseForgeFileResult;
      };
      downloadModrinthFile: {
        params: DownloadModrinthFileInput;
        response: DownloadModrinthFileResult;
      };
      installDownloadedCurseForgeFile: {
        params: InstallDownloadedCurseForgeFileInput;
        response: InstallDownloadedCurseForgeFileResult;
      };
      launchInstance: {
        params: LaunchInstanceInput;
        response: LaunchInstanceResult;
      };
      listRunningLaunches: {
        params: null;
        response: Array<RunningLaunch>;
      };
      stopLaunchInstance: {
        params: StopLaunchInstanceInput;
        response: StopLaunchInstanceResult;
      };
      listLoaderVersions: {
        params: ListLoaderVersionsInput;
        response: Array<LoaderVersionSummary>;
      };
      getSettingsStatus: {
        params: null;
        response: SettingsStatus;
      };
      updateSetting: {
        params: {
          key: string;
          value: SettingValue;
        };
        response: SettingsStatus;
      };
      getSystemMemory: {
        params: null;
        response: { totalMb: number };
      };
      getWindowState: {
        params: null;
        response: {
          maximized: boolean;
          minimized: boolean;
        };
      };
      minimizeWindow: {
        params: null;
        response: {
          maximized: boolean;
          minimized: boolean;
        };
      };
      toggleMaximizeWindow: {
        params: null;
        response: {
          maximized: boolean;
          minimized: boolean;
        };
      };
      closeWindow: {
        params: null;
        response: null;
      };
      openExternal: {
        params: { url: string };
        response: { opened: boolean };
      };
      resolveMediaUrl: {
        params: ResolveMediaUrlInput;
        response: ResolveMediaUrlResult;
      };
    };
  }>;
  webview: RPCSchema<{
    messages: {
      logToWebview: {
        message: string;
      };
    };
    requests: {
      getViewStatus: {
        params: null;
        response: {
          ready: boolean;
        };
      };
    };
  }>;
};
