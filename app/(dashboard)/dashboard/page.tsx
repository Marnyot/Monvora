import { createClient } from '@/lib/supabase/server'
import { CurrencyDisplay } from '@/components/shared/currency-display'
import { AmountDisplay } from '@/components/shared/amount-display'
import { TransactionCard } from '@/components/transactions/transaction-card'
import { EmptyState } from '@/components/shared/empty-state'
import { ThemeToggle } from '@/components/shared/theme-toggle'
import { Skeleton } from '@/components/ui/skeleton'
import { SkeletonList } from '@/components/shared/skeleton-card'
import { List } from 'lucide-react'
import { Suspense } from 'react'
import { RealtimeRefresh } from '@/components/dashboard/realtime-refresh'

export const metadata = { title: 'Dashboard — Monvora' }

function DashboardSkeleton() {
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

async function DashboardContent() {
  const supabase = await createClient()

  const now = new Date()
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const [{ data: wallets }, { data: txThisMonth }, { data: recentTx }, { data: profile }] = await Promise.all([
    supabase
      .from('wallets')
      .select('id, name, balance, color')
      .is('deleted_at', null)
      .eq('is_active', true),
    supabase
      .from('transactions')
      .select('amount, type')
      .is('deleted_at', null)
      .gte('transacted_at', firstOfMonth),
    supabase
      .from('transactions')
      .select(`
        id, amount, type, description, merchant_name, payment_method, transacted_at,
        wallet:wallets!wallet_id(id, name, color),
        category:categories(id, name, icon, color)
      `)
      .is('deleted_at', null)
      .order('transacted_at', { ascending: false })
      .limit(10),
    supabase
      .from('profiles')
      .select('full_name')
      .single(),
  ])

  const firstName = profile?.full_name?.split(' ')[0] ?? 'Kamu'

  const totalBalance = (wallets ?? []).reduce((sum, w) => sum + (w.balance ?? 0), 0)
  const monthIncome = (txThisMonth ?? []).filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const monthExpense = (txThisMonth ?? []).filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)

  return (
    <div className="max-w-lg mx-auto">
      <div className="flex items-center justify-between px-4 py-4">
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Selamat datang,</p>
          <p className="font-semibold text-foreground">{firstName}</p>
        </div>
        <ThemeToggle />
      </div>

      <div className="mx-4 rounded-2xl bg-primary p-5 text-primary-foreground mb-4">
        <p className="text-xs font-medium opacity-75 mb-1">Total Saldo</p>
        <p className="text-3xl font-bold tabular-nums">
          <CurrencyDisplay amount={Math.max(0, totalBalance)} className="text-primary-foreground" />
        </p>

        <div className="flex gap-6 mt-4 pt-4 border-t border-primary-foreground/20">
          <div>
            <p className="text-xs opacity-60 mb-0.5">Pemasukan</p>
            <AmountDisplay amount={monthIncome} type="income" className="text-sm text-emerald-300 dark:text-emerald-300" />
          </div>
          <div>
            <p className="text-xs opacity-60 mb-0.5">Pengeluaran</p>
            <AmountDisplay amount={monthExpense} type="expense" className="text-sm text-red-300 dark:text-red-300" />
          </div>
        </div>
      </div>

      <RealtimeRefresh />

      <div className="px-4 mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Transaksi Terbaru</h2>
      </div>

      {!recentTx?.length ? (
        <div className="px-4">
          <EmptyState
            title="Belum ada transaksi"
            description="Tap tombol + untuk mencatat transaksi pertama kamu"
            icon={<List className="h-10 w-10" />}
          />
        </div>
      ) : (
        <div className="divide-y divide-border">
          {recentTx.map(tx => (
            <TransactionCard key={tx.id} transaction={tx as any} />
          ))}
        </div>
      )}
    </div>
  )
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardContent />
    </Suspense>
  )
}
