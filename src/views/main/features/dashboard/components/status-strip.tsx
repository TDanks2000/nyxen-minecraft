import {
  BoxesIcon,
  CheckCircle2Icon,
  CloudIcon,
  CpuIcon,
  GaugeIcon,
  MemoryStickIcon,
  StarIcon,
} from "lucide-react";
import type { ElementType } from "react";
import type { LauncherStatus } from "@/shared/types";
import { Skeleton } from "@/views/main/components/ui/skeleton";

type StatusStripProps = {
  counts: LauncherStatus["counts"] | undefined;
  loading: boolean;
};

type StatusItem = {
  icon: ElementType;
  id: string;
  label: string;
  value: string;
};

export function StatusStrip({ counts, loading }: StatusStripProps) {
  const stats: Array<StatusItem> = [
    {
      id: "instances",
      icon: BoxesIcon,
      label: "Instances",
      value: counts ? String(counts.instances) : "-",
    },
    {
      id: "profiles",
      icon: StarIcon,
      label: "Profiles",
      value: counts ? String(counts.profiles) : "-",
    },
    {
      id: "versions",
      icon: CheckCircle2Icon,
      label: "Versions cached",
      value: counts ? String(counts.versions) : "-",
    },
    { id: "java", icon: CpuIcon, label: "Java", value: "-" },
    { id: "memory", icon: MemoryStickIcon, label: "Memory", value: "-" },
    { id: "perf", icon: GaugeIcon, label: "Performance", value: "-" },
    { id: "sync", icon: CloudIcon, label: "Sync", value: "-" },
  ];

  return (
    <div className="flex items-center divide-x divide-border overflow-x-auto border-b border-border bg-card/60">
      {stats.map((stat) => {
        const Icon = stat.icon;

        return (
          <div
            key={stat.id}
            className="flex shrink-0 items-center gap-2.5 px-4 py-4"
          >
            <Icon className="size-4 shrink-0 text-primary/70" />
            <div className="flex flex-col leading-none">
              <span className="text-[0.58rem] text-muted-foreground uppercase tracking-wide">
                {stat.label}
              </span>
              <span className="mt-0.5 font-bold text-foreground text-xs">
                {loading ? (
                  <Skeleton className="inline-block h-3 w-6" />
                ) : (
                  stat.value
                )}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
