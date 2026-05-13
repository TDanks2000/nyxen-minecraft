import type { ReactNode } from "react";

type SettingRowProps = {
  children: ReactNode;
  description?: string;
  label: string;
};

export function SettingRow({ label, description, children }: SettingRowProps) {
  return (
    <div className="flex items-center justify-between gap-6 px-4 py-3 transition-colors hover:bg-muted/20">
      <div className="min-w-0">
        <p className="font-medium text-sm leading-none">{label}</p>
        {description ? (
          <p className="mt-1 text-muted-foreground text-xs leading-snug">
            {description}
          </p>
        ) : null}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}
