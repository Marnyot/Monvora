import type { BankParser, GmailMessage, ParsedTransaction } from '@/types/parser'
import { parseIDRAmount, normalizeText, isFromSender, parseEmailDate } from './base'
import { registerParser } from './index'
import { calculateConfidence } from './confidence'

const KNOWN_SENDERS = ['bri.co.id']

const KNOWN_SUBJECTS = ['bri', 'brimo', 'notifikasi', 'transaksi']

export const briParser: BankParser = {
  name: 'bri',

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
        normalized.includes('transfer') &&
        (normalized.includes('keluar') || normalized.includes('ke '))
      ) {
        type = 'expense'
        paymentMethod = 'transfer'
      } else if (
        normalized.includes('tarik tunai') ||
        normalized.includes('atm') ||
        normalized.includes('penarikan tunai')
      ) {
        type = 'expense'
        paymentMethod = 'debit'
      } else if (
        normalized.includes('qris') ||
        normalized.includes('pembayaran qris') ||
        normalized.includes('qr code')
      ) {
        type = 'expense'
        paymentMethod = 'qris'
      } else if (
        normalized.includes('debit') ||
        normalized.includes('pembelian') ||
        normalized.includes('belanja')
      ) {
        type = 'expense'
        paymentMethod = 'debit'
      } else if (
        normalized.includes('gopay') ||
        normalized.includes('ovo') ||
        normalized.includes('dana') ||
        normalized.includes('gcash')
      ) {
        type = 'expense'
        paymentMethod = 'ewallet'
      }

      let merchantName: string | null = null
      const merchantPatterns = [
        /(?:tujuan|penerima):\s+([^\n]+?)(?:\n|$)/i,
        /(?:tujuan|penerima)\s+([^\n]+?)(?:\n|rp|idr|$)/i,
        /(?:pembelian|belanja|transaksi)\s+(?:di|at)\s+([^\n]+?)(?:\n|rp|idr|$)/i,
        /(?:merchant|di|at|pada)\s+([^\n]+?)(?:\n|rp|idr|$)/i,
        /(?:dari|pengirim)\s+([^\n]+?)(?:\n|rp|idr|$)/i,
      ]
      for (const pattern of merchantPatterns) {
        const match = body.match(pattern)
        if (match?.[1]) {
          const candidate = normalizeText(match[1]).split(/\n/)[0].substring(0, 100).trim()
          if (candidate && !candidate.includes('nominal') && !candidate.includes('rp')) {
            merchantName = candidate
            break
          }
        }
      }

      let referenceNumber: string | null = null
      const refPatterns = [
        /(?:referensi|nomor\s+ref|ref|reff|id\s+transaksi|transaction\s+id)[:\s]+([A-Z0-9]+)/i,
        /(?:nomor\s+)([A-Z0-9]{10,})/i,
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
        bank: 'bri',
      }

      result.confidence = calculateConfidence(result)
      return result
    } catch {
      return null
    }
  },
}

registerParser(briParser)
