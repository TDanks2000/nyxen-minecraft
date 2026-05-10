import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type { InstanceContent, LauncherInstance } from "@/shared/types";
import { useInstanceContentStore } from "@/views/main/features/instances/hooks/use-instance-content-store";
import { getModManagementState } from "@/views/main/features/instances/instance-catalog-model";
import { rpc } from "@/views/main/lib/rpc";

export function useInstanceCatalog(instance: LauncherInstance | null) {
  const [mutating, setMutating] = useState(false);
  const content = useInstanceContentStore((state) =>
    instance ? (state.byInstanceId[instance.id] ?? null) : null,
  );
  const error = useInstanceContentStore((state) =>
    instance ? (state.errors[instance.id] ?? null) : null,
  );
  const loading = useInstanceContentStore((state) =>
    instance ? (state.loadingIds[instance.id] ?? false) : false,
  );
  const refreshInstanceContent = useInstanceContentStore(
    (state) => state.refreshInstanceContent,
  );
  const replaceInstanceContent = useInstanceContentStore(
    (state) => state.replaceContent,
  );

  const refreshContent = useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      if (!instance) {
        return null;
      }

      try {
        return await refreshInstanceContent(instance.id);
      } catch (e) {
        const message =
          e instanceof Error ? e.message : "Failed to load instance content";
        if (!silent) toast.error(message);
        return null;
      }
    },
    [instance, refreshInstanceContent],
  );

  useEffect(() => {
    void refreshContent({ silent: false });
  }, [refreshContent]);

  const replaceContent = useCallback(
    (next: InstanceContent) => {
      if (!instance || next.instanceId !== instance.id) return;
      replaceInstanceContent(next);
    },
    [instance, replaceInstanceContent],
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
        replaceInstanceContent(next);
        toast.success(`${name} ${enabled ? "enabled" : "disabled"}.`);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to update mod");
      } finally {
        setMutating(false);
      }
    },
    [instance, modManagement.reason, replaceInstanceContent],
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
        replaceInstanceContent(nextContent);
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
    [
      instance,
      modManagement.reason,
      refreshContent,
      replaceInstanceContent,
      scopedContent,
    ],
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
