import type { LaunchPlan } from "../../../../../shared/types";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/views/main/components/ui/sheet";
import { Button } from "@/views/main/components/ui/button";
import { Separator } from "@/views/main/components/ui/separator";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: LaunchPlan | null;
};

export function LaunchPlanSheet({ open, onOpenChange, plan }: Props) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[420px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Launch Plan</SheetTitle>
          <SheetDescription>
            Pre-flight summary for {plan?.instance.name ?? "this instance"}
          </SheetDescription>
        </SheetHeader>

        {plan && (
          <div className="flex flex-col gap-4 py-4 px-4">
            {/* Instance */}
            <section className="flex flex-col gap-1">
              <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Instance
              </h3>
              <p className="text-sm font-semibold">{plan.instance.name}</p>
              <p className="text-xs text-muted-foreground">
                {plan.instance.versionId} · {plan.instance.loader}
              </p>
            </section>

            <Separator />

            {/* Profile */}
            <section className="flex flex-col gap-1">
              <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Profile
              </h3>
              <p className="text-sm">
                {plan.profile?.displayName ?? (
                  <span className="text-muted-foreground italic">
                    No profile
                  </span>
                )}
              </p>
            </section>

            <Separator />

            {/* Java */}
            <section className="flex flex-col gap-1">
              <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Java
              </h3>
              <p className="text-xs text-muted-foreground">
                Executable:{" "}
                <span className="font-mono text-foreground">
                  {plan.java.executable}
                </span>
              </p>
              <p className="text-xs text-muted-foreground">
                Memory:{" "}
                <span className="text-foreground">
                  {plan.java.memoryMinMb}–{plan.java.memoryMaxMb} MB
                </span>
              </p>
            </section>

            <Separator />

            {/* Warnings */}
            {plan.warnings.length > 0 && (
              <>
                <section className="flex flex-col gap-1.5">
                  <h3 className="text-xs font-bold uppercase tracking-wide text-amber-500">
                    Warnings ({plan.warnings.length})
                  </h3>
                  <ul className="flex flex-col gap-1">
                    {plan.warnings.map((w, i) => (
                      <li
                        key={`w-${i}`}
                        className="text-xs text-amber-600 dark:text-amber-400 bg-amber-500/10 rounded px-2.5 py-1.5 border border-amber-500/20"
                      >
                        {w}
                      </li>
                    ))}
                  </ul>
                </section>
                <Separator />
              </>
            )}

            {/* Missing Artifacts */}
            <section className="flex flex-col gap-1.5">
              <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Artifacts
              </h3>
              {plan.missingArtifacts.length === 0 ? (
                <p className="text-xs text-green-600 dark:text-green-400 font-medium">
                  All artifacts present
                </p>
              ) : (
                <>
                  <p className="text-xs text-muted-foreground">
                    {plan.missingArtifacts.length} artifact
                    {plan.missingArtifacts.length !== 1 ? "s" : ""} need to be
                    downloaded before launch
                  </p>
                  <ul className="flex flex-col gap-1 max-h-48 overflow-y-auto">
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
            </section>

            <Separator />

            {/* Directories */}
            <section className="flex flex-col gap-1">
              <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Directories
              </h3>
              <p className="text-xs text-muted-foreground">
                Game:{" "}
                <span className="font-mono text-foreground break-all">
                  {plan.directories.game}
                </span>
              </p>
            </section>
          </div>
        )}

        <SheetFooter className="px-4 pb-4">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
