import { Link } from "@tanstack/react-router";
import { InstanceIcon } from "@/views/main/features/instances/components/instance-artwork";
import type { InstanceQuickPlayItemProps } from "@/views/main/features/instances/components/instance-card-types";
import { LOADER_LABELS } from "@/views/main/features/instances/components/instance-format";
import { InstancePlayButton } from "@/views/main/features/instances/components/instance-play-button";
import { cn } from "@/views/main/lib/utils";

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
          <div className="mt-0.5 truncate text-[11px] text-muted-foreground leading-none">
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
