export type InstanceTabValue =
  | "logs"
  | "modpack"
  | "mods"
  | "resource-packs"
  | "screenshots"
  | "servers"
  | "settings"
  | "shader-packs"
  | "versions"
  | "worlds";

export type ModStatusFilter = "all" | "disabled" | "enabled";
export type ModSortField = "modified" | "name" | "size";
