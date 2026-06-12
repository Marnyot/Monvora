// Pure analytics aggregators. All time math uses Asia/Jakarta (WIB, UTC+7, no DST).
// Caller is responsible for filtering transactions to the user + deleted_at IS NULL.
const JAKARTA_OFFSET_MS = 7 * 60 * 60 * 1000

export interface AnalyticsInput {
  id: string
  amount: number
  type: 'income' | 'expense' | 'transfer'
  transacted_at: string
  merchant_name: string | null
  description: string | null
  category: { id: string; name: string; icon: string; color: string } | null
}

export interface TrendPoint {
  month: string
  income: number
  expense: number
}

export interface CategoryAgg {
  categoryId: string
  name: string
  icon: string
  color: string
  amount: number
  count: number
}

export interface MerchantAgg {
  merchantName: string
  amount: number
  count: number
}

export interface DayOfWeekAgg {
  day: 0 | 1 | 2 | 3 | 4 | 5 | 6
  amount: number
  count: number
}

export interface AnalyticsResult {
  trend: TrendPoint[]
  byCategory: CategoryAgg[]
  topMerchants: MerchantAgg[]
  byDayOfWeek: DayOfWeekAgg[]
  totals: { income: number; expense: number; net: number }
}

const UNCATEGORIZED_ID = '__uncategorized__'
const UNCATEGORIZED_NAME = 'Lainnya'
const UNCATEGORIZED_ICON = 'circle-ellipsis'
const UNCATEGORIZED_COLOR = '#64748b'

function toJakarta(iso: string): Date {
  return new Date(new Date(iso).getTime() + JAKARTA_OFFSET_MS)
}

function jakartaMonthKey(iso: string): string {
  const d = toJakarta(iso)
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

function jakartaDayOfWeek(iso: string): 0 | 1 | 2 | 3 | 4 | 5 | 6 {
  return toJakarta(iso).getUTCDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6
}

function nowMonthKey(now: Date): string {
  const j = new Date(now.getTime() + JAKARTA_OFFSET_MS)
  return `${j.getUTCFullYear()}-${String(j.getUTCMonth() + 1).padStart(2, '0')}`
}

function shiftMonth(key: string, delta: number): string {
  const [y, m] = key.split('-').map(Number)
  const d = new Date(Date.UTC(y, m - 1 + delta, 1))
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

export function aggregate(input: AnalyticsInput[], now: Date = new Date()): AnalyticsResult {
  const currentMonth = nowMonthKey(now)
  const trendMonths: string[] = []
  for (let i = 5; i >= 0; i--) trendMonths.push(shiftMonth(currentMonth, -i))

  const trendMap = new Map<string, TrendPoint>(
    trendMonths.map((m) => [m, { month: m, income: 0, expense: 0 }])
  )

  const categoryMap = new Map<string, CategoryAgg>()
  const merchantMap = new Map<string, MerchantAgg>()
  const dayMap = new Map<number, DayOfWeekAgg>(
    [0, 1, 2, 3, 4, 5, 6].map((d) => [d, { day: d as DayOfWeekAgg['day'], amount: 0, count: 0 }])
  )

  const totals = { income: 0, expense: 0, net: 0 }

  for (const t of input) {
    const monthKey = jakartaMonthKey(t.transacted_at)
    const inTrendWindow = trendMap.has(monthKey)
    const isCurrent = monthKey === currentMonth

    // trend buckets — income + expense only (skip transfer)
    if (inTrendWindow && t.type !== 'transfer') {
      const bucket = trendMap.get(monthKey)!
      if (t.type === 'income') bucket.income += t.amount
      else bucket.expense += t.amount
    }

    if (!isCurrent) continue

    // totals — current month, income + expense
    if (t.type === 'income') totals.income += t.amount
    else if (t.type === 'expense') totals.expense += t.amount

    if (t.type !== 'expense') continue

    // byCategory — current month expense
    const catId = t.category?.id ?? UNCATEGORIZED_ID
    const existing = categoryMap.get(catId)
    if (existing) {
      existing.amount += t.amount
      existing.count += 1
    } else {
      categoryMap.set(catId, {
        categoryId: catId,
        name: t.category?.name ?? UNCATEGORIZED_NAME,
        icon: t.category?.icon ?? UNCATEGORIZED_ICON,
        color: t.category?.color ?? UNCATEGORIZED_COLOR,
        amount: t.amount,
        count: 1,
      })
    }

    // topMerchants — current month expense
    const merchantName = (t.merchant_name?.trim() || t.description?.trim() || UNCATEGORIZED_NAME)
    const m = merchantMap.get(merchantName)
    if (m) {
      m.amount += t.amount
      m.count += 1
    } else {
      merchantMap.set(merchantName, { merchantName, amount: t.amount, count: 1 })
    }

    // byDayOfWeek — current month expense
    const dow = jakartaDayOfWeek(t.transacted_at)
    const dayBucket = dayMap.get(dow)!
    dayBucket.amount += t.amount
    dayBucket.count += 1
  }

  totals.net = totals.income - totals.expense

  return {
    trend: trendMonths.map((m) => trendMap.get(m)!),
    byCategory: [...categoryMap.values()].sort((a, b) => b.amount - a.amount),
    topMerchants: [...merchantMap.values()].sort((a, b) => b.amount - a.amount).slice(0, 5),
    byDayOfWeek: [...dayMap.values()].sort((a, b) => a.day - b.day),
    totals,
  }
}
