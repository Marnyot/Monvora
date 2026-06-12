import type { BankParser, GmailMessage, ParsedTransaction } from '@/types/parser'
import { parseIDRAmount, normalizeText, parseEmailDate } from './base'
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

/** Title-case: lowercase dulu lalu kapitalisasi tiap awal kata. "RISQUINA ANGELICA" → "Risquina Angelica". */
function toTitleCase(s: string): string {
  return s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())
}

/**
 * Ambil nama tengah dari nama lengkap (aturan BCA: yang ditampilkan hanya nama tengah).
 * "RISQUINA ANGELICA ARVINTYANI" → "ANGELICA".
 * 2 kata → kata kedua, 1 kata → kata itu sendiri.
 */
function middleName(full: string | null): string | null {
  if (!full) return null
  const words = full.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return null
  const idx = words.length >= 3 ? Math.floor(words.length / 2) : words.length === 2 ? 1 : 0
  return words[idx]
}

/** Buang URL / www / domain dari teks Details agar tidak masuk ke catatan. */
function stripLinks(text: string): string | null {
  const cleaned = text
    .replace(/https?:\/\/\S+/gi, '')
    .replace(/www\.\S+/gi, '')
    .replace(/\b\S+\.(?:com|co\.id|net|org|io|id)\b\S*/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
  return cleaned || null
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

      // Hanya proses transaksi yang sukses ("Status : Successful").
      const statusMatch = body.match(/Status\s*:\s*([A-Za-z]+)/i)
      if (statusMatch && !statusMatch[1].toLowerCase().includes('success')) return null

      // Field helpers ---------------------------------------------------------
      const pick = (re: RegExp): string | null => {
        const m = body.match(re)
        return m?.[1] ? m[1].trim() : null
      }
      const pickAmount = (re: RegExp): number | null => {
        const m = body.match(re)
        return m?.[1] ? parseAmountToInteger(m[1].trim()) : null
      }

      const transferTypeRaw = pick(/Transfer Type\s*:\s*([^\n]+)/i)
      const transactionTypeRaw = pick(/Transaction Type\s*:\s*([^\n]+)/i)

      const totalPayment = pickAmount(/Total Payment\s*:\s*IDR\s*([\d,. ]+)/i)
      const amountField = pickAmount(/(?:^|[^pP]\s)Amount\s*:\s*IDR\s*([\d,. ]+)/i)
      const feeField = pickAmount(/Fee\s*:\s*IDR\s*([\d,. ]+)/i)
      const topUpAmount = pickAmount(/Top\s*Up\s*Amount\s*:\s*IDR\s*([\d,. ]+)/i)

      let type: ParsedTransaction['type'] = 'expense'
      let paymentMethod: ParsedTransaction['payment_method'] = 'other'
      let amount: number | null = null
      let displayName: string | null = null
      let description: string | null = null

      if (transferTypeRaw) {
        // ---- TRANSFER (Transfer Type : Transfer to <BANK>) ------------------
        type = 'transfer'
        paymentMethod = 'transfer'

        const dest = transferTypeRaw.replace(/^\s*transfer to\s*/i, '').trim()
        const isToBCA = /\bbca\b/i.test(dest)
        const beneficiaryFull = pick(/Beneficiary Name\s*:\s*([^\n]+)/i)

        if (isToBCA) {
          // Transfer sesama BCA → nominal = Total Payment (tanpa fee terpisah).
          amount = totalPayment ?? amountField
        } else {
          // Transfer antar bank → Amount + Fee dijumlahkan.
          if (amountField != null || feeField != null) {
            amount = (amountField ?? 0) + (feeField ?? 0) || null
          }
        }

        // Nama lengkap disimpan di description; yang ditampilkan hanya nama tengah.
        const mid = middleName(beneficiaryFull)
        if (mid) {
          displayName = `Transfer kepada ${toTitleCase(mid)}`
        } else {
          displayName = `Transfer ke ${toTitleCase(dest)}`
        }
        description = beneficiaryFull ? toTitleCase(beneficiaryFull) : null
      } else if (transactionTypeRaw && /qris/i.test(transactionTypeRaw)) {
        // ---- QRIS Payment ---------------------------------------------------
        type = 'expense'
        paymentMethod = 'qris'
        amount = totalPayment
        const payTo = pick(/Payment to\s*:\s*([^\n]+)/i)
        displayName = payTo ? `QRIS ke ${toTitleCase(payTo)}` : 'QRIS'
      } else if (transactionTypeRaw && /top\s*up/i.test(transactionTypeRaw)) {
        // ---- Top Up (e-wallet / saldo) -------------------------------------
        type = 'expense'
        paymentMethod = 'topup'
        amount = topUpAmount ?? totalPayment
        const provider =
          transactionTypeRaw.replace(/top\s*up/i, '').replace(/[-:]/g, ' ').trim() ||
          pick(/Payment to\s*:\s*([^\n]+)/i) ||
          ''
        displayName = provider ? `Top up ke ${provider}` : 'Top up'
        const details = pick(/Details\s*:\s*([^\n]+)/i)
        if (details) description = stripLinks(details)
      } else if (
        transactionTypeRaw &&
        /(mobile data|pulsa|paket|prepaid|\bdata\b|voucher)/i.test(transactionTypeRaw)
      ) {
        // ---- Pulsa / paket data → diperlakukan sebagai top up --------------
        type = 'expense'
        paymentMethod = 'topup'
        amount = totalPayment ?? topUpAmount
        const product = transactionTypeRaw.includes('-')
          ? transactionTypeRaw.split('-').slice(1).join('-').trim()
          : transactionTypeRaw.trim()
        displayName = `Top up ${product}`
        const details = pick(/Details\s*:\s*([^\n]+)/i)
        if (details) description = stripLinks(details)
      } else if (transactionTypeRaw) {
        // ---- Transaction Type lain (pembayaran/tagihan generik) ------------
        type = 'expense'
        amount = totalPayment ?? amountField
        const t = transactionTypeRaw.toLowerCase()
        if (t.includes('debit') || t.includes('card')) paymentMethod = 'debit'
        else if (t.includes('credit')) paymentMethod = 'credit'
        else paymentMethod = 'other'
        const payTo = pick(/Payment to\s*:\s*([^\n]+)/i)
        displayName = payTo ? toTitleCase(payTo) : transactionTypeRaw.trim()
        const details = pick(/Details\s*:\s*([^\n]+)/i)
        if (details) description = stripLinks(details)
      } else {
        // ---- Fallback defensif (format tak dikenal) ------------------------
        const isIncome =
          normalized.includes('transfer masuk') ||
          normalized.includes('dana masuk') ||
          normalized.includes('kredit')
        type = isIncome ? 'income' : 'expense'
        paymentMethod = isIncome ? 'transfer' : 'other'
        amount = totalPayment ?? parseIDRAmount(body)
      }

      if (!amount) return null

      // Reference No. — BCA pakai alfanumerik (bukan hex/UUID), bisa terpisah spasi.
      let referenceNumber: string | null = null
      const refMatch = body.match(/Reference No\.?\s*:\s*([A-Za-z0-9 ]+)/i)
      if (refMatch?.[1]) {
        const ref = refMatch[1].replace(/\s+/g, '')
        if (ref) referenceNumber = ref
      }
      if (!referenceNumber) {
        const rrnMatch = body.match(/RRN\s*:\s*([A-Za-z0-9]+)/i)
        if (rrnMatch?.[1]) referenceNumber = rrnMatch[1].trim()
      }

      // Date: "Transaction Date : 09 Jun 2026 12:31:22" → pisahkan tanggal & jam
      // agar parseTransactionDate mempertahankan komponen waktu.
      let transactedAt: Date = parseEmailDate(email.date)
      const dateMatch = body.match(
        /Transaction Date\s*:\s*(\d{1,2}\s+\w+\s+\d{4})(?:\s+(\d{2}:\d{2}:\d{2}))?/i,
      )
      if (dateMatch) {
        const parsed = parseTransactionDate(dateMatch[1], dateMatch[2])
        if (parsed) transactedAt = parsed
      }

      const result: ParsedTransaction = {
        amount,
        type,
        merchant_name: displayName,
        description,
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
