import { describe, it, expect } from 'vitest'
import { bcaParser } from '@/lib/gmail/parsers/bca'
import type { GmailMessage } from '@/types/parser'

function makeEmail(overrides: Partial<GmailMessage> = {}): GmailMessage {
  return {
    id: 'msg-bca-001',
    threadId: 'thread-001',
    subject: 'Internet Transaction Journal',
    from: 'BCA <noreply@bca.co.id>',
    body: '',
    date: '2026-06-09T12:00:00+07:00',
    snippet: '',
    ...overrides,
  }
}

// Fixture NYATA — QRIS Payment (screenshot myBCA 09 Jun 2026)
const QRIS_BODY = `Hello RISQUINA ANGELICA ARVINTYANI,
You just made a transaction through myBCA.
Here are the details of your transaction :

Status              : Successful
Transaction Date    : 09 Jun 2026 12:31:22
Transaction Type    : QRIS Payment
Payment to          : SEKUTU KOPI
Merchant Location   : SOLO, 57131, ID
Acquirer            : BCA
Merchant PAN        : 9360001400021465299
Terminal ID         : A01
Source of Fund      : TAHAPAN XPRESI - 3940****80
Customer PAN        : 9360001410092955532
Total Payment       : IDR 35,000.00
RRN                 : 345244767
Reference No.       : 9527120260609123118518QRS0698496183
Please save this email as your transaction reference.`

// Fixture NYATA — Transfer ke bank lain / SEABANK (screenshot myBCA 23 May 2026)
const TRANSFER_SEABANK_BODY = `Hello RISQUINA ANGELICA ARVINTYANI,
You just made a transaction through myBCA.
Here are the details of your transaction :

Status              : Successful
Transaction Date    : 23 May 2026 14:47:40
Transfer Type       : Transfer to SEABANK
Source of Fund      : 3940xxxx80
Beneficiary Account
Beneficiary Name        : RISQUINA ANGELICA ARVINTYANI
Beneficiary Bank        : SEABANK
Beneficiary Account No. : 901960783547
Amount              : IDR 240,000.00
Fee                 : IDR 2,500.00
Transfer Method     : BI FAST
Remarks             : -
Transaction Purpose : Others (for various purposes)
Reference No.       : 20260523CENAIDJA51095741152`

// Transfer sesama BCA — nominal diambil dari Total Payment (tanpa fee terpisah)
const TRANSFER_BCA_BODY = `Hello RISQUINA ANGELICA ARVINTYANI,
You just made a transaction through myBCA.

Status              : Successful
Transaction Date    : 10 Jun 2026 09:15:00
Transfer Type       : Transfer to BCA
Source of Fund      : 3940xxxx80
Beneficiary Account
Beneficiary Name        : BUDI SANTOSO WIJAYA
Beneficiary Bank        : BCA
Beneficiary Account No. : 1234567890
Total Payment       : IDR 1,500,000.00
Remarks             : -
Reference No.       : 20260610BCATRX0099887766`

// Top Up e-wallet — nominal dari Top Up Amount, kategori topup
const TOPUP_BODY = `Hello RISQUINA ANGELICA ARVINTYANI,
You just made a transaction through myBCA.

Status              : Successful
Transaction Date    : 11 Jun 2026 20:00:00
Transaction Type    : GoPay Top Up
Source of Fund      : TAHAPAN XPRESI - 3940****80
Top Up Amount       : IDR 100,000.00
Total Payment       : IDR 100,000.00
Reference No.       : 20260611TOPUP123456`

// Pulsa / paket data — diperlakukan sebagai top up, Details masuk catatan tanpa link
const MOBILE_DATA_BODY = `Hello RISQUINA ANGELICA ARVINTYANI,
You just made a transaction through myBCA.

Status              : Successful
Transaction Date    : 11 Jun 2026 21:00:00
Transaction Type    : Mobile Data - IM3 Paket
Source of Fund      : TAHAPAN XPRESI - 3940****80
Total Payment       : IDR 50,000.00
Details             : Paket Freedom Internet 10GB www.indosatooredoo.com info
Reference No.       : 20260611DATA987654`

describe('BCA Parser', () => {
  describe('canParse', () => {
    it('detects emails from @bca.co.id with Internet Transaction Journal subject', () => {
      const email = makeEmail({ from: 'BCA <noreply@bca.co.id>' })
      expect(bcaParser.canParse(email)).toBe(true)
    })

    it('detects emails from @klikbca.com', () => {
      const email = makeEmail({ from: 'BCA <notification@klikbca.com>' })
      expect(bcaParser.canParse(email)).toBe(true)
    })

    it('rejects non-BCA sender even if subject mentions BCA', () => {
      const email = makeEmail({
        from: 'notifications@example.com',
        subject: 'Notifikasi Transaksi BCA',
      })
      expect(bcaParser.canParse(email)).toBe(false)
    })

    it('rejects other bank emails', () => {
      const email = makeEmail({
        from: 'notification@mandiri.co.id',
        subject: 'Notifikasi Transaksi',
      })
      expect(bcaParser.canParse(email)).toBe(false)
    })
  })

  describe('parse — QRIS Payment', () => {
    const result = bcaParser.parse(makeEmail({ body: QRIS_BODY }))

    it('is an expense paid via QRIS', () => {
      expect(result).not.toBeNull()
      expect(result!.type).toBe('expense')
      expect(result!.payment_method).toBe('qris')
    })

    it('takes amount from Total Payment', () => {
      expect(result!.amount).toBe(35000)
    })

    it('uses "Payment to" as the QRIS merchant display name', () => {
      expect(result!.merchant_name).toBe('QRIS ke Sekutu Kopi')
    })

    it('captures the alphanumeric reference without spaces', () => {
      expect(result!.reference_number).toBe('9527120260609123118518QRS0698496183')
    })

    it('parses the transaction date with time (WIB)', () => {
      expect(result!.transacted_at.toISOString()).toBe('2026-06-09T05:31:22.000Z')
    })
  })

  describe('parse — Transfer ke bank lain (SEABANK)', () => {
    const result = bcaParser.parse(makeEmail({ body: TRANSFER_SEABANK_BODY }))

    it('is a transfer', () => {
      expect(result).not.toBeNull()
      expect(result!.type).toBe('transfer')
      expect(result!.payment_method).toBe('transfer')
    })

    it('sums Amount + Fee for inter-bank transfer', () => {
      expect(result!.amount).toBe(242500)
    })

    it('displays only the middle name of the beneficiary', () => {
      expect(result!.merchant_name).toBe('Transfer kepada Angelica')
    })

    it('keeps the full beneficiary name in description', () => {
      expect(result!.description).toBe('Risquina Angelica Arvintyani')
    })

    it('captures the reference number', () => {
      expect(result!.reference_number).toBe('20260523CENAIDJA51095741152')
    })

    it('parses date+time correctly', () => {
      expect(result!.transacted_at.toISOString()).toBe('2026-05-23T07:47:40.000Z')
    })
  })

  describe('parse — Transfer sesama BCA', () => {
    const result = bcaParser.parse(makeEmail({ body: TRANSFER_BCA_BODY }))

    it('takes amount from Total Payment (no separate fee)', () => {
      expect(result).not.toBeNull()
      expect(result!.amount).toBe(1500000)
    })

    it('displays only the middle name', () => {
      expect(result!.merchant_name).toBe('Transfer kepada Santoso')
    })
  })

  describe('parse — Top Up', () => {
    const result = bcaParser.parse(makeEmail({ body: TOPUP_BODY }))

    it('is categorized as topup expense', () => {
      expect(result).not.toBeNull()
      expect(result!.type).toBe('expense')
      expect(result!.payment_method).toBe('topup')
    })

    it('takes amount from Top Up Amount', () => {
      expect(result!.amount).toBe(100000)
    })

    it('shows the top up provider', () => {
      expect(result!.merchant_name).toBe('Top up ke GoPay')
    })
  })

  describe('parse — Pulsa / Paket Data', () => {
    const result = bcaParser.parse(makeEmail({ body: MOBILE_DATA_BODY }))

    it('is treated as a top up', () => {
      expect(result).not.toBeNull()
      expect(result!.payment_method).toBe('topup')
      expect(result!.amount).toBe(50000)
    })

    it('shows the product name', () => {
      expect(result!.merchant_name).toBe('Top up IM3 Paket')
    })

    it('puts Details into the note but strips links', () => {
      expect(result!.description).toBe('Paket Freedom Internet 10GB info')
      expect(result!.description).not.toContain('www')
    })
  })

  // Email BCA dikirim sebagai HTML; stripHtmlTags() meng-collapse newline jadi
  // spasi sehingga body jadi SATU baris. Parser harus tetap memotong nilai di
  // batas field, bukan menelan field berikutnya ("Source of Fund" dst).
  describe('parse — flattened HTML body (real stripHtmlTags output)', () => {
    const flatten = (s: string) => s.replace(/\s+/g, ' ').trim()

    it('QRIS: merchant name does not bleed into following fields', () => {
      const result = bcaParser.parse(makeEmail({ body: flatten(QRIS_BODY) }))
      expect(result!.merchant_name).toBe('QRIS ke Sekutu Kopi')
      expect(result!.merchant_name).not.toMatch(/merchant location|source of fund/i)
      expect(result!.amount).toBe(35000)
      expect(result!.reference_number).toBe('9527120260609123118518QRS0698496183')
    })

    it('Top Up: provider name stops at its own field, excludes Source of Fund', () => {
      const result = bcaParser.parse(makeEmail({ body: flatten(TOPUP_BODY) }))
      expect(result!.merchant_name).toBe('Top up ke GoPay')
      expect(result!.merchant_name).not.toMatch(/source of fund/i)
      expect(result!.amount).toBe(100000)
    })

    it('Transfer: beneficiary name does not absorb the bank field', () => {
      const result = bcaParser.parse(makeEmail({ body: flatten(TRANSFER_SEABANK_BODY) }))
      expect(result!.merchant_name).toBe('Transfer kepada Angelica')
      expect(result!.description).toBe('Risquina Angelica Arvintyani')
      expect(result!.amount).toBe(242500)
    })

    it('Mobile data: Details captured, link stripped, no field bleed', () => {
      const result = bcaParser.parse(makeEmail({ body: flatten(MOBILE_DATA_BODY) }))
      expect(result!.merchant_name).toBe('Top up IM3 Paket')
      expect(result!.description).toBe('Paket Freedom Internet 10GB info')
    })
  })

  describe('parse — guards', () => {
    it('returns null on empty body', () => {
      expect(bcaParser.parse(makeEmail({ body: '' }))).toBeNull()
    })

    it('returns null for non-successful transactions', () => {
      const body = TRANSFER_SEABANK_BODY.replace('Successful', 'Failed')
      expect(bcaParser.parse(makeEmail({ body }))).toBeNull()
    })

    it('tags the bank as bca', () => {
      const result = bcaParser.parse(makeEmail({ body: QRIS_BODY }))
      expect(result!.bank).toBe('bca')
    })

    it('scores high confidence when all fields present', () => {
      const result = bcaParser.parse(makeEmail({ body: QRIS_BODY }))
      expect(result!.confidence).toBeGreaterThanOrEqual(0.85)
    })
  })
})
