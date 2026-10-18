import { Skeleton } from "@/components/ui/skeleton";

export default function BrowseLoading() {
  return (
    <div className="flex min-h-svh flex-col">
      {/* nav placeholder */}
      <div className="fixed inset-x-0 top-4 z-50 flex justify-center px-4">
        <Skeleton className="h-11 w-[90%] max-w-5xl rounded-full" />
      </div>

      <div className="mx-auto w-full max-w-6xl flex-1 space-y-6 px-4 pb-12 pt-24 sm:pt-28">
        <div className="space-y-3">
          <Skeleton className="h-8 w-44" />
          <Skeleton className="h-4 w-64" />
        </div>

        {/* filter bar */}
        <Skeleton className="h-11 rounded-2xl" />

        {/* listing grid */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="overflow-hidden rounded-2xl border">
              <Skeleton className="aspect-[4/3] rounded-none" />
              <div className="space-y-2 p-3">
                <Skeleton className="h-4 w-4/5" />
                <Skeleton className="h-5 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
