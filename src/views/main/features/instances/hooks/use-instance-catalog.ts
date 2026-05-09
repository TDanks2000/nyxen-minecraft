import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import type { LauncherInstance } from "@/shared/types";
import {
  MODS,
  type ModEntry,
  SERVERS,
  type ServerEntry,
} from "@/views/main/features/catalog/catalog-data";

export function useInstanceCatalog(instance: LauncherInstance | null) {
  const [enabled, setEnabled] = useState(
    () => new Set(MODS.filter((mod) => mod.enabled).map((mod) => mod.id)),
  );
  const [favorites, setFavorites] = useState(
    () =>
      new Set(
        SERVERS.filter((server) => server.favorite).map((server) => server.id),
      ),
  );
  const [mods, setMods] = useState<Array<ModEntry>>(() => MODS);
  const [servers, setServers] = useState<Array<ServerEntry>>(() => SERVERS);
  const [updates, setUpdates] = useState(
    () =>
      new Set(MODS.filter((mod) => mod.updateAvailable).map((mod) => mod.id)),
  );

  const enabledMods = useMemo(
    () => mods.filter((mod) => enabled.has(mod.id)),
    [enabled, mods],
  );

  const onlineServers = useMemo(
    () => servers.filter((server) => server.status === "Online"),
    [servers],
  );

  const addMod = useCallback(() => {
    const mod: ModEntry = {
      category: "Utility",
      enabled: false,
      id: "instance-local-minimap",
      name: "Instance Minimap",
      scope: "Client",
      summary: "A client utility staged directly on this instance.",
      updateAvailable: false,
      version: "1.0.0-local",
    };

    setMods((current) => {
      if (current.some((item) => item.id === mod.id)) {
        toast.message("Instance Minimap is already attached.");
        return current;
      }

      return [mod, ...current];
    });
    toast.success("Instance Minimap added disabled for review.");
  }, []);

  const addServer = useCallback(() => {
    const server: ServerEntry = {
      address: "instance.lan.local",
      favorite: false,
      id: "instance-lan",
      latencyMs: 18,
      name: "Instance LAN",
      players: "1 / 16",
      status: "Online",
      tags: ["LAN", instance?.loader ?? "Instance"],
      version: instance?.versionId ?? "Current",
    };

    setServers((current) => {
      if (current.some((item) => item.id === server.id)) {
        toast.message("Instance LAN is already attached.");
        return current;
      }

      return [server, ...current];
    });
    toast.success("Instance LAN added to this instance.");
  }, [instance?.loader, instance?.versionId]);

  const applyUpdate = useCallback((id: string, name: string) => {
    setUpdates((current) => {
      const next = new Set(current);
      next.delete(id);
      return next;
    });
    toast.success(`${name} marked up to date.`);
  }, []);

  const refreshPings = useCallback(() => {
    setServers((current) =>
      current.map((server, index) => ({
        ...server,
        latencyMs:
          server.status === "Online"
            ? 18 + (((server.latencyMs ?? 0) + index * 11) % 64)
            : null,
      })),
    );
    toast.success("Instance server pings refreshed.");
  }, []);

  const toggleFavorite = useCallback((id: string) => {
    setFavorites((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleMod = useCallback(
    (id: string, name: string, checked: boolean) => {
      setEnabled((current) => {
        const next = new Set(current);
        if (checked) next.add(id);
        else next.delete(id);
        return next;
      });
      toast.success(
        `${name} ${checked ? "enabled" : "disabled"} for this instance.`,
      );
    },
    [],
  );

  return {
    addMod,
    addServer,
    applyUpdate,
    enabled,
    enabledMods,
    favorites,
    mods,
    onlineServers,
    refreshPings,
    servers,
    toggleFavorite,
    toggleMod,
    updates,
  };
}
