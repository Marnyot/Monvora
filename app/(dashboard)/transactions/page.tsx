import { createClient } from '@/lib/supabase/server'
import { TransactionCard } from '@/components/transactions/transaction-card'
import { EmptyState } from '@/components/shared/empty-state'
import { SkeletonList } from '@/components/shared/skeleton-card'
import { List } from 'lucide-react'
import { Suspense } from 'react'

export const metadata = { title: 'Transaksi — Monvora' }

async function TransactionList() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: transactions } = await supabase
    .from('transactions')
    .select(`
      id, amount, type, description, merchant_name, payment_method, transacted_at,
      wallet:wallets(id, name, color),
      category:categories(id, name, icon, color)
    `)
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .order('transacted_at', { ascending: false })
    .limit(50)

  if (!transactions?.length) {
    return (
      <EmptyState
        title="Belum ada transaksi"
        description="Tap tombol + untuk mencatat transaksi pertama kamu"
        icon={<List className="h-12 w-12" />}
      />
    )
  }

  return (
    <div className="divide-y divide-border">
      {transactions.map(tx => (
        <TransactionCard key={tx.id} transaction={tx as any} />
      ))}
    </div>
  )
}

export default function TransactionsPage() {
  return (
    <div className="max-w-lg mx-auto">
      <div className="flex items-center justify-between px-4 py-4 border-b">
        <h1 className="text-lg font-semibold text-foreground">Transaksi</h1>
      </div>

      <Suspense fallback={<div className="px-4 py-4"><SkeletonList count={5} /></div>}>
        <TransactionList />
      </Suspense>
    </div>
  )
}
