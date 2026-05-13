import type { ElementType } from "react";

type PathRowProps = {
  icon: ElementType;
  label: string;
  path: string;
};

export function PathRow({ icon: Icon, label, path }: PathRowProps) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/20">
      <Icon className="size-4 shrink-0 text-muted-foreground/60" />
      <span className="w-20 shrink-0 font-medium text-muted-foreground text-sm">
        {label}
      </span>
      <span
        className="min-w-0 flex-1 truncate text-right font-mono text-foreground/80 text-xs"
        title={path}
      >
        {path}
      </span>
    </div>
  );
}
