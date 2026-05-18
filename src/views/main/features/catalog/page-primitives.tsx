import { SearchIcon } from "lucide-react";
import type { ComponentType, ReactNode, SVGProps } from "react";
import { PageHeader } from "@/views/main/components/page-header";
import { Badge } from "@/views/main/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/views/main/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/views/main/components/ui/empty";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/views/main/components/ui/input-group";
import { cn } from "@/views/main/lib/utils";

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

export function LibraryPageHeader({
  actions,
  description,
  eyebrow,
  title,
}: {
  actions?: ReactNode;
  description: string;
  eyebrow: string;
  title: string;
}) {
  return (
    <PageHeader
      actions={actions}
      description={description}
      eyebrow={eyebrow}
      title={title}
    />
  );
}

export function SearchBox({
  className,
  onChange,
  placeholder,
  value,
}: {
  className?: string;
  onChange: (value: string) => void;
  placeholder: string;
  value: string;
}) {
  return (
    <InputGroup className={cn("max-w-sm", className)}>
      <InputGroupAddon>
        <SearchIcon />
      </InputGroupAddon>
      <InputGroupInput
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />
    </InputGroup>
  );
}

export function MetricCard({
  caption,
  icon: Icon,
  label,
  value,
}: {
  caption: string;
  icon: IconComponent;
  label: string;
  value: string;
}) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="flex items-center gap-2">
          <Icon className="size-4 text-primary" />
          {value}
        </CardTitle>
      </CardHeader>
      <CardContent className="text-xs leading-5 text-muted-foreground">
        {caption}
      </CardContent>
    </Card>
  );
}

export function PageEmpty({
  description,
  icon: Icon,
  title,
}: {
  description: string;
  icon: IconComponent;
  title: string;
}) {
  return (
    <Empty className="border border-dashed">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Icon />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

export function MiniStat({
  label,
  value,
  variant = "secondary",
}: {
  label: string;
  value: string;
  variant?: "default" | "secondary" | "outline" | "destructive";
}) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-3 rounded-md border border-border/60 bg-muted/20 px-3 py-2">
      <span className="truncate text-xs font-medium text-muted-foreground">
        {label}
      </span>
      <Badge variant={variant}>{value}</Badge>
    </div>
  );
}
