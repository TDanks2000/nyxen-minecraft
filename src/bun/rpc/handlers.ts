import os from "node:os";
import { Utils } from "electrobun/bun";
import { APP_NAME } from "../../shared/constants";
import type {
  AppEnvironment,
  CompleteMicrosoftProfileLoginInput,
  CreateLauncherProfileInput,
  CreateLaunchPlanInput,
  DownloadArtifactsInput,
  DownloadArtifactsResult,
  LaunchInstanceInput,
  LaunchInstanceResult,
  LaunchPlan,
  MicrosoftProfileLoginResult,
  MicrosoftProfileLoginStart,
  MicrosoftProfileSignInStatus,
} from "../../shared/types";
import { getDatabaseStatus } from "../db/client";
import { downloadArtifacts as downloadArtifactsFn } from "../launcher/download";
import { launchMinecraft } from "../launcher/executor";
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
import {
  getLauncherProfileAuthSecrets,
  listLauncherProfiles,
} from "../launcher/profiles";
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

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const getString = (value: unknown): string | undefined =>
  typeof value === "string" ? value : undefined;

const getLaunchPlanRequest = (
  input: DownloadArtifactsInput | LaunchInstanceInput,
): CreateLaunchPlanInput => {
  if (!isRecord(input)) {
    throw new Error("Launcher instance id is required.");
  }

  const record = input as Record<string, unknown>;
  const instanceId = getString(record.instanceId)?.trim();

  if (instanceId) {
    return {
      instanceId,
      profileId: getString(record.profileId),
      refreshVersionDetails:
        typeof record.refreshVersionDetails === "boolean"
          ? record.refreshVersionDetails
          : undefined,
    };
  }

  const plan = isRecord(record.plan)
    ? (record.plan as Partial<LaunchPlan>)
    : null;
  const plannedInstanceId = getString(plan?.instance?.id)?.trim();

  if (!plannedInstanceId) {
    throw new Error("Launcher instance id is required.");
  }

  return { instanceId: plannedInstanceId };
};

export const createLauncherProfile = (
  _input: CreateLauncherProfileInput,
): never => {
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

export const downloadArtifacts = (
  input: DownloadArtifactsInput,
): Promise<DownloadArtifactsResult> =>
  createLaunchPlan(getLaunchPlanRequest(input)).then(downloadArtifactsFn);

export const launchInstance = async (
  input: LaunchInstanceInput,
): Promise<LaunchInstanceResult> => {
  const plan = await createLaunchPlan(getLaunchPlanRequest(input));
  let accessToken: string | undefined;

  if (plan.missingArtifacts.length > 0) {
    throw new Error("Download missing artifacts before launching Minecraft.");
  }

  if (plan.profile?.id && plan.profile.kind === "microsoft") {
    const secrets = getLauncherProfileAuthSecrets(plan.profile.id);
    accessToken = secrets?.minecraftAccessToken ?? undefined;
  }

  return launchMinecraft(plan, { accessToken });
};

export const openExternal = ({
  url,
}: {
  url: string;
}): { opened: boolean } => ({
  opened: Utils.openExternal(url),
});

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
