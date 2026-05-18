import type {
  CreateLaunchPlanInput,
  DownloadArtifactsInput,
  DownloadArtifactsResult,
  DownloadCurseForgeFileInput,
  DownloadCurseForgeFileResult,
  DownloadModrinthFileInput,
  DownloadModrinthFileResult,
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
import { getMissingRequiredModpackDependencies } from "../../launcher/instance-content";
import { markLauncherInstanceLaunched } from "../../launcher/instances";
import { persistLaunchAttempt } from "../../launcher/launch-diagnostics";
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

export const downloadModrinthFile = async (
  input: DownloadModrinthFileInput,
): Promise<DownloadModrinthFileResult> => {
  const job = await enqueueDownloadJob({
    input,
    kind: "modrinthFile",
  });
  const finished = await waitForDownloadJob(job.id);

  if (finished.result?.kind === "modrinthFile") {
    return finished.result.result;
  }

  throw new Error(finished.error ?? "Failed to download Modrinth file.");
};

export const launchInstance = async (
  input: LaunchInstanceInput,
): Promise<LaunchInstanceResult> => {
  const plan = await createLaunchPlan(getLaunchPlanRequest(input));
  let accessToken: string | undefined;
  const recordAttempt = (
    outcome: Parameters<typeof persistLaunchAttempt>[1],
  ): void => {
    try {
      persistLaunchAttempt(plan, outcome);
    } catch {
      // Diagnostics should never be the reason a launch is blocked.
    }
  };

  if (plan.missingArtifacts.length > 0) {
    const message = "Download missing artifacts before launching Minecraft.";

    recordAttempt({
      message,
      missingArtifactCount: plan.missingArtifacts.length,
      reason: "missingArtifacts",
      status: "blocked",
    });

    throw new Error(message);
  }

  const missingModpackDependencies = getMissingRequiredModpackDependencies(
    plan.instance,
  );

  if (missingModpackDependencies.length > 0) {
    const message = `${plan.instance.name} is missing ${missingModpackDependencies.length} required modpack file${
      missingModpackDependencies.length === 1 ? "" : "s"
    }. Reinstall or update the modpack before launching.`;

    recordAttempt({
      message,
      missingModpackDependencyCount: missingModpackDependencies.length,
      reason: "missingModpackDependencies",
      status: "blocked",
    });

    throw new Error(message);
  }

  if (!plan.profile || plan.profile.kind !== "microsoft") {
    const message =
      "A verified Microsoft profile is required to launch Minecraft.";

    recordAttempt({
      message,
      reason: "missingProfile",
      status: "blocked",
    });

    throw new Error(message);
  }

  if (plan.profile.id) {
    const secrets = getLauncherProfileAuthSecrets(plan.profile.id);
    accessToken = secrets?.minecraftAccessToken ?? undefined;
  }

  let result: LaunchInstanceResult;

  try {
    result = launchMinecraft(plan, { accessToken });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to launch Minecraft.";

    recordAttempt({
      message,
      reason: "launchError",
      status: "failed",
    });

    throw error;
  }

  markLauncherInstanceLaunched(plan.instance.id);
  recordAttempt({
    message: "Minecraft process started.",
    pid: result.pid,
    reason: null,
    startedAt: result.startedAt,
    status: "started",
  });
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
  createInstanceServer,
  deleteInstanceServer,
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
export {
  getModrinthStatus,
  searchModrinthProjects,
} from "../../launcher/modrinth";
export { exportInstanceRecipe } from "../../launcher/recipe-export";
export { getLauncherStatus } from "../../launcher/status";
export {
  clearLauncherCache,
  clearLauncherData,
} from "../../launcher/storage";
export { exportInstanceSupportBundle } from "../../launcher/support-bundle";
export {
  getMinecraftVersionDetails,
  listMinecraftVersions,
} from "../../launcher/versions";
