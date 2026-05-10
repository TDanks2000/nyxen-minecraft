import type {
  CreateLaunchPlanInput,
  DownloadArtifactsInput,
  DownloadArtifactsResult,
  DownloadCurseForgeFileInput,
  DownloadCurseForgeFileResult,
  LaunchInstanceInput,
  LaunchInstanceResult,
  LaunchPlan,
  MinecraftVersionManifest,
  RunningLaunch,
  StopLaunchInstanceInput,
  StopLaunchInstanceResult,
} from "../../../shared/types";
import {
  enqueueDownloadJob,
  waitForDownloadJob,
} from "../../launcher/download-queue";
import {
  launchMinecraft,
  listRunningLaunches as listTrackedRunningLaunches,
  stopMinecraftLaunch,
} from "../../launcher/executor";
import { markLauncherInstanceLaunched } from "../../launcher/instances";
import { createLaunchPlan } from "../../launcher/launch-plan";
import { getLauncherProfileAuthSecrets } from "../../launcher/profiles";

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

export const refreshMinecraftVersionManifest =
  async (): Promise<MinecraftVersionManifest> => {
    const job = await enqueueDownloadJob({
      input: null,
      kind: "minecraftVersionManifest",
    });
    const finished = await waitForDownloadJob(job.id);

    if (finished.result?.kind === "minecraftVersionManifest") {
      return finished.result.result;
    }

    throw new Error(finished.error ?? "Failed to refresh Minecraft versions.");
  };

export const downloadArtifacts = async (
  input: DownloadArtifactsInput,
): Promise<DownloadArtifactsResult> => {
  const job = await enqueueDownloadJob({
    input,
    kind: "launchArtifacts",
  });
  const finished = await waitForDownloadJob(job.id);

  if (finished.result?.kind === "launchArtifacts") {
    return finished.result.result;
  }

  throw new Error(finished.error ?? "Failed to download launch files.");
};

export const downloadCurseForgeFile = async (
  input: DownloadCurseForgeFileInput,
): Promise<DownloadCurseForgeFileResult> => {
  const job = await enqueueDownloadJob({
    input,
    kind: "curseForgeFile",
  });
  const finished = await waitForDownloadJob(job.id);

  if (finished.result?.kind === "curseForgeFile") {
    return finished.result.result;
  }

  throw new Error(finished.error ?? "Failed to download CurseForge file.");
};

export const launchInstance = async (
  input: LaunchInstanceInput,
): Promise<LaunchInstanceResult> => {
  const plan = await createLaunchPlan(getLaunchPlanRequest(input));
  let accessToken: string | undefined;

  if (plan.missingArtifacts.length > 0) {
    throw new Error("Download missing artifacts before launching Minecraft.");
  }

  if (!plan.profile || plan.profile.kind !== "microsoft") {
    throw new Error(
      "A verified Microsoft profile is required to launch Minecraft.",
    );
  }

  if (plan.profile?.id && plan.profile.kind === "microsoft") {
    const secrets = getLauncherProfileAuthSecrets(plan.profile.id);
    accessToken = secrets?.minecraftAccessToken ?? undefined;
  }

  const result = launchMinecraft(plan, { accessToken });
  markLauncherInstanceLaunched(plan.instance.id);

  return result;
};

export const listRunningLaunches = (): Array<RunningLaunch> =>
  listTrackedRunningLaunches();

export const stopLaunchInstance = (
  input: StopLaunchInstanceInput,
): StopLaunchInstanceResult => stopMinecraftLaunch(input.instanceId);

export {
  getCurseForgeStatus,
  searchCurseForgeProjects,
} from "../../launcher/curseforge";
export {
  clearDownloadJob,
  clearFinishedDownloadJobs,
  enqueueDownloadJob,
  listDownloadJobs,
} from "../../launcher/download-queue";
export {
  getInstanceContent,
  getInstanceLogFile,
  getInstanceModpackUpdate,
  installDownloadedCurseForgeFile,
  setInstanceModEnabled,
  updateInstanceModpack,
} from "../../launcher/instance-content";
export {
  createLauncherInstance,
  deleteLauncherInstance,
  listLauncherInstances,
  updateLauncherInstance,
} from "../../launcher/instances";
export { createLaunchPlan } from "../../launcher/launch-plan";
export { listLoaderVersions } from "../../launcher/loader-versions";
export { getLauncherStatus } from "../../launcher/status";
export {
  getMinecraftVersionDetails,
  listMinecraftVersions,
} from "../../launcher/versions";
