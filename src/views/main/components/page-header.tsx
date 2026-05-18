import type { ReactNode } from "react";
import { cn } from "@/views/main/lib/utils";

type PageHeaderProps = {
  actions?: ReactNode;
  className?: string;
  description?: ReactNode;
  eyebrow?: string;
  meta?: ReactNode;
  title: ReactNode;
  toolbar?: ReactNode;
};

export function PageHeader({
  actions,
  className,
  description,
  eyebrow,
  meta,
  title,
  toolbar,
}: PageHeaderProps) {
  return (
    <header className={cn("flex flex-col gap-4", className)}>
      <div className="flex items-end justify-between gap-4 max-lg:flex-col max-lg:items-start">
        <div className="min-w-0 max-w-3xl">
          {eyebrow ? (
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {eyebrow}
            </span>
          ) : null}
          <h1
            className={cn(
              "font-heading text-3xl font-black leading-[1.05]",
              eyebrow && "mt-2",
            )}
          >
            {title}
          </h1>
          {description ? (
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {description}
            </p>
          ) : null}
          {meta ? (
            <div className="mt-2 text-xs text-muted-foreground">{meta}</div>
          ) : null}
        </div>
        {actions ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {actions}
          </div>
        ) : null}
      </div>
      {toolbar ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          {toolbar}
        </div>
      ) : null}
    </header>
  );
}
