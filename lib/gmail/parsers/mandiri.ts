import type { BankParser, GmailMessage, ParsedTransaction } from '@/types/parser'
import { parseIDRAmount, normalizeText, isFromSender, parseEmailDate } from './base'
import { registerParser } from './index'

/**
 * Mandiri Parser - Handles email notifications from Bank Mandiri
 * Detects emails from @bankmandiri.co.id and parses transaction details
 */
export const mandiriParser: BankParser = {
  name: 'mandiri',

  canParse(email: GmailMessage): boolean {
    // Check if email is from Mandiri domain
    return isFromSender(email, 'bankmandiri.co.id')
  },

  parse(email: GmailMessage): ParsedTransaction | null {
    const body = email.body
    if (!body) return null

    const normalized = normalizeText(body)

    // Extract amount from body
    const amount = parseIDRAmount(body)
    if (!amount) return null

    // Determine transaction type based on keywords
    let type: 'expense' | 'income' | 'transfer' = 'expense'
    let paymentMethod: 'qris' | 'transfer' | 'cash' | 'debit' | 'credit' | 'ewallet' | 'other' =
      'debit'

    // Check for income indicators
    if (normalized.includes('transfer masuk') || normalized.includes('kredit')) {
      type = 'income'
      paymentMethod = 'transfer'
    }
    // Check for transfer out
    else if (
      normalized.includes('transfer keluar') ||
      normalized.includes('transfer ke') ||
      normalized.includes('transfer out')
    ) {
      type = 'expense'
      paymentMethod = 'transfer'
    }
    // Check for cash withdrawal
    else if (
      normalized.includes('penarikan tunai') ||
      normalized.includes('atm') ||
      normalized.includes('cash withdrawal')
    ) {
      type = 'expense'
      paymentMethod = 'debit'
    }
    // Check for QRIS specifically (not e-wallet apps)
    else if (normalized.includes('qris') || normalized.includes('pembayaran qris')) {
      type = 'expense'
      paymentMethod = 'qris'
    }
    // Check for e-wallet apps
    else if (
      normalized.includes('gcash') ||
      normalized.includes('ovo') ||
      normalized.includes('dana') ||
      normalized.includes('gopay')
    ) {
      type = 'expense'
      paymentMethod = 'ewallet'
    }
    // Default to expense (purchases, debit transactions)
    else if (
      normalized.includes('pembelian') ||
      normalized.includes('belanja') ||
      normalized.includes('purchase')
    ) {
      type = 'expense'
      paymentMethod = 'debit'
    }

    // Extract merchant name
    let merchantName: string | null = null
    const merchantPatterns = [
      /(?:merchant|merchant:|di|at)\s+([^\n]+)/i,
      /(?:pembelian|belanja)\s+(?:di|at)\s+([^\n]+)/i,
      /(?:transfer ke|tujuan)\s+([^\n]+)/i,
      /(?:dari)\s+([^\n]+)/i,
    ]

    for (const pattern of merchantPatterns) {
      const match = body.match(pattern)
      if (match && match[1]) {
        const candidate = normalizeText(match[1]).split(/\n/)[0].substring(0, 100)
        if (candidate && !candidate.includes('nominal') && !candidate.includes('rp')) {
          merchantName = candidate
          break
        }
      }
    }

    // Extract reference number
    let referenceNumber: string | null = null
    const refPatterns = [
      /(?:nomor\s+ref|ref|reference|nomor\s+referensi|reference\s+number)[:\s]+([A-Z0-9]+)/i,
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
    const confidence = hasFullDetails ? 0.95 : 0.75

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
      bank: 'mandiri',
    }
  },
}

// Auto-register the parser when module is loaded
registerParser(mandiriParser)
