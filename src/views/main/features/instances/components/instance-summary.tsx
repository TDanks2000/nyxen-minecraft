import type { ElementType } from "react";
import {
  CpuIcon,
  DatabaseIcon,
  FolderIcon,
  MemoryStickIcon,
  PuzzleIcon,
  ShieldCheckIcon,
} from "lucide-react";
import type { LauncherInstance } from "@/shared/types";

type InstanceSummaryProps = {
  enabledModsCount: number;
  instance: LauncherInstance;
};

function formatMemory(mb: number): string {
  return mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${mb} MB`;
}

function StatTile({
  icon: Icon,
  label,
  value,
}: {
  icon: ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="size-3.5 shrink-0 text-primary" />
        {label}
      </div>
      <div className="mt-2 truncate font-heading text-xl font-black leading-none">
        {value}
      </div>
    </div>
  );
}

function PathEntry({
  icon: Icon,
  label,
  value,
}: {
  icon: ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1.5 text-[0.62rem] font-semibold uppercase tracking-widest text-muted-foreground">
        <Icon className="size-3 shrink-0 text-primary" />
        {label}
      </div>
      <div className="mt-1.5 truncate font-mono text-xs text-foreground/70">
        {value}
      </div>
    </div>
  );
}

export function InstanceSummary({
  enabledModsCount,
  instance,
}: InstanceSummaryProps) {
  return (
    <section className="flex flex-col gap-3">
      {/* Stat strip */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatTile
          icon={MemoryStickIcon}
          label="Memory"
          value={`${formatMemory(instance.memoryMinMb)} – ${formatMemory(instance.memoryMaxMb)}`}
        />
        <StatTile
          icon={CpuIcon}
          label="Java"
          value={instance.javaExecutable ? "Custom" : "Managed"}
        />
        <StatTile
          icon={PuzzleIcon}
          label="Mods"
          value={`${enabledModsCount} enabled`}
        />
        <StatTile
          icon={ShieldCheckIcon}
          label="Profile"
          value={instance.profileId ? "Linked" : "Offline"}
        />
      </div>

      {/* Paths */}
      <div className="rounded-lg border border-border/60 bg-muted/10 px-4 py-3">
        <div className="grid gap-4 sm:grid-cols-3">
          <PathEntry
            icon={DatabaseIcon}
            label="Instance root"
            value={instance.instanceDirectory}
          />
          <PathEntry
            icon={FolderIcon}
            label="Game directory"
            value={instance.gameDirectory}
          />
          <PathEntry
            icon={FolderIcon}
            label="Metadata"
            value={instance.metadataPath}
          />
        </div>
      </div>
    </section>
  );
}
