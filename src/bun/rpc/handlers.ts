import os from "node:os";
import { APP_NAME } from "../../shared/constants";
import type {
  AppEnvironment,
  CompleteMicrosoftProfileLoginInput,
  MicrosoftProfileLoginResult,
  MicrosoftProfileLoginStart,
  MicrosoftProfileSignInStatus,
} from "../../shared/types";
import { getDatabaseStatus } from "../db/client";
import {
  createLauncherInstance,
  listLauncherInstances,
} from "../launcher/instances";
import { createLaunchPlan } from "../launcher/launch-plan";
import { listLoaderVersions } from "../launcher/loader-versions";
import {
  completeMicrosoftProfileLogin as completeMicrosoftProfileLoginRequest,
  pollMicrosoftProfileSignIn as pollMicrosoftProfileSignInRequest,
  startMicrosoftProfileLogin as startMicrosoftProfileLoginRequest,
} from "../launcher/microsoft-auth";
import { listLauncherProfiles } from "../launcher/profiles";
import { getLauncherStatus } from "../launcher/status";
import {
  getMinecraftVersionDetails,
  listMinecraftVersions,
  refreshMinecraftVersionManifest as refreshManifest,
} from "../launcher/versions";
import { getSettingsStatus, updateSetting } from "../settings/store";
import {
  closeWindow,
  getWindowState,
  minimizeWindow,
  toggleMaximizeWindow,
} from "../window-controls";

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

export const createLauncherProfile = (): never => {
  throw new Error(
    "Manual profile creation is disabled. Sign in with a Microsoft account that owns Minecraft.",
  );
};

export const startMicrosoftProfileLogin =
  (): Promise<MicrosoftProfileLoginStart> =>
    startMicrosoftProfileLoginRequest();

export const completeMicrosoftProfileLogin = (
  input: CompleteMicrosoftProfileLoginInput,
): Promise<MicrosoftProfileLoginResult> =>
  completeMicrosoftProfileLoginRequest(input);

export const pollMicrosoftProfileSignIn = (
  input: CompleteMicrosoftProfileLoginInput,
): Promise<MicrosoftProfileSignInStatus> =>
  pollMicrosoftProfileSignInRequest(input);

export {
  closeWindow,
  createLauncherInstance,
  createLaunchPlan,
  getLauncherStatus,
  getMinecraftVersionDetails,
  getSettingsStatus,
  getWindowState,
  listLauncherInstances,
  listLauncherProfiles,
  listLoaderVersions,
  listMinecraftVersions,
  minimizeWindow,
  toggleMaximizeWindow,
  updateSetting,
};
