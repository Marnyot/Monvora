'use client'

import { useEffect, useState } from 'react'
import { useDashboard } from '@/lib/hooks/use-dashboard'
import { useBalanceVisibility } from '@/lib/hooks/use-balance-visibility'
import { CurrencyDisplay } from '@/components/shared/currency-display'
import { TransactionCard } from '@/components/transactions/transaction-card'
import { EmptyState } from '@/components/shared/empty-state'
import { ThemeToggle } from '@/components/shared/theme-toggle'
import { Skeleton } from '@/components/ui/skeleton'
import { SkeletonList } from '@/components/shared/skeleton-card'
import { useSession } from '@/lib/hooks/use-session'
import { WelcomeCard } from '@/components/dashboard/welcome-card'
import { OnboardingDialog } from '@/components/dashboard/onboarding-dialog'
import { GuestBanner } from '@/components/dashboard/guest-banner'
import {
  List, Bell, ArrowDown, ArrowUp, TrendingUp, Eye,
} from 'lucide-react'

function DashboardSkeleton() {
  return (
    <div className="max-w-lg lg:max-w-2xl mx-auto">
      <div className="flex items-center justify-between px-4 py-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-9 rounded-full" />
          <div className="space-y-1.5">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-5 w-32" />
          </div>
        </div>
        <Skeleton className="h-9 w-9 rounded-full" />
      </div>

      <div className="mx-4 rounded-2xl bg-primary/20 p-5 mb-4 space-y-3 relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-9 w-48" />
        <div className="flex gap-6 pt-4 border-t border-white/10">
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

const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']

export default function DashboardPage() {
  const { user } = useSession()
  const { data, isLoading, sessionLoading } = useDashboard()
  const [onboardingOpen, setOnboardingOpen] = useState(false)
  const [balanceVisible, setBalanceVisible] = useBalanceVisibility()

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

  const now = new Date()
  const today = `${now.getDate()} ${MONTHS[now.getMonth()]} ${now.getFullYear()}`

  return (
    <div className="max-w-lg lg:max-w-2xl mx-auto relative">
      <OnboardingDialog open={onboardingOpen} onOpenChange={setOnboardingOpen} />

      {/* Decorative background blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10" aria-hidden>
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-blob" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-[hsl(var(--coral)/.08)] rounded-full blur-3xl animate-blob-delayed" />
        <div className="absolute top-1/3 left-1/4 w-64 h-64 bg-[hsl(var(--lavender)/.08)] rounded-full blur-3xl animate-blob" />
        <div className="absolute top-3/4 right-1/3 w-48 h-48 bg-[hsl(var(--amber)/.06)] rounded-full blur-3xl animate-blob-delayed" />
      </div>

      {/* Top App Bar */}
      <header className="flex items-center justify-between px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-primary-foreground text-sm font-semibold shadow-sm">
            {firstName[0]}
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Hai,</p>
            <p className="font-semibold text-foreground">{firstName}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Notifikasi"
          >
            <Bell className="h-4 w-4" />
          </button>
          <ThemeToggle />
        </div>
      </header>

      <GuestBanner isGuest={data?.profile?.is_guest ?? false} />

      <WelcomeCard
        hasWallets={wallets.length > 0}
        gmailEnabled={data?.profile?.gmail_sync_enabled ?? false}
        hasTransactions={hasTransactions}
        isGuest={data?.profile?.is_guest ?? false}
      />

      {/* Total Balance Card */}
      <section className="mx-4 mb-4 rounded-2xl bg-gradient-to-br from-primary via-primary to-primary/90 p-5 text-primary-foreground shadow-lg relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-48 h-48 bg-white/5 rounded-full blur-2xl animate-blob pointer-events-none" />
        <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-white/5 rounded-full blur-2xl animate-blob-delayed pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium opacity-70 uppercase tracking-wider">Total Saldo</p>
            <button
              type="button"
              onClick={() => setBalanceVisible(!balanceVisible)}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
              aria-label={balanceVisible ? 'Sembunyikan saldo' : 'Tampilkan saldo'}
            >
              <Eye className="h-4 w-4 opacity-70" />
            </button>
          </div>
          <p className="text-3xl font-bold tabular-nums tracking-tight">
            {balanceVisible ? (
              <CurrencyDisplay amount={Math.max(0, totalBalance)} className="text-primary-foreground" />
            ) : (
              <span className="text-2xl tracking-widest opacity-50">Rp •••••••</span>
            )}
          </p>
          <div className="flex items-center gap-2 mt-4 pt-4 border-t border-white/10">
            <div className="flex items-center gap-1 text-xs opacity-70">
              <TrendingUp className="h-3.5 w-3.5 text-emerald-300" />
              <span>+14% dari bulan lalu</span>
            </div>
          </div>
        </div>
      </section>

      {/* Income / Expense Summary */}
      <section className="mx-4 mb-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-card p-4 shadow-[0_2px_12px_rgba(0,0,0,0.04)] border border-border/50">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <ArrowDown className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <span className="text-xs font-medium text-muted-foreground">Pemasukan</span>
          </div>
          <p className="text-base font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
            <CurrencyDisplay amount={monthIncome} />
          </p>
          <div className="mt-2 h-1.5 bg-emerald-500/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, (monthIncome / (monthIncome + monthExpense || 1)) * 100)}%` }}
            />
          </div>
        </div>
        <div className="rounded-xl bg-card p-4 shadow-[0_2px_12px_rgba(0,0,0,0.04)] border border-border/50">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-red-500/10 flex items-center justify-center">
              <ArrowUp className="h-4 w-4 text-red-600 dark:text-red-400" />
            </div>
            <span className="text-xs font-medium text-muted-foreground">Pengeluaran</span>
          </div>
          <p className="text-base font-bold tabular-nums text-red-600 dark:text-red-400">
            <CurrencyDisplay amount={monthExpense} />
          </p>
          <div className="mt-2 h-1.5 bg-red-500/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-red-500 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, (monthExpense / (monthIncome + monthExpense || 1)) * 100)}%` }}
            />
          </div>
        </div>
      </section>

      {/* Recent Transactions */}
      <div className="px-4 mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Transaksi Terbaru</h2>
        {recentTx.length > 0 && (
          <p className="text-xs text-muted-foreground">{today}</p>
        )}
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
        <div className="mx-4 rounded-xl bg-card border border-border/50 divide-y divide-border/50 shadow-[0_2px_12px_rgba(0,0,0,0.04)] overflow-hidden">
          {recentTx.map(tx => (
            <TransactionCard key={tx.id} transaction={tx as any} />
          ))}
        </div>
      )}

      <div className="h-24" />
    </div>
  )
}
