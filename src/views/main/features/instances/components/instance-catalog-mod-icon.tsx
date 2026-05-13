import { PuzzleIcon } from "lucide-react";
import { cn } from "@/views/main/lib/utils";

export function InstanceCatalogModIcon({ enabled }: { enabled: boolean }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-md border border-border font-heading font-black text-xs",
        enabled
          ? "bg-primary/20 text-primary"
          : "bg-muted/40 text-muted-foreground",
      )}
    >
      <PuzzleIcon className="size-4" />
    </div>
  );
}
