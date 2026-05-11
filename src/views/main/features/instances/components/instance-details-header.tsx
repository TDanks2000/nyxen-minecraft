import { Link } from "@tanstack/react-router";
import {
  ArrowLeftIcon,
  ChevronDownIcon,
  DownloadIcon,
  FileTextIcon,
  FolderOpenIcon,
  HammerIcon,
  Loader2Icon,
  MoreHorizontalIcon,
  PlayIcon,
  RefreshCcwIcon,
  Settings2Icon,
  SquareIcon,
} from "lucide-react";
import type { LauncherInstance, ModLoader } from "@/shared/types";
import { Badge } from "@/views/main/components/ui/badge";
import { Button } from "@/views/main/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/views/main/components/ui/dropdown-menu";
import {
  InstanceArtwork,
  InstanceIcon,
} from "@/views/main/features/instances/components/instance-artwork";
import {
  formatInstanceLastPlayed,
  LOADER_LABELS,
} from "@/views/main/features/instances/components/instance-format";
import { openLocalPath } from "@/views/main/lib/open-local-path";

type InstanceDetailsHeaderProps = {
  enabledModsCount: number;
  instance: LauncherInstance;
  isRunning: boolean;
  launchActionState: LaunchActionState;
  modpackUpdateAvailable: boolean;
  modpackUpdateChecking: boolean;
  onOpenSettings: () => void;
  onPlay: () => void;
  onStop: () => void;
  onUpdateModpack: () => void;
  onViewLaunchPlan: () => void;
  planLoading: boolean;
  resourcePackCount: number;
  shaderPackCount: number;
  updatingModpack: boolean;
  warningCount: number;
};

type LaunchActionState =
  | "idle"
  | "preparing"
  | "downloading"
  | "launching"
  | "stopping";

type LoaderColors = {
  accent: string;
  glow: string;
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

export function InstanceDetailsHeader({
  enabledModsCount,
  instance,
  isRunning,
  launchActionState,
  modpackUpdateAvailable,
  modpackUpdateChecking,
  onOpenSettings,
  onPlay,
  onStop,
  onUpdateModpack,
  onViewLaunchPlan,
  planLoading,
  resourcePackCount,
  shaderPackCount,
  updatingModpack,
  warningCount,
}: InstanceDetailsHeaderProps) {
  const colors = LOADER_COLORS[instance.loader];
  const loaderLabel = LOADER_LABELS[instance.loader];
  const lastPlayed = formatInstanceLastPlayed(instance.lastLaunchedAt);
  const busy = planLoading || launchActionState !== "idle";
  const modpackBusy = modpackUpdateChecking || updatingModpack;
  const primaryDisabled = isRunning ? launchActionState === "stopping" : busy;
  const dropdownDisabled = busy;
  const primaryLabel = isRunning
    ? launchActionState === "stopping"
      ? "Stopping..."
      : "Stop"
    : planLoading || launchActionState === "preparing"
      ? "Preparing..."
      : launchActionState === "downloading"
        ? "Downloading..."
        : launchActionState === "launching"
          ? "Launching..."
          : "Play";
  const showBusyIcon =
    planLoading ||
    launchActionState === "preparing" ||
    launchActionState === "downloading" ||
    launchActionState === "launching" ||
    launchActionState === "stopping";

  const openFolder = () => {
    void openLocalPath(instance.gameDirectory, {
      failureMessage: "Could not open the instance folder.",
    });
  };
  const openMetadata = () => {
    void openLocalPath(instance.metadataPath, {
      failureMessage: "Could not open instance metadata.",
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

      <div className="relative mx-auto grid max-w-[90rem] gap-4 px-4 py-4 sm:px-5 lg:grid-cols-[minmax(0,1fr)_minmax(22rem,30rem)]">
        <div className="flex min-w-0 flex-col justify-between gap-5">
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
              <Badge variant={warningCount > 0 ? "outline" : "default"}>
                {warningCount > 0
                  ? `${warningCount} warning${warningCount === 1 ? "" : "s"}`
                  : "Ready"}
              </Badge>
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
                disabled={primaryDisabled}
                onClick={isRunning ? onStop : onPlay}
                size="lg"
                variant={isRunning ? "destructive" : "default"}
              >
                {showBusyIcon ? (
                  <Loader2Icon
                    data-icon="inline-start"
                    className="animate-spin"
                  />
                ) : isRunning ? (
                  <SquareIcon
                    data-icon="inline-start"
                    className="fill-current"
                  />
                ) : (
                  <PlayIcon data-icon="inline-start" className="fill-current" />
                )}
                {primaryLabel}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger
                  disabled={dropdownDisabled}
                  render={
                    <Button
                      aria-label="Choose launch option"
                      className="rounded-l-none border-l border-primary-foreground/20 px-0"
                      disabled={dropdownDisabled}
                      size="icon-lg"
                      variant={isRunning ? "destructive" : "default"}
                    />
                  }
                >
                  <ChevronDownIcon />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuGroup>
                    <DropdownMenuItem onClick={onViewLaunchPlan}>
                      <FileTextIcon />
                      View launch plan
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <Button
              className="w-full sm:w-auto"
              onClick={onOpenSettings}
              size="lg"
              variant="outline"
            >
              <Settings2Icon data-icon="inline-start" />
              Settings
            </Button>
            {instance.modpack?.locked ? (
              <Button
                className="w-full sm:w-auto"
                disabled={!modpackUpdateAvailable || modpackBusy}
                onClick={onUpdateModpack}
                size="lg"
                title={
                  modpackUpdateAvailable
                    ? undefined
                    : "No modpack update is available."
                }
                variant={modpackUpdateAvailable ? "default" : "outline"}
              >
                {modpackBusy ? (
                  <Loader2Icon
                    className="animate-spin"
                    data-icon="inline-start"
                  />
                ) : (
                  <RefreshCcwIcon data-icon="inline-start" />
                )}
                {updatingModpack
                  ? "Updating..."
                  : modpackUpdateChecking
                    ? "Checking..."
                    : modpackUpdateAvailable
                      ? "Update Modpack"
                      : "Modpack Current"}
              </Button>
            ) : null}
            <Button
              className="w-full sm:w-auto"
              onClick={openFolder}
              size="lg"
              variant="outline"
            >
              <FolderOpenIcon data-icon="inline-start" />
              Folder
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
        </aside>
      </div>
    </section>
  );
}
