import { type CSSProperties, type ReactNode, useState } from "react";
import { cn } from "@/views/main/lib/utils";

type SkinBounds = {
  height: number;
  width: number;
  x: number;
  y: number;
};

type SkinPart = {
  base: SkinBounds;
  overlay?: SkinBounds;
};

const SKIN_TEXTURE_SIZE = 64;

const SKIN_PARTS = {
  body: {
    base: { height: 12, width: 8, x: 20, y: 20 },
    overlay: { height: 12, width: 8, x: 20, y: 36 },
  },
  head: {
    base: { height: 8, width: 8, x: 8, y: 8 },
    overlay: { height: 8, width: 8, x: 40, y: 8 },
  },
  leftArm: {
    base: { height: 12, width: 4, x: 36, y: 52 },
    overlay: { height: 12, width: 4, x: 52, y: 52 },
  },
  leftLeg: {
    base: { height: 12, width: 4, x: 20, y: 52 },
    overlay: { height: 12, width: 4, x: 4, y: 52 },
  },
  rightArm: {
    base: { height: 12, width: 4, x: 44, y: 20 },
    overlay: { height: 12, width: 4, x: 44, y: 36 },
  },
  rightLeg: {
    base: { height: 12, width: 4, x: 4, y: 20 },
    overlay: { height: 12, width: 4, x: 4, y: 36 },
  },
} satisfies Record<string, SkinPart>;

const getSkinLayerStyle = (
  skinUrl: string,
  bounds: SkinBounds,
  scale: number,
): CSSProperties => ({
  backgroundImage: `url(${JSON.stringify(skinUrl)})`,
  backgroundPosition: `-${bounds.x * scale}px -${bounds.y * scale}px`,
  backgroundRepeat: "no-repeat",
  backgroundSize: `${SKIN_TEXTURE_SIZE * scale}px ${
    SKIN_TEXTURE_SIZE * scale
  }px`,
  height: bounds.height * scale,
  imageRendering: "pixelated",
  width: bounds.width * scale,
});

function SkinLoadGuard({
  children,
  displayName,
  fallback = null,
  skinUrl,
}: {
  children: ReactNode;
  displayName: string;
  fallback?: ReactNode;
  skinUrl: string | null;
}) {
  const [skinFailed, setSkinFailed] = useState(false);

  if (!skinUrl || skinFailed) {
    return fallback;
  }

  return (
    <>
      <img
        alt={`${displayName} Minecraft skin`}
        className="pointer-events-none sr-only"
        onError={() => setSkinFailed(true)}
        src={skinUrl}
      />
      {children}
    </>
  );
}

function SkinLayer({
  bounds,
  className,
  scale,
  skinUrl,
}: {
  bounds: SkinBounds;
  className?: string;
  scale: number;
  skinUrl: string;
}) {
  return (
    <div
      aria-hidden="true"
      className={cn("shrink-0", className)}
      style={getSkinLayerStyle(skinUrl, bounds, scale)}
    />
  );
}

function SkinPartLayer({
  className,
  part,
  scale,
  skinUrl,
}: {
  className?: string;
  part: SkinPart;
  scale: number;
  skinUrl: string;
}) {
  return (
    <div
      aria-hidden="true"
      className={cn("relative shrink-0", className)}
      style={{
        height: part.base.height * scale,
        width: part.base.width * scale,
      }}
    >
      <SkinLayer bounds={part.base} scale={scale} skinUrl={skinUrl} />
      {part.overlay ? (
        <SkinLayer
          bounds={part.overlay}
          className="absolute inset-0"
          scale={scale}
          skinUrl={skinUrl}
        />
      ) : null}
    </div>
  );
}

export function MinecraftSkinHead({
  className,
  displayName,
  scale = 5,
  skinUrl,
}: {
  className?: string;
  displayName: string;
  scale?: number;
  skinUrl: string | null;
}) {
  return (
    <SkinLoadGuard displayName={displayName} skinUrl={skinUrl}>
      <div
        aria-hidden="true"
        className={cn("absolute inset-0 overflow-hidden rounded-md", className)}
      >
        <SkinPartLayer
          part={SKIN_PARTS.head}
          scale={scale}
          skinUrl={skinUrl ?? ""}
        />
      </div>
    </SkinLoadGuard>
  );
}

export function MinecraftSkinCharacter({
  displayName,
  fallback = null,
  scale = 7,
  skinUrl,
}: {
  displayName: string;
  fallback?: ReactNode;
  scale?: number;
  skinUrl: string | null;
}) {
  return (
    <SkinLoadGuard
      displayName={displayName}
      fallback={fallback}
      skinUrl={skinUrl}
    >
      <div
        aria-hidden="true"
        className="flex flex-col items-center drop-shadow-sm"
      >
        <SkinPartLayer
          className="z-10"
          part={SKIN_PARTS.head}
          scale={scale}
          skinUrl={skinUrl ?? ""}
        />
        <div className="flex items-start">
          <SkinPartLayer
            part={SKIN_PARTS.rightArm}
            scale={scale}
            skinUrl={skinUrl ?? ""}
          />
          <SkinPartLayer
            part={SKIN_PARTS.body}
            scale={scale}
            skinUrl={skinUrl ?? ""}
          />
          <SkinPartLayer
            part={SKIN_PARTS.leftArm}
            scale={scale}
            skinUrl={skinUrl ?? ""}
          />
        </div>
        <div className="flex items-start">
          <SkinPartLayer
            part={SKIN_PARTS.rightLeg}
            scale={scale}
            skinUrl={skinUrl ?? ""}
          />
          <SkinPartLayer
            part={SKIN_PARTS.leftLeg}
            scale={scale}
            skinUrl={skinUrl ?? ""}
          />
        </div>
      </div>
    </SkinLoadGuard>
  );
}
