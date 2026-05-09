import { useCallback, useEffect, useSyncExternalStore } from "react";
import type { LauncherProfile } from "@/shared/types";
import { rpc } from "@/views/main/lib/rpc";

type ProfilesState = {
  data: Array<LauncherProfile> | null;
  loading: boolean;
  error: string | null;
};

const listeners = new Set<() => void>();
let profilesState: ProfilesState = {
  data: null,
  error: null,
  loading: false,
};
let loadPromise: Promise<void> | null = null;

const emitProfilesChange = (): void => {
  for (const listener of listeners) {
    listener();
  }
};

const setProfilesState = (nextState: ProfilesState): void => {
  profilesState = nextState;
  emitProfilesChange();
};

const subscribeProfiles = (listener: () => void): (() => void) => {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
};

const getProfilesSnapshot = (): ProfilesState => profilesState;

export const refreshProfiles = (): void => {
  if (loadPromise) {
    return;
  }

  setProfilesState({
    ...profilesState,
    loading: true,
  });

  loadPromise = rpc.requestProxy
    .listLauncherProfiles(null)
    .then((result) => {
      setProfilesState({
        data: result,
        error: null,
        loading: false,
      });
    })
    .catch((e: unknown) => {
      setProfilesState({
        ...profilesState,
        error: e instanceof Error ? e.message : "Failed to load profiles",
        loading: false,
      });
    })
    .finally(() => {
      loadPromise = null;
    });
};

export function useProfiles(): {
  data: Array<LauncherProfile> | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
} {
  const profiles = useSyncExternalStore(
    subscribeProfiles,
    getProfilesSnapshot,
    getProfilesSnapshot,
  );
  const refresh = useCallback(() => refreshProfiles(), []);

  useEffect(() => {
    if (!profiles.data && !profiles.loading && !profiles.error) {
      refreshProfiles();
    }
  }, [profiles.data, profiles.error, profiles.loading]);

  return { ...profiles, refresh };
}
