import { Card } from "@/components/ui/Card";
import { LoadingRegion, Skeleton } from "@/components/ui/Skeleton";

/** Archived-habits loading state: heading and a grid of card outlines. */
export default function Loading() {
  return (
    <LoadingRegion>
      <section className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-7 w-44" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }, (_, index) => (
            <Card key={index} className="space-y-3">
              <div className="flex items-center gap-3">
                <Skeleton className="h-3.5 w-3.5 rounded-full" />
                <Skeleton className="h-5 w-32" />
              </div>
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-6 w-36" />
            </Card>
          ))}
        </div>
      </section>
    </LoadingRegion>
  );
}
