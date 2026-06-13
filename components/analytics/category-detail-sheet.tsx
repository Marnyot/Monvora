'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { ScrollArea } from '@/components/ui/scroll-area'
import { CategoryIconBubble } from '@/components/shared/category-icon'
import type { AnalyticsInput, CategoryAgg } from '@/lib/analytics/aggregate'
import { formatIDR } from '@/lib/utils/currency'
import { formatDate } from '@/lib/utils/date'
import { ChevronRight } from 'lucide-react'

const JAKARTA_OFFSET_MS = 7 * 60 * 60 * 1000
const UNCATEGORIZED_ID = '__uncategorized__'

function currentJakartaMonth(now: Date): string {
  const j = new Date(now.getTime() + JAKARTA_OFFSET_MS)
  return `${j.getUTCFullYear()}-${String(j.getUTCMonth() + 1).padStart(2, '0')}`
}

function jakartaMonthKey(iso: string): string {
  const d = new Date(new Date(iso).getTime() + JAKARTA_OFFSET_MS)
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

interface CategoryDetailSheetProps {
  category: CategoryAgg | null
  transactions: AnalyticsInput[]
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CategoryDetailSheet({ category, transactions, open, onOpenChange }: CategoryDetailSheetProps) {
  const filtered = useMemo(() => {
    if (!category) return []
    const currentMonth = currentJakartaMonth(new Date())
    return transactions
      .filter((t) => {
        if (t.type !== 'expense') return false
        const catId = t.category?.id ?? UNCATEGORIZED_ID
        if (catId !== category.categoryId) return false
        return jakartaMonthKey(t.transacted_at) === currentMonth
      })
      .sort((a, b) => new Date(b.transacted_at).getTime() - new Date(a.transacted_at).getTime())
  }, [category, transactions])

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="h-[80svh] rounded-t-2xl p-0 flex flex-col"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <SheetHeader className="px-4 pt-6 pb-4 text-left">
          {category ? (
            <div className="flex items-center gap-3">
              <CategoryIconBubble icon={category.icon} color={category.color} size={22} bubbleSize={48} />
              <div className="min-w-0">
                <SheetTitle className="truncate">{category.name}</SheetTitle>
                <SheetDescription>
                  {formatIDR(category.amount)} · {category.count} transaksi bulan ini
                </SheetDescription>
              </div>
            </div>
          ) : (
            <>
              <SheetTitle>Detail kategori</SheetTitle>
              <SheetDescription>Memuat...</SheetDescription>
            </>
          )}
        </SheetHeader>

        <ScrollArea className="flex-1 px-2 pb-4">
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12 px-4">
              Tidak ada transaksi pada kategori ini bulan ini.
            </p>
          ) : (
            <ul className="divide-y divide-border px-2">
              {filtered.map((t) => {
                const label = t.merchant_name?.trim() || t.description?.trim() || category?.name || 'Transaksi'
                return (
                  <li key={t.id}>
                    <Link
                      href={`/transactions/${t.id}`}
                      prefetch
                      onClick={() => onOpenChange(false)}
                      className="flex items-center gap-3 py-3 px-2 hover:bg-accent/40 rounded-lg transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{label}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(t.transacted_at)}</p>
                      </div>
                      <span className="text-sm font-semibold tabular-nums text-red-600 dark:text-red-400 shrink-0">
                        {formatIDR(t.amount)}
                      </span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground/60 shrink-0" aria-hidden />
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}
