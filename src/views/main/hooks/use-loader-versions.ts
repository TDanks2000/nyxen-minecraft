import { useCallback, useEffect, useRef, useState } from "react";
import type { LoaderVersionSummary, ModLoader } from "@/shared/types";
import { rpc } from "@/views/main/lib/rpc";

export function useLoaderVersions(loader: ModLoader, mcVersion: string) {
  const [data, setData] = useState<Array<LoaderVersionSummary> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const load = useCallback(async () => {
    if (loader === "vanilla" || !mcVersion) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }

    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setLoading(true);
    setError(null);
    try {
      const result = await rpc.requestProxy.listLoaderVersions({
        loader,
        mcVersion,
      });
      if (!ctrl.signal.aborted) {
        setData(result);
      }
    } catch (e) {
      if (!ctrl.signal.aborted) {
        setError(
          e instanceof Error ? e.message : "Failed to load loader versions",
        );
        setData(null);
      }
    } finally {
      if (!ctrl.signal.aborted) {
        setLoading(false);
      }
    }
  }, [loader, mcVersion]);

  useEffect(() => {
    load();
    return () => abortRef.current?.abort();
  }, [load]);

  return { data, loading, error, refresh: load };
}
