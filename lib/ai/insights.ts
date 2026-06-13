// AI insights — Bahasa Indonesia, daily-cached. Never sends raw user data;
// only aggregated monthly summaries. Caller (Inngest job) is responsible for
// gating execution and persisting to the ai_insights table.
import { GoogleGenerativeAI } from '@google/generative-ai'

const MODEL_NAME = 'gemini-2.5-flash'
const TIMEOUT_MS = 8_000
const MAX_INSIGHTS = 3
const MAX_INSIGHT_LENGTH = 200

export interface InsightsTotals {
  income: number
  expense: number
}

export interface InsightsContext {
  monthLabel: string       // e.g. "Juni 2026" (WIB)
  prevMonthLabel: string   // e.g. "Mei 2026"
  totals: InsightsTotals
  prevTotals: InsightsTotals
  topCategories: { name: string; amount: number }[]
  topMerchants: { name: string; amount: number; count: number }[]
}

export function buildInsightsPrompt(ctx: InsightsContext): string {
  const fmt = (n: number) => `Rp ${n.toLocaleString('id-ID')}`
  const cats = ctx.topCategories
    .slice(0, 5)
    .map((c) => `- ${c.name}: ${fmt(c.amount)}`)
    .join('\n') || '(belum ada data kategori)'
  const merchants = ctx.topMerchants
    .slice(0, 5)
    .map((m) => `- ${m.name} (${m.count}× transaksi): ${fmt(m.amount)}`)
    .join('\n') || '(belum ada data merchant)'

  return `Kamu adalah asisten keuangan personal untuk pengguna Indonesia.
Tugasmu: berikan maksimal 3 wawasan finansial yang actionable, dalam Bahasa Indonesia santai dan mudah dimengerti. Hindari jargon. Setiap wawasan satu kalimat (maksimal 25 kata).

Data pengeluaran (kalender WIB):

Bulan ini (${ctx.monthLabel}):
- Pemasukan: ${fmt(ctx.totals.income)}
- Pengeluaran: ${fmt(ctx.totals.expense)}

Bulan lalu (${ctx.prevMonthLabel}):
- Pemasukan: ${fmt(ctx.prevTotals.income)}
- Pengeluaran: ${fmt(ctx.prevTotals.expense)}

Kategori pengeluaran terbesar bulan ini:
${cats}

Merchant paling sering bulan ini:
${merchants}

Format jawaban: JSON array berisi 1 sampai 3 string Bahasa Indonesia. TIDAK ada teks lain di luar JSON, tidak ada penjelasan, tidak ada markdown.

Contoh: ["Pengeluaran kategori X kamu naik 20% dari bulan lalu.", "Kamu transaksi di Y sebanyak 5 kali bulan ini — total Rp 250.000."]`
}

export function parseInsights(raw: string): string[] | null {
  if (!raw) return null
  // Strip common markdown wrappers
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim()

  // Find first JSON array
  const match = cleaned.match(/\[[\s\S]*\]/)
  if (!match) return null

  let parsed: unknown
  try {
    parsed = JSON.parse(match[0])
  } catch {
    return null
  }
  if (!Array.isArray(parsed) || parsed.length === 0) return null

  const valid: string[] = []
  for (const entry of parsed) {
    if (typeof entry !== 'string') continue
    const trimmed = entry.trim()
    if (!trimmed) continue
    if (trimmed.length > MAX_INSIGHT_LENGTH) continue
    valid.push(trimmed)
    if (valid.length >= MAX_INSIGHTS) break
  }
  return valid.length > 0 ? valid : null
}

export async function generateInsights(
  ctx: InsightsContext
): Promise<{ insights: string[]; model: string } | null> {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not set')
  }

  const client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  const model = client.getGenerativeModel({ model: MODEL_NAME })
  const prompt = buildInsightsPrompt(ctx)

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const response = await model.generateContent(prompt)
    clearTimeout(timeoutId)
    const text = response.response.text()
    const insights = parseInsights(text)
    if (!insights) return null
    return { insights, model: MODEL_NAME }
  } catch (error) {
    const errorId = `ERR_${Date.now()}_${Math.random().toString(36).substring(7)}`
    const message = error instanceof Error ? error.message : 'unknown'
    console.error(`[Insights Error] ID: ${errorId}, Message: ${message}`)
    return null
  } finally {
    clearTimeout(timeoutId)
  }
}
