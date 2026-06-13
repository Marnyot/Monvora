'use client'

import { use } from 'react'
import { notFound } from 'next/navigation'
import { TransactionDetailClient } from '@/components/transactions/transaction-detail-client'
import { useTransactionDetail } from '@/lib/hooks/use-transaction-detail'
import { Skeleton } from '@/components/ui/skeleton'

function TransactionDetailSkeleton() {
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

interface Props {
  params: Promise<{ id: string }>
}

export default function TransactionDetailPage({ params }: Props) {
  const { id } = use(params)
  const { data, isLoading, sessionLoading } = useTransactionDetail(id)

  if (isLoading || sessionLoading) return <TransactionDetailSkeleton />
  if (!data?.transaction) return notFound()

  return <TransactionDetailClient transaction={data.transaction as any} />
}
