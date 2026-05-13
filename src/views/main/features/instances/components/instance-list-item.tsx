import { Link } from "@tanstack/react-router";
import { Progress } from "@/views/main/components/ui/progress";
import { InstanceActionMenu } from "@/views/main/features/instances/components/instance-action-menu";
import { InstanceIcon } from "@/views/main/features/instances/components/instance-artwork";
import type { InstanceListItemProps } from "@/views/main/features/instances/components/instance-card-types";
import {
  formatInstanceLastPlayed,
  LOADER_LABELS,
} from "@/views/main/features/instances/components/instance-format";
import { getInstallProgress } from "@/views/main/features/instances/components/instance-install-progress";
import { InstancePlayButton } from "@/views/main/features/instances/components/instance-play-button";
import { cn } from "@/views/main/lib/utils";

export function InstanceListItem({
  className,
  featured = false,
  installJob,
  instance,
  launchDisabled,
  launchLoading,
  onPlay,
}: InstanceListItemProps) {
  const installing = Boolean(installJob);
  const installProgress = installJob ? getInstallProgress(installJob) : 0;
  const installDetail =
    installJob?.activeLabel ?? installJob?.subtitle ?? "Installing content";

  return (
    <div
      className={cn(
        "flex min-h-12 items-center gap-3 rounded-md border bg-card px-3 py-2 transition-colors hover:bg-accent/40",
        featured && "border-primary/40 bg-primary/5",
        !featured && !installing && "border-border",
        installing && "border-primary/35 bg-primary/5 hover:bg-primary/10",
        className,
      )}
    >
      <InstanceIcon instance={instance} className="size-8 rounded-sm" />
      <Link
        className="min-w-0 flex-1"
        params={{ instanceId: instance.id }}
        to="/instances/$instanceId"
      >
        <div className="truncate font-semibold text-foreground text-xs">
          {instance.name}
        </div>
        <div className="truncate text-[0.6rem] text-muted-foreground">
          {installing
            ? installDetail
            : `Minecraft ${instance.versionId} · ${LOADER_LABELS[instance.loader]}`}
        </div>
        {installing ? (
          <Progress
            aria-label={`${instance.name} install progress`}
            className="mt-1.5 [&_[data-slot=progress-track]]:h-1.5"
            value={installProgress}
          />
        ) : null}
      </Link>
      <span className="hidden shrink-0 text-[0.58rem] text-muted-foreground/70 sm:block">
        {installing
          ? `${Math.round(installProgress)}%`
          : formatInstanceLastPlayed(instance.lastLaunchedAt)}
      </span>
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
        size="icon-xs"
      />
    </div>
  );
}
