import { Skeleton } from '@/components/ui/skeleton'
import { SkeletonList } from '@/components/shared/skeleton-card'

export default function CategoriesLoading() {
  return (
    <div className="max-w-lg lg:max-w-2xl mx-auto px-4 py-6 space-y-6">
      <Skeleton className="h-7 w-28" />
      <SkeletonList count={6} />
    </div>
  )
}
