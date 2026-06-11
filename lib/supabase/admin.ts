/**
 * Supabase admin client (service role) — bypass RLS untuk background jobs:
 * webhook Pub/Sub, cron sync, push sync, dan initial sync di OAuth callback.
 *
 * PENTING: kalau SUPABASE_SERVICE_ROLE_KEY tidak diset, JANGAN diam-diam
 * jatuh ke level anon (RLS akan memblokir semua tulis tanpa error → bug
 * senyap). Lempar error yang jelas supaya kelihatan di server logs.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

export function createAdminClient(): SupabaseClient<Database> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url) {
    throw new Error('[supabase-admin] NEXT_PUBLIC_SUPABASE_URL tidak diset')
  }
  if (!serviceRoleKey) {
    throw new Error(
      '[supabase-admin] SUPABASE_SERVICE_ROLE_KEY tidak diset — ' +
        'admin client tidak bisa dibuat. Set env ini di server (Vercel) lalu redeploy.'
    )
  }

  return createClient<Database>(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
