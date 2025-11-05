export default function OfferGridSkeleton() {
  return (
    <div className="space-y-4" data-testid="offers-loading">
      <div className="h-7 w-48 bg-muted animate-pulse rounded" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="rounded-lg border bg-card shadow-xs overflow-hidden">
            {/* Image Skeleton */}
            <div className="aspect-video w-full bg-muted animate-pulse" />

            {/* Content Skeleton */}
            <div className="p-4 space-y-3">
              {/* Title */}
              <div className="space-y-2">
                <div className="h-4 bg-muted animate-pulse rounded w-full" />
                <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
              </div>

              {/* City */}
              <div className="h-3 bg-muted animate-pulse rounded w-1/2" />

              {/* Price */}
              <div className="flex items-baseline justify-between">
                <div className="h-6 bg-muted animate-pulse rounded w-24" />
                <div className="h-5 bg-muted animate-pulse rounded w-16" />
              </div>

              {/* Last Checked */}
              <div className="h-3 bg-muted animate-pulse rounded w-32" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
