import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/views/main/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/views/main/components/ui/field";
import { Input } from "@/views/main/components/ui/input";
import { Slider } from "@/views/main/components/ui/slider";
import { formatRam } from "@/views/main/features/instances/components/instance-settings-model";

type InstancePerformanceCardProps = {
  memoryMaxMb: number;
  memoryMinMb: string;
  memoryMinValid: boolean;
  onMemoryMinMbChange: (value: string) => void;
  onRamIndexChange: (value: number) => void;
  ramIndex: number;
  ramStops: Array<number>;
};

export function InstancePerformanceCard({
  memoryMaxMb,
  memoryMinMb,
  memoryMinValid,
  onMemoryMinMbChange,
  onRamIndexChange,
  ramIndex,
  ramStops,
}: InstancePerformanceCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Performance</CardTitle>
        <CardDescription>
          Keep memory explicit so large modpacks are predictable.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <FieldGroup>
          <Field data-invalid={!memoryMinValid}>
            <FieldLabel htmlFor="memory-min">Minimum Memory</FieldLabel>
            <Input
              aria-invalid={!memoryMinValid}
              id="memory-min"
              inputMode="numeric"
              min={256}
              onChange={(event) => onMemoryMinMbChange(event.target.value)}
              type="number"
              value={memoryMinMb}
            />
            <FieldDescription>
              Must be at least 256 MB and no more than the max memory.
            </FieldDescription>
          </Field>

          <Field>
            <div className="flex items-center justify-between gap-3">
              <FieldLabel>Maximum Memory</FieldLabel>
              <span className="rounded-md bg-muted px-2 py-0.5 font-semibold text-sm tabular-nums">
                {formatRam(memoryMaxMb)}
              </span>
            </div>
            <Slider
              max={ramStops.length - 1}
              min={0}
              onValueChange={(value) => {
                const nextIndex =
                  typeof value === "number"
                    ? Math.round(value)
                    : (value[0] ?? 0);
                onRamIndexChange(nextIndex);
              }}
              step={1}
              value={[ramIndex]}
            />
            <div className="flex justify-between gap-3 text-muted-foreground text-xs">
              <span>{formatRam(ramStops[0] ?? 512)}</span>
              <span>{formatRam(ramStops[ramStops.length - 1] ?? 16384)}</span>
            </div>
          </Field>
        </FieldGroup>
      </CardContent>
    </Card>
  );
}
