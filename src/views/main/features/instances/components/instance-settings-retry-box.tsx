import { Button } from "@/views/main/components/ui/button";

export function InstanceSettingsRetryBox({
  label,
  onRetry,
}: {
  label: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border border-destructive/40 bg-muted px-2.5 py-1.5 text-sm">
      <span className="min-w-0 truncate text-muted-foreground">{label}</span>
      <Button onClick={onRetry} size="xs" type="button" variant="outline">
        Retry
      </Button>
    </div>
  );
}
