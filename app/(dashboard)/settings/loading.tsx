import { Skeleton } from '@/components/ui/skeleton'

export default function SettingsLoading() {
  return (
    <div className="max-w-lg lg:max-w-2xl mx-auto px-4 py-6 space-y-6">
      <Skeleton className="h-7 w-32" />

      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <Skeleton className="h-4 w-16" />
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-48" />
          </div>
        </div>
        <Skeleton className="h-9 w-24" />
      </div>

      <div className="space-y-2">
        <Skeleton className="h-3 w-16" />
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-4 border-b last:border-b-0">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
