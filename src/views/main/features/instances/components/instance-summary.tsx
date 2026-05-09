import { formatDistanceToNow } from "date-fns";
import {
  CpuIcon,
  HardDriveIcon,
  MemoryStickIcon,
  PackageCheckIcon,
  PuzzleIcon,
  ServerIcon,
  Settings2Icon,
  ShieldIcon,
} from "lucide-react";
import type { ElementType } from "react";
import type { LauncherInstance } from "@/shared/types";
import { Badge } from "@/views/main/components/ui/badge";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/views/main/components/ui/card";
import { cn } from "@/views/main/lib/utils";

const INSTANCE_BLOCKS = Array.from(
  { length: 30 },
  (_, index) => `instance-info-block-${index}`,
);

type InstanceSummaryProps = {
  enabledModsCount: number;
  instance: LauncherInstance;
  onlineServersCount: number;
};

function InstanceArtwork({ instance }: { instance: LauncherInstance }) {
  const toneByLoader: Record<LauncherInstance["loader"], string> = {
    fabric: "from-indigo-900 via-primary/30 to-background",
    forge: "from-amber-900 via-primary/20 to-background",
    neoforge: "from-orange-900 via-primary/20 to-background",
    quilt: "from-violet-900 via-secondary/40 to-background",
    vanilla: "from-emerald-900 via-primary/30 to-background",
  };

  return (
    <div
      className={cn(
        "relative h-56 overflow-hidden bg-linear-to-br",
        toneByLoader[instance.loader],
      )}
      aria-hidden="true"
    >
      <div className="absolute inset-0 bg-[linear-gradient(135deg,color-mix(in_oklch,var(--foreground)_8%,transparent)_0_1px,transparent_1px_20px)]" />
      <div className="absolute right-8 bottom-0 grid grid-cols-5 gap-1.5 opacity-80">
        {INSTANCE_BLOCKS.map((blockId) => (
          <span
            key={blockId}
            className="size-6 rounded-sm bg-background/35 shadow-sm"
          />
        ))}
      </div>
      <div className="absolute inset-x-0 bottom-0 h-24 bg-linear-to-t from-background/85 to-transparent" />
      <div className="absolute bottom-6 left-6">
        <Badge variant="secondary" className="capitalize">
          {instance.loader}
        </Badge>
      </div>
    </div>
  );
}

function InstanceMetric({
  icon: Icon,
  label,
  value,
}: {
  icon: ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-md border border-border/60 bg-muted/20 px-3 py-2">
      <Icon className="size-4 shrink-0 text-primary" />
      <div className="min-w-0">
        <div className="font-medium text-muted-foreground text-xs">{label}</div>
        <div className="truncate font-semibold text-sm">{value}</div>
      </div>
    </div>
  );
}

export function InstanceSummary({
  enabledModsCount,
  instance,
  onlineServersCount,
}: InstanceSummaryProps) {
  const readiness = [
    {
      icon: ShieldIcon,
      label: "Profile validation",
      value: instance.profileId ? "Profile linked" : "Select profile",
    },
    {
      icon: HardDriveIcon,
      label: "Game directory",
      value: "Inside launcher storage",
    },
    {
      icon: Settings2Icon,
      label: "Arguments",
      value: `${instance.javaArgs.length + instance.gameArgs.length} custom`,
    },
    {
      icon: PackageCheckIcon,
      label: "Mod loadout",
      value: `${enabledModsCount} enabled`,
    },
  ];

  return (
    <section className="grid grid-cols-[minmax(0,1fr)_22rem] gap-3 max-xl:grid-cols-1">
      <Card className="pt-0">
        <InstanceArtwork instance={instance} />
        <CardHeader>
          <CardTitle>Launch Profile</CardTitle>
          <CardDescription>
            {instance.versionId} · {instance.loader}
            {instance.loaderVersion ? ` ${instance.loaderVersion}` : ""}
          </CardDescription>
          <CardAction>
            <Badge variant="secondary">
              {instance.lastLaunchedAt
                ? formatDistanceToNow(new Date(instance.lastLaunchedAt), {
                    addSuffix: true,
                  })
                : "Never played"}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-2 max-md:grid-cols-1">
          <InstanceMetric
            icon={MemoryStickIcon}
            label="Memory"
            value={`${instance.memoryMinMb} / ${instance.memoryMaxMb} MB`}
          />
          <InstanceMetric
            icon={CpuIcon}
            label="Java"
            value={instance.javaExecutable ? "Custom" : "System default"}
          />
          <InstanceMetric
            icon={PuzzleIcon}
            label="Enabled Mods"
            value={String(enabledModsCount)}
          />
          <InstanceMetric
            icon={ServerIcon}
            label="Online Servers"
            value={String(onlineServersCount)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Readiness</CardTitle>
          <CardDescription>Local checks before launch.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {readiness.map((item) => {
            const Icon = item.icon;

            return (
              <div
                key={item.label}
                className="flex items-center justify-between gap-3 rounded-md border border-border/60 bg-muted/20 px-3 py-2"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <Icon className="size-4 shrink-0 text-primary" />
                  <span className="truncate font-medium text-sm">
                    {item.label}
                  </span>
                </div>
                <Badge variant="outline">{item.value}</Badge>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </section>
  );
}
