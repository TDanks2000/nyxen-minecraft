import { ArchiveIcon, type FileTextIcon } from "lucide-react";
import type { InstanceFileEntry } from "@/shared/types";
import { Button } from "@/views/main/components/ui/button";
import { cn } from "@/views/main/lib/utils";

type InstanceLogTabButtonProps = {
  active: boolean;
  entry?: InstanceFileEntry;
  icon: typeof FileTextIcon;
  label: string;
  meta: string;
  onClick: () => void;
};

export function InstanceLogTabButton({
  active,
  entry,
  icon: Icon,
  label,
  meta,
  onClick,
}: InstanceLogTabButtonProps) {
  return (
    <Button
      aria-pressed={active}
      className="h-auto w-full min-w-0 justify-start px-2 py-2 text-left"
      onClick={onClick}
      size="sm"
      variant={active ? "default" : "ghost"}
    >
      <Icon data-icon="inline-start" />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold">{label}</span>
        <span
          className={cn(
            "block truncate font-normal text-xs",
            active ? "text-primary-foreground/75" : "text-muted-foreground",
          )}
        >
          {meta}
        </span>
      </span>
      {entry?.fileName.toLowerCase().endsWith(".gz") ? (
        <ArchiveIcon className="text-current/70" data-icon="inline-end" />
      ) : null}
    </Button>
  );
}
