import { useCallback, useEffect, useRef, useState } from "react";
import type { LoaderVersionSummary, ModLoader } from "@/shared/types";
import { rpc } from "@/views/main/lib/rpc";

type LoaderVersionsState = {
  key: string;
  data: Array<LoaderVersionSummary> | null;
  loading: boolean;
  error: string | null;
};

const getLoaderVersionsKey = (loader: ModLoader, mcVersion: string) =>
  `${loader}\u0000${mcVersion}`;

export function useLoaderVersions(loader: ModLoader, mcVersion: string) {
  const requestKey = getLoaderVersionsKey(loader, mcVersion);
  const shouldLoad = loader !== "vanilla" && mcVersion.trim().length > 0;
  const [state, setState] = useState<LoaderVersionsState>(() => ({
    key: requestKey,
    data: null,
    loading: false,
    error: null,
  }));
  const abortRef = useRef<AbortController | null>(null);

  const load = useCallback(async () => {
    const key = getLoaderVersionsKey(loader, mcVersion);
    abortRef.current?.abort();

    if (loader === "vanilla" || !mcVersion.trim()) {
      setState({ key, data: null, loading: false, error: null });
      return;
    }

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setState({ key, data: null, loading: true, error: null });
    try {
      const result = await rpc.requestProxy.listLoaderVersions({
        loader,
        mcVersion,
      });
      if (!ctrl.signal.aborted) {
        setState({ key, data: result, loading: false, error: null });
      }
    } catch (e) {
      if (!ctrl.signal.aborted) {
        setState({
          key,
          data: null,
          loading: false,
          error:
            e instanceof Error ? e.message : "Failed to load loader versions",
        });
      }
    }
  }, [loader, mcVersion]);

  useEffect(() => {
    load();
    return () => abortRef.current?.abort();
  }, [load]);

  const currentState =
    state.key === requestKey
      ? state
      : {
          key: requestKey,
          data: null,
          loading: shouldLoad,
          error: null,
        };

  return {
    data: currentState.data,
    loading: currentState.loading,
    error: currentState.error,
    refresh: load,
  };
}
