import { useCallback, useEffect } from "react";
import { create } from "zustand";
import type { LauncherProfile } from "@/shared/types";
import { rpc } from "@/views/main/lib/rpc";

type ProfilesStore = {
  data: Array<LauncherProfile> | null;
  error: string | null;
  loading: boolean;
  loadPromise: Promise<Array<LauncherProfile>> | null;
  refresh: () => Promise<Array<LauncherProfile>>;
};

export const useProfilesStore = create<ProfilesStore>((set, get) => ({
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
      .listLauncherProfiles(null)
      .then((result) => {
        set({
          data: result,
          error: null,
          loading: false,
        });
        return result;
      })
      .catch((e: unknown) => {
        const message =
          e instanceof Error ? e.message : "Failed to load profiles";
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
}));

export const refreshProfiles = (): void => {
  void useProfilesStore
    .getState()
    .refresh()
    .catch(() => undefined);
};

export const setProfiles = (profiles: Array<LauncherProfile>): void => {
  useProfilesStore.setState({
    data: profiles,
    error: null,
    loading: false,
  });
};

export const upsertProfile = (profile: LauncherProfile): void => {
  useProfilesStore.setState((state) => {
    const next = state.data ? [...state.data] : [];
    const existingIndex = next.findIndex((item) => item.id === profile.id);

    if (existingIndex >= 0) {
      next[existingIndex] = profile;
    } else {
      next.push(profile);
    }

    return {
      data: next,
      error: null,
    };
  });
};

export function useProfiles(): {
  data: Array<LauncherProfile> | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
} {
  const data = useProfilesStore((state) => state.data);
  const error = useProfilesStore((state) => state.error);
  const storeLoading = useProfilesStore((state) => state.loading);
  const loadPromise = useProfilesStore((state) => state.loadPromise);
  const refreshStore = useProfilesStore((state) => state.refresh);

  const refresh = useCallback(() => {
    void refreshStore().catch(() => undefined);
  }, [refreshStore]);

  useEffect(() => {
    if (data === null && !storeLoading && !loadPromise && !error) {
      void refreshStore().catch(() => undefined);
    }
  }, [data, error, loadPromise, refreshStore, storeLoading]);

  const loading = storeLoading || (data === null && !error);

  return { data, error, loading, refresh };
}
