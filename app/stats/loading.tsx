import { Card } from "@/components/ui/Card";
import { LoadingRegion, Skeleton } from "@/components/ui/Skeleton";

/** Stats loading state: heading, chart card, and a row of stat-card outlines. */
export default function Loading() {
  return (
    <LoadingRegion>
      <section className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-7 w-24" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Card className="space-y-4">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-64 w-full" />
        </Card>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }, (_, index) => (
            <Card key={index} className="space-y-3">
              <div className="flex items-center gap-3">
                <Skeleton className="h-3.5 w-3.5 rounded-full" />
                <Skeleton className="h-5 w-32" />
              </div>
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-10 w-full" />
            </Card>
          ))}
        </div>
      </section>
    </LoadingRegion>
  );
}
