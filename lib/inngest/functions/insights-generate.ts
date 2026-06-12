/**
 * Inngest Cron Job — Daily AI Insights Generation
 * Runs at 00:00 UTC (= 07:00 WIB) — generates today's insights per user
 * and persists them to ai_insights table (RLS-protected, service-role writes).
 *
 * Never log transaction amounts or merchant names.
 */

import { inngest } from '@/lib/inngest/client'
import { createAdminClient } from '@/lib/supabase/admin'
import { aggregate, type AnalyticsInput } from '@/lib/analytics/aggregate'
import { generateInsights, type InsightsContext } from '@/lib/ai/insights'

const JAKARTA_OFFSET_MS = 7 * 60 * 60 * 1000
const ID_MONTHS_LONG: Record<number, string> = {
  0: 'Januari', 1: 'Februari', 2: 'Maret', 3: 'April', 4: 'Mei', 5: 'Juni',
  6: 'Juli', 7: 'Agustus', 8: 'September', 9: 'Oktober', 10: 'November', 11: 'Desember',
}

function jakartaDateKey(now: Date): string {
  const j = new Date(now.getTime() + JAKARTA_OFFSET_MS)
  return `${j.getUTCFullYear()}-${String(j.getUTCMonth() + 1).padStart(2, '0')}-${String(j.getUTCDate()).padStart(2, '0')}`
}

function jakartaMonthLabel(monthOffset: number, now: Date): string {
  const j = new Date(now.getTime() + JAKARTA_OFFSET_MS)
  const target = new Date(Date.UTC(j.getUTCFullYear(), j.getUTCMonth() + monthOffset, 1))
  return `${ID_MONTHS_LONG[target.getUTCMonth()]} ${target.getUTCFullYear()}`
}

function jakartaMonthStartUTC(monthOffset: number, now: Date): Date {
  const j = new Date(now.getTime() + JAKARTA_OFFSET_MS)
  const startWib = new Date(Date.UTC(j.getUTCFullYear(), j.getUTCMonth() + monthOffset, 1))
  return new Date(startWib.getTime() - JAKARTA_OFFSET_MS)
}

export const insightsGenerateFunction = inngest.createFunction(
  {
    id: 'insights-generate',
    name: 'AI Insights — Daily Generation',
    concurrency: { limit: 5 },
    retries: 1,
    triggers: [{ cron: '0 0 * * *' }],
  },
  async ({ step, logger }) => {
    const supabase = createAdminClient()
    const now = new Date()
    const periodKey = jakartaDateKey(now)
    const monthLabel = jakartaMonthLabel(0, now)
    const prevMonthLabel = jakartaMonthLabel(-1, now)
    const since = jakartaMonthStartUTC(-1, now).toISOString()

    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id')

    if (profilesError) {
      logger.error('Failed to fetch profiles', { error: profilesError.message })
      throw new Error(`Failed to fetch profiles: ${profilesError.message}`)
    }

    const users = profiles ?? []
    if (users.length === 0) {
      return { generated: 0, skipped: 0, errors: 0 }
    }

    let generated = 0
    let skipped = 0
    let errors = 0

    for (const profile of users) {
      const result = await step.run(`insights-${profile.id}`, async () => {
        // Skip if already generated today
        const { data: existing } = await supabase
          .from('ai_insights')
          .select('id')
          .eq('user_id', profile.id)
          .eq('period_key', periodKey)
          .maybeSingle()

        if (existing) return { status: 'skipped' as const }

        // Fetch transactions from previous month start onwards
        const { data: rows, error: txError } = await supabase
          .from('transactions')
          .select(`
            id, amount, type, transacted_at, merchant_name, description,
            category:categories(id, name, icon, color)
          `)
          .eq('user_id', profile.id)
          .is('deleted_at', null)
          .gte('transacted_at', since)

        if (txError) {
          return { status: 'error' as const, reason: 'tx_fetch' }
        }

        const input: AnalyticsInput[] = (rows ?? []).map((r) => {
          const cat = Array.isArray(r.category) ? r.category[0] : r.category
          return {
            id: r.id as string,
            amount: r.amount as number,
            type: r.type as AnalyticsInput['type'],
            transacted_at: r.transacted_at as string,
            merchant_name: (r.merchant_name as string | null) ?? null,
            description: (r.description as string | null) ?? null,
            category: cat ? {
              id: cat.id as string,
              name: cat.name as string,
              icon: cat.icon as string,
              color: cat.color as string,
            } : null,
          }
        })

        const currentResult = aggregate(input, now)
        // Aggregate with "now" shifted to previous month to capture prev totals
        const prevNow = new Date(jakartaMonthStartUTC(0, now).getTime() - 1)
        const prevResult = aggregate(input, prevNow)

        // Skip users with no activity in either month — Gemini quota saver
        const noActivity =
          currentResult.totals.income + currentResult.totals.expense === 0 &&
          prevResult.totals.income + prevResult.totals.expense === 0
        if (noActivity) return { status: 'skipped' as const }

        const ctx: InsightsContext = {
          monthLabel,
          prevMonthLabel,
          totals: { income: currentResult.totals.income, expense: currentResult.totals.expense },
          prevTotals: { income: prevResult.totals.income, expense: prevResult.totals.expense },
          topCategories: currentResult.byCategory.slice(0, 5).map((c) => ({
            name: c.name,
            amount: c.amount,
          })),
          topMerchants: currentResult.topMerchants.map((m) => ({
            name: m.merchantName,
            amount: m.amount,
            count: m.count,
          })),
        }

        const gen = await generateInsights(ctx)
        if (!gen) return { status: 'error' as const, reason: 'gemini_failed' }

        const { error: insertError } = await supabase
          .from('ai_insights')
          .insert({
            user_id: profile.id,
            period_key: periodKey,
            insights: gen.insights,
            model: gen.model,
            generated_at: now.toISOString(),
          })

        if (insertError) {
          return { status: 'error' as const, reason: 'insert_failed' }
        }

        return { status: 'generated' as const }
      })

      if (result.status === 'generated') generated++
      else if (result.status === 'skipped') skipped++
      else errors++
    }

    logger.info('Insights generation complete', { generated, skipped, errors, users: users.length })
    return { generated, skipped, errors }
  }
)
