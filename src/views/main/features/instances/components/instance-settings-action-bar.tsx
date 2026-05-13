import { RotateCcwIcon, SaveIcon } from "lucide-react";
import { Button } from "@/views/main/components/ui/button";
import { Spinner } from "@/views/main/components/ui/spinner";

type InstanceSettingsActionBarProps = {
  canSave: boolean;
  onReset: () => void;
  onSave: () => void;
  saving: boolean;
};

export function InstanceSettingsActionBar({
  canSave,
  onReset,
  onSave,
  saving,
}: InstanceSettingsActionBarProps) {
  return (
    <div className="sticky bottom-0 z-10 -mx-4 border-border border-t bg-background/92 px-4 py-3 backdrop-blur supports-backdrop-filter:bg-background/80 sm:-mx-5 sm:px-5">
      <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
        <Button disabled={saving} onClick={onReset} size="lg" variant="outline">
          <RotateCcwIcon data-icon="inline-start" />
          Reset
        </Button>
        <Button disabled={!canSave} onClick={onSave} size="lg">
          {saving ? (
            <Spinner data-icon="inline-start" />
          ) : (
            <SaveIcon data-icon="inline-start" />
          )}
          {saving ? "Saving..." : "Save Settings"}
        </Button>
      </div>
    </div>
  );
}
