import {
  ArchiveIcon,
  CameraIcon,
  FileTextIcon,
  GaugeIcon,
  HardDriveIcon,
  PackageCheckIcon,
  PuzzleIcon,
  ServerIcon,
  Settings2Icon,
  ZapIcon,
} from "lucide-react";
import type { ElementType } from "react";
import type {
  InstanceTabValue,
  ModSortField,
  ModStatusFilter,
} from "@/views/main/features/instances/components/instance-catalog-types";

export const INSTANCE_TAB_ITEMS: Array<{
  icon: ElementType;
  label: string;
  value: InstanceTabValue;
}> = [
  { icon: PuzzleIcon, label: "Mods", value: "mods" },
  { icon: PackageCheckIcon, label: "Modpack", value: "modpack" },
  { icon: ArchiveIcon, label: "Resource Packs", value: "resource-packs" },
  { icon: GaugeIcon, label: "Shaders", value: "shader-packs" },
  { icon: HardDriveIcon, label: "Worlds", value: "worlds" },
  { icon: FileTextIcon, label: "Logs", value: "logs" },
  { icon: Settings2Icon, label: "Settings", value: "settings" },
  { icon: ServerIcon, label: "Servers", value: "servers" },
  { icon: CameraIcon, label: "Screenshots", value: "screenshots" },
  { icon: ZapIcon, label: "Versions", value: "versions" },
];

export const PRIMARY_INSTANCE_TAB_VALUES: Array<InstanceTabValue> = [
  "mods",
  "modpack",
  "resource-packs",
  "shader-packs",
  "worlds",
  "logs",
  "settings",
];

export const MOD_STATUS_FILTERS: Array<{
  label: string;
  value: ModStatusFilter;
}> = [
  { label: "All mods", value: "all" },
  { label: "Enabled", value: "enabled" },
  { label: "Disabled", value: "disabled" },
];

export const MOD_SORT_OPTIONS: Array<{ label: string; value: ModSortField }> = [
  { label: "Name", value: "name" },
  { label: "Recently modified", value: "modified" },
  { label: "Size", value: "size" },
];
