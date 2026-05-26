import { describe, it, expect, beforeEach } from 'vitest'
import type { GmailMessage } from '@/types/parser'
import { briParser } from '@/lib/gmail/parsers/bri'

/**
 * Helper to create test email with defaults
 */
function makeEmail(overrides: Partial<GmailMessage> = {}): GmailMessage {
  return {
    id: 'msg-bri-001',
    threadId: 'thread-001',
    subject: 'Notifikasi Transaksi BRI',
    from: 'BRI <notifikasi@bri.co.id>',
    body: '',
    date: '2026-05-25T10:00:00+07:00',
    snippet: '',
    ...overrides,
  }
}

describe('BRI Parser', () => {
  describe('canParse', () => {
    it('should return true for emails from @bri.co.id domain', () => {
      const email = makeEmail({
        from: 'notifikasi@bri.co.id',
      })
      expect(briParser.canParse(email)).toBe(true)
    })

    it('should not detect emails from non-BRI sender even if subject contains BRI', () => {
      const email = makeEmail({
        subject: 'Notifikasi Transaksi BRI - Transfer Keluar',
        from: 'sender@example.com',
      })
      expect(briParser.canParse(email)).toBe(false)
    })

    it('should not detect emails from non-BRI sender even if subject contains BRImo', () => {
      const email = makeEmail({
        subject: 'BRImo - Pembayaran Berhasil',
        from: 'sender@example.com',
      })
      expect(briParser.canParse(email)).toBe(false)
    })

    it('should not detect emails from non-BRI sender with generic subject', () => {
      const email = makeEmail({
        subject: 'notifikasi transaksi bri',
        from: 'sender@example.com',
      })
      expect(briParser.canParse(email)).toBe(false)
    })

    it('should return false for non-BRI emails', () => {
      const email = makeEmail({
        from: 'bank@other-bank.com',
        subject: 'Notifikasi Transaksi',
      })
      expect(briParser.canParse(email)).toBe(false)
    })
  })

  describe('parse - transaction type detection', () => {
    it('should parse debit/pembelian as expense', () => {
      const email = makeEmail({
        body: `
          Notifikasi Transaksi BRI
          Debit Rp. 150.000
          Pembelian di Indomaret
          Tanggal: 2026-05-25 10:00
        `,
      })
      const result = briParser.parse(email)
      expect(result).not.toBeNull()
      expect(result?.type).toBe('expense')
      expect(result?.amount).toBe(150000)
    })

    it('should parse kredit as income', () => {
      const email = makeEmail({
        body: `
          Notifikasi Transaksi BRI
          Kredit Rp. 500.000
          Transfer Masuk
          Tanggal: 2026-05-25 10:00
        `,
      })
      const result = briParser.parse(email)
      expect(result).not.toBeNull()
      expect(result?.type).toBe('income')
      expect(result?.amount).toBe(500000)
    })

    it('should parse tarik tunai as expense with debit payment method', () => {
      const email = makeEmail({
        body: `
          Notifikasi Transaksi BRI
          Tarik Tunai Rp. 1.000.000
          ATM BRI
          Tanggal: 2026-05-25 10:00
        `,
      })
      const result = briParser.parse(email)
      expect(result).not.toBeNull()
      expect(result?.type).toBe('expense')
      expect(result?.payment_method).toBe('debit')
      expect(result?.amount).toBe(1000000)
    })

    it('should parse transfer keluar as expense with transfer payment method', () => {
      const email = makeEmail({
        body: `
          Notifikasi Transaksi BRI
          Transfer Keluar Rp. 2.500.000
          Tujuan: PT Aplikasi Indonesia
          Tanggal: 2026-05-25 10:00
        `,
      })
      const result = briParser.parse(email)
      expect(result).not.toBeNull()
      expect(result?.type).toBe('expense')
      expect(result?.payment_method).toBe('transfer')
      expect(result?.amount).toBe(2500000)
    })

    it('should parse QRIS payment as expense with qris payment method', () => {
      const email = makeEmail({
        body: `
          Notifikasi Transaksi BRI
          QRIS Rp. 50.000
          Pembayaran QR Code
          Tanggal: 2026-05-25 10:00
        `,
      })
      const result = briParser.parse(email)
      expect(result).not.toBeNull()
      expect(result?.type).toBe('expense')
      expect(result?.payment_method).toBe('qris')
      expect(result?.amount).toBe(50000)
    })
  })

  describe('parse - merchant extraction', () => {
    it('should extract merchant name from body', () => {
      const email = makeEmail({
        body: `
          Notifikasi Transaksi BRI
          Pembelian di Tokopedia
          Debit Rp. 250.000
          Tanggal: 2026-05-25 10:00
        `,
      })
      const result = briParser.parse(email)
      expect(result).not.toBeNull()
      expect(result?.merchant_name).toBe('tokopedia')
    })

    it('should extract transfer recipient name', () => {
      const email = makeEmail({
        body: `
          Notifikasi Transaksi BRI
          Transfer Keluar Rp. 100.000
          Tujuan: Budi Santoso
          Tanggal: 2026-05-25 10:00
        `,
      })
      const result = briParser.parse(email)
      expect(result).not.toBeNull()
      expect(result?.merchant_name).toBe('budi santoso')
    })
  })

  describe('parse - amount parsing', () => {
    it('should parse various IDR amount formats', () => {
      const formats = [
        { body: 'Rp. 150.000', expected: 150000 },
        { body: 'Rp 1.500.000,00', expected: 1500000 },
        { body: 'IDR 250000', expected: 250000 },
        { body: 'Rp 50.000', expected: 50000 },
      ]

      for (const { body, expected } of formats) {
        const email = makeEmail({
          body: `Notifikasi BRI\n${body}\nDebit dari rekening`,
        })
        const result = briParser.parse(email)
        expect(result?.amount).toBe(expected)
      }
    })
  })

  describe('parse - edge cases', () => {
    it('should return null if body is empty', () => {
      const email = makeEmail({ body: '' })
      const result = briParser.parse(email)
      expect(result).toBeNull()
    })

    it('should return null if amount is not found', () => {
      const email = makeEmail({
        body: 'Notifikasi BRI tanpa nominal',
      })
      const result = briParser.parse(email)
      expect(result).toBeNull()
    })

    it('should return null if body is missing', () => {
      const email = makeEmail()
      email.body = ''
      const result = briParser.parse(email)
      expect(result).toBeNull()
    })

    it('should handle amount of 0 or negative gracefully', () => {
      const email = makeEmail({
        body: 'Notifikasi BRI Rp. 0',
      })
      const result = briParser.parse(email)
      expect(result).toBeNull()
    })
  })

  describe('parse - confidence scoring', () => {
    it('should have high confidence (0.9) when all details are present', () => {
      const email = makeEmail({
        body: `
          Notifikasi Transaksi BRI
          Pembelian Rp. 150.000
          Di Indomaret Mitra Biru
          Debit dari rekening
          Tanggal: 2026-05-25 10:00
        `,
      })
      const result = briParser.parse(email)
      expect(result?.confidence).toBe(0.9)
    })

    it('should have lower confidence when merchant is missing', () => {
      const email = makeEmail({
        body: `
          Notifikasi Transaksi BRI
          Debit Rp. 150.000
          Tanggal: 2026-05-25 10:00
        `,
      })
      const result = briParser.parse(email)
      expect(result?.confidence).toBeLessThan(0.9)
    })
  })

  describe('parse - raw snippet', () => {
    it('should create raw_snippet from first 200 chars', () => {
      const longBody = 'AAAAAAAAAAAAAAA Rp. 150.000 ' + 'A'.repeat(270)
      const email = makeEmail({ body: longBody })
      const result = briParser.parse(email)
      expect(result).not.toBeNull()
      expect(result?.raw_snippet).toHaveLength(200)
    })

    it('should remove newlines from raw_snippet', () => {
      const email = makeEmail({
        body: `
          Notifikasi Transaksi BRI
          Pembelian Rp. 150.000
          Di Indomaret
        `,
      })
      const result = briParser.parse(email)
      expect(result?.raw_snippet).not.toContain('\n')
    })
  })

  describe('parse - reference number extraction', () => {
    it('should extract reference number from body', () => {
      const email = makeEmail({
        body: `
          Notifikasi Transaksi BRI
          Pembelian Rp. 150.000
          Referensi: BRI123456789ABC
          Di Indomaret
        `,
      })
      const result = briParser.parse(email)
      expect(result?.reference_number).toBe('BRI123456789ABC')
    })

    it('should extract ID transaksi', () => {
      const email = makeEmail({
        body: `
          Notifikasi Transaksi BRI
          ID Transaksi: TRX2026052510123456
          Pembelian Rp. 150.000
        `,
      })
      const result = briParser.parse(email)
      expect(result?.reference_number).toBe('TRX2026052510123456')
    })
  })

  describe('parse - returned fields', () => {
    it('should always return bank as "bri"', () => {
      const email = makeEmail({
        body: 'Notifikasi BRI\nPembelian Rp. 150.000',
      })
      const result = briParser.parse(email)
      expect(result?.bank).toBe('bri')
    })

    it('should set raw_email_id from email.id', () => {
      const email = makeEmail({
        id: 'test-msg-12345',
        body: 'Notifikasi BRI\nPembelian Rp. 150.000',
      })
      const result = briParser.parse(email)
      expect(result?.raw_email_id).toBe('test-msg-12345')
    })

    it('should use email.date as transacted_at', () => {
      const dateStr = '2026-05-25T14:30:00+07:00'
      const email = makeEmail({
        date: dateStr,
        body: 'Notifikasi BRI\nPembelian Rp. 150.000',
      })
      const result = briParser.parse(email)
      expect(result?.transacted_at).toEqual(new Date(dateStr))
    })

    it('should set description as null', () => {
      const email = makeEmail({
        body: 'Notifikasi BRI\nPembelian Rp. 150.000',
      })
      const result = briParser.parse(email)
      expect(result?.description).toBeNull()
    })
  })
})
