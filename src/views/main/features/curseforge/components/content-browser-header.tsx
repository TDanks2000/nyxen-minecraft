import { XIcon } from "lucide-react";
import { Button } from "@/views/main/components/ui/button";
import {
  DialogClose,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/views/main/components/ui/dialog";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/views/main/components/ui/toggle-group";
import { ContentBrowserInstanceSelector } from "@/views/main/features/curseforge/components/content-browser-instance-selector";
import type {
  ContentBrowserSource,
  SelectedInstance,
} from "@/views/main/features/curseforge/curseforge-browser-types";

type ContentBrowserHeaderProps = {
  activeInstallActionsConfigured: boolean;
  activeInstance: SelectedInstance | null;
  activeSource: ContentBrowserSource;
  activeSourceLabel: string;
  availableInstances: Array<SelectedInstance>;
  canClearInstance: boolean;
  onSelectInstance: (instance: SelectedInstance | null) => void;
  onSourceChange: (source: ContentBrowserSource) => void;
  resultCountLabel: string;
};

export function ContentBrowserHeader({
  activeInstallActionsConfigured,
  activeInstance,
  activeSource,
  activeSourceLabel,
  availableInstances,
  canClearInstance,
  onSelectInstance,
  onSourceChange,
  resultCountLabel,
}: ContentBrowserHeaderProps) {
  return (
    <DialogHeader className="border-b border-border bg-card/80 px-4 py-3 sm:px-5">
      <div className="flex min-w-0 items-start gap-3">
        <div className="grid min-w-0 flex-1 gap-3 xl:grid-cols-[minmax(12rem,1fr)_minmax(20rem,28rem)]">
          <div className="min-w-0">
            <div className="flex min-w-0 flex-wrap items-center gap-3">
              <DialogTitle className="font-heading font-black text-xl leading-tight">
                Content Browser
              </DialogTitle>
              <ToggleGroup
                aria-label="Content source"
                onValueChange={(value) => {
                  const nextSource = value[0] as
                    | ContentBrowserSource
                    | undefined;
                  if (nextSource) onSourceChange(nextSource);
                }}
                value={[activeSource]}
              >
                <ToggleGroupItem type="button" value="curseforge">
                  CurseForge
                </ToggleGroupItem>
                <ToggleGroupItem type="button" value="modrinth">
                  Modrinth
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
            <DialogDescription className="sr-only">
              Browse CurseForge and Modrinth Minecraft content and choose an
              instance for install actions.
            </DialogDescription>
            <div className="mt-1 flex min-w-0 flex-wrap items-center gap-2 text-muted-foreground text-xs">
              <span>{activeSourceLabel}</span>
              <span className="text-primary">•</span>
              <span>{resultCountLabel}</span>
              <span className="text-primary">•</span>
              <span>
                {activeInstallActionsConfigured
                  ? "Install ready"
                  : "Browse only"}
              </span>
            </div>
          </div>

          <ContentBrowserInstanceSelector
            activeInstance={activeInstance}
            availableInstances={availableInstances}
            canClearInstance={canClearInstance}
            onSelectInstance={onSelectInstance}
          />
        </div>

        <DialogClose
          render={
            <Button className="shrink-0" size="icon-sm" variant="ghost" />
          }
        >
          <XIcon />
          <span className="sr-only">Close</span>
        </DialogClose>
      </div>
    </DialogHeader>
  );
}
