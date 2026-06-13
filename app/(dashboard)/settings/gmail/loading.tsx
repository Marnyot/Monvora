import { Skeleton } from '@/components/ui/skeleton'

export default function GmailSettingsLoading() {
  return (
    <div className="max-w-lg lg:max-w-2xl mx-auto px-4 py-6 space-y-6">
      <div className="space-y-3">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-full max-w-sm" />
      </div>

      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-9 rounded-full" />
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-48" />
          </div>
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-8 w-28" />
          <Skeleton className="h-8 w-32" />
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-6 space-y-3">
        <Skeleton className="h-4 w-28" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex gap-3 py-2">
            <Skeleton className="h-4 w-4 rounded-full shrink-0" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-3/4" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
