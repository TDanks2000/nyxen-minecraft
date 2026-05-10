import { Link } from "@tanstack/react-router";
import {
  InfoIcon,
  Loader2Icon,
  MoreHorizontalIcon,
  PackageIcon,
  PlayIcon,
} from "lucide-react";
import type { DownloadQueueJob, LauncherInstance } from "@/shared/types";
import { Badge } from "@/views/main/components/ui/badge";
import { Button } from "@/views/main/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/views/main/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/views/main/components/ui/dropdown-menu";
import { Progress } from "@/views/main/components/ui/progress";
import { cn } from "@/views/main/lib/utils";
import { InstanceArtwork, InstanceIcon } from "./instance-artwork";
import { formatInstanceLastPlayed, LOADER_LABELS } from "./instance-format";

const getInstallProgress = (job: DownloadQueueJob): number =>
  Math.max(0, Math.min(100, job.progress ?? 0));

const getCompletedInstallItems = (job: DownloadQueueJob): number =>
  job.items.filter(
    (item) => item.status === "completed" || item.status === "skipped",
  ).length;

type InstanceActionProps = {
  instance: LauncherInstance;
  launchDisabled: boolean;
  launchLoading: boolean;
  onPlay: () => void;
};

function InstancePlayButton({
  className,
  instance,
  launchDisabled,
  launchLoading,
  onPlay,
  size = "icon-sm",
}: InstanceActionProps & {
  className?: string;
  size?: "icon-xs" | "icon-sm";
}) {
  return (
    <Button
      aria-label={`Prepare launch for ${instance.name}`}
      className={cn(launchLoading && "cursor-wait", className)}
      disabled={launchDisabled}
      onClick={onPlay}
      size={size}
    >
      {launchLoading ? (
        <Loader2Icon className="animate-spin" />
      ) : (
        <PlayIcon className="fill-current" />
      )}
    </Button>
  );
}

export function InstanceActionMenu({
  instance,
  launchDisabled,
  onPlay,
}: Omit<InstanceActionProps, "launchLoading">) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            aria-label={`Open actions for ${instance.name}`}
            size="icon-sm"
            variant="ghost"
          />
        }
      >
        <MoreHorizontalIcon />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuGroup>
          <DropdownMenuItem disabled={launchDisabled} onClick={onPlay}>
            <PlayIcon />
            Prepare launch
          </DropdownMenuItem>
          <DropdownMenuItem
            render={
              <Link
                params={{ instanceId: instance.id }}
                to="/instances/$instanceId"
              />
            }
          >
            <InfoIcon />
            View details
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export type InstanceCardDensity = "compact" | "standard";

type InstanceCardProps = InstanceActionProps & {
  className?: string;
  density?: InstanceCardDensity;
  featured?: boolean;
};

type InstallingInstanceCardProps = {
  className?: string;
  installJob: DownloadQueueJob;
};

type InstanceCardRenderProps = InstanceCardProps | InstallingInstanceCardProps;

function InstallingInstanceCard({
  className,
  installJob: job,
}: InstallingInstanceCardProps) {
  const progress = getInstallProgress(job);
  const totalItems = Math.max(1, job.totalItems, job.items.length);
  const completedItems = getCompletedInstallItems(job);
  const imageUrl =
    job.metadata.kind === "curseForgeFile" ? job.metadata.imageUrl : null;

  return (
    <Card
      className={cn(
        "group pt-0 ring-1 ring-primary/20 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_24px_72px_-48px_black]",
        className,
      )}
    >
      <div className="relative h-36 overflow-hidden bg-muted">
        {imageUrl ? (
          <img
            alt=""
            className="size-full object-cover opacity-80 blur-[1px] transition-transform duration-500 group-hover:scale-[1.03]"
            src={imageUrl}
          />
        ) : (
          <div className="flex size-full items-center justify-center bg-primary/10 text-primary">
            <PackageIcon className="size-10" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/45 to-transparent" />
        <Badge className="absolute top-3 left-3 gap-1.5">
          <Loader2Icon className="animate-spin" data-icon="inline-start" />
          Installing
        </Badge>
      </div>
      <CardHeader className="min-w-0 gap-1.5">
        <CardTitle className="truncate">{job.title}</CardTitle>
        <CardDescription className="truncate">
          {job.activeLabel ?? job.subtitle}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between gap-3 text-xs">
          <span className="truncate text-muted-foreground">
            {job.status === "queued" ? "Queued" : "Downloading"}
          </span>
          <span className="shrink-0 font-medium tabular-nums">
            {Math.round(progress)}%
          </span>
        </div>
        <Progress
          aria-label={`${job.title} install progress`}
          className="mt-2 [&_[data-slot=progress-track]]:h-2"
          value={progress}
        />
      </CardContent>
      <CardFooter className="justify-between gap-2">
        <Badge variant="secondary">CurseForge</Badge>
        <span className="text-muted-foreground text-xs tabular-nums">
          {completedItems}/{totalItems} files
        </span>
      </CardFooter>
    </Card>
  );
}

export function InstanceCard(props: InstanceCardRenderProps) {
  if ("installJob" in props) {
    return <InstallingInstanceCard {...props} />;
  }

  const {
    className,
    density = "standard",
    featured = false,
    instance,
    launchDisabled,
    launchLoading,
    onPlay,
  } = props;
  const compact = density === "compact";

  return (
    <Card
      className={cn(
        "group pt-0 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_24px_72px_-48px_black] data-[size=sm]:pt-0",
        featured && "border-primary/60 ring-1 ring-primary/30",
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
          className="h-full transition-transform duration-500 group-hover:scale-[1.03]"
          instance={instance}
          showBadge={!compact}
        />
        {featured ? (
          <div className="pointer-events-none absolute inset-0 rounded-t-[inherit] ring-2 ring-primary/50 ring-inset" />
        ) : null}
      </Link>

      <CardHeader className={cn("min-w-0", compact && "gap-1")}>
        <CardTitle
          className={cn("truncate", compact && "text-xs leading-none")}
        >
          {instance.name}
        </CardTitle>
        <CardDescription className={cn("truncate", compact && "text-[0.6rem]")}>
          Minecraft {instance.versionId} · {LOADER_LABELS[instance.loader]}
        </CardDescription>
      </CardHeader>

      <CardContent className={cn(compact && "hidden")}>
        <p className="text-muted-foreground text-xs">
          {formatInstanceLastPlayed(instance.lastLaunchedAt, { prefix: true })}
        </p>
      </CardContent>

      <CardFooter className="justify-between gap-2">
        {compact ? (
          <span className="min-w-0 truncate text-[0.58rem] text-muted-foreground/70">
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
            launchDisabled={launchDisabled}
            onPlay={onPlay}
          />
          <InstancePlayButton
            instance={instance}
            launchDisabled={launchDisabled}
            launchLoading={launchLoading}
            onPlay={onPlay}
            size={compact ? "icon-xs" : "icon-sm"}
          />
        </div>
      </CardFooter>
    </Card>
  );
}

type InstanceListItemProps = InstanceActionProps & {
  className?: string;
  featured?: boolean;
};

export function InstanceListItem({
  className,
  featured = false,
  instance,
  launchDisabled,
  launchLoading,
  onPlay,
}: InstanceListItemProps) {
  return (
    <div
      className={cn(
        "flex min-h-12 items-center gap-3 rounded-md border bg-card px-3 py-2 transition-colors hover:bg-accent/40",
        featured && "border-primary/40 bg-primary/5",
        !featured && "border-border",
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
          Minecraft {instance.versionId} · {LOADER_LABELS[instance.loader]}
        </div>
      </Link>
      <span className="hidden shrink-0 text-[0.58rem] text-muted-foreground/70 sm:block">
        {formatInstanceLastPlayed(instance.lastLaunchedAt)}
      </span>
      <InstanceActionMenu
        instance={instance}
        launchDisabled={launchDisabled}
        onPlay={onPlay}
      />
      <InstancePlayButton
        instance={instance}
        launchDisabled={launchDisabled}
        launchLoading={launchLoading}
        onPlay={onPlay}
        size="icon-xs"
      />
    </div>
  );
}

type InstanceQuickPlayItemProps = InstanceActionProps & {
  className?: string;
};

export function InstanceQuickPlayItem({
  className,
  instance,
  launchDisabled,
  launchLoading,
  onPlay,
}: InstanceQuickPlayItemProps) {
  return (
    <div
      className={cn(
        "group flex h-10 items-center gap-2 rounded-md px-2 transition-colors hover:bg-sidebar-accent",
        className,
      )}
    >
      <Link
        className="flex min-w-0 flex-1 items-center gap-2 no-underline"
        params={{ instanceId: instance.id }}
        to="/instances/$instanceId"
      >
        <InstanceIcon instance={instance} className="size-8 rounded-sm" />
        <div className="min-w-0 flex-1">
          <div className="truncate font-semibold text-sidebar-foreground text-xs leading-none">
            {instance.name}
          </div>
          <div className="mt-0.5 truncate text-[0.62rem] text-muted-foreground leading-none">
            Minecraft {instance.versionId} · {LOADER_LABELS[instance.loader]}
          </div>
        </div>
      </Link>
      <InstancePlayButton
        className="opacity-45 transition-opacity group-hover:opacity-100"
        instance={instance}
        launchDisabled={launchDisabled}
        launchLoading={launchLoading}
        onPlay={onPlay}
        size="icon-xs"
      />
    </div>
  );
}
