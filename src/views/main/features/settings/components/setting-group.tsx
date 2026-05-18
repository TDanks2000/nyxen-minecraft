import type { ElementType, ReactNode } from "react";
import { cn } from "@/views/main/lib/utils";

type SettingGroupProps = {
  children: ReactNode;
  icon: ElementType;
  title: string;
  tone?: "default" | "destructive";
};

export function SettingGroup({
  icon: Icon,
  title,
  children,
  tone = "default",
}: SettingGroupProps) {
  const destructive = tone === "destructive";
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 px-1">
        <Icon
          className={cn(
            "size-3.5 shrink-0",
            destructive ? "text-destructive" : "text-primary",
          )}
        />
        <span
          className={cn(
            "text-[11px] font-semibold uppercase tracking-[0.14em]",
            destructive ? "text-destructive" : "text-muted-foreground",
          )}
        >
          {title}
        </span>
        <div
          className={cn(
            "h-px flex-1",
            destructive ? "bg-destructive/30" : "bg-border/60",
          )}
        />
      </div>
      <div
        className={cn(
          "divide-y overflow-hidden rounded-lg border shadow-sm backdrop-blur-sm",
          destructive
            ? "divide-destructive/20 border-destructive/40 bg-destructive/[0.04]"
            : "divide-border/40 border-border/50 bg-card/90",
        )}
      >
        {children}
      </div>
    </div>
  );
}
