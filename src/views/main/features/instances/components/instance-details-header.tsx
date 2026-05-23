import { Link } from "@tanstack/react-router";
import {
  CheckIcon,
  ChevronDownIcon,
  FileArchiveIcon,
  FileTextIcon,
  FolderOpenIcon,
  LinkIcon,
  Loader2Icon,
  MoreHorizontalIcon,
  PlayIcon,
  SquareIcon,
} from "lucide-react";
import type { LauncherInstance } from "@/shared/types";
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
import { cn } from "@/views/main/lib/utils";

type LaunchActionState =
  | "idle"
  | "preparing"
  | "downloading"
  | "launching"
  | "stopping";

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
  worldCount: number;
};

const PILL_VARIANTS = {
  default:
    "bg-[oklch(0.21_0.014_124)] border-[oklch(0.27_0.014_124)] text-[oklch(0.66_0.012_112)]",
  green:
    "bg-[oklch(0.2_0.06_145)] border-[oklch(0.4_0.14_145)] text-[oklch(0.78_0.18_145)]",
  orange:
    "bg-[oklch(0.22_0.06_50)] border-[oklch(0.4_0.14_50)] text-[oklch(0.76_0.16_50)]",
  amber:
    "bg-[oklch(0.22_0.06_80)] border-[oklch(0.4_0.14_80)] text-[oklch(0.82_0.16_80)]",
  purple:
    "bg-[oklch(0.22_0.06_280)] border-[oklch(0.4_0.1_280)] text-[oklch(0.78_0.14_280)]",
} as const;

function HeroPill({
  children,
  variant = "default",
}: {
  children: React.ReactNode;
  variant?: keyof typeof PILL_VARIANTS;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded border px-2 py-0.5 font-mono text-[10.5px] font-semibold uppercase tracking-[0.06em]",
        PILL_VARIANTS[variant],
      )}
    >
      {children}
    </span>
  );
}

const STAR_POSITIONS = Array.from({ length: 24 }, (_, i) => ({
  cx: (i * 97) % 1600,
  cy: (i * 37) % 80,
  r: i % 4 === 0 ? 1.2 : 0.6,
}));

const HILL_POINTS_BACK =
  "0,220 0,160 120,140 220,150 320,110 440,140 540,90 660,140 780,110 900,150 1020,100 1160,140 1280,120 1400,150 1520,130 1600,150 1600,220";
const HILL_POINTS_FRONT =
  "0,220 0,180 80,170 180,178 280,160 400,178 520,162 640,180 760,170 880,180 1000,165 1120,180 1240,170 1360,180 1480,170 1600,178 1600,220";

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
  worldCount,
}: InstanceDetailsHeaderProps) {
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

  return (
    <div className="relative h-[220px] shrink-0 overflow-hidden rounded-[10px] border border-border">
      {/* Sky gradient base */}
      <div className="absolute inset-0 bg-[linear-gradient(180deg,oklch(0.22_0.04_250)_0%,oklch(0.16_0.06_30)_70%,oklch(0.1_0.04_30)_100%)]" />

      {/* SVG horizon + stars */}
      <svg
        viewBox="0 0 1600 220"
        preserveAspectRatio="none"
        className="absolute inset-0 size-full opacity-90"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="hero-hill-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1d1e15" />
            <stop offset="100%" stopColor="#0a0a07" />
          </linearGradient>
        </defs>
        <polygon fill="url(#hero-hill-grad)" points={HILL_POINTS_BACK} />
        <polygon fill="#070605" opacity="0.85" points={HILL_POINTS_FRONT} />
        {STAR_POSITIONS.map((s) => (
          <circle
            key={`${s.cx}-${s.cy}-${s.r}`}
            cx={s.cx}
            cy={s.cy}
            r={s.r}
            fill="#fff"
            opacity="0.5"
          />
        ))}
      </svg>

      {/* Horizontal vignette */}
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(10,13,10,0.9)_0%,rgba(10,13,10,0.5)_60%,rgba(10,13,10,0.85)_100%)]" />

      {/* Content row */}
      <div className="relative flex h-full items-center gap-4 px-[22px] py-[18px]">
        {/* Instance icon */}
        <InstanceIcon
          instance={instance}
          className="size-[100px] shrink-0 self-center rounded-lg shadow-[0_6px_20px_rgba(0,0,0,0.5)] ring-2 ring-white/10 [image-rendering:pixelated]"
        />

        {/* Center column */}
        <div className="flex min-w-0 flex-1 flex-col justify-center gap-1.5">
          {/* Status pills */}
          <div className="flex flex-wrap items-center gap-2">
            {isRunning ? (
              <HeroPill variant="green">
                <span className="size-1.5 animate-pulse rounded-full bg-[oklch(0.78_0.18_145)]" />
                Running
              </HeroPill>
            ) : warningCount > 0 ? (
              <HeroPill variant="amber">{warningCount} warnings</HeroPill>
            ) : (
              <HeroPill variant="green">
                <CheckIcon className="size-2.5" />
                Ready
              </HeroPill>
            )}
            {instance.loader !== "vanilla" && (
              <HeroPill variant="orange">
                {loaderLabel}
                {instance.loaderVersion ? ` ${instance.loaderVersion}` : ""}
              </HeroPill>
            )}
            <HeroPill>Minecraft {instance.versionId}</HeroPill>
            {modpackUpdateAvailable && (
              <HeroPill variant="amber">Updates available</HeroPill>
            )}
            {instance.modpack?.locked && (
              <HeroPill variant="purple">
                <LinkIcon className="size-2.5" />
                Modpack linked
              </HeroPill>
            )}
          </div>

          {/* Instance name */}
          <h1 className="m-0 truncate font-heading text-[30px] font-bold leading-[1.05] tracking-[-0.02em] text-white">
            {instance.name}
          </h1>

          {/* Stats */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-[oklch(0.7_0.012_112)]">
            <span>
              <strong className="font-semibold text-white">
                {enabledModsCount}
              </strong>{" "}
              {enabledModsCount === 1 ? "mod" : "mods"}
            </span>
            <span className="text-white/30" aria-hidden="true">
              ·
            </span>
            <span>
              <strong className="font-semibold text-white">
                {resourcePackCount}
              </strong>{" "}
              resource packs
            </span>
            <span className="text-white/30" aria-hidden="true">
              ·
            </span>
            <span>
              <strong className="font-semibold text-white">
                {shaderPackCount}
              </strong>{" "}
              shaders
            </span>
            <span className="text-white/30" aria-hidden="true">
              ·
            </span>
            <span>
              <strong className="font-semibold text-white">{worldCount}</strong>{" "}
              worlds
            </span>
            <span className="text-white/30" aria-hidden="true">
              ·
            </span>
            <span>
              Last played{" "}
              <strong className="font-semibold text-white">{lastPlayed}</strong>
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-2">
          {/* Play button group with green shadow */}
          <div className="flex items-stretch overflow-hidden rounded-md shadow-[0_6px_20px_oklch(0.5_0.18_145_/_0.4)]">
            <button
              type="button"
              disabled={primaryDisabled}
              onClick={isRunning ? onStop : onPlay}
              className={cn(
                "inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60",
                isRunning
                  ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  : "bg-primary text-primary-foreground hover:bg-primary/90",
              )}
            >
              {showBusyIcon ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : isRunning ? (
                <SquareIcon className="size-4 fill-current" />
              ) : (
                <PlayIcon className="size-4 fill-current" />
              )}
              {primaryLabel}
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger
                disabled={dropdownDisabled}
                render={
                  <button
                    type="button"
                    aria-label="Choose launch option"
                    disabled={dropdownDisabled}
                    className={cn(
                      "inline-flex items-center justify-center border-l border-white/15 px-2.5 py-3 transition-colors disabled:cursor-not-allowed disabled:opacity-60",
                      isRunning
                        ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        : "bg-primary text-primary-foreground hover:bg-primary/90",
                    )}
                  />
                }
              >
                <ChevronDownIcon className="size-3" />
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

          {/* Tools button */}
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <button
                  type="button"
                  aria-label="Open instance tools"
                  className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-black/40 px-3.5 py-2.5 text-xs text-white/80 transition-colors hover:bg-black/60 hover:text-white"
                />
              }
            >
              <MoreHorizontalIcon className="size-3.5" />
              Tools
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuGroup>
                <DropdownMenuItem
                  onClick={() =>
                    void openLocalPath(instance.gameDirectory, {
                      failureMessage: "Could not open the instance folder.",
                    })
                  }
                >
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
                <DropdownMenuItem
                  onClick={() =>
                    void openLocalPath(instance.metadataPath, {
                      failureMessage: "Could not open instance metadata.",
                    })
                  }
                >
                  <FileTextIcon />
                  Open metadata
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Back link overlay */}
      <Link
        to="/instances"
        className="absolute left-[14px] top-[12px] inline-flex items-center gap-1 rounded border border-white/10 bg-black/50 px-2.5 py-1 text-[11.5px] text-white/70 no-underline transition-colors hover:text-white"
      >
        ← Library
      </Link>
    </div>
  );
}
