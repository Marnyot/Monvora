'use client'

import { BarChart3, ChartPie, Store, CalendarDays, AlertCircle } from 'lucide-react'
import { useAnalytics } from '@/lib/hooks/use-analytics'
import { SpendingTrendChart } from '@/components/analytics/spending-trend-chart'
import { CategoryBreakdownChart } from '@/components/analytics/category-breakdown-chart'
import { TopMerchants } from '@/components/analytics/top-merchants'
import { DayOfWeekChart } from '@/components/analytics/day-of-week-chart'
import { EmptyState } from '@/components/shared/empty-state'
import { SkeletonCard } from '@/components/shared/skeleton-card'
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
        <span className="rounded-lg bg-muted p-2 text-muted-foreground">
          <Icon className="h-4 w-4" />
        </span>
        <div className="space-y-0.5">
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
      </header>
      {children}
    </section>
  )
}

export default function AnalyticsPage() {
  const { data, isLoading, isError, error, sessionLoading } = useAnalytics()

  if (sessionLoading || isLoading) {
    return (
      <div className="space-y-4 pb-20 md:pb-6">
        <header>
          <h1 className="text-xl font-bold">Analytics</h1>
          <p className="text-sm text-muted-foreground">Ringkasan keuanganmu bulan ini.</p>
        </header>
        <SkeletonCard className="h-72" />
        <SkeletonCard className="h-64" />
        <SkeletonCard className="h-64" />
      </div>
    )
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
          description="Catat beberapa transaksi dulu untuk melihat insights di sini."
        />
      </div>
    )
  }

  const { trend, byCategory, topMerchants, byDayOfWeek, totals } = data

  return (
    <div className="space-y-4 pb-20 md:pb-6">
      <header>
        <h1 className="text-xl font-bold">Analytics</h1>
        <p className="text-sm text-muted-foreground">Ringkasan keuanganmu bulan ini.</p>
      </header>

      <section className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border bg-card p-3 sm:p-4">
          <p className="text-xs text-muted-foreground">Masuk</p>
          <p className="text-sm sm:text-base font-semibold text-green-600 dark:text-green-400 tabular-nums truncate">
            {formatIDR(totals.income)}
          </p>
        </div>
        <div className="rounded-xl border bg-card p-3 sm:p-4">
          <p className="text-xs text-muted-foreground">Keluar</p>
          <p className="text-sm sm:text-base font-semibold text-red-600 dark:text-red-400 tabular-nums truncate">
            {formatIDR(totals.expense)}
          </p>
        </div>
        <div className="rounded-xl border bg-card p-3 sm:p-4">
          <p className="text-xs text-muted-foreground">Bersih</p>
          <p className="text-sm sm:text-base font-semibold tabular-nums truncate">
            {formatIDR(totals.net)}
          </p>
        </div>
      </section>

      <SectionCard
        icon={BarChart3}
        title="Tren 6 bulan"
        description="Pemasukan vs pengeluaran tiap bulan."
      >
        <SpendingTrendChart data={trend} />
      </SectionCard>

      {byCategory.length > 0 && (
        <SectionCard
          icon={ChartPie}
          title="Kategori pengeluaran"
          description="Ke mana uangmu pergi bulan ini."
        >
          <CategoryBreakdownChart data={byCategory} />
        </SectionCard>
      )}

      {topMerchants.length > 0 && (
        <SectionCard
          icon={Store}
          title="Top merchant"
          description="Tempat paling sering kamu transaksi."
        >
          <TopMerchants data={topMerchants} />
        </SectionCard>
      )}

      <SectionCard
        icon={CalendarDays}
        title="Pola harian"
        description="Hari paling boros minggu ini."
      >
        <DayOfWeekChart data={byDayOfWeek} />
      </SectionCard>
    </div>
  )
}
