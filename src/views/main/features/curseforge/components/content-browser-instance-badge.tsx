import { CheckCircle2Icon, ServerIcon } from "lucide-react";
import type { SelectedInstance } from "@/views/main/features/curseforge/curseforge-browser-types";
import { LOADER_LABELS } from "@/views/main/features/instances/components/instance-format";
import { useRendererMediaUrl } from "@/views/main/features/instances/hooks/use-renderer-media-url";

export function ContentBrowserInstanceBadge({
  instance,
}: {
  instance: SelectedInstance | null;
}) {
  const iconUrl = useRendererMediaUrl(instance?.iconUrl);

  if (!instance) {
    return (
      <div className="flex min-w-0 items-center gap-2 rounded-lg border border-border bg-background/70 px-3 py-2">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
          <ServerIcon />
        </div>
        <div className="min-w-0">
          <div className="truncate font-semibold text-sm">
            No instance selected
          </div>
          <div className="truncate text-muted-foreground text-xs">
            Select an instance to install content.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-w-0 items-center gap-2 rounded-lg border border-border bg-background/70 px-3 py-2">
      {iconUrl ? (
        <img
          alt=""
          className="size-9 rounded-md object-cover ring-1 ring-border"
          src={iconUrl}
        />
      ) : (
        <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
          <CheckCircle2Icon />
        </div>
      )}
      <div className="min-w-0">
        <div className="truncate font-semibold text-sm">{instance.name}</div>
        <div className="truncate text-muted-foreground text-xs">
          {instance.modpackLocked
            ? instance.modpackName
              ? `Managed by ${instance.modpackName}`
              : "Managed modpack instance"
            : `Minecraft ${instance.minecraftVersion}${
                instance.loader ? ` · ${LOADER_LABELS[instance.loader]}` : ""
              }`}
        </div>
      </div>
    </div>
  );
}
