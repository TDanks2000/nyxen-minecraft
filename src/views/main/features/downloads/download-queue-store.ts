import { create } from "zustand";
import type {
  ClearDownloadJobInput,
  DownloadQueueJob,
  EnqueueDownloadJobInput,
} from "@/shared/types";
import { rpc } from "@/views/main/lib/rpc";

type WaitForDownloadJobOptions = {
  pollMs?: number;
  timeoutMs?: number;
};

type DownloadQueueStore = {
  clearFinishedDownloadJobs: () => Promise<Array<DownloadQueueJob>>;
  clearDownloadJob: (
    input: ClearDownloadJobInput,
  ) => Promise<Array<DownloadQueueJob>>;
  enqueueDownloadJob: (
    input: EnqueueDownloadJobInput,
  ) => Promise<DownloadQueueJob>;
  error: string | null;
  jobs: Array<DownloadQueueJob>;
  loading: boolean;
  refreshDownloadJobs: () => Promise<Array<DownloadQueueJob>>;
  waitForDownloadJob: (
    jobId: string,
    options?: WaitForDownloadJobOptions,
  ) => Promise<DownloadQueueJob>;
};

const upsertJob = (
  jobs: Array<DownloadQueueJob>,
  nextJob: DownloadQueueJob,
): Array<DownloadQueueJob> => {
  const existingIndex = jobs.findIndex((job) => job.id === nextJob.id);

  if (existingIndex === -1) {
    return [nextJob, ...jobs];
  }

  return jobs.map((job) => (job.id === nextJob.id ? nextJob : job));
};

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

export const useDownloadQueueStore = create<DownloadQueueStore>((set, get) => ({
  clearDownloadJob: async (input) => {
    const jobs = await rpc.requestProxy.clearDownloadJob(input);
    set({ error: null, jobs });
    return jobs;
  },
  clearFinishedDownloadJobs: async () => {
    const jobs = await rpc.requestProxy.clearFinishedDownloadJobs(null);
    set({ error: null, jobs });
    return jobs;
  },
  enqueueDownloadJob: async (input) => {
    const job = await rpc.requestProxy.enqueueDownloadJob(input);
    set((state) => ({
      error: null,
      jobs: upsertJob(state.jobs, job),
    }));
    return job;
  },
  error: null,
  jobs: [],
  loading: false,
  refreshDownloadJobs: async () => {
    set({ loading: true });

    try {
      const jobs = await rpc.requestProxy.listDownloadJobs(null);
      set({ error: null, jobs, loading: false });
      return jobs;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to load downloads";
      set({ error: message, loading: false });
      throw error;
    }
  },
  waitForDownloadJob: async (jobId, options = {}) => {
    const pollMs = Math.max(250, options.pollMs ?? 750);
    const timeoutMs = Math.max(1_000, options.timeoutMs ?? 5 * 60_000);
    const startedAt = Date.now();

    for (;;) {
      const jobs = await get().refreshDownloadJobs();
      const job = jobs.find((item) => item.id === jobId);

      if (job?.status === "completed" || job?.status === "failed") {
        return job;
      }

      if (Date.now() - startedAt > timeoutMs) {
        throw new Error("Timed out waiting for download to finish.");
      }

      await sleep(pollMs);
    }
  },
}));
