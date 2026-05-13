import type { DownloadQueueJob, LauncherInstance } from "@/shared/types";

export type ActiveModpackInstallJobs = {
  byInstanceId: Map<string, DownloadQueueJob>;
  unmatchedJobs: Array<DownloadQueueJob>;
};

export const isModpackDownloadJob = (job: DownloadQueueJob): boolean =>
  (job.metadata.kind === "curseForgeFile" ||
    job.metadata.kind === "modrinthFile") &&
  job.metadata.category === "modpacks";

export const isActiveModpackDownloadJob = (job: DownloadQueueJob): boolean =>
  isModpackDownloadJob(job) &&
  (job.status === "queued" || job.status === "running");

export const isCompletedModpackDownloadJob = (job: DownloadQueueJob): boolean =>
  isModpackDownloadJob(job) &&
  job.status === "completed" &&
  (job.result?.kind === "curseForgeFile" ||
    job.result?.kind === "modrinthFile") &&
  Boolean(job.result.result.instance);

export const getActiveModpackJobInstanceId = (
  job: DownloadQueueJob,
  instances: Array<LauncherInstance>,
): string | null => {
  if (
    job.metadata.kind !== "curseForgeFile" &&
    job.metadata.kind !== "modrinthFile"
  ) {
    return null;
  }
  const metadata = job.metadata;

  if (
    metadata.targetInstanceId &&
    instances.some((instance) => instance.id === metadata.targetInstanceId)
  ) {
    return metadata.targetInstanceId;
  }

  const projectId = String(metadata.projectId);
  const projectMatch = instances.find(
    (instance) => instance.modpack?.projectId === projectId,
  );

  if (projectMatch) return projectMatch.id;

  const titleMatch = instances.find(
    (instance) =>
      instance.modpack?.name === job.title || instance.name === job.title,
  );

  return titleMatch?.id ?? null;
};

export const getActiveModpackInstallJobs = (
  jobs: Array<DownloadQueueJob>,
  instances: Array<LauncherInstance>,
): ActiveModpackInstallJobs => {
  const byInstanceId = new Map<string, DownloadQueueJob>();
  const matchedJobIds = new Set<string>();
  const activeJobs = jobs.filter(isActiveModpackDownloadJob);

  for (const job of activeJobs) {
    const instanceId = getActiveModpackJobInstanceId(job, instances);

    if (!instanceId) continue;

    const existing = byInstanceId.get(instanceId);
    if (
      !existing ||
      (existing.status === "queued" && job.status === "running")
    ) {
      byInstanceId.set(instanceId, job);
    }

    matchedJobIds.add(job.id);
  }

  return {
    byInstanceId,
    unmatchedJobs: activeJobs.filter((job) => !matchedJobIds.has(job.id)),
  };
};
