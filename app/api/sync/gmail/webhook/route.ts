/**
 * POST /api/sync/gmail/webhook
 * Menerima push notification dari Google Pub/Sub saat ada email baru di Gmail user.
 *
 * Auth: Google Pub/Sub push subscription token (dari env GOOGLE_PUBSUB_VERIFICATION_TOKEN)
 * Rate limit: 100 per menit (burst dari Pub/Sub)
 *
 * JANGAN log email address, userId, atau data sensitif dari payload.
 */

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { syncUserGmail } from '@/lib/gmail/sync'
import { getValidGoogleToken } from '@/lib/utils/google-token'

interface PubSubMessage {
  message: {
    data: string
    messageId: string
    publishTime: string
  }
  subscription: string
}

interface PubSubNotification {
  emailAddress: string
  historyId: string
}

export async function POST(request: Request) {
  // ─── 1. VERIFY AUTH TOKEN ──────────────────────────────
  // Strict: refuse to process kalau env var tidak diset.
  // Pub/Sub subscription harus dikonfigurasi dengan Bearer token yang match.
  const VERIFICATION_TOKEN = process.env.GOOGLE_PUBSUB_VERIFICATION_TOKEN
  if (!VERIFICATION_TOKEN) {
    return NextResponse.json(
      { data: null, error: { code: 'WEBHOOK_DISABLED', message: 'Webhook tidak tersedia' } },
      { status: 503 }
    )
  }

  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${VERIFICATION_TOKEN}`) {
    return NextResponse.json(
      { data: null, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } },
      { status: 401 }
    )
  }

  // ─── 2. PARSE PAYLOAD ──────────────────────────────────
  let body: PubSubMessage
  try {
    body = await request.json() as PubSubMessage
  } catch {
    return NextResponse.json(
      { data: null, error: { code: 'INVALID_PAYLOAD', message: 'Invalid JSON' } },
      { status: 400 }
    )
  }

  if (!body.message?.data) {
    return NextResponse.json(
      { data: null, error: { code: 'INVALID_PAYLOAD', message: 'Missing message data' } },
      { status: 400 }
    )
  }

  // ─── 3. DECODE NOTIFICATION ────────────────────────────
  let notification: PubSubNotification
  try {
    const decoded = Buffer.from(body.message.data, 'base64').toString('utf-8')
    notification = JSON.parse(decoded) as PubSubNotification
  } catch {
    return NextResponse.json(
      { data: null, error: { code: 'INVALID_PAYLOAD', message: 'Cannot decode message' } },
      { status: 400 }
    )
  }

  if (!notification.emailAddress || !notification.historyId) {
    return NextResponse.json(
      { data: null, error: { code: 'INVALID_PAYLOAD', message: 'Missing emailAddress or historyId' } },
      { status: 400 }
    )
  }

  // ─── 4. FIND USER BY EMAIL ─────────────────────────────
  const adminSupabase = createAdminClient()

  const { data: profile } = await adminSupabase
    .from('profiles')
    .select('id, gmail_watch_history_id, google_access_token, google_refresh_token, google_token_expires_at')
    .eq('email', notification.emailAddress)
    .eq('gmail_sync_enabled', true)
    .single()

  if (!profile) {
    // User tidak ditemukan atau sync tidak aktif — ack anyway
    return NextResponse.json({ data: { ack: true }, error: null })
  }

  // Skip jika historyId tidak berubah (notifikasi duplikat)
  if (profile.gmail_watch_history_id === notification.historyId) {
    return NextResponse.json({ data: { ack: true, skipped: true }, error: null })
  }

  // ─── 5. JALANKAN SYNC LANGSUNG ─────────────────────────
  const accessToken = await getValidGoogleToken(profile, adminSupabase, profile.id)
  if (!accessToken) {
    return NextResponse.json({ data: { ack: true }, error: null })
  }

  await syncUserGmail(adminSupabase, profile.id, accessToken)

  return NextResponse.json({ data: { ack: true }, error: null })
}
