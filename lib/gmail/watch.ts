/**
 * Gmail Push Notification lifecycle management.
 * - setupWatch: daftarkan mailbox user ke Pub/Sub topic via users.watch()
 * - stopWatch: berhenti menerima notifikasi via users.stop()
 * - verifyWebhookPayload: validasi payload dari Pub/Sub push
 *
 * JANGAN log email address, user_id, atau data sensitif lainnya.
 */

import { google } from 'googleapis'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { createGmailClient } from '@/lib/gmail/client'

const PUBSUB_TOPIC = process.env.GOOGLE_PUBSUB_TOPIC ?? ''
const WATCH_EXPIRATION_MS = 6 * 24 * 60 * 60 * 1000 // 6 hari (max Gmail: 7 hari)

interface WatchResponse {
  expiration: string
  historyId: string
}

/**
 * Daftarkan mailbox user ke Pub/Sub topic.
 * Google akan kirim notifikasi ke push subscription saat ada email baru.
 */
export async function setupWatch(
  accessToken: string,
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<void> {
  if (!PUBSUB_TOPIC) return

  const gmail = createGmailClient(accessToken)

  const res = await gmail.users.watch({
    userId: 'me',
    requestBody: {
      topicName: PUBSUB_TOPIC,
      labelIds: ['INBOX'],
      labelFilterAction: 'include',
    },
  })

  const watchData = res.data as WatchResponse

  const expiration = new Date(Date.now() + WATCH_EXPIRATION_MS).toISOString()

  await supabase
    .from('profiles')
    .update({
      gmail_watch_expiration: expiration,
      gmail_watch_history_id: watchData.historyId,
      gmail_sync_token: watchData.historyId,
    })
    .eq('id', userId)
}

/**
 * Berhenti menerima push notification untuk user.
 * Dipanggil saat disconnect Gmail.
 */
export async function stopWatch(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<void> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('google_access_token')
    .eq('id', userId)
    .single()

  if (!profile?.google_access_token) return

  try {
    const gmail = createGmailClient(profile.google_access_token)
    await gmail.users.stop({ userId: 'me' })
  } catch {
    // Non-fatal: stop mungkin gagal kalau token expired, tidak apa
  }

  await supabase
    .from('profiles')
    .update({
      gmail_watch_expiration: null,
      gmail_watch_history_id: null,
    })
    .eq('id', userId)
}

/**
 * Renew watch untuk user yang watch-nya akan expired.
 * Dipanggil oleh Inngest cron job.
 */
export async function renewWatch(
  supabase: SupabaseClient<Database>,
  userId: string,
  accessToken: string
): Promise<void> {
  await setupWatch(accessToken, supabase, userId)
}
