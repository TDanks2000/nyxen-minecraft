import { Link } from "@tanstack/react-router";
import { ArrowLeftIcon, FolderOpenIcon, PlayIcon } from "lucide-react";
import { toast } from "sonner";
import type { LauncherInstance } from "@/shared/types";
import { Button, buttonVariants } from "@/views/main/components/ui/button";

type InstanceDetailsHeaderProps = {
  instance: LauncherInstance;
  onPlay: () => void;
  planLoading: boolean;
};

export function InstanceDetailsHeader({
  instance,
  onPlay,
  planLoading,
}: InstanceDetailsHeaderProps) {
  return (
    <section className="flex items-end justify-between gap-4 max-lg:flex-col max-lg:items-start">
      <div className="max-w-3xl">
        <Link
          to="/instances"
          className={buttonVariants({ size: "sm", variant: "outline" })}
        >
          <ArrowLeftIcon data-icon="inline-start" />
          Library
        </Link>
        <span className="mt-5 block font-black text-muted-foreground text-xs uppercase tracking-widest">
          Instance Info
        </span>
        <h1 className="mt-2 font-heading font-black text-4xl leading-none">
          {instance.name}
        </h1>
        <p className="mt-3 text-muted-foreground text-sm leading-6">
          Manage launch settings, attached mods, and multiplayer servers from
          the instance context.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          onClick={() => toast.message(instance.gameDirectory)}
        >
          <FolderOpenIcon data-icon="inline-start" />
          Folder
        </Button>
        <Button disabled={planLoading} onClick={onPlay}>
          <PlayIcon data-icon="inline-start" />
          {planLoading ? "Preparing" : "Play"}
        </Button>
      </div>
    </section>
  );
}
