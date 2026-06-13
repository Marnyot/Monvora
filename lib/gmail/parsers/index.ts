import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import type { BankParser, GmailMessage, ParseResult } from '@/types/parser'
import { aiFallbackParse } from './ai-fallback'

// Registry akan diisi saat masing-masing parser dibuat
// Parsers di-import di sync.ts via side effects untuk menghindari circular dependencies
export const PARSER_REGISTRY: BankParser[] = []

// Below this confidence the rule-based result is considered shaky and we let
// the AI fallback take a second look. Tuned to match what specific bank
// parsers emit on a clean parse (>0.7) vs the generic parser cap (0.5).
const RULE_CONFIDENCE_FLOOR = 0.7

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

export interface DetectWithAiOptions {
  supabase: SupabaseClient<Database>
  userId: string
  now?: Date
}

/**
 * Async pipeline: try rule-based parsers first. If they fail or produce a
 * low-confidence result, fall back to the AI parser (budget-gated). Returns
 * the better of the two.
 *
 * The result keeps the standard ParseResult shape — callers cannot tell
 * whether the AI was involved. That is intentional: the UI must treat
 * AI-derived rows identically to rule-derived rows.
 */
export async function detectAndParseWithAi(
  email: GmailMessage,
  opts: DetectWithAiOptions
): Promise<ParseResult> {
  const ruleResult = detectAndParse(email)
  const ruleTx = ruleResult.transaction
  const ruleStrong = !!ruleTx && ruleTx.confidence >= RULE_CONFIDENCE_FLOOR

  if (ruleStrong) return ruleResult

  const aiTx = await aiFallbackParse({
    supabase: opts.supabase,
    userId: opts.userId,
    email,
    now: opts.now,
  })

  if (!aiTx) {
    // AI couldn't help — keep whatever the rule chain produced.
    return ruleResult
  }

  // If both produced something, keep the higher-confidence one. Otherwise
  // take whichever exists.
  if (ruleTx && ruleTx.confidence >= aiTx.confidence) return ruleResult

  return { transaction: aiTx, error: null, bank: aiTx.bank }
}

export function registerParser(parser: BankParser): void {
  PARSER_REGISTRY.push(parser)
}
