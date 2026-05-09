import {
  AlertCircleIcon,
  CheckCircle2Icon,
  DownloadIcon,
  HardDriveIcon,
  Loader2Icon,
  MemoryStickIcon,
  PackageIcon,
  PlayIcon,
  TriangleAlertIcon,
  UserIcon,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/views/main/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/views/main/components/ui/sheet";
import { rpc } from "@/views/main/lib/rpc";
import type { LaunchPlan } from "../../../../../shared/types";

type Props = {
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

export function LaunchPlanSheet({ open, onOpenChange, plan }: Props) {
  const [launchState, setLaunchState] = useState<LaunchState>("idle");
  const [failedArtifacts, setFailedArtifacts] = useState<
    Array<{ error: string; id: string }>
  >([]);

  const readyToLaunch =
    plan?.missingArtifacts.length === 0 ||
    launchState === "downloaded" ||
    launchState === "launched";

  const handleOpenChange = (next: boolean) => {
    onOpenChange(next);
    if (!next) {
      setLaunchState("idle");
      setFailedArtifacts([]);
    }
  };

  async function handleDownload() {
    if (!plan) return;
    setLaunchState("downloading");
    setFailedArtifacts([]);

    try {
      const result = await rpc.requestProxy.downloadArtifacts({ plan });

      if (result.failed.length > 0) {
        setFailedArtifacts(result.failed);
        toast.error(
          `${result.failed.length} artifact${result.failed.length === 1 ? "" : "s"} failed to download`,
        );
        setLaunchState("idle");
      } else {
        toast.success("All artifacts downloaded");
        setLaunchState("downloaded");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Download failed");
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
                      Offline mode
                    </p>
                  )}
                  {!plan.profile && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Sign in to a Microsoft account to play online.
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
                      : `Automatic${plan.java.majorVersion ? ` · Java ${plan.java.majorVersion}` : ""}`}
                  </p>
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
                      <p className="text-xs text-muted-foreground mb-1.5">
                        {plan.missingArtifacts.length} artifact
                        {plan.missingArtifacts.length !== 1 ? "s" : ""} to
                        download
                      </p>
                      <ul className="flex flex-col gap-1 max-h-36 overflow-y-auto">
                        {plan.missingArtifacts.map((a) => (
                          <li
                            key={a.id}
                            className="text-xs text-muted-foreground flex items-center gap-2"
                          >
                            <span className="shrink-0 rounded px-1 py-0.5 bg-muted text-[0.6rem] uppercase font-bold">
                              {a.kind}
                            </span>
                            <span className="truncate font-mono">{a.id}</span>
                          </li>
                        ))}
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
                  : "Download Artifacts"}
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
            {launchState === "launching" ? "Launching…" : "Launch"}
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
