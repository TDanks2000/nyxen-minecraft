import {
  FolderOpenIcon,
  PackageCheckIcon,
  PuzzleIcon,
  RefreshCcwIcon,
  ShieldCheckIcon,
} from "lucide-react";
import type { InstanceContent, LauncherInstance } from "@/shared/types";
import { Badge } from "@/views/main/components/ui/badge";
import { Button } from "@/views/main/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/views/main/components/ui/card";
import {
  formatContentModified,
  openInstancePath,
} from "@/views/main/features/instances/components/instance-content-format";
import { LOADER_LABELS } from "@/views/main/features/instances/components/instance-format";

export type InstanceModpackPanelProps = {
  content: InstanceContent | null;
  instance: LauncherInstance;
  modpackUpdateAvailable: boolean;
  modpackUpdateChecking: boolean;
  onUpdateModpack: () => void;
  updatingModpack: boolean;
};

export function InstanceModpackPanel({
  content,
  instance,
  modpackUpdateAvailable,
  modpackUpdateChecking,
  onUpdateModpack,
  updatingModpack,
}: InstanceModpackPanelProps) {
  const modpack = instance.modpack;
  const linkedModpack = modpack ?? content?.curseForge.modpacks?.[0] ?? null;
  const hasLinkedModpack = Boolean(linkedModpack);
  const modpackBusy = modpackUpdateChecking || updatingModpack;
  const modpackName = modpack?.name ?? linkedModpack?.name ?? "Linked modpack";
  const modpackVersion = modpack?.version ?? linkedModpack?.version ?? null;
  const sourceLabel =
    modpack?.source === "curseforge"
      ? "CurseForge"
      : modpack?.source === "modrinth"
        ? "Modrinth"
        : "Local metadata";
  const installedAt =
    modpack?.installedAt ?? linkedModpack?.installedAt ?? instance.createdAt;

  return (
    <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
      <Card className="overflow-hidden">
        <CardHeader className="border-border border-b bg-card/70">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-md border border-primary/35 bg-primary/10 text-primary">
              {hasLinkedModpack ? (
                <PackageCheckIcon className="size-5" />
              ) : (
                <PuzzleIcon className="size-5" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <CardTitle className="truncate">
                {hasLinkedModpack ? modpackName : "Custom instance"}
              </CardTitle>
              <CardDescription>
                {hasLinkedModpack
                  ? "This instance is linked to a managed modpack."
                  : "This instance is assembled from local settings and manually managed content."}
              </CardDescription>
            </div>
            <Badge variant={hasLinkedModpack ? "default" : "secondary"}>
              {hasLinkedModpack ? "Modpack linked" : "Custom"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 p-4">
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            <ModpackFact label="Source" value={sourceLabel} />
            <ModpackFact label="Version" value={modpackVersion ?? "Managed"} />
            <ModpackFact
              label="Installed"
              value={formatContentModified(installedAt)}
            />
            <ModpackFact
              label="Platform"
              value={`${instance.versionId} / ${LOADER_LABELS[instance.loader]}`}
            />
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            <ModpackCount label="Mods" value={content?.mods.length ?? 0} />
            <ModpackCount
              label="Resource packs"
              value={content?.resourcePacks.length ?? 0}
            />
            <ModpackCount
              label="Shaders"
              value={content?.shaderPacks.length ?? 0}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {hasLinkedModpack ? (
              <Button
                disabled={!modpackUpdateAvailable || modpackBusy}
                onClick={onUpdateModpack}
                variant={modpackUpdateAvailable ? "default" : "outline"}
              >
                <RefreshCcwIcon
                  data-icon="inline-start"
                  className={modpackBusy ? "animate-spin" : undefined}
                />
                {updatingModpack
                  ? "Updating..."
                  : modpackUpdateChecking
                    ? "Checking..."
                    : modpackUpdateAvailable
                      ? "Update Modpack"
                      : "Modpack Current"}
              </Button>
            ) : null}
            <Button
              onClick={() => openInstancePath(instance.instanceDirectory)}
              variant="outline"
            >
              <FolderOpenIcon data-icon="inline-start" />
              Open Instance Folder
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheckIcon className="size-4 text-primary" />
            Ownership
          </CardTitle>
          <CardDescription>
            {hasLinkedModpack
              ? "The linked pack owns the base install. Add-ons should be installed through the content browser when possible."
              : "Nyxen will treat mods, packs, and shaders as local content for this instance."}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm text-muted-foreground">
          <p>
            {hasLinkedModpack
              ? "Updating the modpack keeps the pack source authoritative. Locally added content should be reviewed before troubleshooting."
              : "Use the Mods tab for enable/disable work and the Browse Content button for catalog installs."}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function ModpackFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-md border border-border bg-background/55 px-3 py-2">
      <div className="text-muted-foreground text-xs">{label}</div>
      <div className="mt-1 truncate font-semibold text-sm">{value}</div>
    </div>
  );
}

function ModpackCount({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-0 rounded-md border border-border bg-muted/20 px-3 py-2">
      <div className="text-muted-foreground text-xs">{label}</div>
      <div className="mt-1 font-heading text-2xl font-black leading-none">
        {value}
      </div>
    </div>
  );
}
