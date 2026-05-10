import type {
  InstanceContent,
  InstanceFileEntry,
  LauncherInstance,
  ModLoader,
} from "@/shared/types";

export type InstalledModpackEntry = {
  fileId: string;
  id: string;
  imageUrl: string | null;
  installedAt: string;
  instance: LauncherInstance;
  instanceId: string;
  loader: ModLoader;
  minecraft: string;
  name: string;
  projectId: string;
  source: "curseforge";
  tags: Array<string>;
  updatedAt: string;
  version: string | null;
  websiteUrl: string | null;
};

export type LocalWorldEntry = {
  file: InstanceFileEntry;
  id: string;
  instance: LauncherInstance;
  modifiedAt: string;
  name: string;
  path: string;
  type: "archive" | "directory";
};

export type LocalScreenshotEntry = {
  file: InstanceFileEntry;
  id: string;
  imageUrl: string;
  instance: LauncherInstance;
  modifiedAt: string;
  name: string;
  path: string;
};

export const LOADER_LABELS: Record<ModLoader, string> = {
  fabric: "Fabric",
  forge: "Forge",
  neoforge: "NeoForge",
  quilt: "Quilt",
  vanilla: "Vanilla",
};

export const formatBytes = (bytes: number): string => {
  if (!Number.isFinite(bytes) || bytes < 0) return "Unknown";
  if (bytes === 0) return "0 B";

  const units = ["B", "KB", "MB", "GB", "TB"] as const;
  const exponent = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  const value = bytes / 1024 ** exponent;

  return `${new Intl.NumberFormat(undefined, {
    maximumFractionDigits: value >= 10 || exponent === 0 ? 0 : 1,
  }).format(value)} ${units[exponent]}`;
};

export const formatEntrySize = (entry: InstanceFileEntry): string =>
  entry.isDirectory ? "Directory" : formatBytes(entry.sizeBytes);

export const formatAbsoluteDate = (value: string): string => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Unknown date";

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

export const formatRelativeDate = (value: string): string => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Unknown date";

  const deltaSeconds = Math.round((date.getTime() - Date.now()) / 1000);
  const absSeconds = Math.abs(deltaSeconds);
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });

  if (absSeconds < 60) return rtf.format(deltaSeconds, "second");

  const deltaMinutes = Math.round(deltaSeconds / 60);
  if (Math.abs(deltaMinutes) < 60) return rtf.format(deltaMinutes, "minute");

  const deltaHours = Math.round(deltaMinutes / 60);
  if (Math.abs(deltaHours) < 24) return rtf.format(deltaHours, "hour");

  const deltaDays = Math.round(deltaHours / 24);
  if (Math.abs(deltaDays) < 30) return rtf.format(deltaDays, "day");

  const deltaMonths = Math.round(deltaDays / 30);
  if (Math.abs(deltaMonths) < 12) return rtf.format(deltaMonths, "month");

  return rtf.format(Math.round(deltaMonths / 12), "year");
};

export const toFileMediaUrl = (path: string): string => {
  const normalized = path.replaceAll("\\", "/");

  if (/^[A-Za-z]:\//.test(normalized)) {
    return new URL(`file:///${normalized}`).toString();
  }

  return new URL(
    normalized.startsWith("/")
      ? `file://${normalized}`
      : `file:///${normalized}`,
  ).toString();
};

export const getContentList = (
  instances: Array<LauncherInstance>,
  byInstanceId: Record<string, InstanceContent>,
): Array<InstanceContent> =>
  instances.flatMap((instance) => byInstanceId[instance.id] ?? []);

export const getLatestContentRefresh = (
  contents: Array<InstanceContent>,
): string | null => {
  let latest: string | null = null;
  let latestTime = 0;

  for (const content of contents) {
    const time = new Date(content.refreshedAt).getTime();
    if (!Number.isNaN(time) && time > latestTime) {
      latest = content.refreshedAt;
      latestTime = time;
    }
  }

  return latest;
};

export const mapInstalledModpacks = (
  instances: Array<LauncherInstance>,
): Array<InstalledModpackEntry> =>
  instances
    .flatMap((instance) => {
      const modpack = instance.modpack;

      if (!modpack) return [];

      return [
        {
          fileId: modpack.fileId,
          id: `${instance.id}:${modpack.projectId}:${modpack.fileId}`,
          imageUrl:
            instance.bannerUrl ??
            modpack.bannerUrl ??
            instance.iconUrl ??
            modpack.iconUrl,
          installedAt: modpack.installedAt,
          instance,
          instanceId: instance.id,
          loader: instance.loader,
          minecraft: instance.versionId,
          name: modpack.name,
          projectId: modpack.projectId,
          source: modpack.source,
          tags: [
            LOADER_LABELS[instance.loader],
            `Minecraft ${instance.versionId}`,
            modpack.version ? `Pack ${modpack.version}` : null,
          ].filter((tag): tag is string => Boolean(tag)),
          updatedAt: modpack.updatedAt,
          version: modpack.version ?? null,
          websiteUrl: modpack.websiteUrl,
        },
      ];
    })
    .sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );

export const mapLocalWorlds = (
  instances: Array<LauncherInstance>,
  byInstanceId: Record<string, InstanceContent>,
): Array<LocalWorldEntry> =>
  instances
    .flatMap((instance) =>
      (byInstanceId[instance.id]?.worlds ?? []).map((file) => ({
        file,
        id: `${instance.id}:${file.id}`,
        instance,
        modifiedAt: file.modifiedAt,
        name: file.displayName,
        path: file.path,
        type: file.isDirectory ? ("directory" as const) : ("archive" as const),
      })),
    )
    .sort(
      (a, b) =>
        new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime(),
    );

export const mapLocalScreenshots = (
  instances: Array<LauncherInstance>,
  byInstanceId: Record<string, InstanceContent>,
): Array<LocalScreenshotEntry> =>
  instances
    .flatMap((instance) =>
      (byInstanceId[instance.id]?.screenshots ?? []).map((file) => ({
        file,
        id: `${instance.id}:${file.id}`,
        imageUrl: toFileMediaUrl(file.path),
        instance,
        modifiedAt: file.modifiedAt,
        name: file.displayName,
        path: file.path,
      })),
    )
    .sort(
      (a, b) =>
        new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime(),
    );
