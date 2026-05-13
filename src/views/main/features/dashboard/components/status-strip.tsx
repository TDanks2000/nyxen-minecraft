import {
  ActivityIcon,
  BoxesIcon,
  CheckCircle2Icon,
  CpuIcon,
  DatabaseIcon,
  RefreshCwIcon,
} from "lucide-react";
import type { ElementType } from "react";
import type { LauncherStatus } from "@/shared/types";
import { Badge } from "@/views/main/components/ui/badge";
import { Button } from "@/views/main/components/ui/button";
import { Skeleton } from "@/views/main/components/ui/skeleton";

type StatusStripProps = {
  error: string | null;
  onRefresh: () => void;
  status: LauncherStatus | null;
  loading: boolean;
};

type StatusItem = {
  detail: string;
  icon: ElementType;
  id: string;
  label: string;
  ready: boolean | null;
  value: string;
};

const formatRefreshedAt = (value: string | null | undefined): string => {
  if (!value) return "Manifest has not been refreshed";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Refresh time unavailable";

  return `Refreshed ${new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date)}`;
};

const getPathTail = (path: string | null | undefined): string => {
  if (!path) return "Storage pending";

  const segments = path.replaceAll("\\", "/").split("/").filter(Boolean);
  return segments.at(-1) ?? path;
};

export function StatusStrip({
  error,
  loading,
  onRefresh,
  status,
}: StatusStripProps) {
  const readyCapabilities =
    status?.capabilities.filter((capability) => capability.ready).length ?? 0;
  const totalCapabilities = status?.capabilities.length ?? 0;
  const unavailableCapabilities =
    status?.capabilities
      .filter((capability) => !capability.ready)
      .map((capability) => capability.title) ?? [];
  const stats: Array<StatusItem> = [
    {
      id: "instances",
      icon: BoxesIcon,
      label: "Library",
      value: status
        ? `${status.counts.instances} instance${
            status.counts.instances === 1 ? "" : "s"
          }`
        : "Pending",
      detail: status
        ? `${status.counts.profiles} saved profile${
            status.counts.profiles === 1 ? "" : "s"
          }`
        : "Waiting for launcher data",
      ready: status ? true : null,
    },
    {
      id: "health",
      icon: CheckCircle2Icon,
      label: "Launcher Health",
      value: status
        ? `${readyCapabilities}/${totalCapabilities} ready`
        : "Pending",
      detail:
        unavailableCapabilities.length > 0
          ? unavailableCapabilities.join(", ")
          : "Core launch services are available",
      ready: status ? unavailableCapabilities.length === 0 : null,
    },
    {
      id: "versions",
      icon: DatabaseIcon,
      label: "Version Cache",
      value: status ? `${status.counts.versions} versions` : "Pending",
      detail: status?.manifest.latestRelease
        ? `Latest release ${status.manifest.latestRelease}`
        : "Refresh Minecraft versions before creating instances",
      ready: status ? status.counts.versions > 0 : null,
    },
    {
      id: "storage",
      icon: CpuIcon,
      label: "Storage Root",
      value: getPathTail(status?.directories.root),
      detail: status?.directories.root ?? "Launcher storage is loading",
      ready: status ? true : null,
    },
  ];

  return (
    <section className="border-b border-border bg-card/60">
      {error ? (
        <div className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-sm">Launcher status unavailable</p>
            <p className="mt-0.5 truncate text-muted-foreground text-xs">
              {error}
            </p>
          </div>
          <Button onClick={onRefresh} size="sm" variant="outline">
            <RefreshCwIcon data-icon="inline-start" />
            Retry
          </Button>
        </div>
      ) : null}

      <div className="flex items-stretch divide-x divide-border overflow-x-auto">
        {stats.map((stat) => {
          const Icon = stat.icon;
          const badgeVariant =
            stat.ready === null
              ? "outline"
              : stat.ready
                ? "secondary"
                : "destructive";

          return (
            <div
              key={stat.id}
              className="flex min-w-48 shrink-0 items-start gap-3 px-4 py-3"
            >
              <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-background/70 text-primary">
                <Icon className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="truncate text-[0.58rem] text-muted-foreground uppercase tracking-wide">
                    {stat.label}
                  </span>
                  {!loading ? (
                    <Badge className="ml-auto" variant={badgeVariant}>
                      {stat.ready === null
                        ? "Pending"
                        : stat.ready
                          ? "OK"
                          : "Setup"}
                    </Badge>
                  ) : null}
                </div>
                <div className="mt-1 font-bold text-foreground text-xs">
                  {loading ? <Skeleton className="h-3 w-20" /> : stat.value}
                </div>
                <div
                  className="mt-1 max-w-56 truncate text-[0.62rem] text-muted-foreground"
                  title={stat.detail}
                >
                  {loading ? <Skeleton className="h-2.5 w-28" /> : stat.detail}
                </div>
              </div>
            </div>
          );
        })}

        <div className="flex min-w-56 shrink-0 items-start gap-3 px-4 py-3">
          <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-background/70 text-primary">
            <ActivityIcon className="size-4" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[0.58rem] text-muted-foreground uppercase tracking-wide">
              Manifest
            </span>
            <div className="mt-1 font-bold text-foreground text-xs">
              {loading ? (
                <Skeleton className="h-3 w-20" />
              ) : (
                (status?.manifest.latestSnapshot ?? "No snapshot cached")
              )}
            </div>
            <div
              className="mt-1 max-w-48 truncate text-[0.62rem] text-muted-foreground"
              title={formatRefreshedAt(status?.manifest.refreshedAt)}
            >
              {loading ? (
                <Skeleton className="h-2.5 w-28" />
              ) : (
                formatRefreshedAt(status?.manifest.refreshedAt)
              )}
            </div>
          </div>
          <Button
            aria-label="Refresh launcher status"
            disabled={loading}
            onClick={onRefresh}
            size="icon-xs"
            type="button"
            variant="ghost"
          >
            <RefreshCwIcon className={loading ? "animate-spin" : undefined} />
          </Button>
        </div>
      </div>
    </section>
  );
}
