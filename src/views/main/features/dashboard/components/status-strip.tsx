import {
  BoxesIcon,
  CheckCircle2Icon,
  CloudIcon,
  CpuIcon,
  StarIcon,
} from "lucide-react";
import type { ElementType } from "react";
import type { LauncherStatus } from "@/shared/types";
import { Skeleton } from "@/views/main/components/ui/skeleton";

type StatusStripProps = {
  status: LauncherStatus | null;
  loading: boolean;
};

type StatusItem = {
  icon: ElementType;
  id: string;
  label: string;
  value: string;
};

const getCapability = (
  status: LauncherStatus | null,
  id: string,
): LauncherStatus["capabilities"][number] | null =>
  status?.capabilities.find((capability) => capability.id === id) ?? null;

export function StatusStrip({ status, loading }: StatusStripProps) {
  const microsoftAuth = getCapability(status, "microsoft-auth");
  const curseForgeApi = getCapability(status, "curseforge-api");
  const stats: Array<StatusItem> = [
    {
      id: "instances",
      icon: BoxesIcon,
      label: "Instances",
      value: status ? String(status.counts.instances) : "Pending",
    },
    {
      id: "profiles",
      icon: StarIcon,
      label: "Profiles",
      value: status ? String(status.counts.profiles) : "Pending",
    },
    {
      id: "versions",
      icon: CheckCircle2Icon,
      label: "Versions cached",
      value: status ? String(status.counts.versions) : "Pending",
    },
    {
      id: "release",
      icon: CheckCircle2Icon,
      label: "Latest release",
      value: status?.manifest.latestRelease ?? "Not cached",
    },
    {
      id: "microsoft-auth",
      icon: CpuIcon,
      label: "Microsoft auth",
      value: microsoftAuth?.ready ? "Ready" : "Needs setup",
    },
    {
      id: "curseforge-api",
      icon: CloudIcon,
      label: "CurseForge",
      value: curseForgeApi?.ready ? "Connected" : "Not configured",
    },
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
