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
import { Skeleton } from "@/views/main/components/ui/skeleton";

export function InstanceDetailsLoadingState() {
  return (
    <div className="flex flex-col">
      <Skeleton className="h-[300px] rounded-none" />
      <div className="mx-auto w-full max-w-7xl flex flex-col gap-5 px-5 pt-5 pb-8">
        <div className="grid grid-cols-[minmax(0,1fr)_22rem] gap-3 max-xl:grid-cols-1">
          <Skeleton className="h-96 rounded-lg" />
          <Skeleton className="h-96 rounded-lg" />
        </div>
        <Skeleton className="h-12 rounded-lg" />
        <Skeleton className="h-64 rounded-lg" />
      </div>
    </div>
  );
}

export function InstanceDetailsNotFoundState() {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-5 p-5">
      <Link
        to="/instances"
        className={buttonVariants({ size: "sm", variant: "outline" })}
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
          <Button render={<Link to="/instances" />} nativeButton={false}>
            Back to Library
          </Button>
        </EmptyContent>
      </Empty>
    </div>
  );
}
