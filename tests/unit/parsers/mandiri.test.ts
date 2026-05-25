import { describe, it, expect } from 'vitest'
import { mandiriParser } from '@/lib/gmail/parsers/mandiri'
import type { GmailMessage } from '@/types/parser'

// Helper untuk membuat mock GmailMessage
function makeEmail(overrides: Partial<GmailMessage>): GmailMessage {
  return {
    id: 'msg-001',
    threadId: 'thread-001',
    subject: 'Notifikasi Transaksi Mandiri',
    from: 'Mandiri <notifikasi@bankmandiri.co.id>',
    body: '',
    date: '2026-05-25T10:30:00+07:00',
    snippet: '',
    ...overrides,
  }
}

describe('Mandiri Parser', () => {
  describe('canParse', () => {
    it('should return true for email from bankmandiri.co.id domain', () => {
      const email = makeEmail({
        from: 'Notifikasi Mandiri <notifikasi@bankmandiri.co.id>',
        subject: 'Notifikasi Transaksi',
      })
      expect(mandiriParser.canParse(email)).toBe(true)
    })

    it('should return false for email from non-Mandiri domain', () => {
      const email = makeEmail({
        from: 'BCA Bank <info@bca.co.id>',
        subject: 'Notifikasi Transaksi',
      })
      expect(mandiriParser.canParse(email)).toBe(false)
    })

    it('should handle case-insensitive sender matching', () => {
      const email = makeEmail({
        from: 'NOTIFIKASI MANDIRI <NOTIFIKASI@BANKMANDIRI.CO.ID>',
        subject: 'Notifikasi Transaksi',
      })
      expect(mandiriParser.canParse(email)).toBe(true)
    })
  })

  describe('parse', () => {
    it('should parse debit transaction (Pembelian)', () => {
      const email = makeEmail({
        body: `
          Notifikasi Transaksi Mandiri

          Anda telah melakukan transaksi:
          Jenis: Pembelian
          Nominal: Rp. 75.000
          Merchant: GCash Payment
          Waktu: 2026-05-25 10:30:00
          Nomor Referensi: 123456789
        `,
        date: '2026-05-25T10:30:00+07:00',
      })
      const result = mandiriParser.parse(email)

      expect(result).not.toBeNull()
      expect(result?.amount).toBe(75000)
      expect(result?.type).toBe('expense')
      expect(result?.merchant_name).toBe('gcash payment')
      expect(result?.payment_method).toBe('ewallet')
      expect(result?.confidence).toBeGreaterThanOrEqual(0.9)
      expect(result?.bank).toBe('mandiri')
    })

    it('should parse transfer keluar (transfer out) as expense', () => {
      const email = makeEmail({
        body: `
          Notifikasi Transaksi Mandiri

          Transfer ke Rekening BCA
          Nominal: Rp 1.500.000
          Tujuan: Ardhana
          Tanggal: 2026-05-25 14:00:00
          Ref: TRF20260525001
        `,
        date: '2026-05-25T14:00:00+07:00',
      })
      const result = mandiriParser.parse(email)

      expect(result).not.toBeNull()
      expect(result?.amount).toBe(1500000)
      expect(result?.type).toBe('expense')
      expect(result?.payment_method).toBe('transfer')
      expect(result?.reference_number).toBe('TRF20260525001')
      expect(result?.confidence).toBeGreaterThanOrEqual(0.9)
    })

    it('should parse transfer masuk (transfer in) as income', () => {
      const email = makeEmail({
        body: `
          Notifikasi Transaksi Mandiri

          Transfer Masuk
          Nominal: Rp 500.000
          Dari: Budi Santoso
          Tanggal: 2026-05-25 09:15:00
          Nomor Ref: TRF20260525INC001
        `,
        date: '2026-05-25T09:15:00+07:00',
      })
      const result = mandiriParser.parse(email)

      expect(result).not.toBeNull()
      expect(result?.amount).toBe(500000)
      expect(result?.type).toBe('income')
      expect(result?.payment_method).toBe('transfer')
      expect(result?.confidence).toBeGreaterThanOrEqual(0.9)
    })

    it('should parse large amount with proper integer conversion', () => {
      const email = makeEmail({
        body: `
          Notifikasi Transaksi
          Pembelian Rp 1.250.000 di Indomaret
          Jam: 2026-05-25 11:45:00
        `,
        date: '2026-05-25T11:45:00+07:00',
      })
      const result = mandiriParser.parse(email)

      expect(result).not.toBeNull()
      expect(result?.amount).toBe(1250000)
      expect(result?.type).toBe('expense')
    })

    it('should parse penarikan tunai (cash withdrawal) as expense', () => {
      const email = makeEmail({
        body: `
          Mandiri Notification

          Penarikan Tunai
          Jumlah: Rp. 500.000
          ATM: Mandiri ATM Senayan
          Waktu: 2026-05-25 16:20:00
        `,
        date: '2026-05-25T16:20:00+07:00',
      })
      const result = mandiriParser.parse(email)

      expect(result).not.toBeNull()
      expect(result?.amount).toBe(500000)
      expect(result?.type).toBe('expense')
      expect(result?.payment_method).toBe('debit')
    })

    it('should return null when no amount is found', () => {
      const email = makeEmail({
        body: `
          Notifikasi Transaksi Mandiri

          Transaksi berhasil diproses.
          Silakan periksa rekening Anda.
        `,
        date: '2026-05-25T10:30:00+07:00',
      })
      const result = mandiriParser.parse(email)

      expect(result).toBeNull()
    })

    it('should set raw_email_id and raw_snippet correctly', () => {
      const email = makeEmail({
        id: 'msg-special-123',
        body: 'Pembelian Rp. 100.000 di Alfamart pada 2026-05-25 13:00:00',
        date: '2026-05-25T13:00:00+07:00',
      })
      const result = mandiriParser.parse(email)

      expect(result).not.toBeNull()
      expect(result?.raw_email_id).toBe('msg-special-123')
      expect(result?.raw_snippet).toBeTruthy()
      expect(result?.raw_snippet?.length).toBeLessThanOrEqual(200)
    })

    it('should have lower confidence when merchant is missing', () => {
      const email = makeEmail({
        body: `
          Notifikasi Transaksi
          Jenis: Pembelian
          Nominal: Rp. 250.000
          Waktu: 2026-05-25 15:30:00
        `,
        date: '2026-05-25T15:30:00+07:00',
      })
      const result = mandiriParser.parse(email)

      expect(result).not.toBeNull()
      expect(result?.amount).toBe(250000)
      expect(result?.type).toBe('expense')
      expect(result?.merchant_name).toBeNull()
      expect(result?.confidence).toBeLessThan(0.9)
      expect(result?.confidence).toBeGreaterThanOrEqual(0.7)
    })

    it('should parse QRIS transaction', () => {
      const email = makeEmail({
        body: `
          Notifikasi Transaksi Mandiri

          Pembayaran QRIS
          Nominal: Rp 150.000
          Merchant: Kopi Kita
          Waktu: 2026-05-25 08:45:00
          Ref: QRIS20260525001
        `,
        date: '2026-05-25T08:45:00+07:00',
      })
      const result = mandiriParser.parse(email)

      expect(result).not.toBeNull()
      expect(result?.amount).toBe(150000)
      expect(result?.type).toBe('expense')
      expect(result?.payment_method).toBe('qris')
      expect(result?.merchant_name).toBe('kopi kita')
    })

    it('should handle email with decimal amount format', () => {
      const email = makeEmail({
        body: 'Pembelian Rp. 1.500.000,00 pada 2026-05-25 12:00:00',
        date: '2026-05-25T12:00:00+07:00',
      })
      const result = mandiriParser.parse(email)

      expect(result).not.toBeNull()
      expect(result?.amount).toBe(1500000)
    })

    it('should properly parse date from email header', () => {
      const email = makeEmail({
        body: 'Pembelian Rp. 50.000',
        date: '2026-05-25T17:45:30+07:00',
      })
      const result = mandiriParser.parse(email)

      expect(result).not.toBeNull()
      expect(result?.transacted_at).toEqual(new Date('2026-05-25T17:45:30+07:00'))
    })
  })

  describe('parser name', () => {
    it('should have name property set to "mandiri"', () => {
      expect(mandiriParser.name).toBe('mandiri')
    })
  })
})
