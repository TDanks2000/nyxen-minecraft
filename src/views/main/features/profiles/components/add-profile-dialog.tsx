import {
  CheckCircle2Icon,
  CopyIcon,
  Loader2Icon,
  ShieldCheckIcon,
  SquareArrowOutUpRightIcon,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/views/main/components/ui/alert";
import { Button } from "@/views/main/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/views/main/components/ui/dialog";
import { rpc } from "@/views/main/lib/rpc";
import type {
  LauncherProfile,
  MicrosoftProfileLoginStart,
} from "../../../../../shared/types";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (profile: LauncherProfile) => void;
};

type FlowState = "idle" | "starting" | "waitingForSignIn" | "verifying";

const wait = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

const copyText = async (value: string, label: string): Promise<void> => {
  try {
    await navigator.clipboard.writeText(value);
    toast.success(`${label} copied`);
  } catch {
    toast.error(`Could not copy ${label.toLowerCase()}`);
  }
};

export function AddProfileDialog({ open, onOpenChange, onCreated }: Props) {
  const [login, setLogin] = useState<MicrosoftProfileLoginStart | null>(null);
  const [flowState, setFlowState] = useState<FlowState>("idle");
  const [verificationMessage, setVerificationMessage] = useState<string | null>(
    null,
  );
  const [microsoftSignedIn, setMicrosoftSignedIn] = useState(false);
  const verificationRunId = useRef(0);

  const busy = flowState === "starting" || flowState === "verifying";
  const waitingForSignIn = flowState === "waitingForSignIn";
  const verifying = flowState === "verifying";
  const loginExpired = login
    ? Date.now() >= Date.parse(login.expiresAt)
    : false;

  const resetFlow = () => {
    verificationRunId.current += 1;
    setLogin(null);
    setFlowState("idle");
    setVerificationMessage(null);
    setMicrosoftSignedIn(false);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    onOpenChange(nextOpen);

    if (!nextOpen) {
      resetFlow();
    }
  };

  async function handleStartLogin() {
    const runId = ++verificationRunId.current;
    setFlowState("starting");
    setVerificationMessage(null);
    setMicrosoftSignedIn(false);

    try {
      const result = await rpc.requestProxy.startMicrosoftProfileLogin(null);
      setLogin(result);
      void watchMicrosoftSignIn(result, runId);
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Failed to start Microsoft sign-in",
      );
      if (verificationRunId.current === runId) {
        setFlowState("idle");
      }
    }
  }

  async function watchMicrosoftSignIn(
    activeLogin: MicrosoftProfileLoginStart,
    runId: number,
  ) {
    setFlowState("waitingForSignIn");
    setVerificationMessage("Waiting for Microsoft sign-in to finish.");

    try {
      while (verificationRunId.current === runId) {
        if (Date.now() >= Date.parse(activeLogin.expiresAt)) {
          setVerificationMessage(
            "This sign-in code expired. Start a new Microsoft sign-in.",
          );
          setFlowState("idle");
          return;
        }

        const result = await rpc.requestProxy.pollMicrosoftProfileSignIn({
          deviceCode: activeLogin.deviceCode,
        });

        setVerificationMessage(result.message);

        if (result.status === "signedIn") {
          setMicrosoftSignedIn(true);
          setFlowState("idle");
          return;
        }

        await wait(Math.max(1, Math.min(result.retryAfterSeconds, 5)) * 1000);
      }
    } catch (e) {
      toast.error(
        e instanceof Error
          ? e.message
          : "Failed while waiting for Microsoft sign-in",
      );
      if (verificationRunId.current === runId) {
        setFlowState("idle");
      }
    } finally {
      if (verificationRunId.current === runId) {
        setFlowState((current) =>
          current === "waitingForSignIn" ? "idle" : current,
        );
      }
    }
  }

  async function handleVerifyLogin() {
    if (!login || loginExpired) {
      toast.error("Start a new Microsoft sign-in first");
      return;
    }

    if (!microsoftSignedIn) {
      toast.error("Finish Microsoft sign-in first");
      return;
    }

    setFlowState("verifying");
    setVerificationMessage("Checking Minecraft ownership.");
    const runId = ++verificationRunId.current;

    try {
      while (verificationRunId.current === runId) {
        const result = await rpc.requestProxy.completeMicrosoftProfileLogin({
          deviceCode: login.deviceCode,
        });

        if (result.status === "complete") {
          toast.success("Microsoft profile verified");
          onCreated(result.profile);
          handleOpenChange(false);
          return;
        }

        setVerificationMessage(result.message);

        await wait(Math.max(1, Math.min(result.retryAfterSeconds, 5)) * 1000);
      }
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Failed to verify Minecraft ownership",
      );
    } finally {
      if (verificationRunId.current === runId) {
        setFlowState("idle");
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Microsoft Profile</DialogTitle>
          <DialogDescription>
            Profiles are created from the Minecraft account returned by
            Microsoft sign-in.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-1">
          {!login ? (
            <Alert>
              <ShieldCheckIcon />
              <AlertTitle>Verified accounts only</AlertTitle>
              <AlertDescription>
                The launcher checks for the Java Edition license before saving a
                profile.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="flex flex-col gap-3 rounded-lg border bg-muted/35 p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-muted-foreground text-xs font-bold uppercase">
                    Microsoft Code
                  </p>
                  <p className="mt-1 font-mono font-bold text-2xl tracking-normal">
                    {login.userCode}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  onClick={() => copyText(login.userCode, "Code")}
                  aria-label="Copy Microsoft sign-in code"
                >
                  <CopyIcon />
                </Button>
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full justify-start gap-2 font-mono text-xs"
                onClick={async () => {
                  await copyText(login.userCode, "Code");
                  await rpc.requestProxy.openExternal({
                    url: login.verificationUri,
                  });
                }}
                aria-label="Open Microsoft sign-in link in browser and copy code"
              >
                <SquareArrowOutUpRightIcon className="shrink-0" />
                <span className="min-w-0 flex-1 truncate text-left">
                  {login.verificationUri}
                </span>
              </Button>

              {loginExpired && (
                <p className="text-destructive text-sm">
                  This sign-in code expired. Start a new Microsoft sign-in.
                </p>
              )}
              {verificationMessage && (
                <p className="flex items-center gap-2 text-muted-foreground text-sm">
                  {waitingForSignIn || verifying ? (
                    <Loader2Icon className="animate-spin" />
                  ) : microsoftSignedIn ? (
                    <CheckCircle2Icon className="text-primary" />
                  ) : null}
                  {verificationMessage}
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={busy}
          >
            Cancel
          </Button>
          {login ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={handleStartLogin}
                disabled={flowState !== "idle"}
              >
                New Code
              </Button>
              <Button
                type="button"
                onClick={handleVerifyLogin}
                disabled={
                  busy || waitingForSignIn || !microsoftSignedIn || loginExpired
                }
              >
                {flowState === "verifying" && (
                  <Loader2Icon
                    data-icon="inline-start"
                    className="animate-spin"
                  />
                )}
                Verify Ownership
              </Button>
            </>
          ) : (
            <Button type="button" onClick={handleStartLogin} disabled={busy}>
              {flowState === "starting" && (
                <Loader2Icon
                  data-icon="inline-start"
                  className="animate-spin"
                />
              )}
              Sign In
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
