import type { BankParser, GmailMessage, ParsedTransaction } from '@/types/parser'
import { parseIDRAmount, normalizeText, isFromSender, parseEmailDate } from './base'
import { registerParser } from './index'

/**
 * BNI Parser - Handles email notifications from Bank Negara Indonesia (BNI)
 * Detects emails from @bni.co.id and parses transaction details
 */
export const bniParser: BankParser = {
  name: 'bni',

  canParse(email: GmailMessage): boolean {
    // Check if email is from BNI domain or subject contains BNI
    const isFromBniDomain = isFromSender(email, 'bni.co.id')
    const isBniInSubject =
      email.subject.toLowerCase().includes('bni') ||
      email.subject.toLowerCase().includes('mobile banking')

    return isFromBniDomain || isBniInSubject
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
      'other'

    // Check for QRIS first (can be either expense or income)
    if (normalized.includes('qris')) {
      type = 'expense'
      paymentMethod = 'qris'
    }
    // Check for credit/income indicators
    else if (normalized.includes('kredit') || normalized.includes('transfer masuk')) {
      type = 'income'
      paymentMethod = 'transfer'
    }
    // Check for debit/expense indicators
    else if (
      normalized.includes('debit') ||
      normalized.includes('transfer debit') ||
      normalized.includes('pembelian')
    ) {
      type = 'expense'

      // Determine payment method based on transaction type
      if (normalized.includes('transfer debit') || normalized.includes('transfer')) {
        paymentMethod = 'transfer'
      } else {
        paymentMethod = 'debit'
      }
    }

    // Extract merchant name
    let merchantName: string | null = null
    const merchantPatterns = [
      /(?:merchant|merchant:|di|at)\s+([^\n]+)/i,
      /(?:pembelian|belanja)\s+(?:di|at)\s+([^\n]+)/i,
      /(?:transfer ke|tujuan|penerima)\s+([^\n]+)/i,
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
      /(?:nomor\s+ref|ref|referensi|reference|nomor\s+referensi|kode\s+referensi|reference\s+number)[:\s]+([A-Z0-9\-]+)/i,
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
      bank: 'bni',
    }
  },
}

// Auto-register the parser when module is loaded
registerParser(bniParser)
