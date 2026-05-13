import {
  BadgeCheckIcon,
  KeyRoundIcon,
  RefreshCwIcon,
  ShieldCheckIcon,
  UserCheckIcon,
} from "lucide-react";
import type { LauncherProfile } from "@/shared/types";
import { Badge } from "@/views/main/components/ui/badge";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/views/main/components/ui/card";
import {
  getProfileHealthSummary,
  type ProfileHealthItem,
  type ProfileHealthTone,
} from "@/views/main/features/profiles/profile-health-model";
import { formatRelativeTime } from "@/views/main/lib/date-format";
import { cn } from "@/views/main/lib/utils";

const HEALTH_ITEM_ICONS: Record<
  ProfileHealthItem["id"],
  typeof ShieldCheckIcon
> = {
  minecraftToken: KeyRoundIcon,
  microsoft: UserCheckIcon,
  ownership: BadgeCheckIcon,
  refresh: RefreshCwIcon,
  xbox: ShieldCheckIcon,
};

const HEALTH_TONE_CLASSES: Record<ProfileHealthTone, string> = {
  blocked: "bg-destructive/10 text-destructive",
  neutral: "bg-muted text-muted-foreground",
  ready: "bg-primary/10 text-primary",
  warning: "bg-muted text-foreground",
};

const formatHealthDetail = (detail: string | null): string | null => {
  if (!detail) return null;

  const parsedTime = Date.parse(detail);

  if (Number.isFinite(parsedTime) && detail.includes("T")) {
    return formatRelativeTime(detail);
  }

  return detail;
};

export function ProfileHealthPanel({
  profile,
}: {
  profile: LauncherProfile | null;
}) {
  if (!profile) {
    return (
      <Card className="border-0 ring-1 ring-border/45">
        <CardHeader>
          <CardDescription>Health</CardDescription>
          <CardTitle>Account preflight</CardTitle>
          <CardAction>
            <Badge variant="outline">No profile</Badge>
          </CardAction>
        </CardHeader>
        <CardContent className="text-muted-foreground text-sm">
          Select or add a Microsoft profile to inspect launch readiness.
        </CardContent>
      </Card>
    );
  }

  const health = getProfileHealthSummary(profile);

  return (
    <Card className="border-0 ring-1 ring-border/45">
      <CardHeader>
        <div>
          <CardDescription>Health</CardDescription>
          <CardTitle>Account preflight</CardTitle>
        </div>
        <CardAction>
          <Badge variant={health.statusTone}>{health.statusLabel}</Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="grid grid-cols-[repeat(auto-fit,minmax(10rem,1fr))] gap-2">
        {health.items.map((item) => {
          const Icon = HEALTH_ITEM_ICONS[item.id];
          const detail = formatHealthDetail(item.detail);

          return (
            <div
              className="flex min-w-0 items-start gap-3 rounded-md bg-muted/20 p-3 ring-1 ring-border/35"
              key={item.id}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-md",
                  HEALTH_TONE_CLASSES[item.tone],
                )}
              >
                <Icon className="size-4" />
              </span>
              <div className="min-w-0">
                <p className="font-black text-muted-foreground text-xs uppercase">
                  {item.label}
                </p>
                <p className="mt-1 break-words font-semibold text-sm leading-tight">
                  {item.value}
                </p>
                {detail ? (
                  <p className="mt-1 break-words text-muted-foreground text-xs">
                    {detail}
                  </p>
                ) : null}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
