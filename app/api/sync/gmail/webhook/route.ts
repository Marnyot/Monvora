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
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { inngest } from '@/lib/inngest/client'

const VERIFICATION_TOKEN = process.env.GOOGLE_PUBSUB_VERIFICATION_TOKEN ?? ''
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

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
  const authHeader = request.headers.get('authorization') ?? ''

  if (VERIFICATION_TOKEN && authHeader !== `Bearer ${VERIFICATION_TOKEN}`) {
    return NextResponse.json(
      { data: null, error: { code: 'UNAUTHORIZED', message: 'Invalid token' } },
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
  const adminSupabase = createAdminClient<Database>(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: profile } = await adminSupabase
    .from('profiles')
    .select('id, gmail_watch_history_id')
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

  // ─── 5. TRIGGER SYNC ───────────────────────────────────
  try {
    await inngest.send({
      name: 'gmail/sync.push',
      data: { userId: profile.id },
    })
  } catch {
    // Non-blocking — cron akan pick up eventually
  }

  return NextResponse.json({ data: { ack: true }, error: null })
}
