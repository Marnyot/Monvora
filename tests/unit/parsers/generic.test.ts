import { describe, it, expect } from 'vitest'
import { genericParser } from '@/lib/gmail/parsers/generic'
import type { GmailMessage } from '@/types/parser'

// Helper untuk membuat mock GmailMessage
function makeEmail(overrides: Partial<GmailMessage>): GmailMessage {
  return {
    id: 'msg-generic-001',
    threadId: 'thread-generic-001',
    subject: 'Email Transaksi',
    from: 'noreply@unknown-bank.com',
    body: '',
    date: '2026-05-25T10:30:00+07:00',
    snippet: '',
    ...overrides,
  }
}

describe('Generic Parser', () => {
  describe('canParse', () => {
    it('should return true for email with "transaksi" keyword in subject', () => {
      const email = makeEmail({
        subject: 'Notifikasi Transaksi Pembayaran',
        body: 'Email dari bank',
      })
      expect(genericParser.canParse(email)).toBe(true)
    })

    it('should return true for email with "Rp" amount in body', () => {
      const email = makeEmail({
        subject: 'Notifikasi Pembayaran',
        body: 'Anda telah melakukan pembayaran Rp 50.000 untuk tagihan listrik',
      })
      expect(genericParser.canParse(email)).toBe(true)
    })

    it('should return true for email with "transfer" keyword', () => {
      const email = makeEmail({
        subject: 'Transfer Uang',
        body: 'Transfer Anda telah diproses',
      })
      expect(genericParser.canParse(email)).toBe(true)
    })

    it('should return true for email with "debit" keyword', () => {
      const email = makeEmail({
        subject: 'Notifikasi Debit',
        body: 'Transaksi debit telah berhasil',
      })
      expect(genericParser.canParse(email)).toBe(true)
    })

    it('should return false for email without any bank/transaction keyword', () => {
      const email = makeEmail({
        subject: 'Promosi Produk',
        body: 'Dapatkan diskon spesial untuk produk kami',
      })
      expect(genericParser.canParse(email)).toBe(false)
    })

    it('should return false for plain email without amount or transaction words', () => {
      const email = makeEmail({
        subject: 'Halo Teman',
        body: 'Bagaimana kabarmu?',
      })
      expect(genericParser.canParse(email)).toBe(false)
    })

    it('should handle case-insensitive keyword matching', () => {
      const email = makeEmail({
        subject: 'TRANSAKSI PEMBAYARAN',
        body: 'EMAIL DARI BANK',
      })
      expect(genericParser.canParse(email)).toBe(true)
    })
  })

  describe('parse', () => {
    it('should parse amount from simple body text', () => {
      const email = makeEmail({
        subject: 'Notifikasi Transaksi',
        body: 'Anda telah melakukan transaksi Rp 100.000 untuk pembayaran',
        date: '2026-05-25T10:30:00+07:00',
      })
      const result = genericParser.parse(email)

      expect(result).not.toBeNull()
      expect(result?.amount).toBe(100000)
      expect(result?.type).toBe('expense')
      expect(result?.payment_method).toBe('other')
      expect(result?.confidence).toBe(0.5)
      expect(result?.bank).toBe('generic')
    })

    it('should return null if no IDR amount found in body', () => {
      const email = makeEmail({
        subject: 'Notifikasi Transaksi',
        body: 'Transaksi Anda telah diproses tanpa ada nominal',
        date: '2026-05-25T10:30:00+07:00',
      })
      const result = genericParser.parse(email)

      expect(result).toBeNull()
    })

    it('should extract merchant name from subject words', () => {
      const email = makeEmail({
        subject: 'Transaksi GrubFood Pembayaran',
        body: 'Transaksi Rp 75.000 telah berhasil',
        date: '2026-05-25T10:30:00+07:00',
      })
      const result = genericParser.parse(email)

      expect(result).not.toBeNull()
      expect(result?.merchant_name).toBeDefined()
      // Should contain "grubfood" or similar
      expect(result?.merchant_name?.toLowerCase()).toContain('grub')
    })

    it('should extract merchant from body pattern when subject lacks details', () => {
      const email = makeEmail({
        subject: 'Notifikasi Pembayaran',
        body: `
          Transaksi Rp 150.000
          Pembayaran ke Toko Online Bagus
          Terima kasih
        `,
        date: '2026-05-25T10:30:00+07:00',
      })
      const result = genericParser.parse(email)

      expect(result).not.toBeNull()
      expect(result?.amount).toBe(150000)
      expect(result?.merchant_name).toBeDefined()
    })

    it('should set confidence to exactly 0.5 (max for generic parser)', () => {
      const email = makeEmail({
        subject: 'Transaksi Pembayaran GCash',
        body: 'Transaksi Rp 50.000 berhasil diproses',
        date: '2026-05-25T10:30:00+07:00',
      })
      const result = genericParser.parse(email)

      expect(result?.confidence).toBe(0.5)
    })

    it('should set merchant_name to null if cannot extract', () => {
      const email = makeEmail({
        subject: 'Transaksi',
        body: 'Transaksi Rp 25.000',
        date: '2026-05-25T10:30:00+07:00',
      })
      const result = genericParser.parse(email)

      expect(result).not.toBeNull()
      expect(result?.merchant_name).toBeNull()
    })

    it('should parse date correctly', () => {
      const email = makeEmail({
        subject: 'Notifikasi Transaksi',
        body: 'Transaksi Rp 100.000 pada 2026-05-25',
        date: '2026-05-25T14:30:00+07:00',
      })
      const result = genericParser.parse(email)

      expect(result?.transacted_at).toEqual(new Date('2026-05-25T14:30:00+07:00'))
    })

    it('should create raw_snippet from first 200 chars of body', () => {
      const longBody =
        'Ini adalah email notifikasi transaksi yang sangat panjang dengan banyak informasi detail. Anda telah melakukan transaksi Rp 100.000 untuk pembayaran. Ini adalah lanjutan email yang akan dipotong hanya sampai 200 karakter saja agar tidak terlalu panjang.'
      const email = makeEmail({
        subject: 'Notifikasi Transaksi',
        body: longBody,
        date: '2026-05-25T10:30:00+07:00',
      })
      const result = genericParser.parse(email)

      expect(result?.raw_snippet).toBeDefined()
      expect(result?.raw_snippet?.length).toBeLessThanOrEqual(200)
      expect(result?.raw_snippet?.includes('\n')).toBe(false) // newlines replaced
    })

    it('should have reference_number as null (generic parser does not extract refs)', () => {
      const email = makeEmail({
        subject: 'Notifikasi Transaksi',
        body: 'Transaksi Rp 100.000 dengan ref TRX20260525001',
        date: '2026-05-25T10:30:00+07:00',
      })
      const result = genericParser.parse(email)

      expect(result?.reference_number).toBeNull()
    })

    it('should have description as null', () => {
      const email = makeEmail({
        subject: 'Notifikasi Transaksi Pembayaran',
        body: 'Transaksi Rp 200.000 untuk pembayaran tagihan',
        date: '2026-05-25T10:30:00+07:00',
      })
      const result = genericParser.parse(email)

      expect(result?.description).toBeNull()
    })

    it('should parse amount with IDR prefix', () => {
      const email = makeEmail({
        subject: 'Notifikasi',
        body: 'Pembayaran IDR 500000 telah berhasil',
        date: '2026-05-25T10:30:00+07:00',
      })
      const result = genericParser.parse(email)

      expect(result?.amount).toBe(500000)
    })

    it('should return null if body is empty', () => {
      const email = makeEmail({
        subject: 'Notifikasi Transaksi',
        body: '',
        date: '2026-05-25T10:30:00+07:00',
      })
      const result = genericParser.parse(email)

      expect(result).toBeNull()
    })
  })
})
