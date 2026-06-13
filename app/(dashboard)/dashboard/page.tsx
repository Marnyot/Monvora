'use client'

import { useEffect, useState } from 'react'
import { useDashboard } from '@/lib/hooks/use-dashboard'
import { CurrencyDisplay } from '@/components/shared/currency-display'
import { AmountDisplay } from '@/components/shared/amount-display'
import { TransactionCard } from '@/components/transactions/transaction-card'
import { EmptyState } from '@/components/shared/empty-state'
import { ThemeToggle } from '@/components/shared/theme-toggle'
import { Skeleton } from '@/components/ui/skeleton'
import { SkeletonList } from '@/components/shared/skeleton-card'
import { useSession } from '@/lib/hooks/use-session'
import { WelcomeCard } from '@/components/dashboard/welcome-card'
import { OnboardingDialog } from '@/components/dashboard/onboarding-dialog'
import { GuestBanner } from '@/components/dashboard/guest-banner'
import { List } from 'lucide-react'

function DashboardSkeleton() {
  return (
    <div className="max-w-lg lg:max-w-2xl mx-auto">
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

export default function DashboardPage() {
  const { user } = useSession()
  const { data, isLoading, sessionLoading } = useDashboard()
  const [onboardingOpen, setOnboardingOpen] = useState(false)

  const needsOnboarding = data?.profile && data.profile.onboarding_completed === false

  useEffect(() => {
    if (needsOnboarding) setOnboardingOpen(true)
  }, [needsOnboarding])

  if (isLoading || sessionLoading) return <DashboardSkeleton />

  const firstName = (data?.profile?.full_name ?? (user?.user_metadata?.full_name as string | undefined) ?? 'Kamu').split(' ')[0]
  const wallets = data?.wallets ?? []
  const totalBalance = wallets.reduce((sum, w) => sum + (w.balance ?? 0), 0)
  const monthIncome = (data?.txThisMonth ?? []).filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const monthExpense = (data?.txThisMonth ?? []).filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  const recentTx = data?.recentTx ?? []
  const hasTransactions = (data?.txThisMonth?.length ?? 0) > 0 || recentTx.length > 0

  return (
    <div className="max-w-lg lg:max-w-2xl mx-auto">
      <OnboardingDialog open={onboardingOpen} onOpenChange={setOnboardingOpen} />
      <div className="flex items-center justify-between px-4 py-4">
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Selamat datang,</p>
          <p className="font-semibold text-foreground">{firstName}</p>
        </div>
        <ThemeToggle />
      </div>

      <GuestBanner isGuest={data?.profile?.is_guest ?? false} />

      <WelcomeCard
        hasWallets={wallets.length > 0}
        gmailEnabled={data?.profile?.gmail_sync_enabled ?? false}
        hasTransactions={hasTransactions}
        isGuest={data?.profile?.is_guest ?? false}
      />

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

      <div className="px-4 mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Transaksi Terbaru</h2>
      </div>

      {!recentTx.length ? (
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
