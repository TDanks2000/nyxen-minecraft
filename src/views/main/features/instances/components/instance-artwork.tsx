import type { LauncherInstance } from "@/shared/types";
import { Badge } from "@/views/main/components/ui/badge";
import { cn } from "@/views/main/lib/utils";
import { LOADER_LABELS } from "./instance-format";

type InstanceArtworkProps = {
  className?: string;
  instance: LauncherInstance;
  showBadge?: boolean;
  variant?: "card" | "hero" | "icon" | "wide";
};

type LoaderArtwork = {
  accent: string;
  far: string;
  ground: string;
  mid: string;
  sky: string;
};

const ART_BY_LOADER: Record<LauncherInstance["loader"], LoaderArtwork> = {
  fabric: {
    accent: "bg-indigo-300",
    far: "bg-indigo-950/75",
    ground: "bg-slate-950",
    mid: "bg-indigo-900/80",
    sky: "from-indigo-950 via-slate-900 to-slate-950",
  },
  forge: {
    accent: "bg-amber-300",
    far: "bg-stone-950/75",
    ground: "bg-stone-950",
    mid: "bg-amber-950/80",
    sky: "from-stone-950 via-amber-950/80 to-stone-950",
  },
  neoforge: {
    accent: "bg-orange-300",
    far: "bg-red-950/75",
    ground: "bg-stone-950",
    mid: "bg-orange-950/80",
    sky: "from-red-950 via-orange-950/85 to-stone-950",
  },
  quilt: {
    accent: "bg-violet-300",
    far: "bg-violet-950/75",
    ground: "bg-slate-950",
    mid: "bg-purple-950/80",
    sky: "from-violet-950 via-slate-900 to-slate-950",
  },
  vanilla: {
    accent: "bg-emerald-300",
    far: "bg-emerald-950/75",
    ground: "bg-slate-950",
    mid: "bg-green-950/80",
    sky: "from-emerald-950 via-slate-900 to-slate-950",
  },
};

const RIDGE_BLOCKS = Array.from({ length: 24 }, (_, index) => index);
const TERRAIN_BLOCKS = Array.from({ length: 42 }, (_, index) => index);
const DETAIL_BLOCKS = Array.from(
  { length: 15 },
  (_, index) => `detail-block-${index}`,
);

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function InstanceIcon({
  className,
  instance,
}: {
  className?: string;
  instance: LauncherInstance;
}) {
  const art = ART_BY_LOADER[instance.loader];

  if (instance.iconUrl) {
    return (
      <img
        src={instance.iconUrl}
        alt=""
        aria-hidden="true"
        className={cn("size-9 shrink-0 rounded-md object-cover", className)}
      />
    );
  }

  return (
    <div
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-md bg-gradient-to-br text-[0.68rem] font-black text-white shadow-inner",
        art.sky,
        className,
      )}
      aria-hidden="true"
    >
      {initials(instance.name) || instance.loader.slice(0, 1).toUpperCase()}
    </div>
  );
}

export function InstanceArtwork({
  className,
  instance,
  showBadge = true,
  variant = "card",
}: InstanceArtworkProps) {
  const art = ART_BY_LOADER[instance.loader];
  const isHero = variant === "hero";
  const isIcon = variant === "icon";
  const artworkUrl = instance.bannerUrl ?? instance.iconUrl;

  return (
    <div
      className={cn(
        "relative isolate overflow-hidden bg-gradient-to-br",
        art.sky,
        isHero && "h-full min-h-64",
        variant === "card" && "h-36",
        variant === "wide" && "h-44",
        isIcon && "size-full",
        className,
      )}
      aria-hidden="true"
    >
      {artworkUrl ? (
        <>
          <img
            src={artworkUrl}
            alt=""
            className="absolute inset-0 size-full object-cover opacity-55"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/35 to-transparent" />
        </>
      ) : (
        <>
          <div
            className={cn(
              "absolute top-[18%] right-[14%] rounded-sm shadow-[0_0_40px_rgba(255,255,255,0.16)]",
              art.accent,
              isHero ? "size-12" : "size-8",
            )}
          />
          <div className="absolute inset-0 bg-[linear-gradient(135deg,color-mix(in_oklch,var(--foreground)_7%,transparent)_0_1px,transparent_1px_22px)] opacity-60" />
          <div className="absolute inset-x-0 bottom-0 flex h-2/5 items-end gap-0.5 px-3 opacity-80">
            {RIDGE_BLOCKS.map((block) => (
              <span
                key={block}
                className={cn("flex-1 rounded-t-sm", art.far)}
                style={{
                  height: `${30 + ((block * 17) % 58)}%`,
                }}
              />
            ))}
          </div>
          <div className="absolute inset-x-0 bottom-0 flex h-1/3 items-end gap-0.5 px-2 opacity-95">
            {TERRAIN_BLOCKS.map((block) => (
              <span
                key={block}
                className={cn("flex-1 rounded-t-sm", art.mid)}
                style={{
                  height: `${38 + ((block * 29) % 54)}%`,
                }}
              />
            ))}
          </div>
          <div
            className={cn("absolute inset-x-0 bottom-0 h-[18%]", art.ground)}
          />
          <div className="absolute right-[9%] bottom-[14%] grid grid-cols-3 gap-0.5 opacity-85">
            {DETAIL_BLOCKS.slice(0, isHero ? 15 : 9).map((block) => (
              <span
                key={block}
                className={cn(
                  "rounded-[2px] bg-background/45",
                  isHero ? "size-5" : "size-3.5",
                )}
              />
            ))}
          </div>
          <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-background/85 to-transparent" />
        </>
      )}

      {!isIcon && (
        <div className="absolute inset-0 bg-gradient-to-r from-black/38 via-transparent to-black/12" />
      )}

      {showBadge && !isIcon ? (
        <div className="absolute bottom-3 left-3 flex max-w-[calc(100%-1.5rem)] items-center gap-2">
          <Badge variant="secondary" className="capitalize">
            {LOADER_LABELS[instance.loader]}
          </Badge>
          <span className="truncate text-xs font-semibold text-white/78">
            {instance.versionId}
          </span>
        </div>
      ) : null}
    </div>
  );
}
