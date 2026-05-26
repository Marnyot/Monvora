import { Skeleton } from '@/components/ui/skeleton'
import { SkeletonList } from '@/components/shared/skeleton-card'

export default function DashboardLoading() {
  return (
    <div className="max-w-lg mx-auto">
      <div className="flex items-center justify-between px-4 py-4">
        <div className="space-y-1.5">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-5 w-32" />
        </div>
        <Skeleton className="h-9 w-9 rounded-md" />
      </div>

      <div className="mx-4 rounded-2xl bg-primary/20 p-5 mb-4 space-y-3">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-9 w-48" />
        <div className="flex gap-6 pt-4">
          <div className="space-y-1.5">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-4 w-24" />
          </div>
          <div className="space-y-1.5">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
      </div>

      <div className="px-4 mb-2">
        <Skeleton className="h-4 w-28" />
      </div>
      <div className="px-4">
        <SkeletonList count={5} />
      </div>
    </div>
  )
}
