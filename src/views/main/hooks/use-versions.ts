import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import type { MinecraftVersionSummary } from "@/shared/types";
import { rpc } from "@/views/main/lib/rpc";

type VersionsOpts = { includeSnapshots?: boolean } | undefined;

export function useVersions(opts?: VersionsOpts): {
  data: Array<MinecraftVersionSummary> | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
  refreshManifest: () => Promise<void>;
} {
  const [data, setData] = useState<Array<MinecraftVersionSummary> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const includeSnapshots = opts?.includeSnapshots;

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    void tick;
    let mounted = true;

    async function load() {
      setLoading(true);
      try {
        const result = await rpc.requestProxy.listMinecraftVersions(
          includeSnapshots === undefined ? null : { includeSnapshots },
        );
        if (mounted) {
          setData(result);
          setError(null);
        }
      } catch (e) {
        if (mounted) {
          setError(e instanceof Error ? e.message : "Failed to load versions");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [tick, includeSnapshots]);

  const refreshManifest = useCallback(async () => {
    try {
      await rpc.requestProxy.refreshMinecraftVersionManifest(null);
      toast.success("Version manifest updated");
      refresh();
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Failed to refresh manifest",
      );
    }
  }, [refresh]);

  return { data, loading, error, refresh, refreshManifest };
}
