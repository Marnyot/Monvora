# MONVORA — Architecture Document
> Defines system architecture, layer responsibilities, and technical decisions
> Referenced from: master.md, CLAUDE.md

---

## DOCUMENT VERSION HISTORY

| Version | Date | Updated By | Changes |
|---|---|---|---|
| v1 | May 24, 2026 | Claude | Initial creation |

**Current Version:** v1
**Last Updated:** May 24, 2026

---

## TABLE OF CONTENTS

1. [Architecture Overview](#1-architecture-overview)
2. [Layer Breakdown](#2-layer-breakdown)
3. [Directory Structure](#3-directory-structure)
4. [Data Flow Diagrams](#4-data-flow-diagrams)
5. [Database Architecture](#5-database-architecture)
6. [Authentication Architecture](#6-authentication-architecture)
7. [Background Job Architecture](#7-background-job-architecture)
8. [Parser Architecture](#8-parser-architecture)
9. [AI Architecture](#9-ai-architecture)
10. [Frontend Architecture](#10-frontend-architecture)
11. [Error Handling Architecture](#11-error-handling-architecture)
12. [Scalability Considerations](#12-scalability-considerations)

---

## 1. ARCHITECTURE OVERVIEW

### Philosophy
Monvora menggunakan arsitektur **layered monolith** — satu aplikasi Next.js yang dibagi menjadi layer-layer dengan tanggung jawab yang jelas. Ini bukan microservices, dan memang tidak perlu untuk skala MVP.

Keputusan ini disengaja:
- Solo developer → microservices terlalu banyak overhead operasional
- Monolith yang terstruktur baik lebih mudah di-debug dan di-maintain
- Bisa dipecah jadi microservices nanti kalau memang dibutuhkan

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         PRESENTATION LAYER                      │
│                     Next.js App Router (PWA)                    │
│   Dashboard │ Transactions │ Analytics │ Budgets │ Settings     │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTP / Server Actions
┌────────────────────────────▼────────────────────────────────────┐
│                          API LAYER                              │
│                     Next.js API Routes                          │
│         Auth Guard → Zod Validation → Business Logic           │
└──────┬──────────────────┬──────────────────────┬───────────────┘
       │                  │                      │
┌──────▼──────┐  ┌────────▼────────┐  ┌──────────▼──────────┐
│  SYNC LAYER │  │  PARSING LAYER  │  │    AI LAYER         │
│             │  │                 │  │                     │
│ Inngest     │  │ Universal Bank  │  │ Rule-based engine   │
│ Background  │  │ Parser          │  │ → Gemini API        │
│ Jobs        │  │ + Zod Validator │  │ (Bahasa Indonesia)  │
└──────┬──────┘  └────────┬────────┘  └──────────┬──────────┘
       │                  │                       │
┌──────▼──────────────────▼───────────────────────▼──────────────┐
│                       PERSISTENCE LAYER                         │
│                    Supabase (PostgreSQL)                        │
│              Row Level Security enforced on all tables          │
└─────────────────────────────────────────────────────────────────┘
                             │
              ┌──────────────▼──────────────┐
              │        EXTERNAL APIS        │
              │  Gmail API │ Gemini API     │
              └─────────────────────────────┘
```

### Prinsip Arsitektur
1. **Read-only data boleh client-direct Supabase** — hook read-only (dashboard, transactions, wallets, categories, analytics, budgets, transaction-detail) query Supabase langsung dari browser dengan filter `user_id` eksplisit + RLS aktif. Mutasi & operasi sensitif tetap lewat API route. Lihat **ADR-025**.
2. **Setiap layer punya satu tanggung jawab** — API layer tidak parse email, parsing layer tidak kategorikan transaksi
3. **External calls (Gmail OAuth, Gemini) selalu di server** — token Gmail tidak pernah di-expose ke client
4. **RLS bukan satu-satunya guard, tapi authoritative guard** — semua client-direct query WAJIB punya `.eq('user_id', user.id)` eksplisit sebagai defense in depth (security.md §4), RLS yang enforce
5. **Fail safe over fail open** — kalau parsing gagal, transaksi tidak disimpan. Lebih baik tidak ada data daripada data salah

---

## 2. LAYER BREAKDOWN

### Presentation Layer
**Teknologi:** Next.js 14 App Router, React, Tailwind CSS, shadcn/ui, next-themes

**Tanggung jawab:**
- Render UI dan handle interaksi user
- Optimistic updates untuk quick entry
- Client-side state management (Zustand)
- Server state caching (TanStack Query)
- Theme management (light/dark/system)

**Yang BOLEH dilakukan (per ADR-025):**
- Query Supabase langsung dari hook read-only untuk path display data, dengan filter `user_id` eksplisit + RLS aktif
- Hook yang sudah pakai pattern ini: `useDashboard`, `useTransactions`, `useWallets`, `useCategories`, `useTransactionDetail`, `useAnalytics`, `useBudgets`, `useGmailSettings`

**Yang TIDAK boleh dilakukan:**
- Mutasi (insert/update/delete) langsung dari client — selalu lewat API route untuk validasi + rate limit
- Akses tabel yang punya logic complex (mis. `gmail_ai_usage_daily` — service-role only)
- Menyimpan token atau secret apapun
- Memanggil Gmail API atau Gemini API langsung dari browser (perantara API route / Inngest job)

---

### API Layer
**Teknologi:** Next.js API Routes, Zod

**Tanggung jawab:**
- Session validation di setiap route
- Input validation dengan Zod schema
- Business logic (kalkulasi balance, aggregasi data)
- Rate limiting per user per endpoint
- Error response yang user-friendly

**Pola wajib setiap route:**
```typescript
// 1. Validasi session
const session = await getSession()
if (!session) return unauthorized()

// 2. Validasi input
const parsed = schema.safeParse(body)
if (!parsed.success) return badRequest()

// 3. Business logic dengan user_id dari session (bukan dari input)
const result = await doSomething(session.user.id, parsed.data)

// 4. Return response
return Response.json(result)
```

---

### Sync Layer
**Teknologi:** Inngest

**Tanggung jawab:**
- Polling Gmail setiap 15 menit per user aktif
- Retry logic untuk failed jobs (max 3x, exponential backoff)
- Logging setiap sync operation ke `gmail_sync_logs`
- Update `gmail_sync_token` (historyId) setelah sync berhasil

**Yang TIDAK boleh dilakukan:**
- Direct database writes tanpa validasi Zod terlebih dahulu
- Silent failure — setiap error harus di-log

---

### Parsing Layer
**Teknologi:** Custom TypeScript parser per bank, Zod

**Tanggung jawab:**
- Deteksi bank pengirim dari email sender + subject pattern
- Ekstraksi data: nominal, merchant, tanggal, metode pembayaran, referensi
- Validasi hasil parsing dengan Zod
- Assign confidence score (0.0–1.0)
- Duplicate check via `raw_email_id`

**Yang TIDAK boleh dilakukan:**
- Insert langsung ke database — kembalikan `ParsedTransaction` object, biarkan API layer yang insert
- Asumsi format email tidak akan berubah — selalu wrap parsing dalam try/catch

---

### AI Layer
**Teknologi:** Gemini API (gemini-2.5-flash), Rule-based engine

**Tanggung jawab:**
- Kategorisasi transaksi otomatis (`lib/ai/gemini.ts`)
- Generate AI insights harian dalam Bahasa Indonesia (`lib/ai/insights.ts`)
- OCR struk via Gemini Vision (`lib/ai/ocr-vision.ts`) — menggantikan Tesseract.js sejak Jun 2026
- Gmail email parser fallback (`lib/ai/email-parser.ts`) — invisible dari UI, lihat ADR-026
- Rule-based fallback ketika Gemini tidak tersedia / over budget

**Yang TIDAK boleh dilakukan:**
- Panggil Gemini untuk setiap transaksi tanpa coba rule-based dulu
- Simpan raw Gemini response ke database tanpa sanitasi

---

### Persistence Layer
**Teknologi:** Supabase (PostgreSQL), Row Level Security

**Tanggung jawab:**
- Penyimpanan semua data
- Row Level Security enforcement
- Real-time subscriptions (opsional, Phase 3)

**Yang TIDAK boleh dilakukan:**
- Hard delete pada data finansial apapun
- Store floating point untuk nominal uang (selalu integer IDR)
- Disable RLS bahkan untuk testing

---

## 3. DIRECTORY STRUCTURE

```
monvora/
│
├── app/                              # Next.js App Router
│   ├── (auth)/                       # Route group: halaman auth
│   │   ├── login/
│   │   │   └── page.tsx              # Halaman login
│   │   └── callback/
│   │       └── route.ts              # OAuth callback handler
│   │
│   ├── (dashboard)/                  # Route group: halaman protected
│   │   ├── layout.tsx                # Layout dengan nav + auth guard
│   │   ├── page.tsx                  # Dashboard utama
│   │   ├── transactions/
│   │   │   ├── page.tsx              # Transaction list
│   │   │   └── [id]/
│   │   │       └── page.tsx          # Transaction detail + edit
│   │   ├── analytics/
│   │   │   └── page.tsx
│   │   ├── budgets/
│   │   │   └── page.tsx
│   │   ├── wallets/
│   │   │   └── page.tsx
│   │   └── settings/
│   │       ├── page.tsx              # Settings utama
│   │       └── gmail/
│   │           └── page.tsx          # Gmail sync settings
│   │
│   ├── api/                          # API Routes
│   │   ├── auth/
│   │   │   └── callback/
│   │   │       └── route.ts
│   │   ├── transactions/
│   │   │   ├── route.ts              # GET (list) + POST (create)
│   │   │   └── [id]/
│   │   │       └── route.ts          # GET + PATCH + DELETE (soft)
│   │   ├── wallets/
│   │   │   ├── route.ts
│   │   │   └── [id]/
│   │   │       └── route.ts
│   │   ├── categories/
│   │   │   └── route.ts
│   │   ├── budgets/
│   │   │   ├── route.ts
│   │   │   └── [id]/
│   │   │       └── route.ts
│   │   ├── sync/
│   │   │   ├── gmail/
│   │   │   │   └── route.ts          # Trigger manual sync
│   │   │   └── status/
│   │   │       └── route.ts          # Get sync status + logs
│   │   ├── analytics/
│   │   │   └── route.ts
│   │   └── ocr/
│   │       └── route.ts
│   │
│   ├── layout.tsx                    # Root layout + ThemeProvider
│   └── globals.css
│
├── components/
│   ├── ui/                           # shadcn/ui components (jangan edit)
│   ├── dashboard/
│   │   ├── balance-card.tsx
│   │   ├── cashflow-summary.tsx
│   │   ├── recent-transactions.tsx
│   │   ├── spending-breakdown.tsx
│   │   └── sync-status-badge.tsx
│   ├── transactions/
│   │   ├── quick-entry-sheet.tsx     # Bottom sheet untuk quick entry
│   │   ├── quick-entry-form.tsx      # Form di dalam sheet
│   │   ├── transaction-list.tsx
│   │   ├── transaction-card.tsx
│   │   ├── transaction-filters.tsx
│   │   └── ocr-upload.tsx
│   ├── analytics/
│   │   ├── spending-trend-chart.tsx
│   │   ├── category-breakdown-chart.tsx
│   │   ├── merchant-ranking.tsx
│   │   └── ai-insights-card.tsx
│   ├── budgets/
│   │   ├── budget-card.tsx
│   │   └── budget-progress-bar.tsx
│   └── shared/
│       ├── nav-bottom.tsx            # Mobile bottom navigation
│       ├── nav-sidebar.tsx           # Desktop sidebar
│       ├── theme-toggle.tsx          # Light/Dark/System toggle
│       ├── currency-display.tsx      # Format Rp X.XXX.XXX
│       ├── empty-state.tsx           # Reusable empty state
│       ├── skeleton-card.tsx         # Loading skeleton
│       └── confirm-dialog.tsx        # Konfirmasi sebelum delete
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts                 # Browser Supabase client
│   │   ├── server.ts                 # Server Supabase client
│   │   └── middleware.ts             # Session refresh middleware
│   │
│   ├── gmail/
│   │   ├── client.ts                 # Gmail API wrapper + token management
│   │   ├── sync.ts                   # Sync orchestration logic
│   │   └── parsers/
│   │       ├── index.ts              # Parser registry + auto-detection
│   │       ├── base.ts               # Base parser interface
│   │       ├── mandiri.ts            # Mandiri parser (prioritas 1)
│   │       ├── bca.ts                # BCA parser
│   │       ├── bni.ts                # BNI parser
│   │       ├── bri.ts                # BRI parser
│   │       ├── cimb.ts               # CIMB parser
│   │       └── generic.ts            # Generic fallback parser
│   │
│   ├── ai/
│   │   ├── gemini.ts                 # Gemini API client
│   │   ├── categorize.ts             # Orchestration: rules → gemini → fallback
│   │   ├── rules.ts                  # Rule-based categorization patterns
│   │   └── insights.ts               # Daily insights generator (Bahasa Indonesia)
│   │
│   ├── inngest/
│   │   ├── client.ts                 # Inngest client
│   │   └── functions/
│   │       ├── gmail-sync.ts         # Main sync job
│   │       └── insights-generate.ts  # Daily insights job
│   │
│   ├── validations/
│   │   ├── transaction.ts            # Zod: create, update, parsed
│   │   ├── wallet.ts
│   │   ├── budget.ts
│   │   ├── category.ts
│   │   └── profile.ts
│   │
│   └── utils/
│       ├── currency.ts               # Format Rp X.XXX (titik sebagai separator)
│       ├── date.ts                   # Date formatting + timezone (Asia/Jakarta)
│       ├── errors.ts                 # Error types + helpers
│       └── rate-limit.ts             # Simple rate limiter
│
├── hooks/
│   ├── use-transactions.ts           # TanStack Query hooks
│   ├── use-wallets.ts
│   ├── use-budgets.ts
│   ├── use-categories.ts
│   ├── use-analytics.ts
│   └── use-sync-status.ts
│
├── stores/
│   ├── quick-entry-store.ts          # Zustand: quick entry state
│   └── ui-store.ts                   # Zustand: global UI state (modal, sheet)
│
├── types/
│   ├── database.ts                   # Generated dari Supabase (jangan edit manual)
│   ├── transaction.ts                # App-level transaction types
│   ├── wallet.ts
│   ├── parser.ts                     # ParsedTransaction, ParserResult
│   └── api.ts                        # API request/response types
│
├── inngest.ts                        # Inngest client export (root level)
├── middleware.ts                     # Next.js middleware: auth guard semua route (dashboard)
├── .env.local                        # TIDAK di-commit ke git
├── .env.example                      # Template — di-commit ke git
│
└── supabase/
    └── migrations/
        ├── 001_initial_schema.sql    # Semua tabel + RLS policies
        └── 002_seed_categories.sql   # Default categories
```

---

## 4. DATA FLOW DIAGRAMS

### Flow 1: Manual Transaction Entry

```
User input nominal + kategori + method
        │
        ▼
Quick Entry Form (client)
  - Optimistic update: transaksi langsung tampil di UI
  - State: Zustand quick-entry-store
        │
        ▼ POST /api/transactions
API Route: /api/transactions
  - getSession() → unauthorized jika tidak ada session
  - createTransactionSchema.safeParse(body)
  - Insert ke Supabase dengan user_id dari session
        │
        ├── SUCCESS → TanStack Query invalidate → UI confirmed
        └── GAGAL   → Rollback optimistic update → toast error
```

---

### Flow 2: Gmail Auto-Sync

```
Inngest Cron (setiap 15 menit)
        │
        ▼
Fetch users: gmail_sync_enabled = true
        │
        ▼ (paralel per user)
Gmail API: history.list sejak historyId terakhir
        │
        ▼
Filter: sender cocok dengan pola bank yang dikenal?
        │
        ├── TIDAK → skip
        └── YA    →
                  │
                  ▼
        Cek duplikat: raw_email_id sudah ada?
                  │
                  ├── SUDAH → skip (idempoten)
                  └── BELUM →
                            │
                            ▼
                  Bank Parser (auto-detect bank)
                  Extract: amount, merchant, date, method, ref
                            │
                            ▼
                  Zod validation
                            │
                  ├── INVALID → log error, skip
                  └── VALID  →
                            │
                            ▼
                  AI Categorization
                  (rule-based → gemini → fallback)
                            │
                            ▼
                  Insert ke transactions
                  confidence < 0.7 → is_verified: false
                            │
                            ▼
                  Update gmail_sync_token (historyId baru)
                  Update gmail_sync_logs
```

---

### Flow 3: OCR Screenshot

```
User upload screenshot e-wallet
        │
        ▼
Tesseract.js (CLIENT-SIDE, tidak upload ke server)
Extract semua teks dari gambar
        │
        ▼
Parsing engine: cari pola nominal + tanggal + merchant
        │
        ▼
Pre-fill Quick Entry Form
        │
        ▼
USER REVIEW DAN KONFIRMASI
        │
        ▼
Lanjut ke Flow 1 (Manual Transaction Entry)
source: 'ocr'
```

---

### Flow 4: Analytics Request

```
User buka halaman Analytics
        │
        ▼
TanStack Query: check cache
        │
        ├── CACHE HIT (< 5 menit) → render langsung
        └── CACHE MISS →
                  │
                  ▼
          GET /api/analytics?period=monthly
                  │
                  ▼
          Supabase aggregation queries:
          - SUM(amount) GROUP BY category
          - SUM(amount) GROUP BY month (6 bulan)
          - COUNT + SUM GROUP BY merchant (top 5)
                  │
                  ▼
          AI Insights: sudah di-generate hari ini?
                  │
                  ├── YA  → return cached insights
                  └── TIDAK →
                            │
                            ▼
                    Gemini: generate insights
                    Bahasa Indonesia
                    Cache hasil (valid 24 jam)
                  │
                  ▼
          Return semua data ke frontend
          TanStack Query simpan ke cache
```

---

## 5. DATABASE ARCHITECTURE

### Design Decisions

| Keputusan | Pilihan | Alasan |
|---|---|---|
| Database engine | PostgreSQL via Supabase | Relational, ACID, mature |
| Primary keys | UUID | Tidak expose sequential ID ke client |
| Nominal uang | INTEGER (IDR) | Tidak ada floating point untuk uang |
| Delete strategy | Soft delete (deleted_at) | Data finansial tidak boleh hilang permanen |
| Access control | Row Level Security | Enforced di database level, bukan hanya application |
| Timestamps | TIMESTAMPTZ | Timezone-aware, server default Asia/Jakarta |

### Entity Relationships

```
profiles (1) ──────── (many) wallets
profiles (1) ──────── (many) transactions
profiles (1) ──────── (many) categories (custom)
profiles (1) ──────── (many) budgets
profiles (1) ──────── (many) gmail_sync_logs

wallets (1) ─────────── (many) transactions
categories (1) ──────── (many) transactions
categories (1) ──────── (many) budgets

system categories (user_id = NULL) ── (many) transactions
```

### Index Strategy

```sql
-- Query paling sering: transaksi user sorted by date
CREATE INDEX idx_transactions_user_date
  ON transactions(user_id, transacted_at DESC);

-- Filter by category
CREATE INDEX idx_transactions_user_category
  ON transactions(user_id, category_id);

-- Duplicate check Gmail
CREATE INDEX idx_transactions_gmail_id
  ON transactions(raw_email_id)
  WHERE raw_email_id IS NOT NULL;

-- Soft delete filter
CREATE INDEX idx_transactions_not_deleted
  ON transactions(user_id)
  WHERE deleted_at IS NULL;
```

### RLS Policy Summary

| Tabel | Policy |
|---|---|
| profiles | SELECT + UPDATE hanya milik sendiri |
| wallets | ALL operations hanya milik sendiri |
| categories | SELECT sistem (user_id NULL) + milik sendiri. INSERT/UPDATE/DELETE hanya milik sendiri |
| transactions | ALL operations hanya milik sendiri |
| gmail_sync_logs | SELECT hanya milik sendiri |
| budgets | ALL operations hanya milik sendiri |

---

## 6. AUTHENTICATION ARCHITECTURE

### Flow Diagram

```
Browser → /login
        │
        ▼
Supabase Auth: signInWithOAuth({ provider: 'google' })
Scopes: openid, email, profile, gmail.readonly
        │
        ▼
Google OAuth Consent Screen
        │
        ▼
Redirect ke /auth/callback?code=xxx
        │
        ▼
/auth/callback route.ts (server-side)
  - exchangeCodeForSession(code)
  - Session disimpan di httpOnly cookie (Supabase handle)
  - Check: profiles record sudah ada?
        │
        ├── BELUM → INSERT profiles → redirect /onboarding
        └── SUDAH → redirect /dashboard
```

### Session Management

```
Session storage  : httpOnly cookie (Supabase SSR)
Session duration : 1 jam access token, 1 minggu refresh token
Auto-refresh     : Supabase middleware handle di setiap request
Expiry handling  : Redirect ke /login, clear cookie
```

### Middleware Guard

```typescript
// middleware.ts — jalan di setiap request
export async function middleware(request: NextRequest) {
  // Refresh session kalau hampir expired
  const { supabase, response } = createMiddlewareClient(request)
  const { data: { session } } = await supabase.auth.getSession()

  // Protected routes: semua path di bawah /(dashboard)/
  if (!session && request.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Kalau sudah login, jangan bisa akses /login lagi
  if (session && request.nextUrl.pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return response
}
```

---

## 7. BACKGROUND JOB ARCHITECTURE

### Inngest Setup

```typescript
// inngest.ts (root level)
export const inngest = new Inngest({ id: 'monvora' })

// Dua jobs utama:
// 1. gmail-sync     → setiap 15 menit
// 2. daily-insights → sekali sehari jam 07:00 WIB
```

### Job: gmail-sync

```
Schedule  : */15 * * * * (setiap 15 menit)
Timeout   : 5 menit per eksekusi
Retries   : 3x dengan exponential backoff
Concurrency: maksimal 10 user diproses paralel
```

**Error scenarios dan handling:**

| Error | Handling |
|---|---|
| Gmail token expired | Refresh token → lanjut. Gagal refresh → disable sync user |
| Gmail API rate limit | Inngest retry otomatis |
| Parse error 1 email | Skip email itu, lanjut berikutnya, log error |
| Database error | Rollback, log ke gmail_sync_logs status: 'failed' |
| Gemini timeout | Gunakan rule-based fallback |

### Job: daily-insights

```
Schedule  : 0 0 * * * (jam 00:00 UTC = 07:00 WIB)
Timeout   : 2 menit
Retries   : 2x
```

Generates Bahasa Indonesia insights per user dan cache ke database.

---

## 8. PARSER ARCHITECTURE

### Universal Detection Strategy

Tidak ada list bank yang hardcoded di level atas. Setiap parser mendaftarkan dirinya ke **Parser Registry** dengan kriteria deteksi masing-masing.

```typescript
// lib/gmail/parsers/index.ts

interface BankParser {
  name: string
  canParse: (email: GmailMessage) => boolean  // kriteria deteksi
  parse: (email: GmailMessage) => ParsedTransaction | null
}

const PARSER_REGISTRY: BankParser[] = [
  mandiriParser,
  bcaParser,
  bniParser,
  briParser,
  cimbParser,
  genericParser,  // fallback: coba parse format umum
]

export function detectAndParse(email: GmailMessage): ParsedTransaction | null {
  for (const parser of PARSER_REGISTRY) {
    if (parser.canParse(email)) {
      return parser.parse(email)
    }
  }
  return null  // tidak ada parser yang cocok
}
```

### Menambah Bank Baru

Untuk menambah bank baru, cukup:
1. Buat file `lib/gmail/parsers/[nama-bank].ts`
2. Implementasi `BankParser` interface
3. Daftarkan ke `PARSER_REGISTRY` di `index.ts`

Tidak perlu ubah kode di tempat lain.

### ParsedTransaction Interface

```typescript
interface ParsedTransaction {
  amount: number           // IDR integer, selalu positif
  type: 'expense' | 'income' | 'transfer'
  merchant_name: string | null
  description: string | null
  payment_method: 'qris' | 'transfer' | 'debit' | 'credit' | 'other'
  transacted_at: Date
  reference_number: string | null
  raw_email_id: string     // Gmail message ID
  raw_snippet: string      // teks asli untuk debugging
  confidence: number       // 0.0 – 1.0
  bank: string             // nama bank yang parse
}
```

### Confidence Score Logic

| Score | Artinya | Handling |
|---|---|---|
| 0.9 – 1.0 | Semua field berhasil di-extract | `is_verified: true`, langsung simpan |
| 0.7 – 0.89 | Sebagian besar field berhasil | `is_verified: true`, simpan |
| 0.5 – 0.69 | Banyak field missing atau ambigu | `is_verified: false`, user perlu konfirmasi |
| < 0.5 | Parsing hampir gagal | `is_verified: false`, tandai untuk review |

---

## 9. AI ARCHITECTURE

### Categorization Pipeline

```
Input: merchant_name + description + amount + payment_method
        │
        ▼
Step 1: Rule-based engine
  - Loop CATEGORIZATION_RULES array
  - Regex match terhadap merchant + description
  - Jika confidence >= 0.9 → return hasil, STOP
        │
        ▼ (hanya jika rule-based < 0.9)
Step 2: Gemini API
  - Model: gemini-2.5-flash (gratis untuk free tier RPM/RPD limit)
  - Prompt dalam Bahasa Indonesia
  - Response: JSON { category, confidence, reasoning }
  - Timeout: 5 detik
        │
        ├── SUCCESS → return hasil Gemini
        └── GAGAL (timeout/rate limit/error) →
                  │
                  ▼
        Step 3: Fallback
        Return hasil rule-based (meski confidence rendah)
        atau category: 'Other', confidence: 0.3
```

### Gemini Prompt Template

```
Kamu adalah sistem kategorisasi transaksi keuangan untuk pengguna Indonesia.
Berikan respons HANYA dalam format JSON, tanpa teks lain.

Data transaksi:
- Merchant: {merchant_name}
- Deskripsi: {description}
- Nominal: Rp {amount}
- Metode: {payment_method}

Kategori yang tersedia: {categories}

Format respons (JSON saja, tidak ada teks lain):
{
  "category": "Food & Beverage",
  "confidence": 0.95,
  "reasoning": "Mixue adalah jaringan minuman"
}
```

### AI Insights (Bahasa Indonesia)

```typescript
// Dijalankan sekali sehari via Inngest
// Output disimpan ke database, bukan di-generate per request

const INSIGHTS_PROMPT = `
Kamu adalah asisten keuangan personal untuk pengguna Indonesia.
Analisis data pengeluaran berikut dan berikan maksimal 3 insight 
yang actionable dalam Bahasa Indonesia yang santai dan mudah dimengerti.

Data bulan ini vs bulan lalu:
{spending_summary}

Format respons (JSON array):
[
  "Pengeluaran makananmu naik 35% dibanding bulan lalu.",
  "Kamu punya 3 langganan rutin totalnya Rp 150.000 per bulan.",
  "Hari Jumat adalah hari paling boros kamu minggu ini."
]
`
```

---

## 10. FRONTEND ARCHITECTURE

### State Management Strategy

```
Server State (data dari database)
└── TanStack Query (React Query)
    - Caching otomatis
    - Background refetch
    - Optimistic updates
    - Stale-while-revalidate

Client State (UI state, form state)
└── Zustand
    - Quick entry form state
    - Global UI state (sheet open/close, modal)
    - Tidak untuk menyimpan data dari server
```

### Rendering Strategy per Halaman

| Halaman | Rendering | Alasan |
|---|---|---|
| /login | Static | Tidak butuh data |
| /dashboard | Server Component + Client hydration | SEO tidak penting, tapi initial data dari server lebih aman |
| /transactions | Client Component | Filter/search interaktif |
| /analytics | Client Component | Chart interaktif |
| /settings | Client Component | Form interaktif |

### Theme Architecture

```typescript
// Root layout
<ThemeProvider
  attribute="class"
  defaultTheme="system"      // ikuti preferensi device
  enableSystem={true}
  disableTransitionOnChange  // no flash saat switch
>

// Tailwind config
darkMode: 'class'            // next-themes inject class 'dark' ke <html>

// Komponen selalu gunakan semantic Tailwind classes
// BENAR:  className="bg-background text-foreground"
// SALAH:  style={{ backgroundColor: '#fff' }}
```

### Component Hierarchy

```
RootLayout (ThemeProvider, QueryProvider)
│
├── AuthLayout (redirect jika sudah login)
│   └── LoginPage
│
└── DashboardLayout (auth guard, nav)
    ├── NavSidebar (desktop)
    ├── NavBottom (mobile)
    │
    ├── DashboardPage
    │   ├── BalanceCard
    │   ├── CashflowSummary
    │   ├── RecentTransactions
    │   ├── SpendingBreakdown
    │   └── SyncStatusBadge
    │
    ├── TransactionsPage
    │   ├── TransactionFilters
    │   ├── TransactionList
    │   │   └── TransactionCard (× N)
    │   └── QuickEntrySheet (floating)
    │       └── QuickEntryForm
    │
    ├── AnalyticsPage
    │   ├── SpendingTrendChart
    │   ├── CategoryBreakdownChart
    │   ├── MerchantRanking
    │   └── AIInsightsCard
    │
    ├── BudgetsPage
    │   └── BudgetCard (× N)
    │       └── BudgetProgressBar
    │
    └── SettingsPage
        ├── ThemeToggle
        ├── WalletManagement
        ├── CategoryManagement
        └── GmailSyncSettings
```

---

## 11. ERROR HANDLING ARCHITECTURE

### Tiga Tingkat Error Handling

**Tingkat 1: Validation Error (input salah)**
```typescript
// Zod validation gagal → 400 Bad Request
return Response.json({
  error: 'Invalid input',
  details: parsed.error.flatten()
}, { status: 400 })
```

**Tingkat 2: Business Logic Error (operasi gagal)**
```typescript
// Contoh: wallet tidak ditemukan, budget sudah ada
return Response.json({
  error: 'Wallet not found'
}, { status: 404 })
```

**Tingkat 3: Unexpected Error (bug / external API gagal)**
```typescript
try {
  // operasi
} catch (error) {
  // Log error ID (bukan data sensitif)
  console.error('Unexpected error:', { errorId, userId: session.user.id })
  return Response.json({
    error: 'Something went wrong. Please try again.'
  }, { status: 500 })
}
```

### Frontend Error Boundaries

```
Setiap halaman utama harus punya error boundary:
- Error state dengan pesan user-friendly
- Tombol "Coba lagi" yang trigger refetch
- Tidak pernah tampilkan stack trace ke user
```

### Logging Rules

```
BOLEH di-log  : Error ID, user ID, endpoint, timestamp, status code
DILARANG log  : Nominal transaksi, nama merchant, nama user, email user
```

---

## 12. SCALABILITY CONSIDERATIONS

### Batasan MVP yang Disadari

| Aspek | Batasan Saat Ini | Solusi Jika Dibutuhkan |
|---|---|---|
| Inngest jobs | Semua user diproses satu per satu | Parallel processing dengan Inngest concurrency |
| Gemini rate limit | Free tier, terbatas | Upgrade ke paid tier atau queue requests |
| Supabase free tier | 500MB database, 2GB bandwidth | Upgrade plan |
| Parser coverage | 5 bank + generic fallback | Tambah parser baru via registry pattern |
| Analytics query | Real-time query setiap request | Materialized views atau pre-computed snapshots |

### Kapan Harus Khawatir

Arsitektur saat ini cukup untuk:
- Ratusan user aktif
- Ribuan transaksi per hari
- Puluhan sync job paralel

Perlu evaluasi ulang jika:
- Inngest jobs mulai timeout secara reguler
- Database query > 500ms secara konsisten
- Gemini rate limit terkena setiap hari

### Yang Tidak Perlu Dikhawatirkan Sekarang
- Microservices
- Kubernetes / container orchestration
- Sharding database
- CDN untuk API responses
- Message queue (Kafka, RabbitMQ)

> Optimisasi prematur adalah akar dari semua kejahatan engineering. — Donald Knuth

---

*Document maintained by: Solo Developer*
*Referenced from: master.md v2, product.md v2*
*Next review: After Phase 2 completion*
