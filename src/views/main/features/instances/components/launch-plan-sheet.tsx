import {
  AlertCircleIcon,
  CheckCircle2Icon,
  DownloadIcon,
  FolderDownIcon,
  HardDriveIcon,
  Loader2Icon,
  MemoryStickIcon,
  PackageIcon,
  PlayIcon,
  TriangleAlertIcon,
  UserIcon,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type {
  LaunchInstanceResult,
  LaunchPlan,
  LaunchPlanMissingArtifact,
} from "@/shared/types";
import { Button } from "@/views/main/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/views/main/components/ui/sheet";
import { useDownloadQueueStore } from "@/views/main/features/downloads/download-queue-store";
import { rpc } from "@/views/main/lib/rpc";

type Props = {
  onLaunched?: (launch: LaunchInstanceResult) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: LaunchPlan | null;
};

type LaunchState =
  | "idle"
  | "downloading"
  | "downloaded"
  | "launching"
  | "launched";

type LaunchArtifactGroup = {
  count: number;
  kind: LaunchPlanMissingArtifact["kind"];
  label: string;
};

const artifactKindLabels: Record<LaunchPlanMissingArtifact["kind"], string> = {
  assetIndex: "Asset indexes",
  assetObject: "Minecraft assets",
  clientJar: "Minecraft client",
  javaRuntime: "Java runtime",
  library: "Libraries",
  modLoaderInstaller: "Mod loader installer",
  nativeLibrary: "Native libraries",
  versionMetadata: "Version metadata",
};

const artifactKindOrder: Array<LaunchPlanMissingArtifact["kind"]> = [
  "versionMetadata",
  "javaRuntime",
  "clientJar",
  "modLoaderInstaller",
  "library",
  "nativeLibrary",
  "assetIndex",
  "assetObject",
];

const getLaunchArtifactDisplayName = (
  artifact: LaunchPlanMissingArtifact,
): string => {
  if (artifact.kind === "assetObject") {
    return `Asset ${artifact.id.replace(/^asset:/, "").slice(0, 12)}`;
  }

  if (artifact.kind === "clientJar") {
    return "Minecraft client jar";
  }

  if (artifact.kind === "assetIndex") {
    return `Asset index ${artifact.id}`;
  }

  return artifact.id;
};

const groupLaunchArtifacts = (
  artifacts: Array<LaunchPlanMissingArtifact>,
): Array<LaunchArtifactGroup> => {
  const groups = new Map<
    LaunchPlanMissingArtifact["kind"],
    LaunchArtifactGroup
  >();

  for (const artifact of artifacts) {
    const existing = groups.get(artifact.kind);

    if (existing) {
      existing.count += 1;
      continue;
    }

    groups.set(artifact.kind, {
      count: 1,
      kind: artifact.kind,
      label: artifactKindLabels[artifact.kind] ?? artifact.kind,
    });
  }

  return Array.from(groups.values()).sort(
    (a, b) =>
      artifactKindOrder.indexOf(a.kind) - artifactKindOrder.indexOf(b.kind),
  );
};

export function LaunchPlanSheet({
  onLaunched,
  open,
  onOpenChange,
  plan,
}: Props) {
  const [launchState, setLaunchState] = useState<LaunchState>("idle");
  const [failedArtifacts, setFailedArtifacts] = useState<
    Array<{ error: string; id: string }>
  >([]);
  const enqueueDownloadJob = useDownloadQueueStore(
    (state) => state.enqueueDownloadJob,
  );
  const waitForDownloadJob = useDownloadQueueStore(
    (state) => state.waitForDownloadJob,
  );
  const planInstanceId = plan?.instance.id ?? null;

  const hasVerifiedProfile = plan?.profile?.kind === "microsoft";
  const readyToLaunch =
    hasVerifiedProfile &&
    (plan?.missingArtifacts.length === 0 ||
      launchState === "downloaded" ||
      launchState === "launched");
  const javaRuntimeArtifactCount =
    plan?.missingArtifacts.filter((artifact) => artifact.kind === "javaRuntime")
      .length ?? 0;
  const missingArtifactGroups = useMemo(
    () => groupLaunchArtifacts(plan?.missingArtifacts ?? []),
    [plan?.missingArtifacts],
  );
  const visibleArtifactPreview = plan?.missingArtifacts.slice(0, 6) ?? [];
  const hiddenArtifactPreviewCount = Math.max(
    0,
    (plan?.missingArtifacts.length ?? 0) - visibleArtifactPreview.length,
  );

  useEffect(() => {
    if (planInstanceId === null) {
      setLaunchState("idle");
      setFailedArtifacts([]);
      return;
    }

    setLaunchState("idle");
    setFailedArtifacts([]);
  }, [planInstanceId]);

  const handleOpenChange = (next: boolean) => {
    onOpenChange(next);
    if (!next && launchState !== "downloading") {
      setLaunchState("idle");
      setFailedArtifacts([]);
    }
  };

  async function handleDownload() {
    if (!plan) return;

    setLaunchState("downloading");
    setFailedArtifacts([]);

    try {
      const job = await enqueueDownloadJob({
        input: { plan },
        kind: "launchArtifacts",
      });
      const finishedJob = await waitForDownloadJob(job.id);
      const result =
        finishedJob.result?.kind === "launchArtifacts"
          ? finishedJob.result.result
          : null;
      const failed =
        result?.failed ??
        finishedJob.items
          .filter((item) => item.status === "failed")
          .map((item) => ({
            error: item.error ?? "Download failed",
            id: item.id,
          }));

      if (finishedJob.status === "failed" || failed.length > 0) {
        setFailedArtifacts(failed);
        toast.error(
          `${Math.max(1, failed.length)} artifact${failed.length === 1 ? "" : "s"} failed to download`,
        );
        setLaunchState("idle");
      } else {
        toast.success("All required files downloaded");
        setLaunchState("downloaded");
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "Download failed";
      toast.error(message);
      setLaunchState("idle");
    }
  }

  async function handleLaunch() {
    if (!plan) return;
    setLaunchState("launching");

    try {
      const result = await rpc.requestProxy.launchInstance({ plan });
      setLaunchState("launched");
      toast.success(`Minecraft started (PID ${result.pid})`);
      onLaunched?.(result);
      handleOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Launch failed");
      setLaunchState(launchState === "downloaded" ? "downloaded" : "idle");
    }
  }

  const busy =
    launchState === "downloading" ||
    launchState === "launching" ||
    launchState === "launched";

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        side="right"
        className="flex w-[440px] flex-col overflow-hidden p-0"
        style={{
          height: "calc(100vh - 3rem)",
          top: "3rem",
        }}
      >
        {/* Header */}
        <SheetHeader className="border-b px-5 py-4">
          <SheetTitle className="text-base">Launch Plan</SheetTitle>
          <SheetDescription className="text-xs">
            Pre-flight summary for{" "}
            <span className="font-medium text-foreground">
              {plan?.instance.name ?? "this instance"}
            </span>
          </SheetDescription>
        </SheetHeader>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto">
          {plan && (
            <div className="flex flex-col divide-y divide-border">
              {/* Instance */}
              <div className="flex items-start gap-3 px-5 py-4">
                <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <PackageIcon className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[0.65rem] font-bold uppercase tracking-widest text-muted-foreground mb-0.5">
                    Instance
                  </p>
                  <p className="font-semibold truncate">{plan.instance.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {plan.instance.versionId}
                    <span className="mx-1.5 opacity-40">·</span>
                    {plan.instance.loader}
                  </p>
                </div>
              </div>

              {/* Profile */}
              <div className="flex items-start gap-3 px-5 py-4">
                <div
                  className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md ${plan.profile ? "bg-primary/10 text-primary" : "bg-amber-500/10 text-amber-500"}`}
                >
                  <UserIcon className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[0.65rem] font-bold uppercase tracking-widest text-muted-foreground mb-0.5">
                    Account
                  </p>
                  {plan.profile ? (
                    <p className="font-medium text-sm">
                      {plan.profile.displayName}
                    </p>
                  ) : (
                    <p className="text-sm text-amber-500 font-medium">
                      No verified profile
                    </p>
                  )}
                  {!plan.profile && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Add a verified Microsoft profile before launching.
                    </p>
                  )}
                </div>
              </div>

              {/* Java */}
              <div className="flex items-start gap-3 px-5 py-4">
                <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <MemoryStickIcon className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[0.65rem] font-bold uppercase tracking-widest text-muted-foreground mb-0.5">
                    Java
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Memory:{" "}
                    <span className="font-medium text-foreground">
                      {plan.java.memoryMinMb}–{plan.java.memoryMaxMb} MB
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {plan.java.management === "app-controlled"
                      ? `Managed Java ${plan.java.majorVersion ?? "runtime"}${plan.java.runtimeVersion ? ` (${plan.java.runtimeVersion})` : ""}`
                      : `System Java${plan.java.majorVersion ? ` · Java ${plan.java.majorVersion}` : ""}`}
                  </p>
                  {plan.java.management === "app-controlled" ? (
                    <div className="mt-2 flex flex-col gap-1.5">
                      <p className="text-xs text-muted-foreground">
                        Nyxen downloads the Mojang runtime required by this
                        Minecraft version, then launches with the managed Java
                        executable below.
                      </p>
                      {plan.java.runtimeDirectory && (
                        <div className="flex items-start gap-2 rounded-md bg-muted/60 px-2 py-1.5">
                          <FolderDownIcon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                          <div className="min-w-0">
                            <p className="text-[0.65rem] font-bold uppercase tracking-widest text-muted-foreground">
                              Installed under
                            </p>
                            <p className="break-all font-mono text-muted-foreground text-xs">
                              {plan.java.runtimeDirectory}
                            </p>
                          </div>
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {javaRuntimeArtifactCount > 0
                          ? `${javaRuntimeArtifactCount} Java runtime file${javaRuntimeArtifactCount === 1 ? "" : "s"} pending download.`
                          : "Managed Java files are already present for this plan."}
                      </p>
                    </div>
                  ) : (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Nyxen will use the instance Java executable when set,
                      otherwise it will ask the operating system for java.
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-0.5 font-mono break-all">
                    {plan.java.executable}
                  </p>
                </div>
              </div>

              {/* Warnings */}
              {plan.warnings.length > 0 && (
                <div className="flex items-start gap-3 px-5 py-4">
                  <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-amber-500/10 text-amber-500">
                    <TriangleAlertIcon className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[0.65rem] font-bold uppercase tracking-widest text-amber-500 mb-1.5">
                      Warnings ({plan.warnings.length})
                    </p>
                    <ul className="flex flex-col gap-1.5">
                      {plan.warnings.map((w) => (
                        <li
                          key={w}
                          className="text-xs text-amber-600 dark:text-amber-400 bg-amber-500/10 rounded-md px-2.5 py-1.5 border border-amber-500/20"
                        >
                          {w}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* Artifacts */}
              <div className="flex items-start gap-3 px-5 py-4">
                <div
                  className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md ${
                    failedArtifacts.length > 0
                      ? "bg-destructive/10 text-destructive"
                      : plan.missingArtifacts.length === 0 ||
                          launchState === "downloaded"
                        ? "bg-green-500/10 text-green-600 dark:text-green-400"
                        : "bg-primary/10 text-primary"
                  }`}
                >
                  <HardDriveIcon className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[0.65rem] font-bold uppercase tracking-widest text-muted-foreground mb-1">
                    Artifacts
                  </p>

                  {launchState === "downloaded" &&
                  failedArtifacts.length === 0 ? (
                    <p className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400 font-medium">
                      <CheckCircle2Icon className="size-3.5 shrink-0" />
                      All artifacts downloaded
                    </p>
                  ) : plan.missingArtifacts.length === 0 ? (
                    <p className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400 font-medium">
                      <CheckCircle2Icon className="size-3.5 shrink-0" />
                      All artifacts present
                    </p>
                  ) : (
                    <>
                      <p className="font-medium text-sm text-foreground">
                        Download required files before launch
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {plan.missingArtifacts.length} artifact
                        {plan.missingArtifacts.length !== 1 ? "s" : ""} to
                        download. The right sidebar shows the active download
                        set while Nyxen prepares this instance.
                      </p>
                      <div className="mt-2 grid gap-1.5">
                        {missingArtifactGroups.map((group) => (
                          <div
                            className="flex items-center justify-between gap-3 rounded-md border border-border bg-muted/35 px-2.5 py-1.5 text-xs"
                            key={group.kind}
                          >
                            <span className="truncate font-medium">
                              {group.label}
                            </span>
                            <span className="shrink-0 rounded bg-background px-1.5 py-0.5 font-semibold text-muted-foreground tabular-nums">
                              {group.count}
                            </span>
                          </div>
                        ))}
                      </div>
                      <ul className="mt-2 flex max-h-32 flex-col gap-1 overflow-y-auto">
                        {visibleArtifactPreview.map((a) => (
                          <li
                            key={a.id}
                            className="text-xs text-muted-foreground flex items-center gap-2"
                          >
                            <span className="shrink-0 rounded px-1 py-0.5 bg-muted text-[0.6rem] uppercase font-bold">
                              {a.kind}
                            </span>
                            <span className="truncate font-mono">
                              {getLaunchArtifactDisplayName(a)}
                            </span>
                          </li>
                        ))}
                        {hiddenArtifactPreviewCount > 0 ? (
                          <li className="text-muted-foreground text-xs">
                            +{hiddenArtifactPreviewCount} more file
                            {hiddenArtifactPreviewCount === 1 ? "" : "s"}
                          </li>
                        ) : null}
                      </ul>
                    </>
                  )}

                  {failedArtifacts.length > 0 && (
                    <div className="mt-2">
                      <p className="flex items-center gap-1.5 text-xs text-destructive font-medium mb-1">
                        <AlertCircleIcon className="size-3.5 shrink-0" />
                        {failedArtifacts.length} download
                        {failedArtifacts.length !== 1 ? "s" : ""} failed
                      </p>
                      <ul className="flex flex-col gap-1 max-h-24 overflow-y-auto">
                        {failedArtifacts.map((a) => (
                          <li
                            key={a.id}
                            className="text-xs text-destructive/80 bg-destructive/5 rounded px-2 py-1 border border-destructive/20"
                          >
                            <span className="font-mono truncate block">
                              {a.id}
                            </span>
                            <span className="text-destructive/60">
                              {a.error}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>

              {/* Game directory */}
              <div className="flex items-start gap-3 px-5 py-4">
                <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <HardDriveIcon className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[0.65rem] font-bold uppercase tracking-widest text-muted-foreground mb-0.5">
                    Game Directory
                  </p>
                  <p className="text-xs font-mono break-all text-muted-foreground">
                    {plan.directories.game}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <SheetFooter className="flex-col gap-2 border-t px-5 py-4">
          {plan && plan.missingArtifacts.length > 0 && (
            <Button
              className="w-full"
              variant={launchState === "downloaded" ? "outline" : "default"}
              onClick={handleDownload}
              disabled={busy}
            >
              {launchState === "downloading" ? (
                <Loader2Icon
                  data-icon="inline-start"
                  className="animate-spin"
                />
              ) : (
                <DownloadIcon data-icon="inline-start" />
              )}
              {launchState === "downloading"
                ? "Downloading…"
                : launchState === "downloaded"
                  ? "Re-download"
                  : "Download Required Files"}
            </Button>
          )}

          <Button
            className="w-full"
            onClick={handleLaunch}
            disabled={!readyToLaunch || busy}
          >
            {launchState === "launching" ? (
              <Loader2Icon data-icon="inline-start" className="animate-spin" />
            ) : (
              <PlayIcon data-icon="inline-start" />
            )}
            {!plan
              ? "Launch"
              : !hasVerifiedProfile
                ? "Profile Required"
                : launchState === "launching"
                  ? "Launching…"
                  : "Launch"}
          </Button>

          <Button
            variant="ghost"
            className="w-full"
            onClick={() => handleOpenChange(false)}
            disabled={launchState === "launching"}
          >
            Close
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
