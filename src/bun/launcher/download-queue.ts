import { basename } from "node:path";
import type {
  ClearDownloadJobInput,
  CreateLaunchPlanInput,
  CurseForgeCategory,
  DownloadArtifactsInput,
  DownloadArtifactsResult,
  DownloadModrinthFileInput,
  DownloadQueueItem,
  DownloadQueueItemStatus,
  DownloadQueueJob,
  DownloadQueueJobMetadata,
  DownloadQueueJobResult,
  DownloadQueueJobStatus,
  EnqueueDownloadJobInput,
  LaunchInstanceInput,
  LaunchPlan,
  LaunchPlanMissingArtifact,
} from "../../shared/types";
import { downloadArtifacts } from "./download";
import {
  type CurseForgeDownloadProgressEvent,
  type CurseForgeDownloadProgressItem,
  downloadCurseForgeFile,
  downloadModrinthFile,
} from "./instance-content";
import { createLaunchPlan } from "./launch-plan";
import { refreshMinecraftVersionManifest } from "./versions";

type DownloadQueueRunner = () => Promise<DownloadQueueJobResult>;

let jobs: Array<DownloadQueueJob> = [];
let processing = false;

const runners = new Map<string, DownloadQueueRunner>();
const jobListeners = new Map<string, Set<() => void>>();
const maxJobs = 40;

type QueueItemInput = {
  downloadedBytes?: number;
  error?: string | null;
  id: string;
  kind: string;
  label: string;
  progress?: number | null;
  status?: DownloadQueueItemStatus;
  totalBytes?: number | null;
};

const clampPercent = (value: number | null | undefined): number | null => {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return null;
  }

  return Math.max(0, Math.min(100, value));
};

const normalizeByteCount = (
  value: number | null | undefined,
  fallback: number,
): number => {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.max(0, Math.trunc(value));
};

const normalizeTotalBytes = (
  value: number | null | undefined,
): number | null => {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return null;
  }

  return Math.max(0, Math.trunc(value));
};

const getByteProgress = (
  downloadedBytes: number,
  totalBytes: number | null,
): number | null => {
  if (!totalBytes || totalBytes <= 0) return null;

  return clampPercent((downloadedBytes / totalBytes) * 100);
};

const createQueueItem = ({
  downloadedBytes = 0,
  error = null,
  id,
  kind,
  label,
  progress,
  status = "queued",
  totalBytes = null,
}: QueueItemInput): DownloadQueueItem => {
  const normalizedDownloaded = normalizeByteCount(downloadedBytes, 0);
  const normalizedTotal = normalizeTotalBytes(totalBytes);

  return {
    downloadedBytes: normalizedDownloaded,
    error,
    id,
    kind,
    label,
    progress: clampPercent(
      progress ?? getByteProgress(normalizedDownloaded, normalizedTotal),
    ),
    status,
    totalBytes: normalizedTotal,
  };
};

const getRunningItemLabel = (job: DownloadQueueJob): string | null =>
  job.items.find((item) => item.status === "running")?.label ?? null;

const deriveJobProgress = (job: DownloadQueueJob): number | null => {
  if (job.status === "completed") return 100;
  if (job.status === "queued") return 0;

  const totalItems = Math.max(1, job.totalItems, job.items.length);
  const completedUnits = job.items.reduce((total, item) => {
    if (item.status === "completed" || item.status === "skipped") {
      return total + 1;
    }

    if (item.progress === null) {
      return total;
    }

    return total + item.progress / 100;
  }, 0);

  return clampPercent((completedUnits / totalItems) * 100);
};

const withDerivedJobProgress = (job: DownloadQueueJob): DownloadQueueJob => ({
  ...job,
  activeLabel: job.activeLabel ?? getRunningItemLabel(job),
  progress: deriveJobProgress(job),
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const getString = (value: unknown): string | undefined =>
  typeof value === "string" ? value : undefined;

const nowIso = (): string => new Date().toISOString();

const notifyJobListeners = (jobId: string): void => {
  const listeners = jobListeners.get(jobId);
  if (!listeners) return;
  for (const notify of listeners) notify();
  jobListeners.delete(jobId);
};

const createJobId = (): string => crypto.randomUUID();

const snapshotJob = (job: DownloadQueueJob): DownloadQueueJob => ({
  ...job,
  items: job.items.map((item) => ({ ...item })),
  metadata: { ...job.metadata } as DownloadQueueJobMetadata,
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
): DownloadQueueItem =>
  createQueueItem({
    id: artifact.id,
    kind: artifactKindLabels[artifact.kind] ?? artifact.kind,
    label: getArtifactLabel(artifact),
  });

const createLaunchArtifactsJob = (
  plan: LaunchPlan,
): { job: DownloadQueueJob; runner: DownloadQueueRunner } => {
  const timestamp = nowIso();
  const job: DownloadQueueJob = {
    activeLabel: null,
    completedAt: null,
    createdAt: timestamp,
    error: null,
    id: createJobId(),
    items: plan.missingArtifacts.map(createArtifactItem),
    metadata: { kind: "launchArtifacts" },
    progress: 0,
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

const getModrinthCategoryLabel = (
  category: DownloadModrinthFileInput["category"],
): string => {
  if (category === "mods") return "Mod";
  if (category === "modpacks") return "Modpack";
  if (category === "resource-packs") return "Resource pack";
  return "Shader";
};

const hasOwn = (
  value: CurseForgeDownloadProgressItem,
  key: keyof CurseForgeDownloadProgressItem,
): boolean => Object.hasOwn(value, key);

const applyProgressItemUpdate = (
  items: Array<DownloadQueueItem>,
  update: CurseForgeDownloadProgressItem,
): Array<DownloadQueueItem> => {
  const existingIndex = items.findIndex((item) => item.id === update.id);
  const existing = existingIndex >= 0 ? items[existingIndex] : null;
  const totalBytes = hasOwn(update, "totalBytes")
    ? normalizeTotalBytes(update.totalBytes)
    : (existing?.totalBytes ?? null);
  const downloadedBytes = hasOwn(update, "downloadedBytes")
    ? normalizeByteCount(update.downloadedBytes, existing?.downloadedBytes ?? 0)
    : (existing?.downloadedBytes ?? 0);
  const status = update.status ?? existing?.status ?? "queued";
  const progress =
    status === "completed" || status === "skipped"
      ? 100
      : hasOwn(update, "progress")
        ? clampPercent(update.progress)
        : (getByteProgress(downloadedBytes, totalBytes) ??
          existing?.progress ??
          null);
  const nextItem = createQueueItem({
    downloadedBytes,
    error: hasOwn(update, "error")
      ? (update.error ?? null)
      : (existing?.error ?? null),
    id: update.id,
    kind: update.kind ?? existing?.kind ?? "CurseForge",
    label: update.label ?? existing?.label ?? update.id,
    progress,
    status,
    totalBytes,
  });

  if (existingIndex === -1) {
    return [...items, nextItem];
  }

  return items.map((item, index) =>
    index === existingIndex ? nextItem : item,
  );
};

const applyCurseForgeProgress = (
  jobId: string,
  event: CurseForgeDownloadProgressEvent,
): void => {
  const timestamp = nowIso();

  updateJob(jobId, (job) => {
    const updates = [
      ...(event.items ?? []),
      ...(event.item ? [event.item] : []),
    ];
    const nextItems = updates.reduce(
      (items, update) => applyProgressItemUpdate(items, update),
      job.items,
    );
    const nextJob: DownloadQueueJob = {
      ...job,
      activeLabel:
        event.activeLabel !== undefined
          ? event.activeLabel
          : (getRunningItemLabel({ ...job, items: nextItems }) ??
            job.activeLabel),
      items: nextItems,
      totalItems: Math.max(
        1,
        event.totalItems ?? job.totalItems,
        nextItems.length,
      ),
      updatedAt: timestamp,
    };

    return withDerivedJobProgress(nextJob);
  });
};

const createCurseForgeFileJob = (
  input: Extract<EnqueueDownloadJobInput, { kind: "curseForgeFile" }>["input"],
): { job: DownloadQueueJob; runner: DownloadQueueRunner } => {
  const timestamp = nowIso();
  const fileName =
    input.file.fileName || input.file.displayName || `${input.projectName}.jar`;
  const job: DownloadQueueJob = {
    activeLabel: null,
    completedAt: null,
    createdAt: timestamp,
    error: null,
    id: createJobId(),
    items: [
      createQueueItem({
        id: `curseforge:${input.projectId}:${input.file.id}`,
        kind: getCurseForgeCategoryLabel(input.category),
        label: basename(fileName.replaceAll("\\", "/")),
      }),
    ],
    metadata: {
      category: input.category,
      fileId: input.file.id,
      imageUrl:
        input.projectLogoUrl ?? input.projectScreenshotUrls?.[0] ?? null,
      kind: "curseForgeFile",
      projectId: input.projectId,
      targetInstanceId: input.instanceId ?? null,
    },
    progress: 0,
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
      result: await downloadCurseForgeFile(input, {
        onProgress: (event) => applyCurseForgeProgress(job.id, event),
      }),
    }),
  };
};

const createModrinthFileJob = (
  input: Extract<EnqueueDownloadJobInput, { kind: "modrinthFile" }>["input"],
): { job: DownloadQueueJob; runner: DownloadQueueRunner } => {
  const timestamp = nowIso();
  const fileName =
    input.file.fileName ||
    input.file.displayName ||
    `${input.projectName}.mrpack`;
  const job: DownloadQueueJob = {
    activeLabel: null,
    completedAt: null,
    createdAt: timestamp,
    error: null,
    id: createJobId(),
    items: [
      createQueueItem({
        id: `modrinth:${input.projectId}:${input.file.id}`,
        kind: getModrinthCategoryLabel(input.category),
        label: basename(fileName.replaceAll("\\", "/")),
      }),
    ],
    metadata: {
      category: input.category,
      fileId: input.file.id,
      imageUrl:
        input.projectLogoUrl ?? input.projectScreenshotUrls?.[0] ?? null,
      kind: "modrinthFile",
      projectId: input.projectId,
      targetInstanceId: input.instanceId ?? null,
    },
    progress: 0,
    result: null,
    source: "modrinth",
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
      kind: "modrinthFile",
      result: await downloadModrinthFile(input, {
        onProgress: (event) => applyCurseForgeProgress(job.id, event),
      }),
    }),
  };
};

const createMinecraftVersionManifestJob = (): {
  job: DownloadQueueJob;
  runner: DownloadQueueRunner;
} => {
  const timestamp = nowIso();
  const job: DownloadQueueJob = {
    activeLabel: null,
    completedAt: null,
    createdAt: timestamp,
    error: null,
    id: createJobId(),
    items: [
      createQueueItem({
        id: "minecraft-version-manifest",
        kind: "Version metadata",
        label: "Minecraft version manifest",
      }),
    ],
    metadata: { kind: "minecraftVersionManifest" },
    progress: 0,
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

  updateJob(jobId, (job) => {
    const nextJob: DownloadQueueJob = {
      ...job,
      items: job.items.map((item) => ({ ...item, status: "running" })),
      startedAt: timestamp,
      status: "running",
      updatedAt: timestamp,
    };

    return withDerivedJobProgress({
      ...nextJob,
      activeLabel: getRunningItemLabel(nextJob),
    });
  });
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
      const nextJob: DownloadQueueJob = {
        ...job,
        activeLabel: null,
        completedAt: timestamp,
        error: failureMessage(result.result),
        items: job.items.map((item) => {
          const error = failures.get(item.id) ?? null;

          return {
            ...item,
            error,
            progress: error ? item.progress : 100,
            status: error ? "failed" : "completed",
          };
        }),
        progress: job.progress,
        result,
        status,
        totalItems: Math.max(
          job.totalItems,
          result.result.succeeded + result.result.failed.length,
        ),
        updatedAt: timestamp,
      };

      return {
        ...nextJob,
        progress: deriveJobProgress(nextJob),
      };
    }

    if (result.kind === "minecraftVersionManifest") {
      return {
        ...job,
        activeLabel: null,
        completedAt: timestamp,
        error: null,
        items: job.items.map((item) => ({
          ...item,
          error: null,
          progress: 100,
          status: "completed",
        })),
        progress: 100,
        result,
        status: "completed",
        updatedAt: timestamp,
      };
    }

    return {
      ...job,
      activeLabel: null,
      completedAt: timestamp,
      error: null,
      items: job.items.map((item) => ({
        ...item,
        error: null,
        progress: item.status === "failed" ? item.progress : 100,
        status:
          item.status === "skipped" || item.status === "failed"
            ? item.status
            : "completed",
      })),
      progress: 100,
      result,
      status: "completed",
      updatedAt: timestamp,
    };
  });

  notifyJobListeners(jobId);
};

const failJob = (jobId: string, error: unknown): void => {
  const timestamp = nowIso();
  const message = error instanceof Error ? error.message : "Download failed.";

  updateJob(jobId, (job) => {
    const nextJob: DownloadQueueJob = {
      ...job,
      activeLabel: null,
      completedAt: timestamp,
      error: message,
      items: job.items.map((item) => {
        const finished =
          item.status === "completed" || item.status === "skipped";

        return {
          ...item,
          error: finished ? item.error : message,
          status: finished ? item.status : "failed",
        };
      }),
      status: "failed",
      updatedAt: timestamp,
    };

    return {
      ...nextJob,
      progress: deriveJobProgress(nextJob),
    };
  });

  notifyJobListeners(jobId);
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
        : input.kind === "modrinthFile"
          ? createModrinthFileJob(input.input)
          : createMinecraftVersionManifestJob();

  runners.set(job.id, runner);
  jobs = trimJobs([job, ...jobs]);

  void processQueue();

  return snapshotJob(job);
};

export const listDownloadJobs = (): Array<DownloadQueueJob> => snapshotJobs();

export const waitForDownloadJob = (
  jobId: string,
  options: { pollMs?: number; timeoutMs?: number } = {},
): Promise<DownloadQueueJob> => {
  const timeoutMs = Math.max(1_000, options.timeoutMs ?? 5 * 60_000);

  const checkDone = (): DownloadQueueJob | null => {
    const job = jobs.find((item) => item.id === jobId);
    if (!job) throw new Error("Download job no longer exists.");
    if (job.status === "completed" || job.status === "failed")
      return snapshotJob(job);
    return null;
  };

  const immediate = checkDone();
  if (immediate) return Promise.resolve(immediate);

  return new Promise((resolve, reject) => {
    let settled = false;

    const settle = (fn: () => void): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutId);
      const listeners = jobListeners.get(jobId);
      if (listeners) {
        listeners.delete(onNotify);
        if (!listeners.size) jobListeners.delete(jobId);
      }
      fn();
    };

    const onNotify = (): void => {
      try {
        const result = checkDone();
        if (result) settle(() => resolve(result));
      } catch (err) {
        settle(() => reject(err as Error));
      }
    };

    const timeoutId = setTimeout(
      () =>
        settle(() =>
          reject(new Error("Timed out waiting for download to finish.")),
        ),
      timeoutMs,
    );

    let listeners = jobListeners.get(jobId);
    if (!listeners) {
      listeners = new Set();
      jobListeners.set(jobId, listeners);
    }
    listeners.add(onNotify);

    // Re-check in case job completed between the initial check and listener registration
    try {
      const recheck = checkDone();
      if (recheck) settle(() => resolve(recheck));
    } catch (err) {
      settle(() => reject(err as Error));
    }
  });
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
