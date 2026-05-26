'use client'

import { useCallback, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSession } from '@/lib/hooks/use-session'
import { useRealtimeTransactions } from '@/lib/hooks/use-realtime-transactions'
import { useTransactions } from '@/lib/hooks/use-transactions'
import { TransactionCard } from '@/components/transactions/transaction-card'
import { TransactionFilters } from '@/components/transactions/transaction-filters'
import { TransactionPagination } from '@/components/transactions/transaction-pagination'
import { EmptyState } from '@/components/shared/empty-state'
import { SkeletonList } from '@/components/shared/skeleton-card'
import { List } from 'lucide-react'

const PAGE_SIZE = 20

export default function TransactionsPage() {
  const { user, loading: sessionLoading } = useSession()
  const searchParams = useSearchParams()
  const router = useRouter()

  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
  const type = searchParams.get('type')
  const q = searchParams.get('q')?.trim() || null

  const { data, isLoading, isFetching } = useTransactions({
    userId: user?.id ?? '',
    page,
    type,
    q,
  })

  useRealtimeTransactions(user?.id ?? '')

  const transactions = data?.transactions ?? []
  const totalPages = data?.totalPages ?? 0

  const isEmpty = !isLoading && !transactions.length

  if (sessionLoading) {
    return (
      <div className="max-w-lg mx-auto">
        <Header title="Transaksi" />
        <TransactionFilters />
        <div className="px-4 py-4"><SkeletonList count={5} /></div>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto">
      <Header title="Transaksi" isRefreshing={isFetching && !isLoading} />

      <TransactionFilters />

      {isEmpty ? (
        <EmptyState
          title={q || type ? 'Tidak ada hasil' : 'Belum ada transaksi'}
          description={
            q || type
              ? 'Coba ubah filter atau kata kunci pencarian'
              : 'Tap tombol + untuk mencatat transaksi pertama kamu'
          }
          icon={<List className="h-12 w-12" />}
        />
      ) : (
        <>
          <div className="divide-y divide-border">
            {isLoading
              ? <div className="px-4 py-4"><SkeletonList count={5} /></div>
              : transactions.map(tx => (
                  <TransactionCard key={tx.id} transaction={tx as any} />
                ))
            }
          </div>
          <TransactionPagination currentPage={page} totalPages={totalPages} />
        </>
      )}
    </div>
  )
}

function Header({ title, isRefreshing }: { title: string; isRefreshing?: boolean }) {
  return (
    <div className="flex items-center justify-between px-4 py-4 border-b">
      <h1 className="text-lg font-semibold text-foreground">{title}</h1>
      {isRefreshing && (
        <span className="text-xs text-muted-foreground animate-pulse">Memuat...</span>
      )}
    </div>
  )
}
