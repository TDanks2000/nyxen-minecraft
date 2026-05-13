import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/views/main/components/ui/select";
import { NO_INSTANCE_VALUE } from "@/views/main/features/curseforge/components/content-browser-dialog-model";
import { ContentBrowserInstanceBadge } from "@/views/main/features/curseforge/components/content-browser-instance-badge";
import type { SelectedInstance } from "@/views/main/features/curseforge/curseforge-browser-types";

type ContentBrowserInstanceSelectorProps = {
  activeInstance: SelectedInstance | null;
  availableInstances: Array<SelectedInstance>;
  canClearInstance: boolean;
  onSelectInstance: (instance: SelectedInstance | null) => void;
};

export function ContentBrowserInstanceSelector({
  activeInstance,
  availableInstances,
  canClearInstance,
  onSelectInstance,
}: ContentBrowserInstanceSelectorProps) {
  return (
    <div className="grid min-w-0 gap-2 lg:grid-cols-[minmax(0,1fr)_12rem]">
      <ContentBrowserInstanceBadge instance={activeInstance} />
      <Select
        disabled={availableInstances.length === 0 && !activeInstance}
        onValueChange={(value) => {
          if (value === NO_INSTANCE_VALUE) {
            if (canClearInstance) onSelectInstance(null);
            return;
          }

          const next = availableInstances.find(
            (instance) => instance.id === value,
          );
          if (next) onSelectInstance(next);
        }}
        value={activeInstance?.id ?? NO_INSTANCE_VALUE}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select instance" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectItem value={NO_INSTANCE_VALUE} disabled={!canClearInstance}>
              Browse without instance
            </SelectItem>
            {availableInstances.map((instance) => (
              <SelectItem key={instance.id} value={instance.id}>
                {instance.name}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
}
