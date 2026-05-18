import { Link } from "@tanstack/react-router";
import { InfoIcon, MoreHorizontalIcon, PlayIcon } from "lucide-react";
import { Button } from "@/views/main/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/views/main/components/ui/dropdown-menu";
import type { InstanceActionProps } from "@/views/main/features/instances/components/instance-card-types";

type InstanceActionMenuProps = Omit<InstanceActionProps, "launchLoading">;

export function InstanceActionMenu({
  instance,
  launchDisabled,
  onPlay,
}: InstanceActionMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            aria-label={`Open actions for ${instance.name}`}
            size="icon-sm"
            variant="ghost"
          />
        }
      >
        <MoreHorizontalIcon />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuGroup>
          <DropdownMenuItem disabled={launchDisabled} onClick={onPlay}>
            <PlayIcon />
            Play
          </DropdownMenuItem>
          <DropdownMenuItem
            render={
              <Link
                params={{ instanceId: instance.id }}
                to="/instances/$instanceId"
              />
            }
          >
            <InfoIcon />
            View details
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
