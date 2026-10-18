import { Skeleton } from "@/components/ui/skeleton";

/**
 * Generic signed-in skeleton — the glass nav and ambient veil stay (they live
 * in the layout), the page area shows its shape.
 */
export default function ProtectedLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Skeleton className="h-8 w-52" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-28 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
