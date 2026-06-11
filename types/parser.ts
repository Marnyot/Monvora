export type PaymentMethod = 'qris' | 'transfer' | 'cash' | 'debit' | 'credit' | 'ewallet' | 'topup' | 'other'
export type TransactionType = 'expense' | 'income' | 'transfer'

export interface GmailMessage {
  id: string           // Gmail message ID (juga sebagai raw_email_id)
  threadId: string
  subject: string
  from: string         // email pengirim, contoh: "BankMandiri <notifikasi@bankmandiri.co.id>"
  body: string         // body email (plain text)
  date: string         // tanggal dari header email
  snippet: string      // cuplikan singkat dari Gmail API
}

export interface ParsedTransaction {
  amount: number              // IDR integer, selalu positif
  type: TransactionType
  merchant_name: string | null
  description: string | null
  payment_method: PaymentMethod
  transacted_at: Date
  reference_number: string | null
  raw_email_id: string        // Gmail message ID
  raw_snippet: string         // teks asli untuk debugging
  confidence: number          // 0.0 – 1.0
  bank: string                // nama bank yang parse, contoh: 'mandiri', 'bca'
}

export interface BankParser {
  name: string
  canParse: (email: GmailMessage) => boolean
  parse: (email: GmailMessage) => ParsedTransaction | null
}

export interface ParseResult {
  transaction: ParsedTransaction | null
  error: string | null
  bank: string | null
}
