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

    it('should parse HTML-stripped QRIS email from Livin by Mandiri (space-separated body)', () => {
      // Simulates body after extractEmailBody strips HTML tags:
      // all tags collapsed to spaces, no newlines between fields
      const email = makeEmail({
        subject: 'Pembayaran Berhasil',
        from: 'Mandiri <noreply@bankmandiri.co.id>',
        body: 'Pembayaran Berhasil Halo MARIO VALENTINO ARDHANA, Berikut adalah detail transaksi Anda dengan QR: Penerima CNB VETERAN SOLO - ID Tanggal 7 Jun 2026 Jam 19:07:14 WIB Nominal Transaksi Rp 33.000,00 No. Referensi 260607122518808257 No. Ref. QRIS 606476612797 Merchant PAN 9360000915040618223 Customer PAN 936000008122564203961 Pengakuisisi Bank BNI Terminal ID 17224706 Sumber Dana MARIO VALENTINO ARDH ****2039',
        date: '2026-06-07T12:07:14.000Z',
      })

      const result = mandiriParser.parse(email)

      expect(result).not.toBeNull()
      expect(result?.amount).toBe(33000)
      expect(result?.merchant_name).toBe('QRIS ke Cnb Veteran')
      expect(result?.payment_method).toBe('qris')
      expect(result?.type).toBe('expense')
      expect(result?.reference_number).toBe('260607122518808257')
      expect(result?.transacted_at).toEqual(new Date('2026-06-07T12:07:14.000Z'))
      expect(result?.bank).toBe('mandiri')
    })

    it('should use No. Ref. QRIS as fallback when No. Referensi is absent', () => {
      const email = makeEmail({
        subject: 'Pembayaran Berhasil',
        from: 'Mandiri <noreply@bankmandiri.co.id>',
        body: 'Pembayaran Berhasil Penerima TOKOPEDIA SELLER Tanggal 7 Jun 2026 Jam 10:00:00 WIB Nominal Transaksi Rp 50.000,00 No. Ref. QRIS 606476612799',
        date: '2026-06-07T03:00:00.000Z',
      })

      const result = mandiriParser.parse(email)

      expect(result).not.toBeNull()
      expect(result?.amount).toBe(50000)
      expect(result?.payment_method).toBe('qris')
      expect(result?.reference_number).toBe('606476612799')
    })
  })

  describe('BI Fast transfer', () => {
    const BI_FAST_BODY =
      'Transfer dengan BI Fast Berhasil Halo MARIO VALENTINO ARDHANA, Berikut adalah detail transaksi Anda: ' +
      'Penerima RISQUINA ANGELICA ARVINTYANI Seabank - 901960783547 ' +
      'Tanggal 5 Jun 2026 Jam 10:25:04 WIB ' +
      'Nominal Transfer Rp 150.000,00 Biaya Transfer Rp 2.500,00 Total Transaksi Rp 152.500,00 ' +
      'Tujuan Transaksi Lainnya No. Referensi BI Fast 20260605BMRIIDJA010O0226409055 ' +
      'Keterangan - Rekening Sumber MARIO VALENTINO ARDH ****2039'

    it('should be detected by canParse for BI Fast subject', () => {
      const email = makeEmail({
        subject: 'Transfer dengan BI Fast Berhasil',
        from: 'Mandiri <noreply@bankmandiri.co.id>',
        body: BI_FAST_BODY,
      })
      expect(mandiriParser.canParse(email)).toBe(true)
    })

    it('should parse amount from Nominal Transfer (not Total Transaksi)', () => {
      const email = makeEmail({
        subject: 'Transfer dengan BI Fast Berhasil',
        from: 'Mandiri <noreply@bankmandiri.co.id>',
        body: BI_FAST_BODY,
        date: '2026-06-05T03:25:04.000Z',
      })
      const result = mandiriParser.parse(email)
      expect(result).not.toBeNull()
      expect(result?.amount).toBe(150000)
    })

    it('should parse all fields of HTML-stripped BI Fast email', () => {
      const email = makeEmail({
        subject: 'Transfer dengan BI Fast Berhasil',
        from: 'Mandiri <noreply@bankmandiri.co.id>',
        body: BI_FAST_BODY,
        date: '2026-06-05T03:25:04.000Z',
      })
      const result = mandiriParser.parse(email)

      expect(result).not.toBeNull()
      expect(result?.amount).toBe(150000)
      expect(result?.type).toBe('expense')
      expect(result?.payment_method).toBe('transfer')
      expect(result?.merchant_name).toBe('Transfer kepada Risquina')
      expect(result?.description).toBe('Transfer risquina angelica arvintyani')
      expect(result?.reference_number).toBe('20260605BMRIIDJA010O0226409055')
      expect(result?.transacted_at).toEqual(new Date('2026-06-05T03:25:04.000Z'))
      expect(result?.bank).toBe('mandiri')
    })
  })

  describe('display name formatting', () => {
    it('names BI Fast transfer as "Transfer kepada <nama depan>"', () => {
      const email = makeEmail({
        subject: 'Transfer dengan BI Fast Berhasil',
        from: 'Mandiri <noreply@bankmandiri.co.id>',
        body:
          'Transfer dengan BI Fast Berhasil Halo MARIO VALENTINO ARDHANA, Berikut adalah detail transaksi Anda: ' +
          'Penerima RISQUINA ANGELICA ARVINTYANI Seabank - 901960783547 ' +
          'Tanggal 5 Jun 2026 Jam 10:25:04 WIB Nominal Transfer Rp 150.000,00 ' +
          'No. Referensi BI Fast 20260605BMRIIDJA010O0226409055',
      })
      const result = mandiriParser.parse(email)
      expect(result?.merchant_name).toBe('Transfer kepada Risquina')
    })

    it('names plain "Transfer Berhasil" as "Transfer kepada <nama depan>"', () => {
      const email = makeEmail({
        subject: 'Transfer Berhasil',
        from: 'Mandiri <noreply@bankmandiri.co.id>',
        body:
          'Transfer Berhasil Penerima BUDI SANTOSO Seabank - 1234567890 ' +
          'Tanggal 7 Jun 2026 Jam 09:00:00 WIB Nominal Transfer Rp 250.000,00 ' +
          'No. Referensi 260607000111',
      })
      const result = mandiriParser.parse(email)
      expect(result?.merchant_name).toBe('Transfer kepada Budi')
    })

    it('names QRIS payment as "QRIS ke <penerima>"', () => {
      const email = makeEmail({
        subject: 'Pembayaran Berhasil',
        from: 'Mandiri <noreply@bankmandiri.co.id>',
        body:
          'Pembayaran Berhasil Halo MARIO, Berikut adalah detail transaksi Anda dengan QR: ' +
          'Penerima CNB VETERAN SOLO - ID Tanggal 7 Jun 2026 Jam 19:07:14 WIB ' +
          'Nominal Transaksi Rp 33.000,00 No. Referensi 260607122518808257',
      })
      const result = mandiriParser.parse(email)
      expect(result?.merchant_name).toBe('QRIS ke Cnb Veteran')
      expect(result?.payment_method).toBe('qris')
    })

    it('names top up as "Top up ke <penyedia jasa>" with payment_method topup (expense)', () => {
      const email = makeEmail({
        subject: 'Top Up Berhasil',
        from: 'Mandiri <noreply@bankmandiri.co.id>',
        body:
          'Top Up Berhasil Halo MARIO VALENTINO ARDHANA, Berikut adalah detail transaksi Anda: ' +
          'Penyedia Jasa GOPAY Nomor Tujuan 081234567890 ' +
          'Tanggal 7 Jun 2026 Jam 12:00:00 WIB ' +
          'Nominal Top Up Rp 50.000,00 Biaya Admin Rp 1.000,00 No. Referensi 260607999888',
      })
      const result = mandiriParser.parse(email)
      expect(result).not.toBeNull()
      expect(result?.merchant_name).toBe('Top up ke Gopay')
      expect(result?.payment_method).toBe('topup')
      expect(result?.type).toBe('expense')
      expect(result?.amount).toBe(50000)
      expect(result?.reference_number).toBe('260607999888')
    })

    it('does NOT add "QRIS ke" when the QR detail line is absent', () => {
      const email = makeEmail({
        subject: 'Pembayaran Berhasil',
        from: 'Mandiri <noreply@bankmandiri.co.id>',
        body:
          'Pembayaran Berhasil Penerima TOKOPEDIA SELLER Tanggal 7 Jun 2026 ' +
          'Jam 10:00:00 WIB Nominal Transaksi Rp 50.000,00 No. Ref. QRIS 606476612799',
      })
      const result = mandiriParser.parse(email)
      expect(result?.merchant_name).not.toMatch(/^QRIS ke/)
    })
  })

  describe('parser name', () => {
    it('should have name property set to "mandiri"', () => {
      expect(mandiriParser.name).toBe('mandiri')
    })
  })
})
