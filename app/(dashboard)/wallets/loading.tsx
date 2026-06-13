import { Skeleton } from '@/components/ui/skeleton'
import { SkeletonList } from '@/components/shared/skeleton-card'

export default function WalletsLoading() {
  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
      <Skeleton className="h-9 w-24" />
      <SkeletonList count={4} />
    </div>
  )
}
