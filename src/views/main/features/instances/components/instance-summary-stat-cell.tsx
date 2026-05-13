import type { ElementType, ReactNode } from "react";

type InstanceSummaryStatCellProps = {
  action?: ReactNode;
  detail: string;
  icon: ElementType;
  label: string;
  value: string;
};

export function InstanceSummaryStatCell({
  action,
  icon: Icon,
  label,
  value,
  detail,
}: InstanceSummaryStatCellProps) {
  return (
    <div className="flex min-w-0 items-center gap-3 bg-card/70 px-4 py-3">
      <Icon className="size-5 shrink-0 text-primary" />
      <div className="min-w-0 flex-1">
        <div className="text-muted-foreground text-xs">{label}</div>
        <div className="mt-1 truncate font-heading font-black text-lg leading-none">
          {value}
        </div>
        <div className="mt-1 truncate text-muted-foreground text-xs">
          {detail}
        </div>
      </div>
      {action}
    </div>
  );
}
