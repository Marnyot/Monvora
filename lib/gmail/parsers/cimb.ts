import type { BankParser, GmailMessage, ParsedTransaction } from '@/types/parser'
import { parseIDRAmount, normalizeText, isFromSender, parseEmailDate } from './base'
import { registerParser } from './index'

/**
 * CIMB Niaga Parser - Handles email notifications from CIMB Niaga
 * Detects emails from @cimbniaga.co.id or @ocbcnisp.com, or subjects containing "CIMB" or "OCTO"
 */
export const cimbParser: BankParser = {
  name: 'cimb',

  canParse(email: GmailMessage): boolean {
    // Check if email is from CIMB domain (@cimbniaga.co.id or @ocbcnisp.com)
    if (isFromSender(email, 'cimbniaga.co.id') || isFromSender(email, 'ocbcnisp.com')) {
      return true
    }

    // Check if subject contains CIMB or OCTO keywords
    const subject = normalizeText(email.subject)
    if (subject.includes('cimb') || subject.includes('octo')) {
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
      'other'

    // Check for income indicators (Kredit, Transfer Masuk)
    if (normalized.includes('kredit') || normalized.includes('transfer masuk')) {
      type = 'income'
      paymentMethod = 'transfer'
    }
    // Check for transfer out (Debit, Transfer Keluar)
    else if (
      normalized.includes('debit') ||
      normalized.includes('transfer keluar') ||
      normalized.includes('transfer ke')
    ) {
      type = 'expense'
      paymentMethod = 'transfer'
    }
    // Check for QRIS/QR Code payment
    else if (normalized.includes('qris') || normalized.includes('qr code')) {
      type = 'expense'
      paymentMethod = 'qris'
    }
    // Check for specific payment methods
    else if (normalized.includes('pembelian') || normalized.includes('belanja')) {
      type = 'expense'
      paymentMethod = 'debit'
    }

    // Extract merchant name
    let merchantName: string | null = null
    const merchantPatterns = [
      /(?:merchant|merchant:|di|at|pada)\s+([^\n]+)/i,
      /(?:pembelian|belanja)\s+(?:di|at|pada)\s+([^\n]+)/i,
      /(?:transfer ke|tujuan)\s+([^\n]+)/i,
      /(?:dari|pengirim)\s+([^\n]+)/i,
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
      /(?:nomor\s+ref|ref|reference|nomor\s+referensi|reference\s+number|reff)[:\s]+([A-Z0-9]+)/i,
      /(?:transaksi\s+id|transaction\s+id)[:\s]+([A-Z0-9]+)/i,
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
    // Full confidence (0.9) if amount, type, and merchant are present
    // Lower confidence (0.7) if merchant is missing
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
      bank: 'cimb',
    }
  },
}

// Auto-register the parser when module is loaded
registerParser(cimbParser)
