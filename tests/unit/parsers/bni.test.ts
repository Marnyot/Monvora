import { describe, it, expect, beforeEach } from 'vitest'
import type { GmailMessage } from '@/types/parser'
import { bniParser } from '@/lib/gmail/parsers/bni'

function makeEmail(overrides: Partial<GmailMessage> = {}): GmailMessage {
  return {
    id: 'msg-bni-001',
    threadId: 'thread-001',
    subject: 'Notifikasi BNI Mobile Banking',
    from: 'BNI <notif@bni.co.id>',
    body: '',
    date: '2026-05-25T10:00:00+07:00',
    snippet: '',
    ...overrides,
  }
}

describe('BNI Parser', () => {
  describe('canParse', () => {
    it('should return true for email from @bni.co.id domain', () => {
      const email = makeEmail({ from: 'notifikasi@bni.co.id' })
      expect(bniParser.canParse(email)).toBe(true)
    })

    it('should return true for email with BNI in subject', () => {
      const email = makeEmail({
        from: 'other@bank.com',
        subject: 'BNI Mobile Banking Notification',
      })
      expect(bniParser.canParse(email)).toBe(true)
    })

    it('should return true for email with mobile banking in subject', () => {
      const email = makeEmail({
        from: 'other@bank.com',
        subject: 'Mobile Banking Transaction Update',
      })
      expect(bniParser.canParse(email)).toBe(true)
    })

    it('should return false for non-BNI email', () => {
      const email = makeEmail({
        from: 'notif@mandiri.co.id',
        subject: 'Notifikasi Transaksi',
      })
      expect(bniParser.canParse(email)).toBe(false)
    })
  })

  describe('parse', () => {
    it('should return null if body is empty', () => {
      const email = makeEmail({ body: '' })
      expect(bniParser.parse(email)).toBeNull()
    })

    it('should return null if amount is not found', () => {
      const email = makeEmail({
        body: 'Transaksi berhasil dilakukan tanpa nominal',
      })
      expect(bniParser.parse(email)).toBeNull()
    })

    it('should parse debit transaction as expense', () => {
      const email = makeEmail({
        body: `
        Notifikasi BNI Mobile Banking
        Transaksi Debit
        Nominal: Rp. 150.000
        Merchant: Alfamart Senayan
        Tanggal: 2026-05-25 10:00
        `,
      })

      const result = bniParser.parse(email)
      expect(result).not.toBeNull()
      expect(result?.type).toBe('expense')
      expect(result?.amount).toBe(150000)
      expect(result?.merchant_name).toContain('alfamart')
    })

    it('should parse kredit transaction as income', () => {
      const email = makeEmail({
        body: `
        Notifikasi BNI Mobile Banking
        Transaksi Kredit
        Nominal: Rp 1.500.000
        Transfer dari: PT Tech Startup
        Tanggal: 2026-05-25 10:00
        Referensi: BNI-20260525-001
        `,
      })

      const result = bniParser.parse(email)
      expect(result).not.toBeNull()
      expect(result?.type).toBe('income')
      expect(result?.amount).toBe(1500000)
      expect(result?.payment_method).toBe('transfer')
    })

    it('should parse amount with BNI format (Rp. with dot separator)', () => {
      const email = makeEmail({
        body: `
        Transaksi Debit
        Nominal: Rp. 2.500.000
        Merchant: Tokopedia
        `,
      })

      const result = bniParser.parse(email)
      expect(result?.amount).toBe(2500000)
    })

    it('should parse amount with comma decimal (Rp X.XXX.XXX,00)', () => {
      const email = makeEmail({
        body: `
        Transaksi Debit
        Nominal: Rp 1.250.500,00
        Merchant: Shopee
        `,
      })

      const result = bniParser.parse(email)
      expect(result?.amount).toBe(1250500)
    })

    it('should parse transfer debit as expense with transfer payment method', () => {
      const email = makeEmail({
        body: `
        Notifikasi BNI Mobile Banking
        Transaksi Transfer Debit
        Nominal: Rp. 500.000
        Tujuan: Adi Kusuma (BCA)
        Referensi: TXNREF-123456
        `,
      })

      const result = bniParser.parse(email)
      expect(result?.type).toBe('expense')
      expect(result?.payment_method).toBe('transfer')
      expect(result?.amount).toBe(500000)
      expect(result?.reference_number).toBe('TXNREF-123456')
    })

    it('should parse QRIS payment', () => {
      const email = makeEmail({
        body: `
        Notifikasi BNI Mobile Banking
        Transaksi QRIS
        Nominal: Rp. 75.000
        Merchant: Kopi Kenangan
        `,
      })

      const result = bniParser.parse(email)
      expect(result?.type).toBe('expense')
      expect(result?.payment_method).toBe('qris')
      expect(result?.amount).toBe(75000)
    })

    it('should extract merchant name correctly', () => {
      const email = makeEmail({
        body: `
        Transaksi Debit
        Nominal: Rp. 250.000
        Merchant: Indomaret Cilandak
        `,
      })

      const result = bniParser.parse(email)
      expect(result?.merchant_name).toContain('indomaret cilandak')
    })

    it('should extract reference number from body', () => {
      const email = makeEmail({
        body: `
        Transaksi Debit
        Nominal: Rp. 100.000
        Merchant: ATM BNI
        Kode Referensi: ATM2026052500001
        `,
      })

      const result = bniParser.parse(email)
      expect(result?.reference_number).toBe('ATM2026052500001')
    })

    it('should have high confidence when all details present', () => {
      const email = makeEmail({
        body: `
        Transaksi Debit
        Nominal: Rp. 100.000
        Merchant: Gojek
        Referensi: GOJ-123456
        `,
      })

      const result = bniParser.parse(email)
      expect(result?.confidence).toBe(0.9)
    })

    it('should have lower confidence when merchant is missing', () => {
      const email = makeEmail({
        body: `
        Transaksi Debit
        Nominal: Rp. 100.000
        `,
      })

      const result = bniParser.parse(email)
      expect(result?.confidence).toBe(0.7)
    })

    it('should set bank name to bni', () => {
      const email = makeEmail({
        body: `
        Transaksi Debit
        Nominal: Rp. 100.000
        Merchant: Test Store
        `,
      })

      const result = bniParser.parse(email)
      expect(result?.bank).toBe('bni')
    })

    it('should create raw_snippet from body', () => {
      const email = makeEmail({
        body: `
        Notifikasi BNI Mobile Banking
        Transaksi Debit Nominal Rp. 100.000
        Merchant: Test Store Jl. Sudirman No. 1
        Tanggal dan Waktu: 2026-05-25 10:00
        `,
      })

      const result = bniParser.parse(email)
      expect(result?.raw_snippet).toBeDefined()
      expect(result?.raw_snippet.length).toBeLessThanOrEqual(200)
    })

    it('should set raw_email_id to email id', () => {
      const email = makeEmail({
        id: 'unique-msg-id-123',
        body: `
        Transaksi Debit
        Nominal: Rp. 100.000
        Merchant: Test
        `,
      })

      const result = bniParser.parse(email)
      expect(result?.raw_email_id).toBe('unique-msg-id-123')
    })

    it('should parse transaction date from email date field', () => {
      const email = makeEmail({
        date: '2026-05-25T14:30:00+07:00',
        body: `
        Transaksi Debit
        Nominal: Rp. 100.000
        Merchant: Test
        `,
      })

      const result = bniParser.parse(email)
      expect(result?.transacted_at).toBeDefined()
      expect(result?.transacted_at).toBeInstanceOf(Date)
    })
  })
})
