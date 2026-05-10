import {
  CopyIcon,
  FolderIcon,
  MemoryStickIcon,
  PuzzleIcon,
  ScrollTextIcon,
  ShieldCheckIcon,
  TerminalSquareIcon,
} from "lucide-react";
import type { ElementType, ReactNode } from "react";
import { toast } from "sonner";
import type { LauncherInstance } from "@/shared/types";
import { Button } from "@/views/main/components/ui/button";

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

function StatCell({
  action,
  icon: Icon,
  label,
  value,
  detail,
}: {
  action?: ReactNode;
  icon: ElementType;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3 bg-card/70 px-4 py-3">
      <Icon className="size-5 shrink-0 text-primary" />
      <div className="min-w-0 flex-1">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="mt-1 truncate font-heading text-lg font-black leading-none">
          {value}
        </div>
        <div className="mt-1 truncate text-xs text-muted-foreground">
          {detail}
        </div>
      </div>
      {action}
    </div>
  );
}

export function InstanceSummary({
  enabledModsCount,
  instance,
  resourcePackCount,
  shaderPackCount,
  totalModsCount,
}: InstanceSummaryProps) {
  const copyGameDirectory = () => {
    void navigator.clipboard.writeText(instance.gameDirectory);
    toast.success("Game directory copied.");
  };

  return (
    <section className="overflow-hidden rounded-lg border border-border bg-card/70 shadow-[0_20px_70px_-58px_black]">
      <div className="grid grid-cols-1 gap-px bg-border/70 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
        <StatCell
          detail={`${instance.memoryMinMb} MB - ${instance.memoryMaxMb} MB`}
          icon={MemoryStickIcon}
          label="Memory"
          value={formatMemory(instance.memoryMaxMb)}
        />
        <StatCell
          detail={instance.javaExecutable ?? "Managed by Nyxen"}
          icon={TerminalSquareIcon}
          label="Java Runtime"
          value={instance.javaExecutable ? "Custom Java" : "Managed Java"}
        />
        <StatCell
          detail={`${totalModsCount} total`}
          icon={PuzzleIcon}
          label="Mods"
          value={`${enabledModsCount} Enabled`}
        />
        <StatCell
          detail={`${shaderPackCount} shader pack${shaderPackCount === 1 ? "" : "s"}`}
          icon={ScrollTextIcon}
          label="Packs"
          value={`${resourcePackCount} Resources`}
        />
        <StatCell
          detail={
            instance.profileId
              ? "Account selected"
              : "Uses first verified profile"
          }
          icon={ShieldCheckIcon}
          label="Profile"
          value={instance.profileId ? "Linked" : "Automatic"}
        />
        <StatCell
          action={
            <Button
              aria-label="Copy game directory path"
              onClick={copyGameDirectory}
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
