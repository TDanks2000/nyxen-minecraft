import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { count } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sqlite";
import type { DatabaseStatus } from "../../shared/types";
import { getDataRoot } from "../launcher/paths";
import * as schema from "./schema";

export const databasePath = join(getDataRoot(), "app.sqlite");

mkdirSync(dirname(databasePath), { recursive: true });

export const sqlite = new Database(databasePath, {
  create: true,
  strict: true,
});

sqlite.exec(`
  pragma foreign_keys = on;

  create table if not exists app_metadata (
    id integer primary key autoincrement,
    key text not null unique,
    value text not null,
    created_at text not null
  );

  create table if not exists minecraft_version_manifests (
    id text primary key,
    latest_release text not null,
    latest_snapshot text not null,
    refreshed_at text not null,
    source_url text not null
  );

  create table if not exists minecraft_versions (
    id text primary key,
    compliance_level integer,
    manifest_updated_at text not null,
    release_time text not null,
    sha1 text,
    time text not null,
    type text not null,
    url text not null
  );

  create table if not exists launcher_profiles (
    id text primary key,
    account_id text,
    created_at text not null,
    display_name text not null,
    entitlements text,
    kind text not null,
    minecraft_access_token text,
    minecraft_access_token_expires_at text,
    microsoft_refresh_token text,
    ownership_checked_at text,
    skin_url text,
    updated_at text not null
  );

  create table if not exists launcher_instances (
    id text primary key,
    created_at text not null,
    game_args text not null,
    game_directory text not null,
    icon_url text,
    java_args text not null,
    java_executable text,
    last_launched_at text,
    loader text not null,
    loader_version text,
    memory_max_mb integer not null,
    memory_min_mb integer not null,
    name text not null,
    profile_id text references launcher_profiles(id),
    updated_at text not null,
    version_id text not null references minecraft_versions(id)
  );

  create index if not exists launcher_instances_version_id_idx
    on launcher_instances(version_id);

  create index if not exists minecraft_versions_type_release_time_idx
    on minecraft_versions(type, release_time);
`);

const launcherProfileColumns = new Set(
  sqlite
    .query<{ name: string }, []>("pragma table_info(launcher_profiles)")
    .all()
    .map((column) => column.name),
);

const ensureLauncherProfileColumn = (
  columnName: string,
  definition: string,
): void => {
  if (!launcherProfileColumns.has(columnName)) {
    sqlite.exec(`alter table launcher_profiles add column ${definition}`);
    launcherProfileColumns.add(columnName);
  }
};

ensureLauncherProfileColumn("entitlements", "entitlements text");
ensureLauncherProfileColumn(
  "minecraft_access_token",
  "minecraft_access_token text",
);
ensureLauncherProfileColumn(
  "minecraft_access_token_expires_at",
  "minecraft_access_token_expires_at text",
);
ensureLauncherProfileColumn(
  "microsoft_refresh_token",
  "microsoft_refresh_token text",
);
ensureLauncherProfileColumn(
  "ownership_checked_at",
  "ownership_checked_at text",
);
ensureLauncherProfileColumn("skin_url", "skin_url text");

export const db = drizzle(sqlite, { schema });

export const getDatabaseStatus = (): DatabaseStatus => {
  const result =
    db.select({ value: count() }).from(schema.appMetadata).get()?.value ?? 0;

  return {
    driver: "drizzle",
    path: databasePath,
    records: result,
  };
};
