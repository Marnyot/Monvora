import type { BankParser, GmailMessage, ParseResult } from '@/types/parser'

// Registry akan diisi saat masing-masing parser dibuat
// Parsers di-import di sync.ts via side effects untuk menghindari circular dependencies
export const PARSER_REGISTRY: BankParser[] = []

export function detectAndParse(email: GmailMessage): ParseResult {
  for (const parser of PARSER_REGISTRY) {
    if (parser.canParse(email)) {
      try {
        const transaction = parser.parse(email)
        return { transaction, error: null, bank: parser.name }
      } catch (err) {
        return { transaction: null, error: String(err), bank: parser.name }
      }
    }
  }
  return { transaction: null, error: 'No parser found for this email', bank: null }
}

export function registerParser(parser: BankParser): void {
  PARSER_REGISTRY.push(parser)
}
