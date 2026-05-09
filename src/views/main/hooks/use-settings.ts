import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import type { SettingsStatus, SettingValue } from "@/shared/types";
import { rpc } from "@/views/main/lib/rpc";

export function useSettings(): {
  data: SettingsStatus | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
  updateSetting: (key: string, value: SettingValue) => Promise<void>;
} {
  const [data, setData] = useState<SettingsStatus | null>(null);
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
        const result = await rpc.requestProxy.getSettingsStatus(null);
        if (mounted) {
          setData(result);
          setError(null);
        }
      } catch (e) {
        if (mounted) {
          setError(e instanceof Error ? e.message : "Failed to load settings");
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

  const updateSetting = useCallback(
    async (key: string, value: SettingValue) => {
      try {
        const result = await rpc.requestProxy.updateSetting({ key, value });
        setData(result);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to save setting");
      }
    },
    [],
  );

  return { data, loading, error, refresh, updateSetting };
}
