export function MinecraftCharacterPlaceholder() {
  return (
    <div className="flex flex-col items-center gap-0" aria-hidden="true">
      <div className="size-16 rounded-sm border bg-[var(--chart-3)]" />
      <div className="flex items-start">
        <div className="h-20 w-7 rounded-sm border bg-[var(--chart-3)]/70" />
        <div className="h-20 w-14 border bg-[color-mix(in_oklch,var(--chart-3)_70%,var(--primary))]" />
        <div className="h-20 w-7 rounded-sm border bg-[var(--chart-3)]/70" />
      </div>
      <div className="flex items-start gap-0.5">
        <div className="h-24 w-7 rounded-b-sm border bg-[var(--chart-3)]/55" />
        <div className="h-24 w-7 rounded-b-sm border bg-[var(--chart-3)]/55" />
      </div>
    </div>
  );
}
