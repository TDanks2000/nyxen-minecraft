import { useCallback, useEffect } from "react";
import { create } from "zustand";
import type { LauncherStatus } from "@/shared/types";
import { rpc } from "@/views/main/lib/rpc";

type LauncherStatusStore = {
  data: LauncherStatus | null;
  error: string | null;
  loading: boolean;
  loadPromise: Promise<LauncherStatus> | null;
  refresh: () => Promise<LauncherStatus>;
};

export const useLauncherStatusStore = create<LauncherStatusStore>(
  (set, get) => ({
    data: null,
    error: null,
    loading: false,
    loadPromise: null,
    refresh: async () => {
      const existingLoad = get().loadPromise;

      if (existingLoad) {
        return existingLoad;
      }

      set({ loading: true });

      const loadPromise = rpc.requestProxy
        .getLauncherStatus(null)
        .then((result) => {
          set({ data: result, error: null, loading: false });
          return result;
        })
        .catch((e: unknown) => {
          const message =
            e instanceof Error ? e.message : "Failed to load status";
          set({ error: message, loading: false });
          throw e;
        })
        .finally(() => {
          if (get().loadPromise === loadPromise) {
            set({ loadPromise: null });
          }
        });

      set({ loadPromise });
      return loadPromise;
    },
  }),
);

export function useLauncherStatus(): {
  data: LauncherStatus | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
} {
  const data = useLauncherStatusStore((state) => state.data);
  const error = useLauncherStatusStore((state) => state.error);
  const storeLoading = useLauncherStatusStore((state) => state.loading);
  const loadPromise = useLauncherStatusStore((state) => state.loadPromise);
  const refreshStatus = useLauncherStatusStore((state) => state.refresh);

  const refresh = useCallback(() => {
    void refreshStatus().catch(() => undefined);
  }, [refreshStatus]);

  useEffect(() => {
    if (data === null && !storeLoading && !loadPromise && !error) {
      void refreshStatus().catch(() => undefined);
    }
  }, [data, error, loadPromise, refreshStatus, storeLoading]);

  const loading = storeLoading || (data === null && !error);

  return { data, loading, error, refresh };
}
