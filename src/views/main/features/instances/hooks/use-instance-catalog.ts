import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type { InstanceContent, LauncherInstance } from "@/shared/types";
import { rpc } from "@/views/main/lib/rpc";

export function useInstanceCatalog(instance: LauncherInstance | null) {
  const [content, setContent] = useState<InstanceContent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [mutating, setMutating] = useState(false);

  const refreshContent = useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      if (!instance) {
        setContent(null);
        setError(null);
        setLoading(false);
        return null;
      }

      if (!silent) setLoading(true);

      try {
        const next = await rpc.requestProxy.getInstanceContent({
          instanceId: instance.id,
        });
        setContent(next);
        setError(null);
        return next;
      } catch (e) {
        const message =
          e instanceof Error ? e.message : "Failed to load instance content";
        setError(message);
        if (!silent) toast.error(message);
        return null;
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [instance],
  );

  useEffect(() => {
    void refreshContent({ silent: false });
  }, [refreshContent]);

  const replaceContent = useCallback(
    (next: InstanceContent) => {
      if (!instance || next.instanceId !== instance.id) return;
      setContent(next);
      setError(null);
    },
    [instance],
  );

  const enabledMods = useMemo(
    () => content?.mods.filter((mod) => mod.enabled === true) ?? [],
    [content?.mods],
  );

  const disabledMods = useMemo(
    () => content?.mods.filter((mod) => mod.enabled === false) ?? [],
    [content?.mods],
  );

  const toggleMod = useCallback(
    async (fileName: string, name: string, enabled: boolean) => {
      if (!instance) return;

      setMutating(true);
      try {
        const next = await rpc.requestProxy.setInstanceModEnabled({
          enabled,
          fileName,
          instanceId: instance.id,
        });
        setContent(next);
        toast.success(`${name} ${enabled ? "enabled" : "disabled"}.`);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to update mod");
      } finally {
        setMutating(false);
      }
    },
    [instance],
  );

  const setAllModsEnabled = useCallback(
    async (enabled: boolean) => {
      if (!instance || !content) return;

      const targets = content.mods.filter((mod) => mod.enabled !== enabled);

      if (targets.length === 0) {
        toast.message(
          enabled ? "All mods are already enabled." : "All mods are disabled.",
        );
        return;
      }

      setMutating(true);
      try {
        let nextContent = content;
        for (const mod of targets) {
          nextContent = await rpc.requestProxy.setInstanceModEnabled({
            enabled,
            fileName: mod.fileName,
            instanceId: instance.id,
          });
        }
        setContent(nextContent);
        toast.success(
          `${targets.length} mod${targets.length === 1 ? "" : "s"} ${enabled ? "enabled" : "disabled"}.`,
        );
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to update mods");
        await refreshContent({ silent: true });
      } finally {
        setMutating(false);
      }
    },
    [content, instance, refreshContent],
  );

  return {
    content,
    disabledMods,
    enabledMods,
    error,
    loading,
    mods: content?.mods ?? [],
    mutating,
    replaceContent,
    refreshContent,
    resourcePacks: content?.resourcePacks ?? [],
    screenshots: content?.screenshots ?? [],
    serverList: content?.serverList ?? null,
    setAllModsEnabled,
    shaderPacks: content?.shaderPacks ?? [],
    logs: content?.logs ?? [],
    toggleMod,
    worlds: content?.worlds ?? [],
  };
}
