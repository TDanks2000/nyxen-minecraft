import type { RPCSchema } from "electrobun";
import type {
  AppEnvironment,
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
  GetInstanceContentInput,
  GetMinecraftVersionDetailsInput,
  InstallDownloadedCurseForgeFileInput,
  InstallDownloadedCurseForgeFileResult,
  InstanceContent,
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
  SearchCurseForgeProjectsInput,
  SetInstanceModEnabledInput,
  SettingsStatus,
  SettingValue,
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
      setInstanceModEnabled: {
        params: SetInstanceModEnabledInput;
        response: InstanceContent;
      };
      createLaunchPlan: {
        params: CreateLaunchPlanInput;
        response: LaunchPlan;
      };
      downloadArtifacts: {
        params: DownloadArtifactsInput;
        response: DownloadArtifactsResult;
      };
      downloadCurseForgeFile: {
        params: DownloadCurseForgeFileInput;
        response: DownloadCurseForgeFileResult;
      };
      installDownloadedCurseForgeFile: {
        params: InstallDownloadedCurseForgeFileInput;
        response: InstallDownloadedCurseForgeFileResult;
      };
      launchInstance: {
        params: LaunchInstanceInput;
        response: LaunchInstanceResult;
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
