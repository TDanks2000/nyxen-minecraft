import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const appMetadata = sqliteTable("app_metadata", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  createdAt: text("created_at").notNull(),
});

export const minecraftVersionManifests = sqliteTable(
  "minecraft_version_manifests",
  {
    id: text("id").primaryKey(),
    latestRelease: text("latest_release").notNull(),
    latestSnapshot: text("latest_snapshot").notNull(),
    refreshedAt: text("refreshed_at").notNull(),
    sourceUrl: text("source_url").notNull(),
  },
);

export const minecraftVersions = sqliteTable("minecraft_versions", {
  id: text("id").primaryKey(),
  complianceLevel: integer("compliance_level"),
  manifestUpdatedAt: text("manifest_updated_at").notNull(),
  releaseTime: text("release_time").notNull(),
  sha1: text("sha1"),
  time: text("time").notNull(),
  type: text("type").notNull(),
  url: text("url").notNull(),
});

export const launcherProfiles = sqliteTable("launcher_profiles", {
  id: text("id").primaryKey(),
  accountId: text("account_id"),
  createdAt: text("created_at").notNull(),
  displayName: text("display_name").notNull(),
  entitlements: text("entitlements"),
  kind: text("kind").notNull(),
  minecraftAccessToken: text("minecraft_access_token"),
  minecraftAccessTokenExpiresAt: text("minecraft_access_token_expires_at"),
  microsoftRefreshToken: text("microsoft_refresh_token"),
  ownershipCheckedAt: text("ownership_checked_at"),
  skinUrl: text("skin_url"),
  updatedAt: text("updated_at").notNull(),
});

export const launcherInstances = sqliteTable("launcher_instances", {
  id: text("id").primaryKey(),
  bannerUrl: text("banner_url"),
  createdAt: text("created_at").notNull(),
  gameArgs: text("game_args").notNull(),
  gameDirectory: text("game_directory").notNull(),
  iconUrl: text("icon_url"),
  javaArgs: text("java_args").notNull(),
  javaExecutable: text("java_executable"),
  lastLaunchedAt: text("last_launched_at"),
  loader: text("loader").notNull(),
  loaderVersion: text("loader_version"),
  memoryMaxMb: integer("memory_max_mb").notNull(),
  memoryMinMb: integer("memory_min_mb").notNull(),
  modpackMetadata: text("modpack_metadata"),
  name: text("name").notNull(),
  profileId: text("profile_id").references(() => launcherProfiles.id),
  updatedAt: text("updated_at").notNull(),
  versionId: text("version_id")
    .notNull()
    .references(() => minecraftVersions.id),
});
