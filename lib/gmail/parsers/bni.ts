import type { BankParser, GmailMessage, ParsedTransaction } from '@/types/parser'
import { parseIDRAmount, normalizeText, isFromSender, parseEmailDate } from './base'
import { registerParser } from './index'
import { calculateConfidence } from './confidence'

const KNOWN_SENDERS = ['bni.co.id']

const KNOWN_SUBJECTS = ['bni', 'notifikasi bni', 'mobile banking bni', 'notifikasi', 'transaksi']

export const bniParser: BankParser = {
  name: 'bni',

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

      if (normalized.includes('qris')) {
        type = 'expense'
        paymentMethod = 'qris'
      } else if (normalized.includes('kredit') || normalized.includes('transfer masuk')) {
        type = 'income'
        paymentMethod = 'transfer'
      } else if (
        normalized.includes('debit') ||
        normalized.includes('transfer debit') ||
        normalized.includes('pembelian')
      ) {
        type = 'expense'
        paymentMethod =
          normalized.includes('transfer debit') || normalized.includes('transfer')
            ? 'transfer'
            : 'debit'
      }

      let merchantName: string | null = null
      const merchantPatterns = [
        /(?:merchant:|merchant)\s+([^\n]+)/i,
        /(?:pembelian|belanja)\s+(?:di|at)\s+([^\n]+)/i,
        /(?:transfer ke|tujuan|penerima)\s+([^\n]+)/i,
        /(?:dari)\s+([^\n]+)/i,
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
      const refMatch = body.match(
        /(?:nomor\s+ref|ref|referensi|reference|nomor\s+referensi|kode\s+referensi|reference\s+number)[:\s]+([A-Z0-9\-]+)/i,
      )
      if (refMatch?.[1]) referenceNumber = refMatch[1].trim()

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
        bank: 'bni',
      }

      result.confidence = calculateConfidence(result)
      return result
    } catch {
      return null
    }
  },
}

registerParser(bniParser)
