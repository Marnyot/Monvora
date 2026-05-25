import { createClient } from '@/lib/supabase/server'
import { TransactionCard } from '@/components/transactions/transaction-card'
import { TransactionFilters } from '@/components/transactions/transaction-filters'
import { TransactionPagination } from '@/components/transactions/transaction-pagination'
import { EmptyState } from '@/components/shared/empty-state'
import { SkeletonList } from '@/components/shared/skeleton-card'
import { List } from 'lucide-react'
import { Suspense } from 'react'

export const metadata = { title: 'Transaksi — Monvora' }

const PAGE_SIZE = 20

interface PageProps {
  searchParams: Promise<{
    page?: string
    type?: string
    q?: string
  }>
}

async function TransactionList({ searchParams }: PageProps) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { page: pageParam, type, q: rawQ } = await searchParams
  const page = Math.max(1, parseInt(pageParam ?? '1', 10))
  const q = rawQ?.trim()

  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  let query = supabase
    .from('transactions')
    .select(`
      id, amount, type, description, merchant_name, payment_method, transacted_at,
      wallet:wallets(id, name, color),
      category:categories(id, name, icon, color)
    `, { count: 'exact' })
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .order('transacted_at', { ascending: false })
    .range(from, to)

  if (type && ['expense', 'income', 'transfer'].includes(type)) {
    query = query.eq('type', type)
  }

  if (q) {
    query = query.or(`merchant_name.ilike.%${q}%,description.ilike.%${q}%`)
  }

  const { data: transactions, count } = await query
  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE)

  if (!transactions?.length) {
    return (
      <EmptyState
        title={q || type ? 'Tidak ada hasil' : 'Belum ada transaksi'}
        description={
          q || type
            ? 'Coba ubah filter atau kata kunci pencarian'
            : 'Tap tombol + untuk mencatat transaksi pertama kamu'
        }
        icon={<List className="h-12 w-12" />}
      />
    )
  }

  return (
    <>
      <div className="divide-y divide-border">
        {transactions.map(tx => (
          <TransactionCard key={tx.id} transaction={tx as any} />
        ))}
      </div>
      <TransactionPagination currentPage={page} totalPages={totalPages} />
    </>
  )
}

export default async function TransactionsPage({ searchParams }: PageProps) {
  return (
    <div className="max-w-lg mx-auto">
      <div className="flex items-center justify-between px-4 py-4 border-b">
        <h1 className="text-lg font-semibold text-foreground">Transaksi</h1>
      </div>

      <TransactionFilters />

      <Suspense fallback={<div className="px-4 py-4"><SkeletonList count={5} /></div>}>
        <TransactionList searchParams={searchParams} />
      </Suspense>
    </div>
  )
}
