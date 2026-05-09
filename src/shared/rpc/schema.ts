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
  DownloadArtifactsInput,
  DownloadArtifactsResult,
  GetMinecraftVersionDetailsInput,
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
  SettingsStatus,
  SettingValue,
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
      listLauncherInstances: {
        params: null;
        response: Array<LauncherInstance>;
      };
      createLaunchPlan: {
        params: CreateLaunchPlanInput;
        response: LaunchPlan;
      };
      downloadArtifacts: {
        params: DownloadArtifactsInput;
        response: DownloadArtifactsResult;
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
