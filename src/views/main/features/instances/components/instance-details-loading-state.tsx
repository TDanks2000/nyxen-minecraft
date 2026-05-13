import { Skeleton } from "@/views/main/components/ui/skeleton";

export function InstanceDetailsLoadingState() {
  return (
    <div className="flex flex-col">
      <Skeleton className="h-[300px] rounded-none" />
      <div className="flex w-full flex-col gap-5 px-4 pt-4 pb-8 sm:px-5">
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
