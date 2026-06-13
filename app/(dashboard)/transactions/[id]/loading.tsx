import { Skeleton } from '@/components/ui/skeleton'

export default function TransactionDetailLoading() {
  return (
    <div className="max-w-lg lg:max-w-2xl mx-auto px-4 py-6 space-y-4">
      <Skeleton className="h-8 w-8 rounded-md" />
      <div className="space-y-2">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-9 w-48" />
      </div>
      <div className="rounded-xl border border-border p-4 space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex justify-between">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-32" />
          </div>
        ))}
      </div>
    </div>
  )
}
