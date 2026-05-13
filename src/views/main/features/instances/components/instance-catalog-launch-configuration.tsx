import {
  HammerIcon,
  HardDriveIcon,
  SlidersHorizontalIcon,
  TerminalSquareIcon,
} from "lucide-react";
import type { LauncherInstance } from "@/shared/types";
import { Button } from "@/views/main/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/views/main/components/ui/card";
import { openInstancePath } from "@/views/main/features/instances/components/instance-content-format";

export function InstanceCatalogLaunchConfiguration({
  instance,
}: {
  instance: LauncherInstance;
}) {
  const rows = [
    {
      icon: HardDriveIcon,
      label: "Memory",
      value: `${instance.memoryMinMb} / ${instance.memoryMaxMb} MB`,
    },
    {
      icon: HammerIcon,
      label: "Java",
      value: instance.javaExecutable ? "Custom Java" : "Managed Java",
    },
    {
      icon: TerminalSquareIcon,
      label: "Arguments",
      value: `${instance.javaArgs.length + instance.gameArgs.length} custom args`,
    },
  ];

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>Launch Configuration</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {rows.map((row) => {
          const Icon = row.icon;

          return (
            <div className="flex items-center gap-2 text-xs" key={row.label}>
              <Icon className="size-3.5 shrink-0 text-muted-foreground" />
              <span className="min-w-20 text-muted-foreground">
                {row.label}
              </span>
              <span className="ml-auto truncate font-semibold">
                {row.value}
              </span>
            </div>
          );
        })}
        <Button
          className="mt-2 w-full"
          onClick={() => openInstancePath(instance.metadataPath)}
          size="sm"
          variant="outline"
        >
          <SlidersHorizontalIcon data-icon="inline-start" />
          Open Metadata
        </Button>
      </CardContent>
    </Card>
  );
}
