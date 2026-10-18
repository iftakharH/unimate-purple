import { Skeleton } from "@/components/ui/skeleton";

export default function ListingLoading() {
  return (
    <div className="flex min-h-svh flex-col">
      <div className="fixed inset-x-0 top-4 z-50 flex justify-center px-4">
        <Skeleton className="h-11 w-[90%] max-w-5xl rounded-full" />
      </div>

      <div className="mx-auto w-full max-w-6xl flex-1 px-4 pb-12 pt-24 sm:pt-28">
        <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
          <div className="space-y-6">
            <Skeleton className="aspect-[4/3] rounded-3xl" />
            <div className="space-y-3">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-24 rounded-2xl" />
            </div>
          </div>
          <div className="space-y-4">
            <Skeleton className="h-52 rounded-3xl" />
            <Skeleton className="h-40 rounded-3xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
