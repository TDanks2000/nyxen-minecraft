import os from "os";
import { APP_NAME } from "../../shared/constants";
import type { AppEnvironment } from "../../shared/types";
import { getDatabaseStatus } from "../db/client";
import {
  createLauncherInstance,
  listLauncherInstances,
} from "../launcher/instances";
import { createLaunchPlan } from "../launcher/launch-plan";
import { listLoaderVersions } from "../launcher/loader-versions";
import {
  createLauncherProfile,
  listLauncherProfiles,
} from "../launcher/profiles";
import { getLauncherStatus } from "../launcher/status";
import {
  getMinecraftVersionDetails,
  listMinecraftVersions,
  refreshMinecraftVersionManifest as refreshManifest,
} from "../launcher/versions";
import { getSettingsStatus, updateSetting } from "../settings/store";

const startedAt = new Date().toISOString();

export const getEnvironment = (): AppEnvironment => ({
  appName: APP_NAME,
  platform: process.platform,
  startedAt,
});

export const greet = ({ name }: { name: string }): { greeting: string } => ({
  greeting: `Hello, ${name || "Electrobun"} from Bun.`,
});

export const logToBun = ({ message }: { message: string }): void => {
  console.log(`[webview] ${message}`);
};

export { getDatabaseStatus };

export const getSystemMemory = (): { totalMb: number } => ({
  totalMb: Math.floor(os.totalmem() / 1024 / 1024),
});

export const refreshMinecraftVersionManifest = () => refreshManifest();

export {
  createLauncherInstance,
  createLauncherProfile,
  createLaunchPlan,
  getLauncherStatus,
  getMinecraftVersionDetails,
  getSettingsStatus,
  listLauncherInstances,
  listLauncherProfiles,
  listLoaderVersions,
  listMinecraftVersions,
  updateSetting,
};
