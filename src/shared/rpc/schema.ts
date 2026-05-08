import type { RPCSchema } from "electrobun";
import type {
  AppEnvironment,
  CreateLauncherInstanceInput,
  CreateLauncherProfileInput,
  CreateLaunchPlanInput,
  DatabaseStatus,
  GetMinecraftVersionDetailsInput,
  LauncherInstance,
  LauncherProfile,
  LauncherStatus,
  LaunchPlan,
  ListLoaderVersionsInput,
  ListMinecraftVersionsInput,
  LoaderVersionSummary,
  MinecraftVersionDetails,
  MinecraftVersionManifest,
  MinecraftVersionSummary,
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
