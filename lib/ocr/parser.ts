// Pure receipt-text parser. Input: OCR-extracted plain text from an e-wallet
// or QRIS receipt screenshot. Output: best-effort structured fields with a
// confidence score. Never throws — caller decides what to do when amount === null.
const JAKARTA_OFFSET_MS = 7 * 60 * 60 * 1000

export interface ParsedReceipt {
  amount: number
  merchantName?: string
  transactedAt?: Date
  paymentMethod?: 'qris' | 'ewallet' | 'transfer'
  confidence: number
  rawText: string
}

const INDONESIAN_MONTHS: Record<string, number> = {
  jan: 1, januari: 1, feb: 2, februari: 2, mar: 3, maret: 3, apr: 4, april: 4,
  mei: 5, may: 5, jun: 6, juni: 6, jul: 7, juli: 7, agu: 8, agustus: 8, aug: 8,
  sep: 9, september: 9, okt: 10, oktober: 10, oct: 10, nov: 11, november: 11,
  des: 12, desember: 12, dec: 12,
}

// --- helpers ----------------------------------------------------------------

function lines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
}

function parseRpToInt(raw: string): number | null {
  // raw like "35.000" or "1.500.000,00" or "50.000,00"
  // Strip non-digit after dropping decimals.
  const noDecimals = raw.replace(/,\d{1,2}\s*$/, '')
  const digits = noDecimals.replace(/[^\d]/g, '')
  if (!digits) return null
  const n = parseInt(digits, 10)
  if (!Number.isFinite(n) || n <= 0) return null
  return n
}

// --- amount -----------------------------------------------------------------

function extractAmount(text: string): number | null {
  const re = /Rp\s*([0-9][\d.,]*)/gi
  const matches: number[] = []
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    const val = parseRpToInt(m[1])
    if (val !== null) matches.push(val)
  }
  if (matches.length === 0) return null
  // Pick the largest — small lines like "Biaya admin Rp 1.500" or "Saldo Rp 250.000"
  // are usually less than the main payment amount.
  return Math.max(...matches)
}

// --- payment method ---------------------------------------------------------

function extractPaymentMethod(text: string): ParsedReceipt['paymentMethod'] | undefined {
  const lower = text.toLowerCase()
  if (/\bgopay\b|\bgo-pay\b|\bgofood\b|\bgojek\b/.test(lower)) return 'ewallet'
  if (/\bshopeepay\b|\bshopee\s*pay\b/.test(lower)) return 'ewallet'
  if (/\bovo\b/.test(lower)) return 'ewallet'
  if (/\bdana\b/.test(lower)) return 'ewallet'
  if (/\blinkaja\b|\blink\s*aja\b/.test(lower)) return 'ewallet'
  if (/\bsaldo\b|\btop\s*up\b/.test(lower)) return 'ewallet'
  if (/\bqris\b/.test(lower)) return 'qris'
  if (/\btransfer\b/.test(lower)) return 'transfer'
  return undefined
}

// --- date -------------------------------------------------------------------

function buildDateWib(year: number, month1based: number, day: number, hh = 12, mi = 0): Date {
  // month is 1-based; build a UTC instant for hh:mi WIB on that date.
  const wibMs = Date.UTC(year, month1based - 1, day, hh, mi, 0)
  return new Date(wibMs - JAKARTA_OFFSET_MS)
}

function extractDate(text: string): Date | undefined {
  // 1) "12 Jun 2026, 14:30" or "12 Juni 2026"
  const reWord = /\b(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})(?:[,\s]+(\d{1,2})[:.](\d{2}))?/
  const m1 = text.match(reWord)
  if (m1) {
    const day = Number(m1[1])
    const monthKey = m1[2].toLowerCase()
    const month = INDONESIAN_MONTHS[monthKey]
    const year = Number(m1[3])
    if (month && day >= 1 && day <= 31 && year >= 2000) {
      const hh = m1[4] ? Number(m1[4]) : 12
      const mi = m1[5] ? Number(m1[5]) : 0
      return buildDateWib(year, month, day, hh, mi)
    }
  }
  // 2) dd/mm/yyyy or dd-mm-yyyy
  const reSlash = /\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})\b(?:[,\s]+(\d{1,2})[:.](\d{2}))?/
  const m2 = text.match(reSlash)
  if (m2) {
    const day = Number(m2[1])
    const month = Number(m2[2])
    const year = Number(m2[3])
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31 && year >= 2000) {
      const hh = m2[4] ? Number(m2[4]) : 12
      const mi = m2[5] ? Number(m2[5]) : 0
      return buildDateWib(year, month, day, hh, mi)
    }
  }
  return undefined
}

// --- merchant ---------------------------------------------------------------

const MERCHANT_BLACKLIST = [
  /total/i, /pembayaran/i, /berhasil/i, /sukses/i, /terima\s*kasih/i,
  /saldo/i, /^rp\b/i, /metode/i, /referensi/i, /id\s*transaksi/i,
  /tanggal/i, /waktu/i, /biaya/i, /admin/i, /^q?ris$/i,
  /gopay/i, /shopeepay/i, /\bovo\b/i, /\bdana\b/i, /linkaja/i, /gofood/i,
  /^transaksi/i, /selesai/i,
]

function extractMerchant(text: string): string | undefined {
  const ls = lines(text)
  if (ls.length === 0) return undefined

  for (const line of ls) {
    if (line.length < 3 || line.length > 60) continue
    if (/Rp\s*\d/i.test(line)) continue
    if (/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}/.test(line)) continue
    if (/\b\d{1,2}\s+[A-Za-z]+\s+\d{4}/.test(line)) continue
    if (MERCHANT_BLACKLIST.some((re) => re.test(line))) continue
    // At least one alpha character
    if (!/[A-Za-z]/.test(line)) continue
    return line
  }
  return undefined
}

// --- confidence -------------------------------------------------------------

function scoreConfidence(p: Omit<ParsedReceipt, 'confidence' | 'rawText'>): number {
  let score = 0
  if (p.amount > 0) score += 0.4
  if (p.merchantName) score += 0.25
  if (p.transactedAt) score += 0.25
  if (p.paymentMethod) score += 0.1
  return Math.min(1, Math.round(score * 100) / 100)
}

// --- public API -------------------------------------------------------------

export function parseReceiptText(rawText: string): ParsedReceipt | null {
  if (!rawText || !rawText.trim()) return null
  const amount = extractAmount(rawText)
  if (amount === null) return null

  const merchantName = extractMerchant(rawText)
  const transactedAt = extractDate(rawText)
  const paymentMethod = extractPaymentMethod(rawText)

  return {
    amount,
    merchantName,
    transactedAt,
    paymentMethod,
    confidence: scoreConfidence({ amount, merchantName, transactedAt, paymentMethod }),
    rawText,
  }
}
