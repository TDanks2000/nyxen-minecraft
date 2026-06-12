import { Loader2Icon, PackageIcon } from "lucide-react";
import { Badge } from "@/views/main/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/views/main/components/ui/card";
import { Progress } from "@/views/main/components/ui/progress";
import type { InstallingInstanceCardProps } from "@/views/main/features/instances/components/instance-card-types";
import {
  getCompletedInstallItems,
  getDownloadSourceLabel,
  getInstallProgress,
} from "@/views/main/features/instances/components/instance-install-progress";
import { cn } from "@/views/main/lib/utils";

export function InstallingInstanceCard({
  animationsDisabled = false,
  className,
  density = "standard",
  installJob: job,
}: InstallingInstanceCardProps) {
  const compact = density === "compact";
  const progress = getInstallProgress(job);
  const totalItems = Math.max(1, job.totalItems, job.items.length);
  const completedItems = getCompletedInstallItems(job);
  const imageUrl =
    job.metadata.kind === "curseForgeFile" ||
    job.metadata.kind === "modrinthFile"
      ? job.metadata.imageUrl
      : null;

  return (
    <Card
      className={cn(
        "group pt-0 ring-1 ring-primary/20",
        animationsDisabled
          ? "transition-colors"
          : "transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_24px_72px_-48px_black]",
        compact && "data-[size=sm]:pt-0",
        className,
      )}
      size={compact ? "sm" : "default"}
    >
      <div
        className={cn(
          "relative overflow-hidden bg-muted",
          compact ? "h-28" : "h-36",
        )}
      >
        {imageUrl ? (
          <img
            alt=""
            className={cn(
              "size-full object-cover opacity-80 blur-[1px]",
              !animationsDisabled &&
                "transition-transform duration-300 group-hover:scale-[1.03]",
            )}
            src={imageUrl}
          />
        ) : (
          <div className="flex size-full items-center justify-center bg-primary/10 text-primary">
            <PackageIcon className="size-10" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/45 to-transparent" />
        <Badge className="absolute top-3 left-3 gap-1.5">
          <Loader2Icon className="animate-spin" data-icon="inline-start" />
          Installing
        </Badge>
      </div>
      <CardHeader className={cn("min-w-0", compact ? "gap-1" : "gap-1.5")}>
        <CardTitle
          className={cn("truncate", compact && "text-xs leading-none")}
        >
          {job.title}
        </CardTitle>
        <CardDescription className={cn("truncate", compact && "text-[11px]")}>
          {job.activeLabel ?? job.subtitle}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between gap-3 text-xs">
          <span className="truncate text-muted-foreground">
            {job.status === "queued" ? "Queued" : "Downloading"}
          </span>
          <span className="shrink-0 font-medium tabular-nums">
            {Math.round(progress)}%
          </span>
        </div>
        <Progress
          aria-label={`${job.title} install progress`}
          className="mt-2 [&_[data-slot=progress-track]]:h-2"
          value={progress}
        />
      </CardContent>
      <CardFooter className="justify-between gap-2">
        <Badge variant="secondary">{getDownloadSourceLabel(job)}</Badge>
        <span className="text-muted-foreground text-xs tabular-nums">
          {completedItems}/{totalItems} files
        </span>
      </CardFooter>
    </Card>
  );
}
