import { count } from "drizzle-orm";
import type { LauncherStatus } from "../../shared/types";
import { db } from "../db/client";
import * as schema from "../db/schema";
import { isMicrosoftAuthConfigured } from "./microsoft-auth";
import { ensureLauncherDirectories } from "./paths";
import {
  getMinecraftVersionManifest,
  MINECRAFT_VERSION_MANIFEST_URL,
} from "./versions";

const tableCount = (
  table:
    | typeof schema.launcherInstances
    | typeof schema.launcherProfiles
    | typeof schema.minecraftVersions,
): number => db.select({ value: count() }).from(table).get()?.value ?? 0;

export const getLauncherStatus = (): LauncherStatus => {
  const directories = ensureLauncherDirectories();
  const manifest = getMinecraftVersionManifest({ limit: 1 });
  const versionCount = tableCount(schema.minecraftVersions);

  return {
    capabilities: [
      {
        id: "version-metadata-cache",
        ready: versionCount > 0,
        title: "Minecraft version metadata cache",
      },
      {
        id: "profile-store",
        ready: true,
        title: "Local launcher profile store",
      },
      {
        id: "instance-store",
        ready: true,
        title: "Persistent instance store",
      },
      {
        id: "launch-planning",
        ready: true,
        title: "Launch preflight planning",
      },
      {
        id: "microsoft-auth",
        ready: isMicrosoftAuthConfigured(),
        title: "Microsoft account ownership verification",
      },
    ],
    counts: {
      instances: tableCount(schema.launcherInstances),
      profiles: tableCount(schema.launcherProfiles),
      versions: versionCount,
    },
    directories,
    manifest: {
      latestRelease: manifest.latest.release,
      latestSnapshot: manifest.latest.snapshot,
      refreshedAt: manifest.refreshedAt,
      sourceUrl: manifest.sourceUrl || MINECRAFT_VERSION_MANIFEST_URL,
    },
  };
};
