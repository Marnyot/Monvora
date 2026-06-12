'use client'

import { BarChart3, ChartPie, Store, CalendarDays, AlertCircle, TrendingUp, TrendingDown, Wallet, RotateCw } from 'lucide-react'
import { useAnalytics } from '@/lib/hooks/use-analytics'
import { SpendingTrendChart } from '@/components/analytics/spending-trend-chart'
import { CategoryBreakdownChart } from '@/components/analytics/category-breakdown-chart'
import { TopMerchants } from '@/components/analytics/top-merchants'
import { DayOfWeekChart } from '@/components/analytics/day-of-week-chart'
import { AiInsightsCard } from '@/components/analytics/ai-insights-card'
import { RecurringSummary } from '@/components/analytics/recurring-summary'
import { EmptyState } from '@/components/shared/empty-state'
import { formatIDR } from '@/lib/utils/currency'

function SectionCard({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: typeof BarChart3
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-xl border bg-card p-4 sm:p-5">
      <header className="flex items-start gap-3 mb-4">
        <span className="rounded-lg bg-muted p-2 text-muted-foreground shrink-0">
          <Icon className="h-4 w-4" />
        </span>
        <div className="space-y-0.5 min-w-0">
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
      </header>
      {children}
    </section>
  )
}

function TotalsTile({
  icon: Icon,
  label,
  amount,
  tone,
}: {
  icon: typeof TrendingUp
  label: string
  amount: number
  tone: 'income' | 'expense' | 'net'
}) {
  const toneClass =
    tone === 'income'
      ? 'text-green-600 dark:text-green-400'
      : tone === 'expense'
      ? 'text-red-600 dark:text-red-400'
      : amount < 0
      ? 'text-red-600 dark:text-red-400'
      : 'text-foreground'

  return (
    <div className="rounded-xl border bg-card p-3 sm:p-4">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
        <Icon className="h-3.5 w-3.5" />
        <span>{label}</span>
      </div>
      <p className={`text-sm sm:text-lg font-semibold tabular-nums truncate ${toneClass}`}>
        {formatIDR(amount)}
      </p>
    </div>
  )
}

function AnalyticsSkeleton() {
  return (
    <div className="space-y-4 pb-20 md:pb-6">
      <header>
        <h1 className="text-xl font-bold">Analytics</h1>
        <p className="text-sm text-muted-foreground">Ringkasan keuanganmu bulan ini.</p>
      </header>
      <div className="rounded-xl border bg-card p-4 space-y-3">
        <div className="h-4 w-1/3 bg-muted rounded animate-pulse" />
        <div className="h-3 w-4/5 bg-muted rounded animate-pulse" />
        <div className="h-3 w-3/5 bg-muted rounded animate-pulse" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-xl border bg-card p-3">
            <div className="h-3 w-1/2 bg-muted rounded animate-pulse mb-2" />
            <div className="h-5 w-3/4 bg-muted rounded animate-pulse" />
          </div>
        ))}
      </div>
      <div className="rounded-xl border bg-card p-4 h-72">
        <div className="h-4 w-1/3 bg-muted rounded animate-pulse mb-4" />
        <div className="h-56 bg-muted/40 rounded animate-pulse" />
      </div>
      <div className="rounded-xl border bg-card p-4 h-64">
        <div className="h-4 w-1/3 bg-muted rounded animate-pulse mb-4" />
        <div className="h-44 bg-muted/40 rounded animate-pulse" />
      </div>
    </div>
  )
}

export default function AnalyticsPage() {
  const { data, isLoading, isError, error, sessionLoading } = useAnalytics()

  if (sessionLoading || isLoading) {
    return <AnalyticsSkeleton />
  }

  if (isError || !data) {
    return (
      <div className="space-y-4 pb-20 md:pb-6">
        <header>
          <h1 className="text-xl font-bold">Analytics</h1>
        </header>
        <EmptyState
          icon={<AlertCircle className="h-10 w-10" />}
          title="Gagal memuat data"
          description={error instanceof Error ? error.message : 'Coba muat ulang halaman.'}
          action={{ label: 'Muat ulang', onClick: () => window.location.reload() }}
        />
      </div>
    )
  }

  const hasAnyData =
    data.totals.income > 0 ||
    data.totals.expense > 0 ||
    data.trend.some((p) => p.income + p.expense > 0)

  if (!hasAnyData) {
    return (
      <div className="space-y-4 pb-20 md:pb-6">
        <header>
          <h1 className="text-xl font-bold">Analytics</h1>
          <p className="text-sm text-muted-foreground">Ringkasan keuanganmu bulan ini.</p>
        </header>
        <EmptyState
          icon={<BarChart3 className="h-10 w-10" />}
          title="Belum ada data"
          description="Catat beberapa transaksi dulu untuk melihat wawasan di sini."
        />
      </div>
    )
  }

  const { trend, byCategory, topMerchants, byDayOfWeek, totals, recurring } = data
  const peakDay = byDayOfWeek.reduce((max, d) => (d.amount > max.amount ? d : max), byDayOfWeek[0])
  const totalExpenseCat = byCategory.reduce((sum, c) => sum + c.amount, 0)

  return (
    <div className="space-y-4 pb-20 md:pb-6">
      <header>
        <h1 className="text-xl font-bold">Analytics</h1>
        <p className="text-sm text-muted-foreground">Ringkasan keuanganmu bulan ini.</p>
      </header>

      <AiInsightsCard />

      <section className="grid grid-cols-3 gap-3">
        <TotalsTile icon={TrendingUp} label="Masuk" amount={totals.income} tone="income" />
        <TotalsTile icon={TrendingDown} label="Keluar" amount={totals.expense} tone="expense" />
        <TotalsTile icon={Wallet} label="Bersih" amount={totals.net} tone="net" />
      </section>

      <SectionCard
        icon={BarChart3}
        title="Tren 6 bulan"
        description="Pemasukan vs pengeluaran tiap bulan."
      >
        <SpendingTrendChart data={trend} />
      </SectionCard>

      {byCategory.length > 0 ? (
        <SectionCard
          icon={ChartPie}
          title="Kategori pengeluaran"
          description="Ke mana uangmu pergi bulan ini."
        >
          <CategoryBreakdownChart data={byCategory} totalLabel={formatIDR(totalExpenseCat)} />
        </SectionCard>
      ) : null}

      {topMerchants.length > 0 ? (
        <SectionCard
          icon={Store}
          title="Top merchant"
          description="Tempat paling sering kamu transaksi."
        >
          <TopMerchants data={topMerchants} />
        </SectionCard>
      ) : null}

      {recurring.items.length > 0 ? (
        <SectionCard
          icon={RotateCw}
          title="Langganan berulang"
          description="Pengeluaran tetap tiap bulan yang terdeteksi otomatis."
        >
          <RecurringSummary data={recurring} />
        </SectionCard>
      ) : null}

      <SectionCard
        icon={CalendarDays}
        title="Pola harian"
        description="Hari paling boros bulan ini."
      >
        <DayOfWeekChart data={byDayOfWeek} peakDay={peakDay?.amount > 0 ? peakDay.day : undefined} />
      </SectionCard>
    </div>
  )
}
