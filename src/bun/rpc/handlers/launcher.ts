import type {
  CreateLaunchPlanInput,
  DownloadArtifactsInput,
  DownloadArtifactsResult,
  LaunchInstanceInput,
  LaunchInstanceResult,
  LaunchPlan,
} from "../../../shared/types";
import { downloadArtifacts as downloadArtifactsFn } from "../../launcher/download";
import { launchMinecraft } from "../../launcher/executor";
import { markLauncherInstanceLaunched } from "../../launcher/instances";
import { createLaunchPlan } from "../../launcher/launch-plan";
import { getLauncherProfileAuthSecrets } from "../../launcher/profiles";
import { refreshMinecraftVersionManifest as refreshManifest } from "../../launcher/versions";

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

export const refreshMinecraftVersionManifest = () => refreshManifest();

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

  const result = launchMinecraft(plan, { accessToken });
  markLauncherInstanceLaunched(plan.instance.id);

  return result;
};

export {
  getCurseForgeStatus,
  searchCurseForgeProjects,
} from "../../launcher/curseforge";
export {
  getInstanceContent,
  setInstanceModEnabled,
} from "../../launcher/instance-content";
export {
  createLauncherInstance,
  listLauncherInstances,
} from "../../launcher/instances";
export { createLaunchPlan } from "../../launcher/launch-plan";
export { listLoaderVersions } from "../../launcher/loader-versions";
export { getLauncherStatus } from "../../launcher/status";
export {
  getMinecraftVersionDetails,
  listMinecraftVersions,
} from "../../launcher/versions";
