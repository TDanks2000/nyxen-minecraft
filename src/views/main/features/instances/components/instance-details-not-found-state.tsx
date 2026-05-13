import { Link } from "@tanstack/react-router";
import { ArrowLeftIcon, BoxesIcon } from "lucide-react";
import { Button, buttonVariants } from "@/views/main/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/views/main/components/ui/empty";

export function InstanceDetailsNotFoundState() {
  return (
    <div className="flex min-h-full w-full flex-col gap-5 p-4 sm:p-6">
      <Link
        className={buttonVariants({ size: "sm", variant: "outline" })}
        to="/instances"
      >
        <ArrowLeftIcon data-icon="inline-start" />
        Library
      </Link>
      <Empty className="border border-dashed">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <BoxesIcon />
          </EmptyMedia>
          <EmptyTitle>Instance not found</EmptyTitle>
          <EmptyDescription>
            This instance is no longer available in the local library.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button nativeButton={false} render={<Link to="/instances" />}>
            Back to Library
          </Button>
        </EmptyContent>
      </Empty>
    </div>
  );
}
