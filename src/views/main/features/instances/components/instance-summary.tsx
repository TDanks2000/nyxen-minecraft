import {
  CopyIcon,
  FolderIcon,
  MemoryStickIcon,
  PuzzleIcon,
  ScrollTextIcon,
  ShieldCheckIcon,
  TerminalSquareIcon,
} from "lucide-react";
import { toast } from "sonner";
import type { LauncherInstance } from "@/shared/types";
import { Button } from "@/views/main/components/ui/button";
import { InstanceSummaryStatCell } from "@/views/main/features/instances/components/instance-summary-stat-cell";

type InstanceSummaryProps = {
  enabledModsCount: number;
  instance: LauncherInstance;
  resourcePackCount: number;
  shaderPackCount: number;
  totalModsCount: number;
};

function formatMemory(mb: number): string {
  return mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${mb} MB`;
}

export function InstanceSummary({
  enabledModsCount,
  instance,
  resourcePackCount,
  shaderPackCount,
  totalModsCount,
}: InstanceSummaryProps) {
  const copyGameDirectory = async () => {
    try {
      await navigator.clipboard.writeText(instance.gameDirectory);
      toast.success("Game directory copied.");
    } catch {
      toast.error("Could not copy game directory.");
    }
  };

  return (
    <section className="overflow-hidden rounded-lg border border-border bg-card/70 shadow-[0_20px_70px_-58px_black]">
      <div className="grid grid-cols-1 gap-px bg-border/70 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
        <InstanceSummaryStatCell
          detail={`${instance.memoryMinMb} MB - ${instance.memoryMaxMb} MB`}
          icon={MemoryStickIcon}
          label="Memory"
          value={formatMemory(instance.memoryMaxMb)}
        />
        <InstanceSummaryStatCell
          detail={instance.javaExecutable ?? "Managed by Nyxen"}
          icon={TerminalSquareIcon}
          label="Java Runtime"
          value={instance.javaExecutable ? "Custom Java" : "Managed Java"}
        />
        <InstanceSummaryStatCell
          detail={`${totalModsCount} total`}
          icon={PuzzleIcon}
          label="Mods"
          value={`${enabledModsCount} Enabled`}
        />
        <InstanceSummaryStatCell
          detail={`${shaderPackCount} shader pack${shaderPackCount === 1 ? "" : "s"}`}
          icon={ScrollTextIcon}
          label="Packs"
          value={`${resourcePackCount} Resources`}
        />
        <InstanceSummaryStatCell
          detail={
            instance.profileId
              ? "Account selected"
              : "Uses first verified profile"
          }
          icon={ShieldCheckIcon}
          label="Profile"
          value={instance.profileId ? "Linked" : "Automatic"}
        />
        <InstanceSummaryStatCell
          action={
            <Button
              aria-label="Copy game directory path"
              onClick={() => void copyGameDirectory()}
              size="icon-xs"
              variant="ghost"
            >
              <CopyIcon />
            </Button>
          }
          detail="Click to copy path"
          icon={FolderIcon}
          label="Game Directory"
          value={`.../${instance.folders.root}`}
        />
      </div>
    </section>
  );
}
