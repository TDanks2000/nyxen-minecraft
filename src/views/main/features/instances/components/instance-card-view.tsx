import { Link } from "@tanstack/react-router";
import { Loader2Icon } from "lucide-react";
import { Badge } from "@/views/main/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/views/main/components/ui/card";
import { Progress } from "@/views/main/components/ui/progress";
import { InstallingInstanceCard } from "@/views/main/features/instances/components/installing-instance-card";
import { InstanceActionMenu } from "@/views/main/features/instances/components/instance-action-menu";
import { InstanceArtwork } from "@/views/main/features/instances/components/instance-artwork";
import type { InstanceCardRenderProps } from "@/views/main/features/instances/components/instance-card-types";
import {
  formatInstanceLastPlayed,
  LOADER_LABELS,
} from "@/views/main/features/instances/components/instance-format";
import {
  getCompletedInstallItems,
  getDownloadSourceLabel,
  getInstallProgress,
} from "@/views/main/features/instances/components/instance-install-progress";
import { InstancePlayButton } from "@/views/main/features/instances/components/instance-play-button";
import { cn } from "@/views/main/lib/utils";

export function InstanceCard(props: InstanceCardRenderProps) {
  if (!("instance" in props)) {
    return <InstallingInstanceCard {...props} />;
  }

  const {
    animationsDisabled = false,
    className,
    density = "standard",
    featured = false,
    instance,
    installJob,
    launchDisabled,
    launchLoading,
    onPlay,
  } = props;
  const compact = density === "compact";
  const installing = Boolean(installJob);
  const installProgress = installJob ? getInstallProgress(installJob) : 0;
  const totalInstallItems = installJob
    ? Math.max(1, installJob.totalItems, installJob.items.length)
    : 0;
  const completedInstallItems = installJob
    ? getCompletedInstallItems(installJob)
    : 0;
  const installStatusLabel =
    installJob?.status === "queued" ? "Queued" : "Installing";
  const installDetail =
    installJob?.activeLabel ??
    installJob?.subtitle ??
    `${totalInstallItems} file${totalInstallItems === 1 ? "" : "s"}`;

  return (
    <Card
      className={cn(
        "group pt-0 data-[size=sm]:pt-0",
        animationsDisabled
          ? "transition-colors"
          : "transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_24px_72px_-48px_black]",
        featured && "border-primary/60 ring-1 ring-primary/30",
        installing && "ring-1 ring-primary/30",
        className,
      )}
      size={compact ? "sm" : "default"}
    >
      <Link
        className={cn("relative block", compact ? "h-28" : "h-36")}
        params={{ instanceId: instance.id }}
        to="/instances/$instanceId"
      >
        <InstanceArtwork
          className={cn(
            "h-full",
            !animationsDisabled &&
              "transition-transform duration-300 group-hover:scale-[1.03]",
          )}
          instance={instance}
          showBadge={!compact}
        />
        {featured ? (
          <div className="pointer-events-none absolute inset-0 rounded-t-[inherit] ring-2 ring-primary/50 ring-inset" />
        ) : null}
        {installing ? (
          <Badge className="absolute top-3 left-3 gap-1.5">
            <Loader2Icon className="animate-spin" data-icon="inline-start" />
            {installStatusLabel}
          </Badge>
        ) : null}
      </Link>

      <CardHeader className={cn("min-w-0", compact && "gap-1")}>
        <CardTitle
          className={cn("truncate", compact && "text-xs leading-none")}
        >
          {instance.name}
        </CardTitle>
        <CardDescription className={cn("truncate", compact && "text-[11px]")}>
          Minecraft {instance.versionId} · {LOADER_LABELS[instance.loader]}
        </CardDescription>
      </CardHeader>

      <CardContent className={cn(compact && !installing && "hidden")}>
        {installing ? (
          <div>
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="truncate text-muted-foreground">
                {installDetail}
              </span>
              <span className="shrink-0 font-medium tabular-nums">
                {Math.round(installProgress)}%
              </span>
            </div>
            <Progress
              aria-label={`${instance.name} install progress`}
              className="mt-2 [&_[data-slot=progress-track]]:h-2"
              value={installProgress}
            />
          </div>
        ) : (
          <p className="text-muted-foreground text-xs">
            {formatInstanceLastPlayed(instance.lastLaunchedAt, {
              prefix: true,
            })}
          </p>
        )}
      </CardContent>

      <CardFooter className="justify-between gap-2">
        {installing ? (
          <div className="flex min-w-0 items-center gap-2">
            <Badge variant="secondary">
              {installJob ? getDownloadSourceLabel(installJob) : "Download"}
            </Badge>
            <span className="truncate text-muted-foreground text-xs tabular-nums">
              {completedInstallItems}/{totalInstallItems} files
            </span>
          </div>
        ) : compact ? (
          <span className="min-w-0 truncate text-[11px] text-muted-foreground">
            {formatInstanceLastPlayed(instance.lastLaunchedAt)}
          </span>
        ) : (
          <Badge variant={instance.profileId ? "secondary" : "outline"}>
            {instance.profileId ? "Profile linked" : "Auto profile"}
          </Badge>
        )}
        <div className="flex shrink-0 items-center gap-1.5">
          <InstanceActionMenu
            instance={instance}
            launchDisabled={launchDisabled || installing}
            onPlay={onPlay}
          />
          <InstancePlayButton
            instance={instance}
            launchDisabled={launchDisabled || installing}
            launchLoading={launchLoading}
            onPlay={onPlay}
            size={compact ? "icon-xs" : "icon-sm"}
          />
        </div>
      </CardFooter>
    </Card>
  );
}
