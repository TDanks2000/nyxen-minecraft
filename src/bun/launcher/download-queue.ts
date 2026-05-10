import { basename } from "node:path";
import type {
  ClearDownloadJobInput,
  CreateLaunchPlanInput,
  CurseForgeCategory,
  DownloadArtifactsInput,
  DownloadArtifactsResult,
  DownloadQueueItem,
  DownloadQueueJob,
  DownloadQueueJobResult,
  DownloadQueueJobStatus,
  EnqueueDownloadJobInput,
  LaunchInstanceInput,
  LaunchPlan,
  LaunchPlanMissingArtifact,
} from "../../shared/types";
import { downloadArtifacts } from "./download";
import { downloadCurseForgeFile } from "./instance-content";
import { createLaunchPlan } from "./launch-plan";
import { refreshMinecraftVersionManifest } from "./versions";

type DownloadQueueRunner = () => Promise<DownloadQueueJobResult>;

let jobs: Array<DownloadQueueJob> = [];
let processing = false;

const runners = new Map<string, DownloadQueueRunner>();
const maxJobs = 40;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const getString = (value: unknown): string | undefined =>
  typeof value === "string" ? value : undefined;

const nowIso = (): string => new Date().toISOString();

const createJobId = (): string => crypto.randomUUID();

const snapshotJob = (job: DownloadQueueJob): DownloadQueueJob => ({
  ...job,
  items: job.items.map((item) => ({ ...item })),
  result: job.result,
});

const snapshotJobs = (): Array<DownloadQueueJob> => jobs.map(snapshotJob);

const trimJobs = (
  nextJobs: Array<DownloadQueueJob>,
): Array<DownloadQueueJob> => {
  const kept: Array<DownloadQueueJob> = [];

  for (const job of nextJobs) {
    if (
      kept.length < maxJobs ||
      job.status === "queued" ||
      job.status === "running"
    ) {
      kept.push(job);
    }
  }

  return kept;
};

const updateJob = (
  jobId: string,
  updater: (job: DownloadQueueJob) => DownloadQueueJob,
): void => {
  jobs = jobs.map((job) => (job.id === jobId ? updater(job) : job));
};

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

const artifactKindLabels: Record<LaunchPlanMissingArtifact["kind"], string> = {
  assetIndex: "Asset index",
  assetObject: "Minecraft asset",
  clientJar: "Minecraft client",
  javaRuntime: "Java runtime",
  library: "Library",
  modLoaderInstaller: "Mod loader installer",
  nativeLibrary: "Native library",
  versionMetadata: "Version metadata",
};

const getArtifactLabel = (artifact: LaunchPlanMissingArtifact): string => {
  if (artifact.kind === "assetObject") {
    return `Asset ${artifact.id.replace(/^asset:/, "").slice(0, 12)}`;
  }

  if (artifact.kind === "clientJar") {
    return "Minecraft client jar";
  }

  if (artifact.kind === "assetIndex") {
    return `Asset index ${artifact.id}`;
  }

  return artifact.id;
};

const createArtifactItem = (
  artifact: LaunchPlanMissingArtifact,
): DownloadQueueItem => ({
  error: null,
  id: artifact.id,
  kind: artifactKindLabels[artifact.kind] ?? artifact.kind,
  label: getArtifactLabel(artifact),
  status: "queued",
});

const createLaunchArtifactsJob = (
  plan: LaunchPlan,
): { job: DownloadQueueJob; runner: DownloadQueueRunner } => {
  const timestamp = nowIso();
  const job: DownloadQueueJob = {
    completedAt: null,
    createdAt: timestamp,
    error: null,
    id: createJobId(),
    items: plan.missingArtifacts.map(createArtifactItem),
    result: null,
    source: "launch",
    startedAt: null,
    status: "queued",
    subtitle: `${plan.instance.versionId} · ${plan.instance.loader}`,
    title: `Prepare ${plan.instance.name}`,
    totalItems: plan.missingArtifacts.length,
    updatedAt: timestamp,
  };

  return {
    job,
    runner: async () => ({
      kind: "launchArtifacts",
      result: await downloadArtifacts(plan),
    }),
  };
};

const getCurseForgeCategoryLabel = (category: CurseForgeCategory): string => {
  if (category === "mods") return "Mod";
  if (category === "modpacks") return "Modpack";
  if (category === "resource-packs") return "Resource pack";
  if (category === "shaders") return "Shader";
  return "World";
};

const createCurseForgeFileJob = (
  input: Extract<EnqueueDownloadJobInput, { kind: "curseForgeFile" }>["input"],
): { job: DownloadQueueJob; runner: DownloadQueueRunner } => {
  const timestamp = nowIso();
  const fileName =
    input.file.fileName || input.file.displayName || `${input.projectName}.jar`;
  const job: DownloadQueueJob = {
    completedAt: null,
    createdAt: timestamp,
    error: null,
    id: createJobId(),
    items: [
      {
        error: null,
        id: `curseforge:${input.projectId}:${input.file.id}`,
        kind: getCurseForgeCategoryLabel(input.category),
        label: basename(fileName.replaceAll("\\", "/")),
        status: "queued",
      },
    ],
    result: null,
    source: "curseforge",
    startedAt: null,
    status: "queued",
    subtitle:
      input.file.displayName || basename(fileName.replaceAll("\\", "/")),
    title: input.projectName,
    totalItems: 1,
    updatedAt: timestamp,
  };

  return {
    job,
    runner: async () => ({
      kind: "curseForgeFile",
      result: await downloadCurseForgeFile(input),
    }),
  };
};

const createMinecraftVersionManifestJob = (): {
  job: DownloadQueueJob;
  runner: DownloadQueueRunner;
} => {
  const timestamp = nowIso();
  const job: DownloadQueueJob = {
    completedAt: null,
    createdAt: timestamp,
    error: null,
    id: createJobId(),
    items: [
      {
        error: null,
        id: "minecraft-version-manifest",
        kind: "Version metadata",
        label: "Minecraft version manifest",
        status: "queued",
      },
    ],
    result: null,
    source: "launch",
    startedAt: null,
    status: "queued",
    subtitle: "Mojang launcher metadata",
    title: "Refresh Minecraft Versions",
    totalItems: 1,
    updatedAt: timestamp,
  };

  return {
    job,
    runner: async () => ({
      kind: "minecraftVersionManifest",
      result: await refreshMinecraftVersionManifest(),
    }),
  };
};

const getNextQueuedJob = (): DownloadQueueJob | null => {
  for (let index = jobs.length - 1; index >= 0; index--) {
    const job = jobs[index];

    if (job?.status === "queued") {
      return job;
    }
  }

  return null;
};

const markJobStarted = (jobId: string): void => {
  const timestamp = nowIso();

  updateJob(jobId, (job) => ({
    ...job,
    items: job.items.map((item) => ({ ...item, status: "running" })),
    startedAt: timestamp,
    status: "running",
    updatedAt: timestamp,
  }));
};

const failureMessage = (result: DownloadArtifactsResult): string | null =>
  result.failed.length > 0
    ? `${result.failed.length} required file${
        result.failed.length === 1 ? "" : "s"
      } failed to download.`
    : null;

const completeJob = (jobId: string, result: DownloadQueueJobResult): void => {
  const timestamp = nowIso();

  updateJob(jobId, (job) => {
    if (result.kind === "launchArtifacts") {
      const failures = new Map(
        result.result.failed.map((failure) => [failure.id, failure.error]),
      );
      const status: DownloadQueueJobStatus =
        result.result.failed.length > 0 ? "failed" : "completed";

      return {
        ...job,
        completedAt: timestamp,
        error: failureMessage(result.result),
        items: job.items.map((item) => {
          const error = failures.get(item.id) ?? null;

          return {
            ...item,
            error,
            status: error ? "failed" : "completed",
          };
        }),
        result,
        status,
        totalItems: Math.max(
          job.totalItems,
          result.result.succeeded + result.result.failed.length,
        ),
        updatedAt: timestamp,
      };
    }

    if (result.kind === "minecraftVersionManifest") {
      return {
        ...job,
        completedAt: timestamp,
        error: null,
        items: job.items.map((item) => ({
          ...item,
          error: null,
          status: "completed",
        })),
        result,
        status: "completed",
        updatedAt: timestamp,
      };
    }

    return {
      ...job,
      completedAt: timestamp,
      error: null,
      items: job.items.map((item) => ({
        ...item,
        error: null,
        status: "completed",
      })),
      result,
      status: "completed",
      updatedAt: timestamp,
    };
  });
};

const failJob = (jobId: string, error: unknown): void => {
  const timestamp = nowIso();
  const message = error instanceof Error ? error.message : "Download failed.";

  updateJob(jobId, (job) => ({
    ...job,
    completedAt: timestamp,
    error: message,
    items: job.items.map((item) => ({
      ...item,
      error: item.status === "completed" ? item.error : message,
      status: item.status === "completed" ? item.status : "failed",
    })),
    status: "failed",
    updatedAt: timestamp,
  }));
};

const processQueue = async (): Promise<void> => {
  if (processing) return;

  processing = true;

  try {
    for (;;) {
      const job = getNextQueuedJob();

      if (!job) return;

      const runner = runners.get(job.id);

      if (!runner) {
        failJob(job.id, new Error("Download job runner is missing."));
        continue;
      }

      markJobStarted(job.id);

      try {
        completeJob(job.id, await runner());
      } catch (error) {
        failJob(job.id, error);
      } finally {
        runners.delete(job.id);
      }
    }
  } finally {
    processing = false;
  }
};

export const enqueueDownloadJob = async (
  input: EnqueueDownloadJobInput,
): Promise<DownloadQueueJob> => {
  const { job, runner } =
    input.kind === "launchArtifacts"
      ? createLaunchArtifactsJob(
          await createLaunchPlan(getLaunchPlanRequest(input.input)),
        )
      : input.kind === "curseForgeFile"
        ? createCurseForgeFileJob(input.input)
        : createMinecraftVersionManifestJob();

  runners.set(job.id, runner);
  jobs = trimJobs([job, ...jobs]);

  void processQueue();

  return snapshotJob(job);
};

export const listDownloadJobs = (): Array<DownloadQueueJob> => snapshotJobs();

const wait = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

export const waitForDownloadJob = async (
  jobId: string,
  options: { pollMs?: number; timeoutMs?: number } = {},
): Promise<DownloadQueueJob> => {
  const pollMs = Math.max(50, options.pollMs ?? 100);
  const timeoutMs = Math.max(1_000, options.timeoutMs ?? 5 * 60_000);
  const startedAt = Date.now();

  for (;;) {
    const job = jobs.find((item) => item.id === jobId);

    if (!job) {
      throw new Error("Download job no longer exists.");
    }

    if (job.status === "completed" || job.status === "failed") {
      return snapshotJob(job);
    }

    if (Date.now() - startedAt > timeoutMs) {
      throw new Error("Timed out waiting for download to finish.");
    }

    await wait(pollMs);
  }
};

export const clearDownloadJob = ({
  jobId,
}: ClearDownloadJobInput): Array<DownloadQueueJob> => {
  const job = jobs.find((item) => item.id === jobId);

  if (!job || job.status === "running") {
    return snapshotJobs();
  }

  runners.delete(jobId);
  jobs = jobs.filter((item) => item.id !== jobId);

  return snapshotJobs();
};

export const clearFinishedDownloadJobs = (): Array<DownloadQueueJob> => {
  const finishedIds = new Set(
    jobs
      .filter((job) => job.status === "completed" || job.status === "failed")
      .map((job) => job.id),
  );

  for (const id of finishedIds) {
    runners.delete(id);
  }

  jobs = jobs.filter((job) => !finishedIds.has(job.id));

  return snapshotJobs();
};
