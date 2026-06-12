// Pure recurring-transaction detector.
//
// Heuristic (MVP, monthly only — the most common case for langganan):
//   1. Group expense transactions by case-folded + trimmed merchant_name.
//   2. Within each group, sort by transacted_at, compute pairwise intervals.
//   3. If ≥3 transactions and *consecutive* intervals all fall in 25–35 day
//      window, mark the group as monthly recurring.
//
// Future work (out of scope for sub-phase 3.5):
//   - Weekly / biweekly / quarterly detection
//   - Description fallback when merchant_name missing
//   - Amount-variance check (some langganan have promo months)
import { randomUUID } from 'node:crypto'

const MIN_OCCURRENCES = 3
const MONTHLY_MIN_DAYS = 25
const MONTHLY_MAX_DAYS = 35
const DAY_MS = 24 * 60 * 60 * 1000

export interface RecurringTxn {
  id: string
  amount: number
  type: 'expense' | 'income' | 'transfer'
  merchant_name: string | null
  transacted_at: string
}

export interface RecurringGroup {
  groupId: string
  canonicalKey: string
  merchantName: string         // display label from first txn
  frequency: 'monthly'
  monthlyEstimate: number      // IDR
  txIds: string[]
}

function normalize(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ')
}

export function detectRecurring(txs: RecurringTxn[]): RecurringGroup[] {
  // 1. Group by normalized merchant
  const byKey = new Map<string, RecurringTxn[]>()
  for (const t of txs) {
    if (t.type !== 'expense') continue
    if (!t.merchant_name) continue
    const key = normalize(t.merchant_name)
    if (!key) continue
    const list = byKey.get(key) ?? []
    list.push(t)
    byKey.set(key, list)
  }

  const groups: RecurringGroup[] = []

  for (const [canonicalKey, list] of byKey) {
    if (list.length < MIN_OCCURRENCES) continue

    // 2. Sort chronologically
    const sorted = [...list].sort(
      (a, b) => new Date(a.transacted_at).getTime() - new Date(b.transacted_at).getTime()
    )

    // 3. Check that every consecutive interval is within monthly tolerance
    let allMonthly = true
    for (let i = 1; i < sorted.length; i++) {
      const diffMs = new Date(sorted[i].transacted_at).getTime() - new Date(sorted[i - 1].transacted_at).getTime()
      const days = diffMs / DAY_MS
      if (days < MONTHLY_MIN_DAYS || days > MONTHLY_MAX_DAYS) {
        allMonthly = false
        break
      }
    }
    if (!allMonthly) continue

    const totalAmount = sorted.reduce((sum, t) => sum + t.amount, 0)
    const monthlyEstimate = Math.round(totalAmount / sorted.length)

    groups.push({
      groupId: randomUUID(),
      canonicalKey,
      merchantName: sorted[0].merchant_name!.trim(),
      frequency: 'monthly',
      monthlyEstimate,
      txIds: sorted.map((t) => t.id),
    })
  }

  return groups
}
