import { useCallback, useEffect, useState } from "react";
import type { LauncherInstance } from "@/shared/types";
import { rpc } from "@/views/main/lib/rpc";

export function useInstances(): {
  data: Array<LauncherInstance> | null;
  loading: boolean;
  error: string | null;
  removeInstance: (instanceId: string) => void;
  refresh: () => void;
  upsertInstance: (instance: LauncherInstance) => void;
} {
  const [data, setData] = useState<Array<LauncherInstance> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((t) => t + 1), []);
  const upsertInstance = useCallback((instance: LauncherInstance) => {
    setData((current) => {
      const next = current ? [...current] : [];
      const existingIndex = next.findIndex((item) => item.id === instance.id);

      if (existingIndex >= 0) {
        next[existingIndex] = instance;
      } else {
        next.push(instance);
      }

      return next.sort((a, b) => a.name.localeCompare(b.name));
    });
  }, []);
  const removeInstance = useCallback((instanceId: string) => {
    setData((current) =>
      current
        ? current.filter((instance) => instance.id !== instanceId)
        : current,
    );
  }, []);

  useEffect(() => {
    void tick;
    let mounted = true;

    async function load() {
      setLoading(true);
      try {
        const result = await rpc.requestProxy.listLauncherInstances(null);
        if (mounted) {
          setData(result);
          setError(null);
        }
      } catch (e) {
        if (mounted) {
          setError(e instanceof Error ? e.message : "Failed to load instances");
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

  return { data, loading, error, refresh, removeInstance, upsertInstance };
}
