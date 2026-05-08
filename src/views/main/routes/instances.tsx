import { createFileRoute, Link } from "@tanstack/react-router";
import { formatDistanceToNow } from "date-fns";
import { InfoIcon, PlayIcon, PlusIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/views/main/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/views/main/components/ui/card";
import { Skeleton } from "@/views/main/components/ui/skeleton";
import { LaunchPlanSheet } from "@/views/main/features/instances/components/launch-plan-sheet";
import { NewInstanceDialog } from "@/views/main/features/instances/components/new-instance-dialog";
import { useInstances } from "@/views/main/hooks/use-instances";
import { rpc } from "@/views/main/lib/rpc";
import { cn } from "@/views/main/lib/utils";
import type { LaunchPlan } from "../../../shared/types";

function InstancesPage() {
  const instancesHook = useInstances();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [activePlan, setActivePlan] = useState<LaunchPlan | null>(null);
  const [planLoadingId, setPlanLoadingId] = useState<string | null>(null);

  async function handlePlay(instanceId: string) {
    setPlanLoadingId(instanceId);
    try {
      const plan = await rpc.requestProxy.createLaunchPlan({ instanceId });
      setActivePlan(plan);
      setSheetOpen(true);
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Failed to create launch plan",
      );
    } finally {
      setPlanLoadingId(null);
    }
  }

  const instances = instancesHook.data;
  const loading = instancesHook.loading;

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-5 p-5">
      <section className="flex items-end justify-between gap-4 max-sm:flex-col max-sm:items-start">
        <div>
          <span className="text-muted-foreground text-xs font-black uppercase">
            Library
          </span>
          <h1 className="mt-2 font-heading font-black text-4xl leading-none">
            Instances
          </h1>
        </div>
        <Button variant="outline" onClick={() => setDialogOpen(true)}>
          <PlusIcon data-icon="inline-start" />
          New Instance
        </Button>
      </section>

      {instancesHook.error && (
        <div className="flex items-center justify-between rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {instancesHook.error}
          <button
            type="button"
            className="underline hover:no-underline text-xs ml-4 shrink-0"
            onClick={instancesHook.refresh}
          >
            Retry
          </button>
        </div>
      )}

      <section className="grid grid-cols-[minmax(0,1fr)_20rem] gap-3 max-lg:grid-cols-1">
        {/* Instance cards */}
        <div className="grid grid-cols-2 gap-3 max-md:grid-cols-1">
          {loading ? (
            ["instance-a", "instance-b", "instance-c", "instance-d"].map(
              (key) => (
                <Card key={key}>
                  <Skeleton className="h-32 rounded-b-none rounded-t-[inherit]" />
                  <CardHeader>
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-3 w-24 mt-1" />
                  </CardHeader>
                  <div className="px-6 pb-4 flex justify-between items-center">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="size-8 rounded-md" />
                  </div>
                </Card>
              ),
            )
          ) : !instances || instances.length === 0 ? (
            <div className="col-span-2 flex flex-col items-center justify-center gap-3 py-16 text-center">
              <p className="text-muted-foreground text-sm">No instances yet.</p>
              <Button onClick={() => setDialogOpen(true)}>
                <PlusIcon className="size-4 mr-1.5" />
                New Instance
              </Button>
            </div>
          ) : (
            instances.map((instance) => (
              <Card key={instance.id}>
                <div
                  className="relative h-32 overflow-hidden bg-gradient-to-br from-primary/80 to-primary/20"
                  aria-hidden="true"
                >
                  <span className="absolute bottom-0 left-6 h-20 w-14 bg-background/60" />
                  <span className="absolute bottom-0 left-24 h-28 w-24 bg-background/50" />
                  <span className="absolute right-7 bottom-0 h-16 w-16 bg-background/45" />
                  <span className="absolute inset-0 bg-[repeating-linear-gradient(90deg,color-mix(in_oklch,var(--foreground)_9%,transparent)_0_1px,transparent_1px_22px)]" />
                </div>
                <CardHeader>
                  <div className="min-w-0">
                    <CardTitle className="truncate">{instance.name}</CardTitle>
                    <CardDescription>
                      {instance.versionId} · {instance.loader}
                    </CardDescription>
                  </div>
                </CardHeader>
                <div className="px-6 pb-5 flex items-center justify-between">
                  <span className="text-muted-foreground text-sm font-semibold">
                    {instance.lastLaunchedAt
                      ? formatDistanceToNow(new Date(instance.lastLaunchedAt), {
                          addSuffix: true,
                        })
                      : "Never played"}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <Link
                      to="/instances/$instanceId"
                      params={{ instanceId: instance.id }}
                      className={buttonVariants({
                        size: "sm",
                        variant: "outline",
                      })}
                    >
                      <InfoIcon data-icon="inline-start" />
                      Info
                    </Link>
                    <button
                      type="button"
                      className={cn(
                        "size-8 rounded-md flex items-center justify-center transition-colors",
                        planLoadingId === instance.id
                          ? "bg-primary/50 cursor-wait"
                          : "bg-primary hover:bg-primary/80",
                      )}
                      onClick={() => handlePlay(instance.id)}
                      disabled={planLoadingId !== null}
                      aria-label="Create launch plan"
                    >
                      <PlayIcon className="size-4 fill-primary-foreground text-primary-foreground" />
                    </button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </section>

      <NewInstanceDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onCreated={() => instancesHook.refresh()}
      />
      <LaunchPlanSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        plan={activePlan}
      />
    </div>
  );
}

export const Route = createFileRoute("/instances")({
  component: InstancesPage,
});
