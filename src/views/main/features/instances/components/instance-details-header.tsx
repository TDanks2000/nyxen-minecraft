import { Link } from "@tanstack/react-router";
import { formatDistanceToNow } from "date-fns";
import {
  ArrowLeftIcon,
  CalendarClockIcon,
  FolderOpenIcon,
  MemoryStickIcon,
  PlayIcon,
  ShieldCheckIcon,
  TerminalSquareIcon,
} from "lucide-react";
import type { ElementType } from "react";
import type { LauncherInstance, ModLoader } from "@/shared/types";
import { Badge } from "@/views/main/components/ui/badge";
import { Button } from "@/views/main/components/ui/button";
import {
  InstanceArtwork,
  InstanceIcon,
} from "@/views/main/features/instances/components/instance-artwork";
import { rpc } from "@/views/main/lib/rpc";

type InstanceDetailsHeaderProps = {
  instance: LauncherInstance;
  onPlay: () => void;
  planLoading: boolean;
};

type LoaderColors = {
  accent: string;
  bg: string;
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
    accent: "rgba(129,140,248,0.9)",
    bg: "linear-gradient(180deg, #06081d 0%, #141a52 36%, #080b24 100%)",
    glow: "radial-gradient(ellipse 72% 64% at 76% 36%, rgba(99,102,241,0.46), transparent 72%)",
  },
  forge: {
    accent: "rgba(251,191,36,0.92)",
    bg: "linear-gradient(180deg, #130701 0%, #4a2308 38%, #0a0401 100%)",
    glow: "radial-gradient(ellipse 72% 64% at 76% 36%, rgba(217,119,6,0.46), transparent 72%)",
  },
  neoforge: {
    accent: "rgba(251,146,60,0.94)",
    bg: "linear-gradient(180deg, #140500 0%, #542000 38%, #0b0300 100%)",
    glow: "radial-gradient(ellipse 72% 64% at 76% 36%, rgba(234,88,12,0.48), transparent 72%)",
  },
  quilt: {
    accent: "rgba(167,139,250,0.92)",
    bg: "linear-gradient(180deg, #0c061e 0%, #25145c 38%, #08060f 100%)",
    glow: "radial-gradient(ellipse 72% 64% at 76% 36%, rgba(139,92,246,0.48), transparent 72%)",
  },
  vanilla: {
    accent: "rgba(52,211,153,0.92)",
    bg: "linear-gradient(180deg, #00140b 0%, #00542c 38%, #000d07 100%)",
    glow: "radial-gradient(ellipse 72% 64% at 76% 36%, rgba(16,185,129,0.46), transparent 72%)",
  },
};

const formatRelative = (value: string | null): string =>
  value
    ? formatDistanceToNow(new Date(value), { addSuffix: true })
    : "Never played";

function HeroFact({
  icon: Icon,
  label,
  value,
}: {
  icon: ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-md border border-white/[0.13] bg-white/[0.055] px-3 py-2 backdrop-blur">
      <div className="flex items-center gap-2 text-[0.62rem] font-bold uppercase tracking-widest text-white/45">
        <Icon />
        {label}
      </div>
      <div className="mt-1 truncate text-sm font-semibold text-white/88">
        {value}
      </div>
    </div>
  );
}

export function InstanceDetailsHeader({
  instance,
  onPlay,
  planLoading,
}: InstanceDetailsHeaderProps) {
  const colors = LOADER_COLORS[instance.loader];

  const openFolder = () => {
    void rpc.requestProxy.openExternal({
      url: `file://${instance.gameDirectory}`,
    });
  };

  return (
    <section className="relative min-h-[390px] overflow-hidden border-b border-border bg-background">
      <div
        className="absolute inset-0"
        style={{ background: colors.bg }}
        aria-hidden="true"
      />
      <div
        className="absolute inset-0"
        style={{ background: colors.glow }}
        aria-hidden="true"
      />
      <div
        className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.08)_0_1px,transparent_1px_26px)] opacity-40"
        aria-hidden="true"
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(90deg, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.68) 36%, rgba(0,0,0,0.16) 72%, rgba(0,0,0,0.32) 100%)",
        }}
        aria-hidden="true"
      />
      <div
        className="absolute right-0 bottom-0 left-0 h-36 bg-gradient-to-t from-background to-transparent"
        aria-hidden="true"
      />

      <div className="relative mx-auto grid min-h-[390px] max-w-[90rem] grid-cols-[minmax(0,1fr)_minmax(22rem,32rem)] gap-6 px-4 py-5 sm:px-5 max-lg:grid-cols-1">
        <div className="flex min-w-0 flex-col justify-between gap-8">
          <Button
            render={<Link to="/instances" />}
            nativeButton={false}
            size="sm"
            variant="outline"
            className="w-fit border-white/[0.18] bg-white/[0.06] text-white/76 hover:bg-white/[0.12] hover:text-white"
          >
            <ArrowLeftIcon data-icon="inline-start" />
            Library
          </Button>

          <div className="max-w-4xl">
            <div className="flex flex-wrap items-center gap-2">
              <InstanceIcon
                instance={instance}
                className="size-10 rounded-md ring-1 ring-white/20"
              />
              <Badge
                variant="secondary"
                className="border-white/[0.14] bg-white/[0.08] text-white"
              >
                {LOADER_LABELS[instance.loader]}
              </Badge>
              <span
                className="text-[0.62rem] font-black uppercase tracking-[0.24em]"
                style={{ color: colors.accent }}
              >
                Minecraft {instance.versionId}
              </span>
            </div>

            <h1 className="mt-4 max-w-4xl text-balance font-heading text-6xl font-black leading-none text-white max-xl:text-5xl max-sm:text-4xl">
              {instance.name}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/62">
              {instance.loaderVersion
                ? `${LOADER_LABELS[instance.loader]} ${instance.loaderVersion}`
                : `${LOADER_LABELS[instance.loader]} profile`}
              {" · "}
              {formatRelative(instance.lastLaunchedAt)}
            </p>

            <div className="mt-6 grid max-w-3xl grid-cols-3 gap-2 max-md:grid-cols-1">
              <HeroFact
                icon={MemoryStickIcon}
                label="Memory"
                value={`${instance.memoryMinMb} / ${instance.memoryMaxMb} MB`}
              />
              <HeroFact
                icon={TerminalSquareIcon}
                label="Arguments"
                value={`${instance.javaArgs.length + instance.gameArgs.length} custom`}
              />
              <HeroFact
                icon={ShieldCheckIcon}
                label="Profile"
                value={instance.profileId ? "Linked" : "Offline ready"}
              />
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-2">
              <Button disabled={planLoading} onClick={onPlay} size="lg">
                <PlayIcon data-icon="inline-start" className="fill-current" />
                {planLoading ? "Preparing..." : "Prepare Launch"}
              </Button>

              <Button
                type="button"
                onClick={openFolder}
                size="lg"
                variant="outline"
                className="border-white/[0.18] bg-white/[0.06] text-white/80 hover:bg-white/[0.12] hover:text-white"
              >
                <FolderOpenIcon data-icon="inline-start" />
                Open Folder
              </Button>
            </div>
          </div>
        </div>

        <div className="flex min-w-0 items-end justify-end max-lg:hidden">
          <div className="relative w-full max-w-md">
            <div className="absolute -inset-3 rounded-xl border border-white/[0.08] bg-white/[0.025]" />
            <div className="relative overflow-hidden rounded-lg border border-white/[0.14] shadow-[0_44px_120px_-64px_black]">
              <InstanceArtwork
                instance={instance}
                variant="hero"
                className="h-72 min-h-0"
              />
            </div>
            <div className="relative mt-3 grid grid-cols-2 gap-2">
              <div className="rounded-md border border-white/[0.12] bg-white/[0.055] px-3 py-2">
                <div className="flex items-center gap-2 text-[0.62rem] font-bold uppercase tracking-widest text-white/45">
                  <CalendarClockIcon />
                  Updated
                </div>
                <div className="mt-1 truncate text-xs font-semibold text-white/80">
                  {formatDistanceToNow(new Date(instance.updatedAt), {
                    addSuffix: true,
                  })}
                </div>
              </div>
              <div className="rounded-md border border-white/[0.12] bg-white/[0.055] px-3 py-2">
                <div className="text-[0.62rem] font-bold uppercase tracking-widest text-white/45">
                  Directory
                </div>
                <div className="mt-1 truncate font-mono text-xs font-semibold text-white/80">
                  {instance.folders.root}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
