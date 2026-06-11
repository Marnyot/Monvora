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

// Bersihkan nilai env: hapus whitespace/newline & tanda kutip yang ikut ter-paste
// (kesalahan umum di UI Vercel, mis. nilai jadi `"projects/.../topics/..."`).
const PUBSUB_TOPIC = (process.env.GOOGLE_PUBSUB_TOPIC ?? '')
  .trim()
  .replace(/^["']|["']$/g, '')
  .trim()

// Format wajib: projects/{project-id}/topics/{topic-id}
const PUBSUB_TOPIC_RE = /^projects\/[^/\s]+\/topics\/[^/\s]+$/

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
  if (!PUBSUB_TOPIC) {
    console.warn('[gmail-watch] GOOGLE_PUBSUB_TOPIC tidak diset — watch tidak didaftarkan')
    return
  }

  // Validasi format sebelum panggil Google — beri pesan jelas kalau env salah.
  if (!PUBSUB_TOPIC_RE.test(PUBSUB_TOPIC)) {
    console.error(
      `[gmail-watch] GOOGLE_PUBSUB_TOPIC format tidak valid: "${PUBSUB_TOPIC}". ` +
        `Harus persis: projects/{project-id}/topics/{topic-id} (tanpa tanda kutip/spasi).`
    )
    return
  }

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

  if (!watchData.historyId) {
    console.error('[gmail-watch] Google tidak mengembalikan historyId — watch mungkin gagal')
    return
  }

  const expiration = new Date(Date.now() + WATCH_EXPIRATION_MS).toISOString()

  // CATATAN: jangan set gmail_sync_token di sini.
  // Cursor sync (gmail_sync_token) dimiliki sepenuhnya oleh syncUserGmail.
  // Kalau watch menulis cursor = historyId "sekarang", sync pertama akan
  // melewati backfill (mulai dari masa depan) dan renewal tiap 6 jam akan
  // me-reset cursor sehingga email yang belum di-sync terlewat.
  //
  // VERIFIKASI tulis: pakai .select() supaya kalau update kena blok RLS
  // (mis. SUPABASE_SERVICE_ROLE_KEY tidak diset di server → client jadi anon),
  // kita tahu — bukan log "berhasil" padahal 0 baris tersimpan.
  const { data: updated, error: updateError } = await supabase
    .from('profiles')
    .update({
      gmail_watch_expiration: expiration,
      gmail_watch_history_id: watchData.historyId,
    })
    .eq('id', userId)
    .select('id')

  if (updateError) {
    console.error('[gmail-watch] gagal simpan watch state:', updateError.message)
    throw new Error(`Gagal simpan watch state: ${updateError.message}`)
  }

  if (!updated || updated.length === 0) {
    console.error(
      '[gmail-watch] watch state TIDAK tersimpan (0 baris ter-update). ' +
        'Kemungkinan besar SUPABASE_SERVICE_ROLE_KEY salah/tidak diset di server — ' +
        'admin client jatuh ke level anon dan RLS memblokir update.'
    )
    throw new Error('Watch state tidak tersimpan (0 baris) — cek SUPABASE_SERVICE_ROLE_KEY di server')
  }

  console.info('[gmail-watch] Watch terdaftar & tersimpan', { expiration })
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
