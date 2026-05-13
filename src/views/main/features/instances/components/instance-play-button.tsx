import { Loader2Icon, PlayIcon } from "lucide-react";
import { Button } from "@/views/main/components/ui/button";
import type { InstanceActionProps } from "@/views/main/features/instances/components/instance-card-types";
import { cn } from "@/views/main/lib/utils";

type InstancePlayButtonProps = InstanceActionProps & {
  className?: string;
  size?: "icon-xs" | "icon-sm";
};

export function InstancePlayButton({
  className,
  instance,
  launchDisabled,
  launchLoading,
  onPlay,
  size = "icon-sm",
}: InstancePlayButtonProps) {
  return (
    <Button
      aria-label={`Prepare launch for ${instance.name}`}
      className={cn(launchLoading && "cursor-wait", className)}
      disabled={launchDisabled}
      onClick={onPlay}
      size={size}
    >
      {launchLoading ? (
        <Loader2Icon className="animate-spin" />
      ) : (
        <PlayIcon className="fill-current" />
      )}
    </Button>
  );
}
