import type { BankParser, GmailMessage, ParsedTransaction } from '@/types/parser'
import { parseIDRAmount, normalizeText, isFromSender, parseEmailDate } from './base'
import { registerParser } from './index'

/**
 * BCA Parser - Handles email notifications from Bank Central Asia (BCA)
 * Detects emails from @klikbca.com, @bca.co.id, or subject containing "BCA"
 * and parses transaction details from the email body
 */
export const bcaParser: BankParser = {
  name: 'bca',

  canParse(email: GmailMessage): boolean {
    // Check if email is from BCA domain
    if (isFromSender(email, 'klikbca.com') || isFromSender(email, 'bca.co.id')) {
      return true
    }

    // Check if subject contains BCA
    if (email.subject && email.subject.toLowerCase().includes('bca')) {
      return true
    }

    return false
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
    if (
      normalized.includes('transfer masuk') ||
      normalized.includes('kredit') ||
      normalized.includes('transfer dari')
    ) {
      type = 'income'
      paymentMethod = 'transfer'
    }
    // Check for transfer out
    else if (
      normalized.includes('transfer ke') ||
      normalized.includes('transfer keluar') ||
      normalized.includes('tujuan')
    ) {
      type = 'expense'
      paymentMethod = 'transfer'
    }
    // Check for QRIS specifically
    else if (
      normalized.includes('pembayaran qris') ||
      normalized.includes('qris') ||
      normalized.includes('scan qr')
    ) {
      type = 'expense'
      paymentMethod = 'qris'
    }
    // Check for ATM withdrawal
    else if (
      normalized.includes('penarikan tunai') ||
      normalized.includes('atm') ||
      normalized.includes('cash withdrawal')
    ) {
      type = 'expense'
      paymentMethod = 'debit'
    }
    // Check for debit/purchase
    else if (
      normalized.includes('debet') ||
      normalized.includes('pembelian') ||
      normalized.includes('belanja')
    ) {
      type = 'expense'
      paymentMethod = 'debit'
    }

    // Extract merchant name
    let merchantName: string | null = null
    const merchantPatterns = [
      /(?:merchant|merchant:)\s+([^\n]+)/i,
      /(?:pembelian|belanja)\s+(?:di|at|di\s+)?([^\n]+)/i,
      /(?:tujuan|transfer ke|dari)\s+([^\n]+)/i,
    ]

    for (const pattern of merchantPatterns) {
      const match = body.match(pattern)
      if (match && match[1]) {
        const candidate = normalizeText(match[1]).split(/\n/)[0].substring(0, 100)
        // Filter out common non-merchant patterns
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

    // Extract reference number
    let referenceNumber: string | null = null
    const refPatterns = [
      /(?:nomor\s+referensi|reference\s+number|nomor\s+ref|ref)[:\s]+([A-Z0-9]+)/i,
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
    // High confidence if amount, type, and merchant are present
    // Medium confidence if merchant is missing
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
      bank: 'bca',
    }
  },
}

// Auto-register the parser when module is loaded
registerParser(bcaParser)
