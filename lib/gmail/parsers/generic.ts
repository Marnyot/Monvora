import type { BankParser, GmailMessage, ParsedTransaction } from '@/types/parser'
import { parseIDRAmount, normalizeText, parseEmailDate } from './base'
import { registerParser } from './index'
import { calculateConfidence } from './confidence'

export const genericParser: BankParser = {
  name: 'generic',

  canParse(email: GmailMessage): boolean {
    const text = normalizeText(email.subject + ' ' + email.body)
    const bankKeywords = ['transaksi', 'debit', 'kredit', 'transfer', 'bayar', 'tagihan', 'rp ', 'rp.', 'idr']
    return bankKeywords.some((kw) => text.includes(kw))
  },

  parse(email: GmailMessage): ParsedTransaction | null {
    try {
      const body = email.body
      if (!body) return null

      const amount = parseIDRAmount(body)
      if (!amount) return null

      let merchantName: string | null = null

      const subjectWords = email.subject
        .split(/[\s\-:()]/)
        .filter(
          (w) =>
            w.length > 2 &&
            !w.match(/^(notifikasi|transaksi|bank|atm|transfer|debit|kredit)$/i),
        )

      if (subjectWords.length > 0) {
        merchantName = subjectWords.slice(0, 2).join(' ').trim().substring(0, 100).toLowerCase()
      }

      if (!merchantName) {
        const merchantPatterns = [
          /(?:merchant|di|at|ke|tujuan)\s+([^\n]+)/i,
          /(?:pembelian|belanja|pembayaran)\s+(?:ke|di)\s+([^\n]+)/i,
        ]
        for (const pattern of merchantPatterns) {
          const match = body.match(pattern)
          if (match?.[1]) {
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

      const result: ParsedTransaction = {
        amount,
        type: 'expense',
        merchant_name: merchantName,
        description: null,
        payment_method: 'other',
        transacted_at: parseEmailDate(email.date),
        reference_number: null,
        raw_email_id: email.id,
        raw_snippet: body.substring(0, 200).replace(/\n/g, ' ').trim(),
        confidence: 0,
        bank: 'generic',
      }

      // Generic parser caps confidence at 0.5 — format unknown, precision not guaranteed
      result.confidence = Math.min(0.5, calculateConfidence(result))
      return result
    } catch {
      return null
    }
  },
}

registerParser(genericParser)
