import { useCallback, useEffect } from "react";
import { create } from "zustand";
import type { LauncherInstance } from "@/shared/types";
import { rpc } from "@/views/main/lib/rpc";

type InstancesStore = {
  data: Array<LauncherInstance> | null;
  error: string | null;
  loading: boolean;
  loadPromise: Promise<Array<LauncherInstance>> | null;
  refresh: () => Promise<Array<LauncherInstance>>;
  removeInstance: (instanceId: string) => void;
  upsertInstance: (instance: LauncherInstance) => void;
};

const sortInstances = (
  instances: Array<LauncherInstance>,
): Array<LauncherInstance> =>
  [...instances].sort((a, b) => a.name.localeCompare(b.name));

export const useInstancesStore = create<InstancesStore>((set, get) => ({
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
      .listLauncherInstances(null)
      .then((result) => {
        const data = sortInstances(result);
        set({ data, error: null, loading: false });
        return data;
      })
      .catch((e: unknown) => {
        const message =
          e instanceof Error ? e.message : "Failed to load instances";
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
  removeInstance: (instanceId) => {
    set((state) => ({
      data: state.data
        ? state.data.filter((instance) => instance.id !== instanceId)
        : state.data,
    }));
  },
  upsertInstance: (instance) => {
    set((state) => {
      const next = state.data ? [...state.data] : [];
      const existingIndex = next.findIndex((item) => item.id === instance.id);

      if (existingIndex >= 0) {
        next[existingIndex] = instance;
      } else {
        next.push(instance);
      }

      return { data: sortInstances(next), error: null };
    });
  },
}));

export function useInstances(): {
  data: Array<LauncherInstance> | null;
  loading: boolean;
  error: string | null;
  removeInstance: (instanceId: string) => void;
  refresh: () => void;
  upsertInstance: (instance: LauncherInstance) => void;
} {
  const data = useInstancesStore((state) => state.data);
  const error = useInstancesStore((state) => state.error);
  const storeLoading = useInstancesStore((state) => state.loading);
  const loadPromise = useInstancesStore((state) => state.loadPromise);
  const refreshInstances = useInstancesStore((state) => state.refresh);
  const removeInstance = useInstancesStore((state) => state.removeInstance);
  const upsertInstance = useInstancesStore((state) => state.upsertInstance);

  const refresh = useCallback(() => {
    void refreshInstances().catch(() => undefined);
  }, [refreshInstances]);

  useEffect(() => {
    if (data === null && !storeLoading && !loadPromise && !error) {
      void refreshInstances().catch(() => undefined);
    }
  }, [data, error, loadPromise, refreshInstances, storeLoading]);

  const loading = storeLoading || (data === null && !error);

  return { data, loading, error, refresh, removeInstance, upsertInstance };
}
