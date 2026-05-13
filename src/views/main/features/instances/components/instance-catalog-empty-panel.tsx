import type { ElementType, ReactNode } from "react";

type InstanceCatalogEmptyPanelProps = {
  action?: ReactNode;
  description: string;
  icon: ElementType;
  title: string;
};

export function InstanceCatalogEmptyPanel({
  action,
  description,
  icon: Icon,
  title,
}: InstanceCatalogEmptyPanelProps) {
  return (
    <div className="rounded-lg border border-border bg-background/45 p-6 text-center">
      <Icon className="mx-auto size-8 text-muted-foreground" />
      <h3 className="mt-3 font-heading font-semibold text-sm">{title}</h3>
      <p className="mx-auto mt-1 max-w-md text-muted-foreground text-sm">
        {description}
      </p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
