import type { BankParser, GmailMessage, ParsedTransaction } from '@/types/parser'
import { parseIDRAmount, normalizeText, parseEmailDate } from './base'
import { registerParser } from './index'

/**
 * Generic Fallback Parser — coba parse email apapun yang belum tertangkap parser spesifik.
 * Confidence rendah (max 0.5) karena tidak tahu format spesifik bank.
 *
 * Hanya bisa parse email yang mengandung keyword transaksi/bank.
 */
export const genericParser: BankParser = {
  name: 'generic',

  canParse(email: GmailMessage): boolean {
    const text = normalizeText(email.subject + ' ' + email.body)
    const bankKeywords = [
      'transaksi',
      'debit',
      'kredit',
      'transfer',
      'bayar',
      'tagihan',
      'rp ',
      'rp.',
      'idr',
    ]
    return bankKeywords.some((kw) => text.includes(kw))
  },

  parse(email: GmailMessage): ParsedTransaction | null {
    const body = email.body
    if (!body) return null

    // Coba extract amount dari body
    const amount = parseIDRAmount(body)
    if (!amount) return null

    // Coba extract merchant dari subject atau dari body
    let merchantName: string | null = null

    // Cek subject dulu
    const subjectWords = email.subject
      .split(/[\s\-:()]/)
      .filter((w) => w.length > 2 && !w.match(/^(notifikasi|transaksi|bank|atm|transfer|debit|kredit)$/i))

    if (subjectWords.length > 0) {
      merchantName = subjectWords.slice(0, 2).join(' ').trim().substring(0, 100).toLowerCase()
    }

    // Jika subject tidak ada merchant, coba cari pattern di body
    if (!merchantName) {
      const merchantPatterns = [
        /(?:merchant|di|at|ke|tujuan)\s+([^\n]+)/i,
        /(?:pembelian|belanja|pembayaran)\s+(?:ke|di)\s+([^\n]+)/i,
      ]

      for (const pattern of merchantPatterns) {
        const match = body.match(pattern)
        if (match && match[1]) {
          const candidate = normalizeText(match[1]).split(/[\n,]/)[0].substring(0, 100)
          if (
            candidate &&
            !candidate.includes('nominal') &&
            !candidate.includes('rp') &&
            !candidate.includes('idr') &&
            candidate.length > 2
          ) {
            merchantName = candidate
            break
          }
        }
      }
    }

    // Parse transaction date
    const transactedAt = parseEmailDate(email.date)

    // Create raw snippet (first 200 chars of body)
    const rawSnippet = body.substring(0, 200).replace(/\n/g, ' ').trim()

    // Generic parser: confidence maksimal 0.5
    // Type default: 'expense'
    // Payment method default: 'other'
    return {
      amount,
      type: 'expense',
      merchant_name: merchantName,
      description: null,
      payment_method: 'other',
      transacted_at: transactedAt,
      reference_number: null,
      raw_email_id: email.id,
      raw_snippet: rawSnippet,
      confidence: 0.5,
      bank: 'generic',
    }
  },
}

// Auto-register — generic harus didaftarkan TERAKHIR (fallback)
registerParser(genericParser)
