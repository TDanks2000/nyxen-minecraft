import { Spinner } from "@/views/main/components/ui/spinner";

export function InstanceSettingsLoadingBox({ label }: { label: string }) {
  return (
    <div className="flex h-8 items-center gap-2 rounded-lg border border-input bg-background px-2.5 text-muted-foreground text-sm">
      <Spinner className="size-3.5" />
      {label}
    </div>
  );
}
