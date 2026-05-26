import type { BankParser, GmailMessage, ParsedTransaction } from '@/types/parser'
import { parseIDRAmount, normalizeText, isFromSender, parseEmailDate } from './base'
import { registerParser } from './index'
import { calculateConfidence } from './confidence'
import { parseAmountToInteger } from '@/lib/utils/currency'
import { parseTransactionDate } from '@/lib/utils/date'

const KNOWN_SENDERS = ['klikbca.com', 'bca.co.id']

const KNOWN_SUBJECTS = [
  'internet transaction journal',
  'bca card transaction',
  'bca',
  'notifikasi bca',
]

function detectBCAType(body: string): ParsedTransaction['type'] {
  const match = body.match(/Transfer Type\s*:\s*([^\n]+)/i)
  if (!match) return 'transfer'
  const t = match[1].toLowerCase()
  if (t.includes('transfer')) return 'transfer'
  return 'expense'
}

function detectBCAPaymentMethod(body: string, normalized: string): ParsedTransaction['payment_method'] {
  const match = body.match(/Transfer Type\s*:\s*([^\n]+)/i)
  if (match) {
    const t = match[1].toLowerCase()
    if (t.includes('qris')) return 'qris'
    if (t.includes('transfer')) return 'transfer'
    if (t.includes('debit') || t.includes('card')) return 'debit'
    if (t.includes('credit')) return 'credit'
    return 'other'
  }

  // Fallback to body keywords
  if (normalized.includes('pembayaran qris') || normalized.includes('qris')) return 'qris'
  if (normalized.includes('transfer masuk') || normalized.includes('kredit') || normalized.includes('transfer dari')) return 'transfer'
  if (normalized.includes('transfer ke') || normalized.includes('transfer keluar') || normalized.includes('tujuan')) return 'transfer'
  if (normalized.includes('debet') || normalized.includes('pembelian') || normalized.includes('belanja')) return 'debit'
  return 'debit'
}

export const bcaParser: BankParser = {
  name: 'bca',

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

      // Skip non-successful transactions
      const statusMatch = body.match(/Status\s*:\s*(\w+)/i)
      if (statusMatch && !statusMatch[1].toLowerCase().includes('success')) return null

      // Amount: try bank-specific pattern, fall back to generic
      let amount: number | null = null
      const specificAmountMatch = body.match(/Transfer Amount\s*:\s*IDR\s*([\d,. ]+)/i)
      if (specificAmountMatch) {
        amount = parseAmountToInteger(specificAmountMatch[1].trim())
      }
      if (!amount) amount = parseIDRAmount(body)
      if (!amount) return null

      // Type detection
      let type: 'expense' | 'income' | 'transfer' = 'expense'
      if (
        normalized.includes('transfer masuk') ||
        normalized.includes('kredit') ||
        normalized.includes('transfer dari')
      ) {
        type = 'income'
      } else if (body.match(/Transfer Type\s*:\s*([^\n]+)/i)) {
        type = detectBCAType(body)
      } else if (
        normalized.includes('transfer ke') ||
        normalized.includes('transfer keluar') ||
        normalized.includes('tujuan')
      ) {
        type = 'expense'
      }

      const paymentMethod = detectBCAPaymentMethod(body, normalized)

      // Merchant: try bank-specific (Beneficiary Name) first, fall back to generic
      let merchantName: string | null = null
      const specificMerchantMatch = body.match(/Beneficiary Name\s*:\s*([^\n]+)/i)
      if (specificMerchantMatch) {
        merchantName = normalizeText(specificMerchantMatch[1]).substring(0, 100) || null
      }
      if (!merchantName) {
        const merchantPatterns = [
          /(?:merchant:|merchant)\s+([^\n]+)/i,
          /(?:pembelian|belanja)\s+(?:di|at|di\s+)?([^\n]+)/i,
          /(?:tujuan|transfer ke|dari)\s+([^\n]+)/i,
        ]
        for (const pattern of merchantPatterns) {
          const match = body.match(pattern)
          if (match?.[1]) {
            const candidate = normalizeText(match[1]).split(/\n/)[0].substring(0, 100)
            if (
              candidate &&
              !candidate.includes('nominal') &&
              !candidate.includes('rp') &&
              !candidate.includes('waktu') &&
              !candidate.includes('jenis')
            ) {
              merchantName = candidate
              break
            }
          }
        }
      }

      // Reference: try bank-specific, fall back to generic
      let referenceNumber: string | null = null
      const specificRefMatch = body.match(/Reference No\.\s*:\s*([A-F0-9-]+)/i)
      if (specificRefMatch) {
        referenceNumber = specificRefMatch[1].trim()
      }
      if (!referenceNumber) {
        const refMatch = body.match(
          /(?:nomor\s+referensi|reference\s+number|nomor\s+ref|ref)[:\s]+([A-Z0-9]+)/i,
        )
        if (refMatch?.[1]) referenceNumber = refMatch[1].trim()
      }

      // Date: try bank-specific (Transaction Date), fall back to email header
      let transactedAt: Date = parseEmailDate(email.date)
      const dateMatch = body.match(
        /Transaction Date\s*:\s*(\d{1,2}\s+\w+\s+\d{4}\s+\d{2}:\d{2}:\d{2})/i,
      )
      if (dateMatch) {
        const parsed = parseTransactionDate(dateMatch[1])
        if (parsed) transactedAt = parsed
      }

      const result: ParsedTransaction = {
        amount,
        type,
        merchant_name: merchantName,
        description: null,
        payment_method: paymentMethod,
        transacted_at: transactedAt,
        reference_number: referenceNumber,
        raw_email_id: email.id,
        raw_snippet: body.substring(0, 200).replace(/\n/g, ' ').trim(),
        confidence: 0,
        bank: 'bca',
      }

      result.confidence = calculateConfidence(result)
      return result
    } catch {
      return null
    }
  },
}

registerParser(bcaParser)
