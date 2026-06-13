'use client'

import { useSearchParams } from 'next/navigation'
import { useTransactions } from '@/lib/hooks/use-transactions'
import { TransactionCard } from '@/components/transactions/transaction-card'
import { TransactionFilters } from '@/components/transactions/transaction-filters'
import { TransactionPagination } from '@/components/transactions/transaction-pagination'
import { EmptyState } from '@/components/shared/empty-state'
import { SkeletonList } from '@/components/shared/skeleton-card'
import { DecorativeBlobs } from '@/components/shared/decorative-blobs'
import { List, Receipt } from 'lucide-react'

export default function TransactionsPage() {
  const searchParams = useSearchParams()

  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
  const type = searchParams.get('type')
  const q = searchParams.get('q')?.trim() || null

  const { data, isLoading, isFetching, sessionLoading } = useTransactions({ page, type, q })

  const transactions = data?.transactions ?? []
  const totalPages = data?.totalPages ?? 0
  const isEmpty = !isLoading && !sessionLoading && !transactions.length

  if (sessionLoading) {
    return (
      <div className="max-w-lg lg:max-w-2xl mx-auto">
        <DecorativeBlobs />
        <Header />
        <TransactionFilters />
        <div className="px-4 py-4"><SkeletonList count={5} /></div>
      </div>
    )
  }

  const hasActiveFilter = !!q || !!type

  return (
    <div className="max-w-lg lg:max-w-2xl mx-auto relative">
      <DecorativeBlobs />

      <Header isRefreshing={isFetching && !isLoading} total={data?.transactions?.length ?? 0} />

      <div className="mx-4 mb-4 rounded-xl bg-card border border-border/50 shadow-[0_2px_12px_rgba(0,0,0,0.04)] overflow-hidden">
        <TransactionFilters />
      </div>

      {isEmpty ? (
        <div className="mx-4">
          <EmptyState
            title={hasActiveFilter ? 'Tidak ada hasil' : 'Belum ada transaksi'}
            description={
              hasActiveFilter
                ? 'Coba ubah filter atau kata kunci pencarian'
                : 'Tap tombol + untuk mencatat transaksi pertama kamu'
            }
            icon={hasActiveFilter ? <List className="h-12 w-12" /> : <Receipt className="h-12 w-12" />}
          />
        </div>
      ) : (
        <div className="mx-4 rounded-xl bg-card border border-border/50 shadow-[0_2px_12px_rgba(0,0,0,0.04)] overflow-hidden">
          {isLoading ? (
            <div className="p-4"><SkeletonList count={5} /></div>
          ) : (
            <div className="divide-y divide-border/50">
              {transactions.map(tx => (
                <TransactionCard key={tx.id} transaction={tx as any} />
              ))}
            </div>
          )}
        </div>
      )}

      <div className="px-4">
        <TransactionPagination currentPage={page} totalPages={totalPages} />
      </div>

      <div className="h-24" />
    </div>
  )
}

function Header({ isRefreshing, total }: { isRefreshing?: boolean; total?: number }) {
  return (
    <div className="flex items-center justify-between px-4 pt-4 pb-3">
      <div>
        <h1 className="text-xl font-bold text-foreground">Transaksi</h1>
        {total !== undefined && (
          <p className="text-xs text-muted-foreground mt-0.5">
            {total} transaksi ditemukan
          </p>
        )}
      </div>
      {isRefreshing && (
        <span className="text-xs text-muted-foreground animate-pulse">Memuat...</span>
      )}
    </div>
  )
}
