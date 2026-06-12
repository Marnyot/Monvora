/**
 * Inngest Cron Job — Recurring Transaction Detection
 * Runs daily at 19:00 UTC (= 02:00 WIB), scans the last 6 months of expense
 * transactions per user, and updates is_recurring + recurring_group_id on
 * detected langganan.
 *
 * Idempotent: re-running on the same data yields the same groupings (groupId
 * is re-assigned each run, which is acceptable — only matters within a run).
 */

import { inngest } from '@/lib/inngest/client'
import { createAdminClient } from '@/lib/supabase/admin'
import { detectRecurring, type RecurringTxn } from '@/lib/recurring/detect'

const LOOKBACK_MONTHS = 6

export const recurringDetectFunction = inngest.createFunction(
  {
    id: 'recurring-detect',
    name: 'Recurring Transactions — Daily Detection',
    concurrency: { limit: 5 },
    retries: 1,
    triggers: [{ cron: '0 19 * * *' }],
  },
  async ({ step, logger }) => {
    const supabase = createAdminClient()
    const now = new Date()
    const since = new Date(now)
    since.setUTCMonth(since.getUTCMonth() - LOOKBACK_MONTHS)
    const sinceISO = since.toISOString()

    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id')

    if (profilesError) {
      logger.error('Failed to fetch profiles', { error: profilesError.message })
      throw new Error(`Failed to fetch profiles: ${profilesError.message}`)
    }

    const users = profiles ?? []
    if (users.length === 0) {
      return { usersProcessed: 0, groupsFound: 0, txsTagged: 0, errors: 0 }
    }

    let usersProcessed = 0
    let groupsFound = 0
    let txsTagged = 0
    let errors = 0

    for (const profile of users) {
      const result = await step.run(`recurring-${profile.id}`, async () => {
        const { data: rows, error: txError } = await supabase
          .from('transactions')
          .select('id, amount, type, merchant_name, transacted_at')
          .eq('user_id', profile.id)
          .is('deleted_at', null)
          .eq('type', 'expense')
          .gte('transacted_at', sinceISO)
          .order('transacted_at', { ascending: false })

        if (txError) {
          return { status: 'error' as const }
        }

        const input: RecurringTxn[] = (rows ?? []).map((r) => ({
          id: r.id,
          amount: r.amount,
          type: r.type as RecurringTxn['type'],
          merchant_name: r.merchant_name,
          transacted_at: r.transacted_at,
        }))

        const groups = detectRecurring(input)

        // 1. Clear previous recurring flags for this user (only inside lookback
        //    window — older rows aren't touched).
        await supabase
          .from('transactions')
          .update({ is_recurring: false, recurring_group_id: null })
          .eq('user_id', profile.id)
          .gte('transacted_at', sinceISO)
          .eq('is_recurring', true)

        // 2. Tag the freshly-detected groups.
        let tagged = 0
        for (const group of groups) {
          const { error: updErr } = await supabase
            .from('transactions')
            .update({ is_recurring: true, recurring_group_id: group.groupId })
            .eq('user_id', profile.id)
            .in('id', group.txIds)
          if (!updErr) tagged += group.txIds.length
        }

        return { status: 'ok' as const, groups: groups.length, tagged }
      })

      usersProcessed++
      if (result.status === 'error') {
        errors++
      } else {
        groupsFound += result.groups
        txsTagged += result.tagged
      }
    }

    logger.info('Recurring detection complete', { usersProcessed, groupsFound, txsTagged, errors })
    return { usersProcessed, groupsFound, txsTagged, errors }
  }
)
