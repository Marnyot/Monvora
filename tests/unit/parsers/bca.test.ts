import { describe, it, expect } from 'vitest'
import { bcaParser } from '@/lib/gmail/parsers/bca'
import type { GmailMessage } from '@/types/parser'

function makeEmail(overrides: Partial<GmailMessage> = {}): GmailMessage {
  return {
    id: 'msg-bca-001',
    threadId: 'thread-001',
    subject: 'Notifikasi BCA',
    from: 'BCA <notification@klikbca.com>',
    body: '',
    date: '2026-05-25T10:00:00+07:00',
    snippet: '',
    ...overrides,
  }
}

describe('BCA Parser', () => {
  describe('canParse', () => {
    it('should detect emails from @klikbca.com', () => {
      const email = makeEmail({
        from: 'BCA Notifikasi <notification@klikbca.com>',
      })
      expect(bcaParser.canParse(email)).toBe(true)
    })

    it('should detect emails from @bca.co.id', () => {
      const email = makeEmail({
        from: 'BCA <support@bca.co.id>',
      })
      expect(bcaParser.canParse(email)).toBe(true)
    })

    it('should detect emails with BCA in subject', () => {
      const email = makeEmail({
        from: 'notifications@example.com',
        subject: 'Notifikasi Transaksi BCA',
      })
      expect(bcaParser.canParse(email)).toBe(true)
    })

    it('should return false for non-BCA emails', () => {
      const email = makeEmail({
        from: 'notification@mandiri.co.id',
        subject: 'Notifikasi Transaksi',
      })
      expect(bcaParser.canParse(email)).toBe(false)
    })
  })

  describe('parse', () => {
    it('should parse debit/pembelian as expense', () => {
      const email = makeEmail({
        body: `
Notifikasi Transaksi BCA
Nomor Rekening: 1234567890
Jenis: Debet
Nominal: Rp 150.000,00
Merchant: INDOMARET
Waktu: 2026-05-25 10:30
`,
      })

      const result = bcaParser.parse(email)
      expect(result).not.toBeNull()
      expect(result!.type).toBe('expense')
      expect(result!.amount).toBe(150000)
      expect(result!.payment_method).toBe('debit')
    })

    it('should parse kredit as income', () => {
      const email = makeEmail({
        body: `
Notifikasi Transaksi BCA
Jenis: Kredit
Nominal: Rp 2.500.000,50
Dari: PT GAJIKU
Waktu: 2026-05-25 09:00
`,
      })

      const result = bcaParser.parse(email)
      expect(result).not.toBeNull()
      expect(result!.type).toBe('income')
      expect(result!.amount).toBe(2500000)
      expect(result!.payment_method).toBe('transfer')
    })

    it('should parse amount in format Rp X.XXX.XXX,xx', () => {
      const email = makeEmail({
        body: `
Nominal: Rp 1.750.000,75
Jenis: Debet
Merchant: ALFAMART
`,
      })

      const result = bcaParser.parse(email)
      expect(result).not.toBeNull()
      expect(result!.amount).toBe(1750000)
    })

    it('should parse transfer keluar as expense with transfer method', () => {
      const email = makeEmail({
        body: `
Notifikasi Transaksi BCA
Jenis: Transfer ke
Nominal: Rp 500.000,00
Tujuan: MANDIRI INDIVIDUAL
Waktu: 2026-05-25 11:15
`,
      })

      const result = bcaParser.parse(email)
      expect(result).not.toBeNull()
      expect(result!.type).toBe('expense')
      expect(result!.amount).toBe(500000)
      expect(result!.payment_method).toBe('transfer')
    })

    it('should parse QRIS payment', () => {
      const email = makeEmail({
        body: `
Notifikasi Transaksi BCA
Jenis: Pembayaran QRIS
Nominal: Rp 75.000,00
Merchant: COFFEE SHOP XYZ
`,
      })

      const result = bcaParser.parse(email)
      expect(result).not.toBeNull()
      expect(result!.type).toBe('expense')
      expect(result!.amount).toBe(75000)
      expect(result!.payment_method).toBe('qris')
    })

    it('should extract merchant name', () => {
      const email = makeEmail({
        body: `
Notifikasi Transaksi BCA
Jenis: Debet
Nominal: Rp 250.000,00
Merchant: SUPER INDOMARET
Waktu: 2026-05-25 10:30
`,
      })

      const result = bcaParser.parse(email)
      expect(result).not.toBeNull()
      expect(result!.merchant_name).toBeTruthy()
    })

    it('should return null if body is empty', () => {
      const email = makeEmail({
        body: '',
      })

      const result = bcaParser.parse(email)
      expect(result).toBeNull()
    })

    it('should return null if amount is not found', () => {
      const email = makeEmail({
        body: `
Notifikasi Transaksi BCA
Jenis: Debet
Merchant: INDOMARET
Waktu: 2026-05-25 10:30
`,
      })

      const result = bcaParser.parse(email)
      expect(result).toBeNull()
    })

    it('should set high confidence when all details present', () => {
      const email = makeEmail({
        body: `
Notifikasi Transaksi BCA
Jenis: Debet
Nominal: Rp 150.000,00
Merchant: INDOMARET
Waktu: 2026-05-25 10:30
Nomor Referensi: BCA123456
`,
      })

      const result = bcaParser.parse(email)
      expect(result).not.toBeNull()
      expect(result!.confidence).toBeGreaterThanOrEqual(0.85)
    })

    it('should set lower confidence when merchant is missing', () => {
      const email = makeEmail({
        body: `
Notifikasi Transaksi BCA
Jenis: Debet
Nominal: Rp 150.000,00
Waktu: 2026-05-25 10:30
`,
      })

      const result = bcaParser.parse(email)
      expect(result).not.toBeNull()
      expect(result!.confidence).toBeLessThan(0.85)
    })

    it('should set bank name to bca', () => {
      const email = makeEmail({
        body: `
Notifikasi Transaksi BCA
Jenis: Debet
Nominal: Rp 100.000,00
Merchant: TEST
`,
      })

      const result = bcaParser.parse(email)
      expect(result).not.toBeNull()
      expect(result!.bank).toBe('bca')
    })

    it('should extract reference number if present', () => {
      const email = makeEmail({
        body: `
Notifikasi Transaksi BCA
Jenis: Debet
Nominal: Rp 100.000,00
Merchant: INDOMARET
Nomor Referensi: BCA987654321
`,
      })

      const result = bcaParser.parse(email)
      expect(result).not.toBeNull()
      expect(result!.reference_number).toBeTruthy()
    })

    it('should handle transfer masuk as income', () => {
      const email = makeEmail({
        body: `
Notifikasi Transaksi BCA
Jenis: Transfer Masuk
Nominal: Rp 1.000.000,00
Dari: PT KERJA KERAS
`,
      })

      const result = bcaParser.parse(email)
      expect(result).not.toBeNull()
      expect(result!.type).toBe('income')
    })
  })
})
