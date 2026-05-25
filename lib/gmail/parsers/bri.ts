import type { BankParser, GmailMessage, ParsedTransaction } from '@/types/parser'
import { parseIDRAmount, normalizeText, isFromSender, parseEmailDate } from './base'
import { registerParser } from './index'

/**
 * BRI Parser - Handles email notifications from Bank Rakyat Indonesia (BRI)
 * Detects emails from @bri.co.id domain and parses transaction details
 */
export const briParser: BankParser = {
  name: 'bri',

  canParse(email: GmailMessage): boolean {
    // Check if email is from BRI domain or subject contains BRI/BRImo keywords
    const isFromBRI = isFromSender(email, 'bri.co.id')
    const hasSubjectKeyword =
      email.subject.toLowerCase().includes('bri') ||
      email.subject.toLowerCase().includes('brimo')

    return isFromBRI || hasSubjectKeyword
  },

  parse(email: GmailMessage): ParsedTransaction | null {
    const body = email.body
    if (!body) return null

    const normalized = normalizeText(body)

    // Extract amount from body
    const amount = parseIDRAmount(body)
    if (!amount) return null

    // Determine transaction type and payment method based on keywords
    let type: 'expense' | 'income' | 'transfer' = 'expense'
    let paymentMethod: 'qris' | 'transfer' | 'cash' | 'debit' | 'credit' | 'ewallet' | 'other' =
      'other'

    // Check for income indicators
    if (normalized.includes('kredit') || normalized.includes('transfer masuk')) {
      type = 'income'
      paymentMethod = 'transfer'
    }
    // Check for transfer out
    else if (
      normalized.includes('transfer') &&
      (normalized.includes('keluar') || normalized.includes('ke '))
    ) {
      type = 'expense'
      paymentMethod = 'transfer'
    }
    // Check for cash withdrawal / ATM
    else if (
      normalized.includes('tarik tunai') ||
      normalized.includes('atm') ||
      normalized.includes('penarikan tunai')
    ) {
      type = 'expense'
      paymentMethod = 'debit'
    }
    // Check for QRIS
    else if (
      normalized.includes('qris') ||
      normalized.includes('pembayaran qris') ||
      normalized.includes('qr code')
    ) {
      type = 'expense'
      paymentMethod = 'qris'
    }
    // Check for debit / purchases
    else if (
      normalized.includes('debit') ||
      normalized.includes('pembelian') ||
      normalized.includes('belanja')
    ) {
      type = 'expense'
      paymentMethod = 'debit'
    }
    // Check for e-wallet apps
    else if (
      normalized.includes('gopay') ||
      normalized.includes('ovo') ||
      normalized.includes('dana') ||
      normalized.includes('gcash')
    ) {
      type = 'expense'
      paymentMethod = 'ewallet'
    }

    // Extract merchant name
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
      if (match && match[1]) {
        const candidate = normalizeText(match[1]).split(/\n/)[0].substring(0, 100).trim()
        if (candidate && !candidate.includes('nominal') && !candidate.includes('rp')) {
          merchantName = candidate
          break
        }
      }
    }

    // Extract reference number / transaction ID
    let referenceNumber: string | null = null
    const refPatterns = [
      /(?:referensi|nomor\s+ref|ref|reff|id\s+transaksi|transaction\s+id)[:\s]+([A-Z0-9]+)/i,
      /(?:nomor\s+)([A-Z0-9]{10,})/i,
    ]

    for (const pattern of refPatterns) {
      const match = body.match(pattern)
      if (match && match[1]) {
        referenceNumber = match[1].trim()
        break
      }
    }

    // Parse transaction date
    const transactedAt = parseEmailDate(email.date)

    // Calculate confidence
    // Full confidence if amount, type, and merchant are present
    // Lower confidence if merchant is missing
    const hasFullDetails = amount && type && merchantName
    const confidence = hasFullDetails ? 0.9 : 0.7

    // Create raw snippet (first 200 chars of body)
    const rawSnippet = body.substring(0, 200).replace(/\n/g, ' ').trim()

    return {
      amount,
      type,
      merchant_name: merchantName,
      description: null,
      payment_method: paymentMethod,
      transacted_at: transactedAt,
      reference_number: referenceNumber,
      raw_email_id: email.id,
      raw_snippet: rawSnippet,
      confidence,
      bank: 'bri',
    }
  },
}

// Auto-register the parser when module is loaded
registerParser(briParser)
