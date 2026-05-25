import { describe, it, expect, beforeEach } from 'vitest'
import type { BankParser, GmailMessage, ParsedTransaction } from '@/types/parser'

function makeEmail(overrides: Partial<GmailMessage> = {}): GmailMessage {
  return {
    id: 'msg-001',
    threadId: 'thread-001',
    subject: 'Test',
    from: 'bank@example.com',
    body: 'test body',
    date: '2024-01-15T10:30:00+07:00',
    snippet: 'test snippet',
    ...overrides,
  }
}

function makeParsedTransaction(overrides: Partial<ParsedTransaction> = {}): ParsedTransaction {
  return {
    amount: 150000,
    type: 'expense',
    merchant_name: 'Test Merchant',
    description: null,
    payment_method: 'transfer',
    transacted_at: new Date('2024-01-15T10:30:00+07:00'),
    reference_number: null,
    raw_email_id: 'msg-001',
    raw_snippet: 'test snippet',
    confidence: 0.95,
    bank: 'test-bank',
    ...overrides,
  }
}

// ─── detectAndParse ────────────────────────────────────────────────────────────

describe('detectAndParse', () => {
  // Use a fresh module import to avoid pollution between tests
  beforeEach(async () => {
    // We need to isolate the registry state; use dynamic import inside each test
  })

  it('returns error result when registry is empty', async () => {
    // Import the function (PARSER_REGISTRY starts empty)
    const { detectAndParse, PARSER_REGISTRY } = await import('@/lib/gmail/parsers/index')
    // Ensure registry is empty for this test
    PARSER_REGISTRY.length = 0

    const result = detectAndParse(makeEmail())
    expect(result.transaction).toBeNull()
    expect(result.bank).toBeNull()
    expect(result.error).toBe('No parser found for this email')
  })

  it('uses the first parser whose canParse returns true', async () => {
    const { detectAndParse, PARSER_REGISTRY } = await import('@/lib/gmail/parsers/index')
    PARSER_REGISTRY.length = 0

    const mockTx = makeParsedTransaction()
    const parserA: BankParser = {
      name: 'parser-a',
      canParse: () => false,
      parse: () => null,
    }
    const parserB: BankParser = {
      name: 'parser-b',
      canParse: () => true,
      parse: () => mockTx,
    }
    PARSER_REGISTRY.push(parserA, parserB)

    const result = detectAndParse(makeEmail())
    expect(result.bank).toBe('parser-b')
    expect(result.transaction).toEqual(mockTx)
    expect(result.error).toBeNull()
  })

  it('does not use a parser whose canParse returns false', async () => {
    const { detectAndParse, PARSER_REGISTRY } = await import('@/lib/gmail/parsers/index')
    PARSER_REGISTRY.length = 0

    const neverParser: BankParser = {
      name: 'never-parser',
      canParse: () => false,
      parse: () => makeParsedTransaction(),
    }
    PARSER_REGISTRY.push(neverParser)

    const result = detectAndParse(makeEmail())
    expect(result.bank).toBeNull()
    expect(result.transaction).toBeNull()
  })

  it('catches errors thrown by parser.parse() and returns error result', async () => {
    const { detectAndParse, PARSER_REGISTRY } = await import('@/lib/gmail/parsers/index')
    PARSER_REGISTRY.length = 0

    const errorParser: BankParser = {
      name: 'error-parser',
      canParse: () => true,
      parse: () => { throw new Error('Parse failed unexpectedly') },
    }
    PARSER_REGISTRY.push(errorParser)

    const result = detectAndParse(makeEmail())
    expect(result.transaction).toBeNull()
    expect(result.bank).toBe('error-parser')
    expect(result.error).toContain('Parse failed unexpectedly')
  })

  it('registerParser adds parser to registry', async () => {
    const { registerParser, PARSER_REGISTRY } = await import('@/lib/gmail/parsers/index')
    PARSER_REGISTRY.length = 0

    const newParser: BankParser = {
      name: 'new-parser',
      canParse: () => false,
      parse: () => null,
    }
    registerParser(newParser)
    expect(PARSER_REGISTRY).toContain(newParser)
    expect(PARSER_REGISTRY.length).toBe(1)
  })
})
