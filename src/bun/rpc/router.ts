import { BrowserView } from "electrobun/bun";
import type { MainViewRPC } from "../../shared/rpc/types";
import {
  createLauncherInstance,
  createLauncherProfile,
  createLaunchPlan,
  getDatabaseStatus,
  getEnvironment,
  getLauncherStatus,
  getMinecraftVersionDetails,
  getSettingsStatus,
  greet,
  listLauncherInstances,
  listLauncherProfiles,
  listLoaderVersions,
  listMinecraftVersions,
  logToBun,
  refreshMinecraftVersionManifest,
  updateSetting,
} from "./handlers";

export const mainViewRPC = BrowserView.defineRPC<MainViewRPC>({
  handlers: {
    messages: {
      logToBun,
    },
    requests: {
      createLaunchPlan,
      createLauncherInstance,
      createLauncherProfile,
      getDatabaseStatus,
      getEnvironment,
      getLauncherStatus,
      getMinecraftVersionDetails,
      getSettingsStatus,
      greet,
      listLauncherInstances,
      listLauncherProfiles,
      listLoaderVersions,
      listMinecraftVersions,
      refreshMinecraftVersionManifest,
      updateSetting,
    },
  },
  maxRequestTime: 30000,
});
