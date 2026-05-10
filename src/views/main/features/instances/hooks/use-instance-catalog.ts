import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type { InstanceContent, LauncherInstance } from "@/shared/types";
import { getModManagementState } from "@/views/main/features/instances/instance-catalog-model";
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

  const scopedContent = useMemo(
    () => (instance && content?.instanceId === instance.id ? content : null),
    [content, instance],
  );
  const effectiveLoading =
    loading || (instance !== null && scopedContent === null && error === null);
  const modManagement = useMemo(
    () =>
      getModManagementState({
        content: scopedContent,
        contentLoading: effectiveLoading,
        instance,
      }),
    [effectiveLoading, instance, scopedContent],
  );

  const enabledMods = useMemo(
    () => scopedContent?.mods.filter((mod) => mod.enabled === true) ?? [],
    [scopedContent?.mods],
  );

  const disabledMods = useMemo(
    () => scopedContent?.mods.filter((mod) => mod.enabled === false) ?? [],
    [scopedContent?.mods],
  );

  const toggleMod = useCallback(
    async (fileName: string, name: string, enabled: boolean) => {
      if (!instance) return;
      if (modManagement.reason === "modpack") {
        toast.error("Mods are managed by this instance's linked modpack.");
        return;
      }
      if (modManagement.reason === "loading") {
        toast.message("Wait for instance content to finish loading.");
        return;
      }

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
    [instance, modManagement.reason],
  );

  const setAllModsEnabled = useCallback(
    async (enabled: boolean) => {
      if (!instance) return;
      if (modManagement.reason === "modpack") {
        toast.error("Mods are managed by this instance's linked modpack.");
        return;
      }
      if (modManagement.reason === "loading") {
        toast.message("Wait for instance content to finish loading.");
        return;
      }
      if (!scopedContent) return;

      const targets = scopedContent.mods.filter(
        (mod) => mod.enabled !== enabled,
      );

      if (targets.length === 0) {
        toast.message(
          enabled ? "All mods are already enabled." : "All mods are disabled.",
        );
        return;
      }

      setMutating(true);
      try {
        let nextContent = scopedContent;
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
    [instance, modManagement.reason, refreshContent, scopedContent],
  );

  return {
    content: scopedContent,
    disabledMods,
    enabledMods,
    error,
    loading: effectiveLoading,
    mods: scopedContent?.mods ?? [],
    mutating,
    replaceContent,
    refreshContent,
    resourcePacks: scopedContent?.resourcePacks ?? [],
    screenshots: scopedContent?.screenshots ?? [],
    serverList: scopedContent?.serverList ?? null,
    setAllModsEnabled,
    shaderPacks: scopedContent?.shaderPacks ?? [],
    logs: scopedContent?.logs ?? [],
    toggleMod,
    worlds: scopedContent?.worlds ?? [],
  };
}
