import { Link } from "@tanstack/react-router";
import { BoxesIcon, InfoIcon, PlayIcon, PlusIcon } from "lucide-react";
import type { LauncherInstance } from "@/shared/types";
import { Badge } from "@/views/main/components/ui/badge";
import { Button, buttonVariants } from "@/views/main/components/ui/button";
import { Skeleton } from "@/views/main/components/ui/skeleton";
import {
  InstanceArtwork,
  InstanceIcon,
} from "@/views/main/features/instances/components/instance-artwork";
import {
  formatInstanceLastPlayed,
  LOADER_LABELS,
} from "@/views/main/features/instances/components/instance-format";

type FeaturedInstancePanelProps = {
  instance: LauncherInstance | null;
  loading: boolean;
  onCreateInstance: () => void;
  onPlayInstance: (instanceId: string) => void;
};

export function FeaturedInstancePanel({
  instance,
  loading,
  onCreateInstance,
  onPlayInstance,
}: FeaturedInstancePanelProps) {
  if (loading) {
    return <Skeleton className="h-56 w-full rounded-xl" />;
  }

  if (!instance) {
    return (
      <div className="flex min-h-52 flex-col items-center justify-center gap-4 rounded-xl border border-dashed bg-muted/10 p-8 text-center">
        <BoxesIcon className="size-10 text-muted-foreground/30" />
        <div>
          <p className="font-semibold">No instances yet</p>
          <p className="mt-1 text-muted-foreground text-sm">
            Create a Minecraft instance to get started.
          </p>
        </div>
        <Button onClick={onCreateInstance}>
          <PlusIcon data-icon="inline-start" />
          New Instance
        </Button>
      </div>
    );
  }

  return (
    <div className="group relative min-h-52 overflow-hidden rounded-xl border border-border/60 bg-background shadow-[0_20px_80px_-50px_black]">
      <InstanceArtwork
        className="absolute inset-0 h-full opacity-90 transition-transform duration-700 group-hover:scale-[1.03]"
        instance={instance}
        showBadge={false}
        variant="hero"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-background via-background/82 to-background/10" />
      <div className="relative flex min-h-52 flex-col justify-between gap-8 p-5">
        <div className="flex items-center gap-2">
          <InstanceIcon instance={instance} className="size-8 rounded-md" />
          <Badge variant="secondary">{LOADER_LABELS[instance.loader]}</Badge>
          <span className="text-muted-foreground text-xs">
            Minecraft {instance.versionId}
          </span>
        </div>
        <div>
          <h2 className="text-balance font-heading font-black text-3xl leading-none sm:text-4xl">
            {instance.name}
          </h2>
          <p className="mt-2 text-muted-foreground text-sm">
            {formatInstanceLastPlayed(instance.lastLaunchedAt, {
              prefix: true,
            })}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button onClick={() => onPlayInstance(instance.id)}>
              <PlayIcon className="fill-current" data-icon="inline-start" />
              Play
            </Button>
            <Link
              className={buttonVariants({ variant: "outline" })}
              params={{ instanceId: instance.id }}
              to="/instances/$instanceId"
            >
              <InfoIcon data-icon="inline-start" />
              View Instance
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
