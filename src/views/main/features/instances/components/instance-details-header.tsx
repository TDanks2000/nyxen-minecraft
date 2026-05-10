import { Link } from "@tanstack/react-router";
import { formatDistanceToNow } from "date-fns";
import {
  ArrowLeftIcon,
  CheckCircle2Icon,
  ChevronDownIcon,
  Clock3Icon,
  DownloadIcon,
  FolderOpenIcon,
  HammerIcon,
  MoreHorizontalIcon,
  PackageIcon,
  PlayIcon,
  Settings2Icon,
  SparklesIcon,
} from "lucide-react";
import type { LauncherInstance, ModLoader } from "@/shared/types";
import { Badge } from "@/views/main/components/ui/badge";
import { Button } from "@/views/main/components/ui/button";
import {
  InstanceArtwork,
  InstanceIcon,
} from "@/views/main/features/instances/components/instance-artwork";
import { rpc } from "@/views/main/lib/rpc";

type InstanceDetailsHeaderProps = {
  enabledModsCount: number;
  instance: LauncherInstance;
  onOpenSettings: () => void;
  onPlay: () => void;
  planLoading: boolean;
  resourcePackCount: number;
  shaderPackCount: number;
  warningCount: number;
};

type LoaderColors = {
  accent: string;
  glow: string;
};

const LOADER_LABELS: Record<ModLoader, string> = {
  fabric: "Fabric",
  forge: "Forge",
  neoforge: "NeoForge",
  quilt: "Quilt",
  vanilla: "Vanilla",
};

const LOADER_COLORS: Record<ModLoader, LoaderColors> = {
  fabric: {
    accent: "text-primary",
    glow: "from-primary/14 via-primary/4 to-transparent",
  },
  forge: {
    accent: "text-amber-400",
    glow: "from-amber-500/14 via-amber-500/5 to-transparent",
  },
  neoforge: {
    accent: "text-orange-400",
    glow: "from-orange-500/16 via-orange-500/5 to-transparent",
  },
  quilt: {
    accent: "text-violet-300",
    glow: "from-violet-500/14 via-violet-500/5 to-transparent",
  },
  vanilla: {
    accent: "text-emerald-300",
    glow: "from-emerald-500/14 via-emerald-500/5 to-transparent",
  },
};

const formatRelative = (value: string | null): string =>
  value
    ? formatDistanceToNow(new Date(value), { addSuffix: true })
    : "Never played";

export function InstanceDetailsHeader({
  enabledModsCount,
  instance,
  onOpenSettings,
  onPlay,
  planLoading,
  resourcePackCount,
  shaderPackCount,
  warningCount,
}: InstanceDetailsHeaderProps) {
  const colors = LOADER_COLORS[instance.loader];
  const loaderLabel = LOADER_LABELS[instance.loader];
  const lastPlayed = formatRelative(instance.lastLaunchedAt);

  const openFolder = () => {
    void rpc.requestProxy.openExternal({
      url: `file://${instance.gameDirectory}`,
    });
  };
  const openMetadata = () => {
    void rpc.requestProxy.openExternal({
      url: `file://${instance.metadataPath}`,
    });
  };

  return (
    <section className="relative overflow-hidden border-b border-border bg-card/40">
      <div
        className={`pointer-events-none absolute inset-x-0 top-0 h-48 bg-gradient-to-b ${colors.glow}`}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,color-mix(in_oklch,var(--foreground)_7%,transparent)_0_1px,transparent_1px_24px)] opacity-20"
        aria-hidden="true"
      />

      <div className="relative mx-auto grid max-w-[90rem] gap-4 px-4 py-4 sm:px-5 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)] xl:grid-cols-[minmax(0,1fr)_16rem_minmax(24rem,32rem)]">
        <div className="flex min-w-0 flex-col justify-between gap-5 lg:col-span-2 xl:col-span-1">
          <div className="flex flex-col gap-3">
            <Button
              render={<Link to="/instances" />}
              nativeButton={false}
              size="sm"
              variant="ghost"
              className="w-fit text-muted-foreground"
            >
              <ArrowLeftIcon data-icon="inline-start" />
              Back to Instances
            </Button>

            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <InstanceIcon
                instance={instance}
                className="size-9 rounded-md ring-1 ring-border"
              />
              <h1 className="min-w-0 flex-1 basis-56 truncate font-heading text-3xl font-black leading-none tracking-normal text-foreground sm:text-4xl">
                {instance.name}
              </h1>
            </div>

            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground sm:text-sm">
              <span className={`font-semibold ${colors.accent}`}>
                {loaderLabel}
              </span>
              <span className="text-primary">•</span>
              <span>Loader {instance.loaderVersion ?? "managed"}</span>
              <span className="text-primary">•</span>
              <span>Minecraft {instance.versionId}</span>
              <span className="text-primary">•</span>
              <span>Last played: {lastPlayed}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap sm:items-center">
            <div className="flex w-full overflow-hidden rounded-md shadow-[0_18px_50px_-32px_var(--primary)] sm:w-auto">
              <Button
                className="flex-1 rounded-r-none sm:flex-none"
                disabled={planLoading}
                onClick={onPlay}
                size="lg"
              >
                <PlayIcon data-icon="inline-start" className="fill-current" />
                {planLoading ? "Preparing..." : "Play"}
              </Button>
              <Button
                aria-label="Choose launch option"
                disabled={planLoading}
                size="icon-lg"
                className="rounded-l-none border-l border-primary-foreground/20 px-0"
              >
                <ChevronDownIcon />
              </Button>
            </div>

            <Button
              className="w-full sm:w-auto"
              onClick={openFolder}
              size="lg"
              variant="outline"
            >
              <FolderOpenIcon data-icon="inline-start" />
              Open Folder
            </Button>
            <Button
              className="w-full sm:w-auto"
              onClick={onOpenSettings}
              size="lg"
              variant="outline"
            >
              <Settings2Icon data-icon="inline-start" />
              Instance Settings
            </Button>
            <Button
              aria-label="Open instance metadata"
              className="w-full sm:w-9"
              onClick={openMetadata}
              size="icon-lg"
              variant="outline"
            >
              <MoreHorizontalIcon />
            </Button>
          </div>
        </div>

        <div className="flex min-w-0 items-start xl:justify-center">
          <div className="flex h-full w-full flex-col justify-between rounded-lg border border-border bg-card/70 p-4 shadow-[0_24px_70px_-52px_black] backdrop-blur">
            <div className="flex items-start gap-3">
              <CheckCircle2Icon className="mt-1 size-8 shrink-0 text-primary" />
              <div className="min-w-0">
                <div className="font-heading text-lg font-semibold leading-tight">
                  Ready to play
                </div>
                <div className="text-sm text-muted-foreground">
                  {warningCount > 0
                    ? `${warningCount} local warning${warningCount === 1 ? "" : "s"}`
                    : "All systems go!"}
                </div>
              </div>
            </div>
            <Button
              disabled={planLoading}
              onClick={onPlay}
              size="sm"
              variant="outline"
              className="mt-4 w-fit"
            >
              <SparklesIcon data-icon="inline-start" />
              View Launch Report
            </Button>
          </div>
        </div>

        <aside className="min-w-0 overflow-hidden rounded-lg border border-border bg-card/75 p-1 shadow-[0_24px_80px_-58px_black] backdrop-blur">
          <div className="relative overflow-hidden rounded-md">
            <InstanceArtwork
              instance={instance}
              showBadge={false}
              variant="hero"
              className="h-32 min-h-0"
            />
            <div className="absolute top-2 right-2 flex flex-col gap-1.5">
              <Badge className="justify-start bg-background/78 text-foreground shadow-sm backdrop-blur">
                <DownloadIcon />
                {instance.versionId}
              </Badge>
              <Badge className="justify-start bg-background/78 text-foreground shadow-sm backdrop-blur">
                <HammerIcon />
                {loaderLabel.toUpperCase()}
              </Badge>
            </div>
          </div>

          <div className="grid grid-cols-1 divide-y divide-border/70 border-b border-border/70 bg-background/50 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            <div className="min-w-0 px-4 py-3">
              <div className="text-xs text-muted-foreground">Mods</div>
              <div className="mt-1 font-heading text-xl font-black leading-none">
                {enabledModsCount}
              </div>
            </div>
            <div className="min-w-0 px-4 py-3">
              <div className="text-xs text-muted-foreground">
                Resource Packs
              </div>
              <div className="mt-1 font-heading text-xl font-black leading-none">
                {resourcePackCount}
              </div>
            </div>
            <div className="min-w-0 px-4 py-3">
              <div className="text-xs text-muted-foreground">Shader Packs</div>
              <div className="mt-1 font-heading text-xl font-black leading-none">
                {shaderPackCount}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 divide-y divide-border/70 bg-background/45 sm:grid-cols-2 sm:divide-x sm:divide-y-0">
            <div className="min-w-0 px-4 py-3">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <PackageIcon className="size-3.5" />
                Last updated
              </div>
              <div className="mt-1 truncate text-sm font-semibold">
                {formatDistanceToNow(new Date(instance.updatedAt), {
                  addSuffix: true,
                })}
              </div>
            </div>
            <div className="min-w-0 px-4 py-3">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock3Icon className="size-3.5" />
                Last launched
              </div>
              <div className="mt-1 truncate text-sm font-semibold">
                {lastPlayed}
              </div>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
