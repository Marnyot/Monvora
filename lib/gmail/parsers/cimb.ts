import type { BankParser, GmailMessage, ParsedTransaction } from '@/types/parser'
import { parseIDRAmount, normalizeText, isFromSender, parseEmailDate } from './base'
import { registerParser } from './index'
import { calculateConfidence } from './confidence'

const KNOWN_SENDERS = ['cimbniaga.co.id', 'ocbcnisp.com']

const KNOWN_SUBJECTS = [
  'cimb', 'octo', 'ocbc', 'notifikasi', 'transaksi', 'notification', 'transaction',
]

export const cimbParser: BankParser = {
  name: 'cimb',

  canParse(email: GmailMessage): boolean {
    const fromLower = email.from.toLowerCase()
    const subjectLower = email.subject.toLowerCase()
    const validSender = KNOWN_SENDERS.some((s) => fromLower.includes(s))
    const validSubject = KNOWN_SUBJECTS.some((s) => subjectLower.includes(s))
    return validSender && validSubject
  },

  parse(email: GmailMessage): ParsedTransaction | null {
    try {
      const body = email.body
      if (!body) return null

      const normalized = normalizeText(body)

      const amount = parseIDRAmount(body)
      if (!amount) return null

      let type: 'expense' | 'income' | 'transfer' = 'expense'
      let paymentMethod: ParsedTransaction['payment_method'] = 'other'

      if (normalized.includes('kredit') || normalized.includes('transfer masuk')) {
        type = 'income'
        paymentMethod = 'transfer'
      } else if (
        normalized.includes('debit') ||
        normalized.includes('transfer keluar') ||
        normalized.includes('transfer ke')
      ) {
        type = 'expense'
        paymentMethod = 'transfer'
      } else if (normalized.includes('qris') || normalized.includes('qr code')) {
        type = 'expense'
        paymentMethod = 'qris'
      } else if (normalized.includes('pembelian') || normalized.includes('belanja')) {
        type = 'expense'
        paymentMethod = 'debit'
      }

      let merchantName: string | null = null
      const merchantPatterns = [
        /(?:merchant:|merchant)\s+([^\n]+)/i,
        /(?:pembelian|belanja)\s+(?:di|at|pada)\s+([^\n]+)/i,
        /(?:transfer ke|tujuan)\s+([^\n]+)/i,
        /(?:dari|pengirim)\s+([^\n]+)/i,
      ]
      for (const pattern of merchantPatterns) {
        const match = body.match(pattern)
        if (match?.[1]) {
          const candidate = normalizeText(match[1]).split(/\n/)[0].substring(0, 100)
          if (candidate && !candidate.includes('nominal') && !candidate.includes('rp')) {
            merchantName = candidate
            break
          }
        }
      }

      let referenceNumber: string | null = null
      const refPatterns = [
        /(?:nomor\s+ref|ref|reference|nomor\s+referensi|reference\s+number|reff)[:\s]+([A-Z0-9]+)/i,
        /(?:transaksi\s+id|transaction\s+id)[:\s]+([A-Z0-9]+)/i,
      ]
      for (const pattern of refPatterns) {
        const match = body.match(pattern)
        if (match?.[1]) {
          referenceNumber = match[1].trim()
          break
        }
      }

      const result: ParsedTransaction = {
        amount,
        type,
        merchant_name: merchantName,
        description: null,
        payment_method: paymentMethod,
        transacted_at: parseEmailDate(email.date),
        reference_number: referenceNumber,
        raw_email_id: email.id,
        raw_snippet: body.substring(0, 200).replace(/\n/g, ' ').trim(),
        confidence: 0,
        bank: 'cimb',
      }

      result.confidence = calculateConfidence(result)
      return result
    } catch {
      return null
    }
  },
}

registerParser(cimbParser)
