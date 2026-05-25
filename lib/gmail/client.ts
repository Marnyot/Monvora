/**
 * Gmail API client wrapper.
 * Menggunakan googleapis package dengan OAuth2 access token dari Supabase Auth.
 *
 * JANGAN log email content, subject, sender, atau transaksi detail.
 */

import { google } from 'googleapis'
import type { GmailMessage } from '@/types/parser'

// ─── Custom Errors ─────────────────────────────────────────────────────────────

export class GmailTokenExpiredError extends Error {
  constructor() {
    super('Gmail token expired or revoked')
    this.name = 'GmailTokenExpiredError'
  }
}

export class GmailAPIError extends Error {
  constructor(message: string) {
    super(`Gmail API error: ${message}`)
    this.name = 'GmailAPIError'
  }
}

// ─── Gmail Client Factory ──────────────────────────────────────────────────────

/**
 * Buat Gmail API client dari access token.
 * Token berasal dari Supabase Auth provider token (Google OAuth).
 */
export function createGmailClient(accessToken: string): ReturnType<typeof google.gmail> {
  const auth = new google.auth.OAuth2()
  auth.setCredentials({ access_token: accessToken })
  return google.gmail({ version: 'v1', auth })
}

// ─── Email Fetching ────────────────────────────────────────────────────────────

/**
 * Fetch emails baru sejak historyId terakhir.
 * - Jika historyId null → initial sync: fetch 50 email terbaru
 * - Jika historyId ada → incremental sync menggunakan Gmail History API
 * - Return: array GmailMessage + historyId baru
 */
export async function fetchNewEmails(
  accessToken: string,
  lastHistoryId: string | null
): Promise<{ messages: GmailMessage[]; newHistoryId: string }> {
  const gmail = createGmailClient(accessToken)

  try {
    if (lastHistoryId === null) {
      // Initial sync: ambil 50 email terbaru dari inbox
      return await fetchInitialEmails(gmail)
    } else {
      // Incremental sync: gunakan History API
      return await fetchEmailsFromHistory(gmail, lastHistoryId)
    }
  } catch (err) {
    const error = err as { code?: number; message?: string; status?: number }

    // Detect token expired / revoked
    if (
      error.code === 401 ||
      error.status === 401 ||
      (error.message && (
        error.message.includes('invalid_grant') ||
        error.message.includes('Token has been expired') ||
        error.message.includes('Invalid Credentials')
      ))
    ) {
      throw new GmailTokenExpiredError()
    }

    throw new GmailAPIError(error.message ?? 'Unknown error')
  }
}

/**
 * Initial sync: fetch 50 email terbaru dari inbox.
 */
async function fetchInitialEmails(
  gmail: ReturnType<typeof google.gmail>
): Promise<{ messages: GmailMessage[]; newHistoryId: string }> {
  // List message IDs terbaru
  const listRes = await gmail.users.messages.list({
    userId: 'me',
    maxResults: 50,
    labelIds: ['INBOX'],
  })

  const messageItems = listRes.data.messages ?? []

  if (messageItems.length === 0) {
    // Ambil historyId dari profile info jika tidak ada email
    const profileRes = await gmail.users.getProfile({ userId: 'me' })
    const historyId = profileRes.data.historyId ?? '0'
    return { messages: [], newHistoryId: historyId }
  }

  // Fetch detail setiap email
  const messages = await fetchMessageDetails(gmail, messageItems.map(m => m.id!))

  // historyId terbaru diambil dari email pertama (terbaru)
  const profileRes = await gmail.users.getProfile({ userId: 'me' })
  const newHistoryId = profileRes.data.historyId ?? messageItems[0].id ?? '0'

  return { messages, newHistoryId }
}

/**
 * Incremental sync: gunakan Gmail History API untuk mendapat email baru sejak historyId.
 */
async function fetchEmailsFromHistory(
  gmail: ReturnType<typeof google.gmail>,
  startHistoryId: string
): Promise<{ messages: GmailMessage[]; newHistoryId: string }> {
  const historyRes = await gmail.users.history.list({
    userId: 'me',
    startHistoryId,
    historyTypes: ['messageAdded'],
    labelId: 'INBOX',
  })

  const historyItems = historyRes.data.history ?? []
  const newHistoryId = historyRes.data.historyId ?? startHistoryId

  // Kumpulkan semua message ID yang baru ditambahkan
  const messageIds = new Set<string>()
  for (const item of historyItems) {
    for (const added of item.messagesAdded ?? []) {
      if (added.message?.id) {
        messageIds.add(added.message.id)
      }
    }
  }

  if (messageIds.size === 0) {
    return { messages: [], newHistoryId }
  }

  const messages = await fetchMessageDetails(gmail, Array.from(messageIds))
  return { messages, newHistoryId }
}

/**
 * Fetch detail email (subject, from, body) untuk array message IDs.
 */
async function fetchMessageDetails(
  gmail: ReturnType<typeof google.gmail>,
  messageIds: string[]
): Promise<GmailMessage[]> {
  const results: GmailMessage[] = []

  for (const id of messageIds) {
    try {
      const msgRes = await gmail.users.messages.get({
        userId: 'me',
        id,
        format: 'full',
      })

      const msg = msgRes.data
      const headers = msg.payload?.headers ?? []

      const subject = headers.find(h => h.name?.toLowerCase() === 'subject')?.value ?? ''
      const from = headers.find(h => h.name?.toLowerCase() === 'from')?.value ?? ''
      const date = headers.find(h => h.name?.toLowerCase() === 'date')?.value ?? ''

      const body = extractEmailBody(msg.payload)
      const snippet = msg.snippet ?? ''

      results.push({
        id,
        threadId: msg.threadId ?? '',
        subject,
        from,
        body,
        date,
        snippet,
      })
    } catch {
      // Skip email yang gagal di-fetch, jangan log detail
      // Individual message failure tidak harus membatalkan seluruh sync
    }
  }

  return results
}

// ─── Email Body Parsing ────────────────────────────────────────────────────────

/**
 * Ekstrak body text dari Gmail message payload.
 * Gmail API mengembalikan body dalam format base64url.
 * Priority: text/plain > text/html (distrip tag-nya)
 */
export function extractEmailBody(payload: {
  mimeType?: string | null
  body?: { data?: string | null } | null
  parts?: Array<{
    mimeType?: string | null
    body?: { data?: string | null } | null
    parts?: unknown[]
  }> | null
} | null | undefined): string {
  if (!payload) return ''

  // Single-part email
  if (payload.body?.data) {
    return decodeBase64url(payload.body.data)
  }

  if (!payload.parts || payload.parts.length === 0) return ''

  // Multi-part: cari text/plain dulu
  for (const part of payload.parts) {
    if (part.mimeType === 'text/plain' && part.body?.data) {
      return decodeBase64url(part.body.data)
    }
  }

  // Fallback ke text/html (strip tags)
  for (const part of payload.parts) {
    if (part.mimeType === 'text/html' && part.body?.data) {
      const html = decodeBase64url(part.body.data)
      return stripHtmlTags(html)
    }
  }

  // Recursive: nested multipart (e.g., multipart/alternative dalam multipart/mixed)
  for (const part of payload.parts) {
    if (part.mimeType?.startsWith('multipart/') && part.parts) {
      const nested = extractEmailBody(part as Parameters<typeof extractEmailBody>[0])
      if (nested) return nested
    }
  }

  return ''
}

/**
 * Decode base64url string ke UTF-8 text.
 * Gmail menggunakan base64url (menggunakan - dan _ sebagai pengganti + dan /).
 */
export function decodeBase64url(encoded: string): string {
  if (!encoded) return ''
  // Konversi base64url → base64 standar
  const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/')
  // Tambahkan padding jika perlu
  const padded = base64 + '=='.slice(0, (4 - base64.length % 4) % 4)

  try {
    // Node.js environment
    return Buffer.from(padded, 'base64').toString('utf-8')
  } catch {
    return ''
  }
}

/**
 * Strip HTML tags dari string, mengembalikan teks saja.
 */
function stripHtmlTags(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

// ─── Bank Email Filter ─────────────────────────────────────────────────────────

/**
 * Filter kasar: cek apakah email kemungkinan notifikasi bank/transaksi.
 * Dilakukan sebelum parser detail untuk mengurangi processing.
 *
 * Cek subject dan sender mengandung kata kunci bank/transaksi.
 */
export function isBankEmail(email: GmailMessage): boolean {
  const BANK_KEYWORDS = [
    'bank',
    'transaksi',
    'debit',
    'transfer',
    'bayar',
    'pembayaran',
    'notifikasi',
    'mandiri',
    'bca',
    'bni',
    'bri',
    'cimb',
    'ocbc',
    'permata',
    'danamon',
    'gopay',
    'ovo',
    'dana',
    'shopeepay',
    'linkaja',
  ]

  const subjectLower = email.subject.toLowerCase()
  const fromLower = email.from.toLowerCase()

  for (const kw of BANK_KEYWORDS) {
    if (subjectLower.includes(kw) || fromLower.includes(kw)) {
      return true
    }
  }

  return false
}
