export function ContentBrowserDetailItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 rounded-md border border-border bg-background/70 px-2.5 py-2">
      <div className="truncate text-muted-foreground text-xs">{label}</div>
      <div className="mt-0.5 truncate font-medium text-xs">{value}</div>
    </div>
  );
}
