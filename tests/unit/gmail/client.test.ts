import { describe, it, expect } from 'vitest'
import {
  isBankEmail,
  decodeBase64url,
  extractEmailBody,
  GmailTokenExpiredError,
  GmailAPIError,
} from '@/lib/gmail/client'
import type { GmailMessage } from '@/types/parser'

// ─── Helpers ───────────────────────────────────────────────────────────────────

function makeEmail(overrides: Partial<GmailMessage> = {}): GmailMessage {
  return {
    id: 'msg-001',
    threadId: 'thread-001',
    subject: 'Test Email',
    from: 'sender@example.com',
    body: '',
    date: '2024-01-15T10:30:00+07:00',
    snippet: '',
    ...overrides,
  }
}

// ─── isBankEmail ───────────────────────────────────────────────────────────────

describe('isBankEmail', () => {
  it('returns true when subject contains "transaksi"', () => {
    const email = makeEmail({ subject: 'Notifikasi Transaksi Mandiri', from: 'noreply@bank.com' })
    expect(isBankEmail(email)).toBe(true)
  })

  it('returns true when subject contains "debit"', () => {
    const email = makeEmail({ subject: 'Debit Rp 150.000 berhasil', from: 'noreply@example.com' })
    expect(isBankEmail(email)).toBe(true)
  })

  it('returns true when subject contains "transfer"', () => {
    const email = makeEmail({ subject: 'Transfer ke rekening berhasil', from: 'noreply@example.com' })
    expect(isBankEmail(email)).toBe(true)
  })

  it('returns true when subject contains "bayar"', () => {
    const email = makeEmail({ subject: 'Konfirmasi pembayaran tagihan', from: 'noreply@example.com' })
    expect(isBankEmail(email)).toBe(true)
  })

  it('returns true when from field contains "mandiri"', () => {
    const email = makeEmail({
      subject: 'Info akun Anda',
      from: 'notifikasi@bankmandiri.co.id',
    })
    expect(isBankEmail(email)).toBe(true)
  })

  it('returns true when from field contains "bca"', () => {
    const email = makeEmail({
      subject: 'Informasi transaksi',
      from: 'notify@klikbca.com',
    })
    expect(isBankEmail(email)).toBe(true)
  })

  it('returns true when subject contains "bank" (case-insensitive)', () => {
    const email = makeEmail({ subject: 'BANK MANDIRI - Notifikasi', from: 'user@example.com' })
    expect(isBankEmail(email)).toBe(true)
  })

  it('returns false for unrelated promotional email', () => {
    const email = makeEmail({
      subject: 'Flash sale 50% untuk semua produk!',
      from: 'promo@toko.com',
    })
    expect(isBankEmail(email)).toBe(false)
  })

  it('returns false for newsletter email', () => {
    const email = makeEmail({
      subject: 'Buletin mingguan teknologi',
      from: 'newsletter@blog.id',
    })
    expect(isBankEmail(email)).toBe(false)
  })

  it('returns true when from contains "gopay"', () => {
    const email = makeEmail({
      subject: 'Konfirmasi dari GoPay',
      from: 'noreply@gopay.co.id',
    })
    expect(isBankEmail(email)).toBe(true)
  })

  it('returns true when subject contains "notifikasi" (catch-all bank pattern)', () => {
    const email = makeEmail({
      subject: 'Notifikasi dari rekening Anda',
      from: 'system@abank.co.id',
    })
    expect(isBankEmail(email)).toBe(true)
  })
})

// ─── decodeBase64url ───────────────────────────────────────────────────────────

describe('decodeBase64url', () => {
  it('decodes standard base64url string correctly', () => {
    // "Hello World" in base64url
    const encoded = Buffer.from('Hello World').toString('base64url')
    expect(decodeBase64url(encoded)).toBe('Hello World')
  })

  it('handles base64url with - and _ characters (no + or /)', () => {
    // text that when base64 encoded uses + or / → base64url uses - or _
    const original = 'some string with special chars: ~><'
    const encodedUrl = Buffer.from(original).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
    expect(decodeBase64url(encodedUrl)).toBe(original)
  })

  it('returns empty string for empty input', () => {
    expect(decodeBase64url('')).toBe('')
  })

  it('decodes Indonesian text (UTF-8)', () => {
    const text = 'Transaksi Rp 150.000 berhasil'
    const encoded = Buffer.from(text).toString('base64url')
    expect(decodeBase64url(encoded)).toBe(text)
  })

  it('handles base64 string that needs padding', () => {
    // base64url without padding
    const text = 'abc'
    const encoded = Buffer.from(text).toString('base64url')
    // encoded length may not be multiple of 4 — padding should be handled
    expect(decodeBase64url(encoded)).toBe(text)
  })
})

// ─── extractEmailBody ──────────────────────────────────────────────────────────

describe('extractEmailBody', () => {
  it('returns empty string for null payload', () => {
    expect(extractEmailBody(null)).toBe('')
  })

  it('returns empty string for undefined payload', () => {
    expect(extractEmailBody(undefined)).toBe('')
  })

  it('decodes body.data when payload is single-part', () => {
    const text = 'Transaksi berhasil'
    const data = Buffer.from(text).toString('base64url')
    const payload = { mimeType: 'text/plain', body: { data } }
    expect(extractEmailBody(payload)).toBe(text)
  })

  it('prefers text/plain part over text/html in multipart email', () => {
    const plainText = 'Plain text body'
    const htmlText = '<p>HTML body</p>'
    const payload = {
      mimeType: 'multipart/alternative',
      body: null,
      parts: [
        { mimeType: 'text/plain', body: { data: Buffer.from(plainText).toString('base64url') } },
        { mimeType: 'text/html', body: { data: Buffer.from(htmlText).toString('base64url') } },
      ],
    }
    expect(extractEmailBody(payload)).toBe(plainText)
  })

  it('falls back to text/html and strips tags when no text/plain', () => {
    const html = '<p>Debit <b>Rp 100.000</b></p>'
    const payload = {
      mimeType: 'multipart/alternative',
      body: null,
      parts: [
        { mimeType: 'text/html', body: { data: Buffer.from(html).toString('base64url') } },
      ],
    }
    const result = extractEmailBody(payload)
    expect(result).toContain('Debit')
    expect(result).toContain('Rp 100.000')
    expect(result).not.toContain('<p>')
    expect(result).not.toContain('<b>')
  })

  it('returns empty string when payload has no parts and no body.data', () => {
    const payload = { mimeType: 'multipart/mixed', body: null, parts: [] }
    expect(extractEmailBody(payload)).toBe('')
  })
})

// ─── Error classes ─────────────────────────────────────────────────────────────

describe('GmailTokenExpiredError', () => {
  it('has correct name and message', () => {
    const err = new GmailTokenExpiredError()
    expect(err).toBeInstanceOf(Error)
    expect(err.name).toBe('GmailTokenExpiredError')
    expect(err.message).toBe('Gmail token expired or revoked')
  })
})

describe('GmailAPIError', () => {
  it('prefixes message with "Gmail API error:"', () => {
    const err = new GmailAPIError('quota exceeded')
    expect(err).toBeInstanceOf(Error)
    expect(err.name).toBe('GmailAPIError')
    expect(err.message).toBe('Gmail API error: quota exceeded')
  })
})
