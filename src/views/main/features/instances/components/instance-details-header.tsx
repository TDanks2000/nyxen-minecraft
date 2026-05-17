import { Link } from "@tanstack/react-router";
import {
  ArrowLeftIcon,
  ChevronDownIcon,
  FileArchiveIcon,
  FileTextIcon,
  FolderOpenIcon,
  Loader2Icon,
  MoreHorizontalIcon,
  PlayIcon,
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
import { InstanceIcon } from "@/views/main/features/instances/components/instance-artwork";
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
  onExportSupportBundle: () => void;
  onPlay: () => void;
  onStop: () => void;
  onViewLaunchPlan: () => void;
  planLoading: boolean;
  resourcePackCount: number;
  shaderPackCount: number;
  supportBundleExporting: boolean;
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
  onExportSupportBundle,
  onPlay,
  onStop,
  onViewLaunchPlan,
  planLoading,
  resourcePackCount,
  shaderPackCount,
  supportBundleExporting,
  warningCount,
}: InstanceDetailsHeaderProps) {
  const colors = LOADER_COLORS[instance.loader];
  const loaderLabel = LOADER_LABELS[instance.loader];
  const lastPlayed = formatInstanceLastPlayed(instance.lastLaunchedAt);
  const busy = planLoading || launchActionState !== "idle";
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
  const contentSummary = [
    `${enabledModsCount} mod${enabledModsCount === 1 ? "" : "s"}`,
    `${resourcePackCount} resource pack${resourcePackCount === 1 ? "" : "s"}`,
    `${shaderPackCount} shader${shaderPackCount === 1 ? "" : "s"}`,
  ].join(" / ");

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

      <div className="relative flex w-full min-w-0 flex-col gap-4 px-4 py-4 sm:px-5">
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

          <div className="flex min-w-0 items-center gap-4 sm:gap-5">
            <div className="relative shrink-0">
              <div
                className="absolute inset-0 scale-[1.6] rounded-full bg-primary/15 blur-2xl"
                aria-hidden="true"
              />
              <InstanceIcon
                instance={instance}
                className="relative size-14 rounded-xl ring-1 ring-border shadow-lg [image-rendering:pixelated] sm:size-16"
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 items-start gap-3">
                <h1 className="min-w-0 flex-1 truncate font-heading text-3xl font-black leading-none text-foreground sm:text-4xl">
                  {instance.name}
                </h1>
                <Badge
                  variant={warningCount > 0 ? "outline" : "default"}
                  className="mt-0.5 shrink-0"
                >
                  {warningCount > 0
                    ? `${warningCount} warning${warningCount === 1 ? "" : "s"}`
                    : "Ready"}
                </Badge>
              </div>
            </div>
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
            <span className="text-primary">•</span>
            <span>{contentSummary}</span>
            {instance.modpack?.locked ? (
              <>
                <span className="text-primary">•</span>
                <span>
                  {modpackUpdateAvailable
                    ? "Modpack update available"
                    : "Modpack linked"}
                </span>
              </>
            ) : null}
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
                <SquareIcon data-icon="inline-start" className="fill-current" />
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

          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  aria-label="Open instance tools"
                  className="w-full sm:w-auto"
                  size="lg"
                  variant="outline"
                />
              }
            >
              <MoreHorizontalIcon data-icon="inline-start" />
              Tools
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuGroup>
                <DropdownMenuItem onClick={openFolder}>
                  <FolderOpenIcon />
                  Open game folder
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={supportBundleExporting}
                  onClick={onExportSupportBundle}
                >
                  {supportBundleExporting ? (
                    <Loader2Icon className="animate-spin" />
                  ) : (
                    <FileArchiveIcon />
                  )}
                  {supportBundleExporting
                    ? "Exporting bundle..."
                    : "Export support bundle"}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={openMetadata}>
                  <FileTextIcon />
                  Open metadata
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </section>
  );
}
