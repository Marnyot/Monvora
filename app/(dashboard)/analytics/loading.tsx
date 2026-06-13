import { Skeleton } from '@/components/ui/skeleton'

export default function AnalyticsLoading() {
  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
      <header className="space-y-1.5">
        <Skeleton className="h-6 w-28" />
        <Skeleton className="h-4 w-60" />
      </header>

      <div className="rounded-xl border bg-card p-4 space-y-3">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-3 w-4/5" />
        <Skeleton className="h-3 w-3/5" />
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-xl border bg-card p-3 space-y-2">
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-5 w-3/4" />
          </div>
        ))}
      </div>

      <div className="rounded-xl border bg-card p-4 space-y-4">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-56 w-full" />
      </div>

      <div className="rounded-xl border bg-card p-4 space-y-4">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-44 w-full" />
      </div>
    </div>
  )
}
