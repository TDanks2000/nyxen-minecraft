import type { LauncherProfile } from "@/shared/types";
import {
  getProfileInitials,
  isVerifiedMinecraftProfile,
} from "@/views/main/features/layout/titlebar-profile-model";
import { MinecraftSkinHead } from "@/views/main/features/profiles/components/minecraft-skin";
import { cn } from "@/views/main/lib/utils";

type TitlebarProfileFaceProps = {
  className?: string;
  initialsClassName?: string;
  profile: LauncherProfile | null;
  scale: number;
};

export function TitlebarProfileFace({
  className,
  initialsClassName,
  profile,
  scale,
}: TitlebarProfileFaceProps) {
  const label = profile ? getProfileInitials(profile.displayName) : "?";
  const verified = profile ? isVerifiedMinecraftProfile(profile) : false;

  return (
    <div className={cn("relative shrink-0", className)} aria-hidden="true">
      <div className="flex size-full items-center justify-center overflow-hidden rounded-md bg-linear-to-br from-amber-400 to-orange-600">
        {profile ? (
          <MinecraftSkinHead
            displayName={profile.displayName}
            scale={scale}
            skinUrl={profile.skinUrl}
          />
        ) : null}
        <span
          className={cn(
            "select-none font-black text-[10px] text-white",
            initialsClassName,
          )}
        >
          {label}
        </span>
      </div>
      <span
        className={cn(
          "absolute right-0 bottom-0 size-2 rounded-full ring-1 ring-sidebar",
          verified ? "bg-primary" : "bg-muted-foreground",
        )}
      />
    </div>
  );
}
