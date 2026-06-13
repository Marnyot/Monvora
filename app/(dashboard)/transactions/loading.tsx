import { SkeletonList } from '@/components/shared/skeleton-card'

export default function TransactionsLoading() {
  return (
    <div className="max-w-lg lg:max-w-2xl mx-auto">
      <div className="px-4 py-4 border-b">
        <div className="h-7 w-28 bg-muted rounded animate-pulse" />
      </div>
      <div className="px-4 py-3">
        <div className="h-9 w-full bg-muted rounded-lg animate-pulse" />
      </div>
      <div className="px-4 py-4">
        <SkeletonList count={5} />
      </div>
    </div>
  )
}
