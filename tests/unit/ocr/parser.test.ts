import { describe, it, expect } from 'vitest'
import { parseReceiptText } from '@/lib/ocr/parser'

describe('parseReceiptText — amount extraction', () => {
  it('extracts amount from "Rp 35.000" pattern', () => {
    const result = parseReceiptText('Total Pembayaran\nRp 35.000\n12 Jun 2026')
    expect(result?.amount).toBe(35_000)
  })

  it('extracts amount from "Rp35.000" (no space)', () => {
    const result = parseReceiptText('Rp35.000')
    expect(result?.amount).toBe(35_000)
  })

  it('extracts amount with comma decimals (Indonesian: "Rp 50.000,00") and drops decimals', () => {
    const result = parseReceiptText('Total: Rp 50.000,00')
    expect(result?.amount).toBe(50_000)
  })

  it('picks the largest Rp amount when multiple match (avoids small fees/saldo lines)', () => {
    const text = `
      Saldo: Rp 250.000
      Pembayaran: Rp 1.500.000
      Biaya admin: Rp 1.500
    `
    const result = parseReceiptText(text)
    expect(result?.amount).toBe(1_500_000)
  })

  it('returns null when no amount found', () => {
    expect(parseReceiptText('Hello world')).toBeNull()
    expect(parseReceiptText('')).toBeNull()
  })
})

describe('parseReceiptText — payment method detection (Indonesia e-wallets)', () => {
  it('detects GoPay', () => {
    const text = 'GoPay\nTotal Pembayaran\nRp 35.000\nMcDonalds'
    expect(parseReceiptText(text)?.paymentMethod).toBe('ewallet')
  })

  it('detects ShopeePay', () => {
    const text = 'ShopeePay\nPembayaran Berhasil\nRp 50.000\nIndomaret'
    expect(parseReceiptText(text)?.paymentMethod).toBe('ewallet')
  })

  it('detects OVO', () => {
    const text = 'Transaksi Berhasil\nOVO Cash\nRp 25.000\nGrab'
    expect(parseReceiptText(text)?.paymentMethod).toBe('ewallet')
  })

  it('detects DANA', () => {
    const text = 'DANA\nPembayaran Berhasil\nRp 45.000\nTokopedia'
    expect(parseReceiptText(text)?.paymentMethod).toBe('ewallet')
  })

  it('detects QRIS standalone', () => {
    const text = 'QRIS\nRp 12.000\nWarung Kopi'
    expect(parseReceiptText(text)?.paymentMethod).toBe('qris')
  })

  it('falls back to ewallet when keyword "saldo" / "top up" present', () => {
    const text = 'Top Up Saldo\nRp 100.000'
    expect(parseReceiptText(text)?.paymentMethod).toBe('ewallet')
  })

  it('returns undefined paymentMethod when nothing recognized', () => {
    const text = 'Transaksi Selesai\nRp 100.000'
    expect(parseReceiptText(text)?.paymentMethod).toBeUndefined()
  })
})

describe('parseReceiptText — date extraction (WIB)', () => {
  it('parses "12 Jun 2026, 14:30"', () => {
    const result = parseReceiptText('Rp 10.000\n12 Jun 2026, 14:30')
    expect(result?.transactedAt).toBeDefined()
    expect(result!.transactedAt!.getUTCHours()).toBe(7) // 14:30 WIB → 07:30 UTC
    expect(result!.transactedAt!.getUTCDate()).toBe(12)
    expect(result!.transactedAt!.getUTCFullYear()).toBe(2026)
  })

  it('parses "12 Juni 2026"', () => {
    const result = parseReceiptText('Rp 10.000\n12 Juni 2026')
    expect(result?.transactedAt).toBeDefined()
    expect(result!.transactedAt!.getUTCFullYear()).toBe(2026)
  })

  it('parses dd/mm/yyyy format', () => {
    const result = parseReceiptText('Rp 10.000\n12/06/2026')
    expect(result?.transactedAt).toBeDefined()
    expect(result!.transactedAt!.getUTCFullYear()).toBe(2026)
  })

  it('returns transactedAt undefined when no date found', () => {
    expect(parseReceiptText('Rp 10.000')?.transactedAt).toBeUndefined()
  })
})

describe('parseReceiptText — merchant extraction heuristic', () => {
  it('picks line that looks like merchant name (mixed caps, no Rp, no date)', () => {
    const text = 'GoPay\nTotal Pembayaran\nRp 35.000\nMcDonalds Sudirman\n12 Jun 2026'
    expect(parseReceiptText(text)?.merchantName).toBe('McDonalds Sudirman')
  })

  it('cleans up noisy lines: drops "Pembayaran Berhasil", "Total", etc.', () => {
    const text = 'OVO\nPembayaran Berhasil\nRp 25.000\nGrab Indonesia\n12 Jun 2026'
    expect(parseReceiptText(text)?.merchantName).toBe('Grab Indonesia')
  })

  it('returns undefined merchant when no plausible line found', () => {
    expect(parseReceiptText('Rp 10.000')?.merchantName).toBeUndefined()
  })
})

describe('parseReceiptText — confidence scoring', () => {
  it('high confidence when amount + merchant + date all extracted', () => {
    const text = 'GoPay\nRp 35.000\nMcDonalds\n12 Jun 2026, 14:30'
    const result = parseReceiptText(text)
    expect(result?.confidence).toBeGreaterThanOrEqual(0.8)
  })

  it('medium confidence when only amount + one of merchant/date', () => {
    const text = 'Rp 35.000\nMcDonalds'
    const result = parseReceiptText(text)
    expect(result?.confidence).toBeGreaterThanOrEqual(0.5)
    expect(result?.confidence).toBeLessThan(0.8)
  })

  it('low confidence when only amount', () => {
    const result = parseReceiptText('Rp 35.000')
    expect(result?.confidence).toBeLessThan(0.5)
  })
})
