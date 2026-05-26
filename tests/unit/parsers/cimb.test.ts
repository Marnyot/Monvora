import { describe, it, expect } from 'vitest'
import { cimbParser } from '@/lib/gmail/parsers/cimb'
import type { GmailMessage } from '@/types/parser'

// Helper untuk membuat mock GmailMessage
function makeEmail(overrides: Partial<GmailMessage> = {}): GmailMessage {
  return {
    id: 'msg-cimb-001',
    threadId: 'thread-001',
    subject: 'Notifikasi Transaksi CIMB Niaga',
    from: 'CIMB <notifikasi@cimbniaga.co.id>',
    body: '',
    date: '2026-05-25T10:00:00+07:00',
    snippet: '',
    ...overrides,
  }
}

describe('CIMB Parser', () => {
  describe('canParse', () => {
    it('should return true for email from @cimbniaga.co.id domain', () => {
      const email = makeEmail({
        from: 'CIMB Niaga <notifikasi@cimbniaga.co.id>',
        subject: 'Notifikasi Transaksi',
      })
      expect(cimbParser.canParse(email)).toBe(true)
    })

    it('should return true for email from @ocbcnisp.com domain', () => {
      const email = makeEmail({
        from: 'OCBC NISP <alerts@ocbcnisp.com>',
        subject: 'Transaction Notification',
      })
      expect(cimbParser.canParse(email)).toBe(true)
    })

    it('should not detect emails from non-CIMB sender even if subject contains CIMB', () => {
      const email = makeEmail({
        from: 'Bank <bank@example.com>',
        subject: 'Notifikasi Transaksi CIMB Niaga',
      })
      expect(cimbParser.canParse(email)).toBe(false)
    })

    it('should not detect emails from non-CIMB sender even if subject contains OCTO', () => {
      const email = makeEmail({
        from: 'Bank <bank@example.com>',
        subject: 'Notifikasi dari OCTO CIMB',
      })
      expect(cimbParser.canParse(email)).toBe(false)
    })

    it('should return false for non-CIMB email', () => {
      const email = makeEmail({
        from: 'BCA Bank <info@bca.co.id>',
        subject: 'Notifikasi Transaksi',
      })
      expect(cimbParser.canParse(email)).toBe(false)
    })

    it('should handle case-insensitive matching', () => {
      const email = makeEmail({
        from: 'NOTIFIKASI CIMB <NOTIFIKASI@CIMBNIAGA.CO.ID>',
        subject: 'notifikasi transaksi',
      })
      expect(cimbParser.canParse(email)).toBe(true)
    })
  })

  describe('parse', () => {
    it('should parse debit transaction as expense', () => {
      const email = makeEmail({
        body: `
          Notifikasi Transaksi CIMB Niaga

          Jenis: Debit
          Nominal: Rp. 150.000
          Merchant: Indomaret
          Waktu: 2026-05-25 10:30:00
          Nomor Ref: CIMB20260525001
        `,
        date: '2026-05-25T10:30:00+07:00',
      })
      const result = cimbParser.parse(email)

      expect(result).not.toBeNull()
      expect(result?.amount).toBe(150000)
      expect(result?.type).toBe('expense')
      expect(result?.payment_method).toBe('transfer')
      expect(result?.merchant_name).toBe('indomaret')
      expect(result?.confidence).toBeGreaterThanOrEqual(0.9)
      expect(result?.bank).toBe('cimb')
    })

    it('should parse kredit transaction as income', () => {
      const email = makeEmail({
        body: `
          Notifikasi Transaksi CIMB Niaga

          Jenis: Kredit
          Nominal: Rp 500.000
          Dari: Adi Pratama
          Tanggal: 2026-05-25 09:15:00
          Nomor Ref: CIMB20260525INC001
        `,
        date: '2026-05-25T09:15:00+07:00',
      })
      const result = cimbParser.parse(email)

      expect(result).not.toBeNull()
      expect(result?.amount).toBe(500000)
      expect(result?.type).toBe('income')
      expect(result?.payment_method).toBe('transfer')
      expect(result?.confidence).toBe(0.9)
    })

    it('should parse transfer keluar as expense with transfer payment method', () => {
      const email = makeEmail({
        body: `
          Notifikasi CIMB Niaga

          Transfer Keluar
          Nominal: Rp 2.000.000
          Tujuan: Budi Santoso
          Tanggal: 2026-05-25 14:00:00
          Ref: TRF20260525001
        `,
        date: '2026-05-25T14:00:00+07:00',
      })
      const result = cimbParser.parse(email)

      expect(result).not.toBeNull()
      expect(result?.amount).toBe(2000000)
      expect(result?.type).toBe('expense')
      expect(result?.payment_method).toBe('transfer')
      expect(result?.reference_number).toBe('TRF20260525001')
    })

    it('should parse QRIS transaction as expense with qris payment method', () => {
      const email = makeEmail({
        body: `
          Notifikasi Transaksi CIMB Niaga

          Pembayaran QR Code
          Nominal: Rp. 75.000
          Merchant: Kopi Kita
          Waktu: 2026-05-25 08:45:00
          Ref: QRIS20260525001
        `,
        date: '2026-05-25T08:45:00+07:00',
      })
      const result = cimbParser.parse(email)

      expect(result).not.toBeNull()
      expect(result?.amount).toBe(75000)
      expect(result?.type).toBe('expense')
      expect(result?.payment_method).toBe('qris')
    })

    it('should parse pembelian transaction as expense with debit payment method', () => {
      const email = makeEmail({
        body: `
          Notifikasi CIMB

          Pembelian
          Nominal: Rp 250.000
          Merchant: Alfamart
          Waktu: 2026-05-25 11:20:00
        `,
        date: '2026-05-25T11:20:00+07:00',
      })
      const result = cimbParser.parse(email)

      expect(result).not.toBeNull()
      expect(result?.amount).toBe(250000)
      expect(result?.type).toBe('expense')
      expect(result?.payment_method).toBe('debit')
    })

    it('should return null when no amount is found', () => {
      const email = makeEmail({
        body: `
          Notifikasi Transaksi CIMB Niaga

          Transaksi berhasil diproses.
          Silakan periksa rekening Anda.
        `,
        date: '2026-05-25T10:30:00+07:00',
      })
      const result = cimbParser.parse(email)

      expect(result).toBeNull()
    })

    it('should return null when body is empty', () => {
      const email = makeEmail({
        body: '',
        date: '2026-05-25T10:30:00+07:00',
      })
      const result = cimbParser.parse(email)

      expect(result).toBeNull()
    })

    it('should set raw_email_id and raw_snippet correctly', () => {
      const email = makeEmail({
        id: 'msg-cimb-special-123',
        body: 'Pembelian Rp. 100.000 di Alfamart pada 2026-05-25 13:00:00',
        date: '2026-05-25T13:00:00+07:00',
      })
      const result = cimbParser.parse(email)

      expect(result).not.toBeNull()
      expect(result?.raw_email_id).toBe('msg-cimb-special-123')
      expect(result?.raw_snippet).toBeTruthy()
      expect(result?.raw_snippet?.length).toBeLessThanOrEqual(200)
    })

    it('should have lower confidence (0.7) when merchant is missing', () => {
      const email = makeEmail({
        body: `
          Notifikasi Transaksi CIMB Niaga

          Jenis: Debit
          Nominal: Rp. 250.000
          Waktu: 2026-05-25 15:30:00
        `,
        date: '2026-05-25T15:30:00+07:00',
      })
      const result = cimbParser.parse(email)

      expect(result).not.toBeNull()
      expect(result?.amount).toBe(250000)
      expect(result?.type).toBe('expense')
      expect(result?.merchant_name).toBeNull()
      expect(result?.confidence).toBeLessThan(0.9)
    })

    it('should parse amount with various format variations', () => {
      const email = makeEmail({
        body: 'Pembelian IDR 1.500.000 pada 2026-05-25 12:00:00',
        date: '2026-05-25T12:00:00+07:00',
      })
      const result = cimbParser.parse(email)

      expect(result).not.toBeNull()
      expect(result?.amount).toBe(1500000)
    })

    it('should properly parse date from email header', () => {
      const email = makeEmail({
        body: 'Pembelian Rp. 50.000',
        date: '2026-05-25T17:45:30+07:00',
      })
      const result = cimbParser.parse(email)

      expect(result).not.toBeNull()
      expect(result?.transacted_at).toEqual(new Date('2026-05-25T17:45:30+07:00'))
    })

    it('should extract reference number when present', () => {
      const email = makeEmail({
        body: `
          Notifikasi CIMB Niaga

          Pembelian Rp. 100.000
          Merchant: Tokopedia
          Reference: ABC123XYZ789
          Waktu: 2026-05-25 16:00:00
        `,
        date: '2026-05-25T16:00:00+07:00',
      })
      const result = cimbParser.parse(email)

      expect(result).not.toBeNull()
      expect(result?.reference_number).toBe('ABC123XYZ789')
    })
  })

  describe('parser name', () => {
    it('should have name property set to "cimb"', () => {
      expect(cimbParser.name).toBe('cimb')
    })
  })
})
