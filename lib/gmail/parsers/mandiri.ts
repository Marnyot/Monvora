import type { BankParser, GmailMessage, ParsedTransaction } from '@/types/parser'
import { parseIDRAmount, normalizeText, isFromSender, parseEmailDate } from './base'
import { registerParser } from './index'
import { calculateConfidence } from './confidence'
import { parseAmountToInteger } from '@/lib/utils/currency'
import { parseTransactionDate } from '@/lib/utils/date'

const KNOWN_SENDERS = ['bankmandiri.co.id']

const KNOWN_SUBJECTS = [
  'pembayaran berhasil',
  'transfer berhasil',
  'dana masuk',
  'notifikasi transaksi',
  'notifikasi',
]

export const mandiriParser: BankParser = {
  name: 'mandiri',

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

      // Amount: try bank-specific pattern first, fall back to generic
      let amount: number | null = null
      const specificAmountMatch = body.match(/Nominal\s+Transaksi\s+Rp\s*([\d.,]+)/i)
      if (specificAmountMatch) {
        amount = parseAmountToInteger(specificAmountMatch[1])
      }
      if (!amount) amount = parseIDRAmount(body)
      if (!amount) return null

      // Type + payment method detection
      let type: 'expense' | 'income' | 'transfer' = 'expense'
      let paymentMethod: ParsedTransaction['payment_method'] = 'debit'

      if (normalized.includes('transfer masuk') || normalized.includes('kredit')) {
        type = 'income'
        paymentMethod = 'transfer'
      } else if (
        normalized.includes('transfer keluar') ||
        normalized.includes('transfer ke') ||
        normalized.includes('transfer out') ||
        normalized.includes('transfer berhasil')
      ) {
        type = 'expense'
        paymentMethod = 'transfer'
      } else if (
        normalized.includes('penarikan tunai') ||
        normalized.includes('atm') ||
        normalized.includes('cash withdrawal')
      ) {
        type = 'expense'
        paymentMethod = 'debit'
      } else if (normalized.includes('qris') || normalized.includes('pembayaran qris')) {
        type = 'expense'
        paymentMethod = 'qris'
      } else if (
        normalized.includes('gcash') ||
        normalized.includes('ovo') ||
        normalized.includes('dana') ||
        normalized.includes('gopay')
      ) {
        type = 'expense'
        paymentMethod = 'ewallet'
      } else if (
        normalized.includes('pembelian') ||
        normalized.includes('belanja') ||
        normalized.includes('purchase')
      ) {
        type = 'expense'
        paymentMethod = 'debit'
      }

      // Merchant: try bank-specific (Penerima\n) first, fall back to generic patterns
      let merchantName: string | null = null
      const specificMerchantMatch = body.match(/Penerima\s*\n([^\n]+)/i)
      if (specificMerchantMatch) {
        merchantName = normalizeText(specificMerchantMatch[1]).substring(0, 100) || null
      }
      if (!merchantName) {
        const merchantPatterns = [
          /(?:merchant:|merchant)\s+([^\n]+)/i,
          /(?:pembelian|belanja)\s+(?:di|at)\s+([^\n]+)/i,
          /(?:transfer ke|tujuan)\s+([^\n]+)/i,
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
      }

      // Reference: try bank-specific (No. Referensi) first, fall back to generic
      let referenceNumber: string | null = null
      const specificRefMatch = body.match(/No\.\s*Referensi\s+(\d+)/i)
      if (specificRefMatch) {
        referenceNumber = specificRefMatch[1].trim()
      }
      if (!referenceNumber) {
        const refMatch = body.match(
          /(?:nomor\s+ref|ref|reference|nomor\s+referensi|reference\s+number)[:\s]+([A-Z0-9]+)/i,
        )
        if (refMatch?.[1]) referenceNumber = refMatch[1].trim()
      }

      // Date: try bank-specific format (Tanggal + Jam), fall back to email header
      let transactedAt: Date = parseEmailDate(email.date)
      const dateMatch = body.match(/Tanggal\s+(\d{1,2}\s+\w+\s+\d{4})/i)
      if (dateMatch) {
        const timeMatch = body.match(/Jam\s+(\d{2}:\d{2}:\d{2}\s*WIB)/i)
        const parsed = parseTransactionDate(dateMatch[1], timeMatch?.[1])
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
        bank: 'mandiri',
      }

      result.confidence = calculateConfidence(result)
      return result
    } catch {
      return null
    }
  },
}

registerParser(mandiriParser)
