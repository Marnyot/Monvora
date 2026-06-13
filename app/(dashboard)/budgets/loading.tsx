import { Skeleton } from '@/components/ui/skeleton'

export default function BudgetsLoading() {
  return (
    <div className="max-w-lg lg:max-w-2xl mx-auto px-4 py-6 space-y-4">
      <header className="space-y-1.5">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-4 w-72" />
      </header>

      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-xl border bg-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-4 w-16" />
            </div>
            <Skeleton className="h-2 w-full rounded-full" />
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
