import {
  AlertTriangleIcon,
  CheckCircle2Icon,
  FolderOpenIcon,
  Loader2Icon,
  PlusIcon,
  ServerIcon,
  Trash2Icon,
  WrenchIcon,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type {
  InstanceContent,
  InstanceServerFileCandidate,
  InstanceServerRequirement,
  InstanceServerWorkspace,
  LauncherInstance,
  ModLoader,
} from "@/shared/types";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/views/main/components/ui/alert-dialog";
import { Badge } from "@/views/main/components/ui/badge";
import { Button } from "@/views/main/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/views/main/components/ui/card";
import { Checkbox } from "@/views/main/components/ui/checkbox";
import { Input } from "@/views/main/components/ui/input";
import { Label } from "@/views/main/components/ui/label";
import { InstanceCatalogEmptyPanel } from "@/views/main/features/instances/components/instance-catalog-empty-panel";
import { InstanceCatalogFileCard } from "@/views/main/features/instances/components/instance-catalog-file-card";
import {
  formatContentBytes,
  openInstancePath,
} from "@/views/main/features/instances/components/instance-content-format";
import { rpc } from "@/views/main/lib/rpc";
import { cn } from "@/views/main/lib/utils";

type InstanceServerManagerPanelProps = {
  content: InstanceContent | null;
  instance: LauncherInstance;
  onServerContentUpdated: (content: InstanceContent) => void;
  serverList: InstanceContent["serverList"];
};

const requirementStyles: Record<
  InstanceServerRequirement["status"],
  { className: string; label: string }
> = {
  missing: {
    className: "border-destructive/25 bg-destructive/5 text-destructive",
    label: "Missing",
  },
  ready: {
    className: "border-success/30 bg-success/10 text-success",
    label: "Ready",
  },
  warning: {
    className: "border-warning/30 bg-warning/10 text-warning",
    label: "Review",
  },
};

const sideBorderStyles: Record<InstanceServerFileCandidate["side"], string> = {
  clientOnly: "border-l-chart-3/50",
  optional: "border-l-warning/45",
  server: "border-l-success/60",
  unknown: "border-l-muted-foreground/20",
};

const sideLabels: Record<InstanceServerFileCandidate["side"], string> = {
  clientOnly: "Client",
  optional: "Optional",
  server: "Server",
  unknown: "Review",
};

const sourceLabels: Record<InstanceServerFileCandidate["source"], string> = {
  config: "Config",
  mod: "Mod",
  resourcePack: "Resource pack",
};

const getCreationSteps = (loader: ModLoader): Array<string> => {
  const base = ["Creating server folder", "Copying mods and configs"];

  if (loader === "vanilla") {
    return [
      ...base,
      "Downloading Minecraft server jar",
      "Writing startup scripts",
    ];
  }
  if (loader === "fabric") {
    return [
      ...base,
      "Downloading Fabric server launcher",
      "Writing startup scripts",
    ];
  }
  if (loader === "quilt") {
    return [...base, "Downloading Quilt installer", "Writing startup scripts"];
  }
  return [...base, "Copying loader installer", "Writing startup scripts"];
};

function RequirementItem({
  requirement,
}: {
  requirement: InstanceServerRequirement;
}) {
  const style = requirementStyles[requirement.status];
  const Icon =
    requirement.status === "ready" ? CheckCircle2Icon : AlertTriangleIcon;

  return (
    <div className={cn("rounded-lg border p-3", style.className)}>
      <div className="flex items-start gap-2">
        <Icon className="mt-0.5 size-4 shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-heading font-semibold text-sm">
              {requirement.title}
            </h3>
            <Badge variant="outline">{style.label}</Badge>
          </div>
          <p className="mt-1 text-xs opacity-85">{requirement.description}</p>
        </div>
      </div>
    </div>
  );
}

function CandidateRow({
  candidate,
}: {
  candidate: InstanceServerFileCandidate;
}) {
  const isSelected = candidate.selectedByDefault || candidate.side === "server";

  return (
    <div
      className={cn(
        "flex min-w-0 items-start justify-between gap-3 rounded-lg border border-border border-l-2 bg-background/45 p-3",
        sideBorderStyles[candidate.side],
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          <h3 className="truncate font-heading font-semibold text-sm">
            {candidate.entry.displayName}
          </h3>
          <Badge variant={isSelected ? "secondary" : "outline"}>
            {sideLabels[candidate.side]}
          </Badge>
          <Badge variant="ghost">{sourceLabels[candidate.source]}</Badge>
        </div>
        <p className="mt-1 line-clamp-2 text-muted-foreground text-xs">
          {candidate.reason}
        </p>
      </div>
      <div className="shrink-0 text-right text-muted-foreground text-xs">
        {formatContentBytes(candidate.entry.sizeBytes)}
      </div>
    </div>
  );
}

function ServerWorkspaceCard({
  server,
  onDelete,
  deleting,
}: {
  server: InstanceServerWorkspace;
  onDelete: () => void;
  deleting: boolean;
}) {
  const hasLauncher = !!(server.serverJar || server.loaderLauncher);

  return (
    <article className="overflow-hidden rounded-lg border border-border bg-background/45">
      <div className="flex items-start gap-3 p-3">
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-heading font-semibold text-sm">
            {server.name}
          </h3>
          <p className="mt-0.5 truncate font-mono text-muted-foreground text-xs">
            {server.path}
          </p>
        </div>
        <Button
          aria-label={`Open ${server.name}`}
          onClick={() => openInstancePath(server.path)}
          size="icon-sm"
          variant="ghost"
        >
          <FolderOpenIcon />
        </Button>
      </div>

      <div className="flex flex-wrap gap-1.5 px-3 pb-3">
        <Badge variant={hasLauncher ? "secondary" : "destructive"}>
          {server.loaderLauncher?.displayName ??
            server.serverJar?.displayName ??
            "No launcher"}
        </Badge>
        <Badge variant={server.eula ? "secondary" : "outline"}>
          {server.eula ? "EULA" : "No EULA"}
        </Badge>
        <Badge variant={server.runScript ? "secondary" : "outline"}>
          {server.runScript ? "start.sh" : "No script"}
        </Badge>
        <Badge variant="ghost">
          {server.mods.length} mod{server.mods.length === 1 ? "" : "s"}
        </Badge>
      </div>

      <div className="border-t border-border px-2 py-1.5">
        <Button
          className="w-full justify-start text-destructive hover:text-destructive"
          disabled={deleting}
          onClick={onDelete}
          size="sm"
          variant="ghost"
        >
          {deleting ? (
            <Loader2Icon
              className="size-3.5 animate-spin"
              data-icon="inline-start"
            />
          ) : (
            <Trash2Icon className="size-3.5" data-icon="inline-start" />
          )}
          {deleting ? "Deleting…" : "Delete server"}
        </Button>
      </div>
    </article>
  );
}

export function InstanceServerManagerPanel({
  content,
  instance,
  onServerContentUpdated,
  serverList,
}: InstanceServerManagerPanelProps) {
  const manager = content?.serverManager ?? null;
  const [serverName, setServerName] = useState(
    manager?.defaultServerName ?? `${instance.name} Server`,
  );
  const [acceptEula, setAcceptEula] = useState(false);
  const [includeClientOnlyMods, setIncludeClientOnlyMods] = useState(false);
  const [creating, setCreating] = useState(false);
  const [creationStep, setCreationStep] = useState(0);
  const [deleteTarget, setDeleteTarget] =
    useState<InstanceServerWorkspace | null>(null);
  const [deletingServerId, setDeletingServerId] = useState<string | null>(null);

  const creationSteps = useMemo(
    () => getCreationSteps(instance.loader),
    [instance.loader],
  );

  useEffect(() => {
    if (!creating) {
      setCreationStep(0);
      return;
    }

    const t1 = setTimeout(() => setCreationStep(1), 700);
    const t2 = setTimeout(() => setCreationStep(2), 2200);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [creating]);

  const visibleCandidates = useMemo(
    () => manager?.candidates.slice(0, 12) ?? [],
    [manager?.candidates],
  );
  const selectedCandidateCount =
    manager?.candidates.filter(
      (candidate) =>
        candidate.selectedByDefault ||
        (includeClientOnlyMods && candidate.side === "clientOnly"),
    ).length ?? 0;

  const createServer = () => {
    if (creating) return;

    void (async () => {
      setCreating(true);

      try {
        const result = await rpc.requestProxy.createInstanceServer({
          acceptEula,
          includeClientOnlyMods,
          instanceId: instance.id,
          name: serverName,
        });

        onServerContentUpdated(result.content);
        toast.success(`${result.server.name} created`);
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to create server",
        );
      } finally {
        setCreating(false);
      }
    })();
  };

  const deleteServer = () => {
    if (!deleteTarget || deletingServerId) return;

    const target = deleteTarget;

    void (async () => {
      setDeletingServerId(target.id);

      try {
        const result = await rpc.requestProxy.deleteInstanceServer({
          instanceId: instance.id,
          serverId: target.id,
        });

        onServerContentUpdated(result.content);
        toast.success(
          result.deleted ? `${target.name} deleted` : "Server already gone",
        );
        setDeleteTarget(null);
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to delete server",
        );
        setDeleteTarget(null);
      } finally {
        setDeletingServerId(null);
      }
    })();
  };

  const loaderTitle =
    instance.loader === "vanilla"
      ? "Vanilla server"
      : `${instance.loader} server`;
  const loaderText =
    instance.loader === "fabric"
      ? "Nyxen downloads the Fabric server launcher and creates run.sh."
      : instance.loader === "forge" || instance.loader === "neoforge"
        ? "Nyxen copies the matching installer and creates install-loader.sh plus run.sh."
        : instance.loader === "quilt"
          ? "Nyxen downloads the Quilt installer and creates install-loader.sh plus run.sh."
          : "Nyxen downloads server.jar and creates run.sh.";

  const requirementSummary = useMemo(() => {
    const reqs = manager?.requirements ?? [];
    const ready = reqs.filter((r) => r.status === "ready").length;
    const total = reqs.length;
    return total > 0 ? { ready, total } : null;
  }, [manager?.requirements]);

  return (
    <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(17rem,22rem)]">
      {/* ── Main column ─────────────────────────────────────── */}
      <div className="flex min-w-0 flex-col gap-4">
        {/* Create server */}
        <Card className="border-primary/25 bg-primary/5">
          <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <CardTitle className="flex min-w-0 items-center gap-2">
                <WrenchIcon className="size-4 shrink-0 text-primary" />
                <span className="truncate">Create {loaderTitle}</span>
              </CardTitle>
              <p className="mt-1 text-muted-foreground text-sm">{loaderText}</p>
            </div>
            <Badge className="shrink-0" variant="secondary">
              {selectedCandidateCount} files selected
            </Badge>
          </CardHeader>
          <CardContent className="grid min-w-0 gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
            <div className="grid min-w-0 gap-2">
              <Label htmlFor="server-name">Server name</Label>
              <Input
                disabled={creating}
                id="server-name"
                onChange={(event) => setServerName(event.target.value)}
                value={serverName}
              />
            </div>
            <Button
              className="h-10 w-full md:w-auto"
              disabled={creating}
              onClick={createServer}
            >
              {creating ? (
                <Loader2Icon
                  className="size-4 animate-spin"
                  data-icon="inline-start"
                />
              ) : (
                <PlusIcon data-icon="inline-start" />
              )}
              {creating ? "Creating…" : "Create Server"}
            </Button>

            <div className="grid min-w-0 gap-2 md:col-span-2 lg:grid-cols-2">
              <div className="flex min-w-0 items-start gap-3 rounded-lg border border-border bg-background/60 p-3 text-sm">
                <Checkbox
                  id="server-accept-eula"
                  checked={acceptEula}
                  disabled={creating}
                  onCheckedChange={(checked) => setAcceptEula(checked === true)}
                />
                <Label
                  className="block min-w-0 leading-normal"
                  htmlFor="server-accept-eula"
                >
                  <span className="block font-medium">Accept EULA now</span>
                  <span className="block text-muted-foreground text-xs">
                    Leave off to review eula.txt first.
                  </span>
                </Label>
              </div>
              <div className="flex min-w-0 items-start gap-3 rounded-lg border border-border bg-background/60 p-3 text-sm">
                <Checkbox
                  id="server-include-client-mods"
                  checked={includeClientOnlyMods}
                  disabled={creating}
                  onCheckedChange={(checked) =>
                    setIncludeClientOnlyMods(checked === true)
                  }
                />
                <Label
                  className="block min-w-0 leading-normal"
                  htmlFor="server-include-client-mods"
                >
                  <span className="block font-medium">
                    Copy client-only mods
                  </span>
                  <span className="block text-muted-foreground text-xs">
                    Usually keep this off.
                  </span>
                </Label>
              </div>
            </div>

            {creating && (
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 md:col-span-2">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary/80">
                  Setting up server
                </p>
                <div className="flex flex-col gap-1.5">
                  {creationSteps.map((step, index) => (
                    <div
                      className={cn(
                        "flex items-center gap-2 text-xs transition-colors",
                        index < creationStep
                          ? "text-muted-foreground"
                          : index === creationStep
                            ? "text-foreground"
                            : "text-muted-foreground/35",
                      )}
                      key={step}
                    >
                      {index < creationStep ? (
                        <CheckCircle2Icon className="size-3 shrink-0 text-success" />
                      ) : index === creationStep ? (
                        <Loader2Icon className="size-3 shrink-0 animate-spin text-primary" />
                      ) : (
                        <div className="size-3 shrink-0 rounded-full border border-muted-foreground/20" />
                      )}
                      {step}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Detected files */}
        <Card>
          <CardHeader>
            <div className="min-w-0">
              <CardTitle>Detected Files</CardTitle>
              <p className="mt-0.5 text-muted-foreground text-xs">
                Files that can be copied into a new server. Green = server-side,
                blue = client-only.
              </p>
            </div>
            <CardAction>
              <Badge variant="secondary">
                {selectedCandidateCount} selected
              </Badge>
            </CardAction>
          </CardHeader>
          <CardContent>
            {visibleCandidates.length === 0 ? (
              <InstanceCatalogEmptyPanel
                description="Add mods, configs, or resource packs to this instance and refresh content to see what can be copied into a server."
                icon={ServerIcon}
                title="No server candidates found"
              />
            ) : (
              <div className="grid min-w-0 gap-2 lg:grid-cols-2">
                {visibleCandidates.map((candidate) => (
                  <CandidateRow
                    candidate={candidate}
                    key={`${candidate.source}:${candidate.entry.id}`}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Client server list */}
        {serverList ? (
          <Card>
            <CardHeader>
              <CardTitle>Client Server List</CardTitle>
            </CardHeader>
            <CardContent>
              <InstanceCatalogFileCard entry={serverList} />
            </CardContent>
          </Card>
        ) : null}
      </div>

      {/* ── Sidebar ─────────────────────────────────────────── */}
      <aside className="flex min-w-0 flex-col gap-4">
        {/* Existing server folders */}
        <Card>
          <CardHeader>
            <div className="min-w-0">
              <CardTitle>Server Folders</CardTitle>
              <p className="mt-0.5 text-muted-foreground text-xs">
                Servers created for this instance.
              </p>
            </div>
            <CardAction>
              <Button
                onClick={() =>
                  openInstancePath(manager?.serverRoot ?? instance.folders.app)
                }
                size="sm"
                variant="outline"
              >
                <FolderOpenIcon data-icon="inline-start" />
                Open
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            {manager?.workspaces.length ? (
              <div className="grid min-w-0 gap-3">
                {manager.workspaces.map((server) => (
                  <ServerWorkspaceCard
                    key={server.id}
                    server={server}
                    deleting={deletingServerId === server.id}
                    onDelete={() => setDeleteTarget(server)}
                  />
                ))}
              </div>
            ) : (
              <InstanceCatalogEmptyPanel
                description="Created servers stay inside this instance so client files and server files are easy to compare."
                icon={ServerIcon}
                title="No servers created"
              />
            )}
          </CardContent>
        </Card>

        {/* Requirements */}
        {(manager?.requirements.length ?? 0) > 0 && (
          <Card>
            <CardHeader>
              <div className="min-w-0">
                <CardTitle>Requirements</CardTitle>
                {requirementSummary && (
                  <p className="mt-0.5 text-muted-foreground text-xs">
                    {requirementSummary.ready} of {requirementSummary.total}{" "}
                    ready
                  </p>
                )}
              </div>
            </CardHeader>
            <CardContent className="grid gap-2">
              {(manager?.requirements ?? []).map((requirement) => (
                <RequirementItem
                  key={requirement.id}
                  requirement={requirement}
                />
              ))}
            </CardContent>
          </Card>
        )}
      </aside>

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open && !deletingServerId) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete server?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget
                ? `${deleteTarget.name} and its generated server files will be removed.`
                : "This server folder will be removed."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!deletingServerId}>
              Cancel
            </AlertDialogCancel>
            <Button
              disabled={!!deletingServerId}
              onClick={deleteServer}
              variant="destructive"
            >
              {deletingServerId ? (
                <>
                  <Loader2Icon
                    className="size-4 animate-spin"
                    data-icon="inline-start"
                  />
                  Deleting…
                </>
              ) : (
                <>
                  <Trash2Icon data-icon="inline-start" />
                  Delete
                </>
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
