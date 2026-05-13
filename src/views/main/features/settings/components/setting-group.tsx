import type { ElementType, ReactNode } from "react";

type SettingGroupProps = {
  children: ReactNode;
  icon: ElementType;
  title: string;
};

export function SettingGroup({
  icon: Icon,
  title,
  children,
}: SettingGroupProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 px-1">
        <Icon className="size-3.5 shrink-0 text-primary" />
        <span className="font-bold text-muted-foreground text-xs uppercase tracking-widest">
          {title}
        </span>
        <div className="h-px flex-1 bg-border/60" />
      </div>
      <div className="divide-y divide-border/40 overflow-hidden rounded-lg border border-border/50 bg-card/90 shadow-sm backdrop-blur-sm">
        {children}
      </div>
    </div>
  );
}
