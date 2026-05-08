import { count } from "drizzle-orm";
import { db } from "./db/client";
import * as schema from "./db/schema";
import { refreshMinecraftVersionManifest } from "./launcher/versions";
import { createMainWindow } from "./window";

createMainWindow();

const versionCount =
  db.select({ value: count() }).from(schema.minecraftVersions).get()?.value ??
  0;

if (versionCount === 0) {
  refreshMinecraftVersionManifest().catch(() => {});
}
