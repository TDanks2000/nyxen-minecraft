import {
  ArchiveIcon,
  CameraIcon,
  FileTextIcon,
  GaugeIcon,
  HardDriveIcon,
  PuzzleIcon,
  ServerIcon,
} from "lucide-react";
import type { InstanceFileEntry } from "@/shared/types";

export function InstanceCatalogFileIcon({
  entry,
}: {
  entry: InstanceFileEntry;
}) {
  const Icon =
    entry.kind === "screenshot"
      ? CameraIcon
      : entry.kind === "log"
        ? FileTextIcon
        : entry.kind === "serverList"
          ? ServerIcon
          : entry.kind === "shaderPack"
            ? GaugeIcon
            : entry.kind === "resourcePack"
              ? ArchiveIcon
              : entry.kind === "world"
                ? HardDriveIcon
                : PuzzleIcon;

  return (
    <div className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-muted/30 text-primary">
      <Icon className="size-4" />
    </div>
  );
}
