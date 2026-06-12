// Pure budget utilization math. All time arithmetic uses Asia/Jakarta (WIB, UTC+7).
// Period semantics:
//   weekly  — ISO week (Mon 00:00 → next Mon 00:00 WIB)
//   monthly — 1st 00:00 WIB → 1st of next month 00:00 WIB
//   yearly  — Jan 1 00:00 WIB → Jan 1 00:00 WIB next year
const JAKARTA_OFFSET_MS = 7 * 60 * 60 * 1000

export type BudgetPeriod = 'weekly' | 'monthly' | 'yearly'

export interface BudgetInput {
  id: string
  amount: number
  period: BudgetPeriod
  category_id: string | null
}

export interface BudgetTxn {
  amount: number
  type: 'expense' | 'income' | 'transfer'
  transacted_at: string
  category_id: string | null
}

export type BudgetStatus = 'ok' | 'warn' | 'over'

export interface BudgetStatusResult {
  spent: number
  remaining: number   // budget.amount - spent (can be negative)
  percent: number     // 0..(unbounded)
  status: BudgetStatus
}

function startOfDayWibUTC(jakartaYear: number, jakartaMonth: number, jakartaDate: number): Date {
  // jakartaMonth is 0-indexed. Result is the UTC instant corresponding to 00:00 WIB.
  return new Date(Date.UTC(jakartaYear, jakartaMonth, jakartaDate) - JAKARTA_OFFSET_MS)
}

export function periodWindow(period: BudgetPeriod, now: Date): { start: Date; end: Date } {
  const wibNow = new Date(now.getTime() + JAKARTA_OFFSET_MS)
  const y = wibNow.getUTCFullYear()
  const m = wibNow.getUTCMonth()
  const d = wibNow.getUTCDate()

  if (period === 'monthly') {
    return {
      start: startOfDayWibUTC(y, m, 1),
      end: startOfDayWibUTC(y, m + 1, 1),
    }
  }

  if (period === 'yearly') {
    return {
      start: startOfDayWibUTC(y, 0, 1),
      end: startOfDayWibUTC(y + 1, 0, 1),
    }
  }

  // weekly — ISO week (Monday as start). JS getUTCDay: 0 = Sun, 1 = Mon, ..., 6 = Sat.
  const dow = wibNow.getUTCDay()
  // Days since Monday (Sun → 6, Mon → 0, Tue → 1, ...).
  const daysSinceMonday = (dow + 6) % 7
  const mondayDate = d - daysSinceMonday
  return {
    start: startOfDayWibUTC(y, m, mondayDate),
    end: startOfDayWibUTC(y, m, mondayDate + 7),
  }
}

export function computeBudgetStatus(
  budget: BudgetInput,
  txs: BudgetTxn[],
  now: Date = new Date()
): BudgetStatusResult {
  const { start, end } = periodWindow(budget.period, now)
  const startMs = start.getTime()
  const endMs = end.getTime()

  let spent = 0
  for (const tx of txs) {
    if (tx.type !== 'expense') continue
    if (budget.category_id !== null && tx.category_id !== budget.category_id) continue
    const txMs = new Date(tx.transacted_at).getTime()
    if (txMs < startMs || txMs >= endMs) continue
    spent += tx.amount
  }

  const ratio = budget.amount > 0 ? spent / budget.amount : 0
  const percent = Math.round(ratio * 100)
  const remaining = budget.amount - spent
  const status: BudgetStatus = ratio >= 1 ? 'over' : ratio >= 0.8 ? 'warn' : 'ok'

  return { spent, remaining, percent, status }
}
