import { useCallback, useEffect, useState } from "react";
import type { LauncherStatus } from "@/shared/types";
import { rpc } from "@/views/main/lib/rpc";

export function useLauncherStatus(): {
  data: LauncherStatus | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
} {
  const [data, setData] = useState<LauncherStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    void tick;
    let mounted = true;

    async function load() {
      setLoading(true);
      try {
        const result = await rpc.requestProxy.getLauncherStatus(null);
        if (mounted) {
          setData(result);
          setError(null);
        }
      } catch (e) {
        if (mounted) {
          setError(e instanceof Error ? e.message : "Failed to load status");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [tick]);

  return { data, loading, error, refresh };
}
