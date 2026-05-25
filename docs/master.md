# MONVORA — Master Project Document
> Personal Finance Operating System for Indonesia
> Solo Developer Edition

---

## DOCUMENT VERSION HISTORY

| Version | Date | Updated By | Changes |
|---|---|---|---|
| v2 | May 24, 2026 | Claude | Switch npm → pnpm, add light/dark/system theme support, skip monorepo, add document versioning system |
| v1 | May 24, 2026 | Claude | Initial creation — full project blueprint |

**Current Version:** v2
**Last Updated:** May 24, 2026

---

## TABLE OF CONTENTS

1. [Project Overview](#1-project-overview)
2. [Core Principles](#2-core-principles)
3. [Tech Stack](#3-tech-stack)
4. [System Architecture](#4-system-architecture)
5. [Database Schema](#5-database-schema)
6. [Feature Specifications](#6-feature-specifications)
7. [Security Blueprint](#7-security-blueprint)
8. [Gmail Integration](#8-gmail-integration)
9. [AI Categorization](#9-ai-categorization)
10. [UI/UX Guidelines](#10-uiux-guidelines)
11. [Development Phases](#11-development-phases)
12. [Folder Structure](#12-folder-structure)
13. [Environment Variables](#13-environment-variables)
14. [Known Limitations & Future Roadmap](#14-known-limitations--future-roadmap)

---

## 1. PROJECT OVERVIEW

### What is Monvora?
Monvora is a web-based personal finance tracking platform designed specifically for Indonesian transaction habits. It automatically captures bank transactions via Gmail notification parsing, and provides a clean, intuitive dashboard for users who do not have a finance background.

### Problem it Solves
- Indonesian users have no unified view of their spending across multiple banks and e-wallets
- Existing apps are either too complex or not localized for Indonesian payment methods (QRIS, GoPay, ShopeePay, DANA, OVO)
- Manual tracking is tedious and unsustainable

### Core Value Proposition
> "Monvora reads your bank emails so you don't have to. Understand where your money goes — without being a finance expert."

### Target User (MVP)
- Primary: Developer himself (dogfooding)
- Secondary: Indonesian professionals aged 20–35 who use at least one bank + one e-wallet
- Assumption: User connects Gmail account that receives bank transaction notifications

---

## 2. CORE PRINCIPLES

### P1 — Security First, Always
Every feature decision must pass a security check before implementation. Financial data is sensitive. Never cut corners on auth, data access, or input validation.

### P2 — Simple Over Smart
Target users are not finance experts. Every UI element must be explainable without a tooltip. If a feature requires explanation, redesign it.

### P3 — Reliable Over Fast
A transaction recorded incorrectly is worse than no transaction recorded. Data integrity > speed of development.

### P4 — Iterative Over Complete
Ship a working Phase 1 before touching Phase 2. A complete Phase 1 is infinitely more valuable than an incomplete full system.

### P5 — English First, Extensible Later
All UI strings in English for MVP. i18n infrastructure added in Phase 3.

---

## 3. TECH STACK

### Package Manager
| Technology | Version | Purpose |
|---|---|---|
| pnpm | 10.x | Package manager — faster installs, strict dependency resolution, disk efficient |

### Frontend
| Technology | Version | Purpose |
|---|---|---|
| Next.js | 14 (App Router) | Framework |
| TypeScript | 5.x | Type safety — mandatory for financial data |
| Tailwind CSS | 3.x | Styling |
| shadcn/ui | Latest | Component library |
| next-themes | Latest | Light / dark / system theme management |
| Zustand | 4.x | Client state management |
| React Query (TanStack) | 5.x | Server state + caching |
| next-intl | 3.x | i18n (Phase 3 only) |

### Backend
| Technology | Purpose |
|---|---|
| Next.js API Routes | Business logic layer |
| Supabase | PostgreSQL + Auth + Storage + RLS |
| Inngest | Background jobs (Gmail sync) |
| Zod | Input validation — every API route |

### External APIs
| Service | Purpose | Tier |
|---|---|---|
| Google OAuth + Gmail API | Auth + email parsing | Free |
| Gemini API (gemini-1.5-flash) | Transaction categorization | Free tier |
| Tesseract.js | OCR for e-wallet screenshots | Free (client-side) |

### Hosting
| Service | Purpose |
|---|---|
| Vercel | Frontend + API Routes |
| Supabase Cloud | Database + Auth |
| Inngest Cloud | Background job orchestration |

### Why This Stack
- **pnpm over npm**: Faster install times, strict node_modules structure prevents phantom dependency bugs, saves disk space
- **Next.js App Router**: Server Components reduce data exposure to client — important for financial app
- **next-themes**: Handles light/dark/system theme with zero flash on load — works seamlessly with Tailwind dark mode
- **Supabase RLS**: Row Level Security enforced at database level, not just application level
- **Inngest over Vercel Cron**: Better retry logic, observability, and error handling for critical sync jobs
- **Zod**: Runtime type validation — TypeScript alone does not protect against malformed API responses or user input
- **Gemini free tier**: Sufficient for MVP volume. Rule-based fallback when limit is hit

---

## 4. SYSTEM ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────┐
│                        USER BROWSER                         │
│                    Next.js PWA Frontend                     │
│         Dashboard │ Quick Entry │ Analytics │ Settings      │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTPS only
┌──────────────────────────▼──────────────────────────────────┐
│                   NEXT.JS API ROUTES                        │
│         /api/auth │ /api/transactions │ /api/sync           │
│         /api/categories │ /api/analytics │ /api/ocr         │
│                                                             │
│   ┌─────────────┐  ┌──────────────┐  ┌─────────────────┐   │
│   │ Auth Layer  │  │ Validation   │  │  Rate Limiter   │   │
│   │ (session    │  │ (Zod schema  │  │  (per user,     │   │
│   │  check)     │  │  every route)│  │   per endpoint) │   │
│   └─────────────┘  └──────────────┘  └─────────────────┘   │
└──────────┬────────────────┬──────────────────┬──────────────┘
           │                │                  │
┌──────────▼──────┐ ┌───────▼────────┐ ┌───────▼──────────┐
│   SUPABASE      │ │    INNGEST     │ │   GEMINI API     │
│                 │ │                │ │                  │
│ PostgreSQL DB   │ │ Background     │ │ Transaction      │
│ Auth (Google    │ │ Jobs:          │ │ categorization   │
│  OAuth)         │ │ - Gmail sync   │ │                  │
│ Row Level       │ │ - Email parse  │ │ Fallback:        │
│ Security        │ │ - Categorize   │ │ Rule-based       │
│ Storage (OCR    │ │                │ │ classifier       │
│  uploads)       │ │                │ │                  │
└─────────────────┘ └───────┬────────┘ └──────────────────┘
                            │
                   ┌────────▼────────┐
                   │   GMAIL API     │
                   │                 │
                   │ Scope:          │
                   │ gmail.readonly  │
                   │ only            │
                   └─────────────────┘
```

### Data Flow: Automatic (Bank Transaction)
```
Bank sends email → Gmail inbox
→ Inngest job polls Gmail API (every 15 min)
→ Parsing engine extracts: amount, merchant, method, time
→ Zod validates extracted data
→ Gemini categorizes transaction
→ Saved to Supabase with RLS
→ Frontend dashboard updates via React Query invalidation
```

### Data Flow: Manual (E-wallet / Cash)
```
User opens quick entry
→ Fills: amount + category + payment method + optional note
→ Zod validates input
→ Saved to Supabase
→ Dashboard updates immediately (optimistic update)
```

### Data Flow: OCR Screenshot
```
User uploads screenshot
→ Tesseract.js processes client-side (no upload of raw image to server)
→ Extracted text sent to parsing engine
→ User confirms/corrects pre-filled form
→ Saved as manual transaction
```

---

## 5. DATABASE SCHEMA

### Design Principles
- All tables have RLS enabled — users can only access their own data
- UUIDs for all primary keys — never expose sequential IDs
- created_at and updated_at on every table
- Soft deletes (deleted_at) — never hard delete financial records
- All amounts stored as INTEGER in cents/rupiah (no floating point for money)

```sql
-- ============================================================
-- USERS (extends Supabase auth.users)
-- ============================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  currency TEXT DEFAULT 'IDR',
  timezone TEXT DEFAULT 'Asia/Jakarta',
  language TEXT DEFAULT 'en',
  gmail_sync_enabled BOOLEAN DEFAULT FALSE,
  gmail_last_synced_at TIMESTAMPTZ,
  gmail_sync_token TEXT, -- encrypted, stores Gmail historyId
  onboarding_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- WALLETS (bank accounts, e-wallets, cash)
-- ============================================================
CREATE TABLE public.wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- e.g. "Mandiri Main", "GoPay", "Cash"
  type TEXT NOT NULL CHECK (type IN ('bank', 'ewallet', 'cash', 'other')),
  provider TEXT, -- e.g. "mandiri", "bca", "bni", "gopay", "shopee"
  balance INTEGER DEFAULT 0, -- in IDR (rupiah), not decimal
  color TEXT DEFAULT '#6366f1', -- for UI display
  icon TEXT, -- icon identifier
  is_active BOOLEAN DEFAULT TRUE,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- CATEGORIES
-- ============================================================
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  -- user_id NULL = system default categories
  name TEXT NOT NULL,
  icon TEXT NOT NULL,
  color TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('expense', 'income', 'transfer')),
  is_system BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- System default categories (user_id = NULL)
INSERT INTO public.categories (id, name, icon, color, type, is_system) VALUES
  (gen_random_uuid(), 'Food & Beverage', 'utensils', '#f59e0b', 'expense', true),
  (gen_random_uuid(), 'Transportation', 'car', '#3b82f6', 'expense', true),
  (gen_random_uuid(), 'Shopping', 'shopping-bag', '#ec4899', 'expense', true),
  (gen_random_uuid(), 'Entertainment', 'gamepad-2', '#8b5cf6', 'expense', true),
  (gen_random_uuid(), 'Bills & Utilities', 'zap', '#ef4444', 'expense', true),
  (gen_random_uuid(), 'Health', 'heart-pulse', '#10b981', 'expense', true),
  (gen_random_uuid(), 'Education', 'graduation-cap', '#06b6d4', 'expense', true),
  (gen_random_uuid(), 'Salary', 'banknote', '#22c55e', 'income', true),
  (gen_random_uuid(), 'Transfer', 'arrow-right-left', '#94a3b8', 'transfer', true),
  (gen_random_uuid(), 'Other', 'circle-ellipsis', '#64748b', 'expense', true);

-- ============================================================
-- TRANSACTIONS (core table)
-- ============================================================
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  wallet_id UUID NOT NULL REFERENCES public.wallets(id),
  category_id UUID REFERENCES public.categories(id),

  -- Financial data
  amount INTEGER NOT NULL, -- in IDR, always positive
  type TEXT NOT NULL CHECK (type IN ('expense', 'income', 'transfer')),
  description TEXT,
  merchant_name TEXT,

  -- Payment context
  payment_method TEXT CHECK (payment_method IN ('qris', 'transfer', 'cash', 'debit', 'credit', 'ewallet', 'other')),
  reference_number TEXT, -- bank reference / transaction ID

  -- Source tracking
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'gmail', 'ocr')),
  raw_email_id TEXT, -- Gmail message ID if source = gmail
  raw_email_snippet TEXT, -- for debugging parser issues
  is_verified BOOLEAN DEFAULT TRUE, -- false = needs user confirmation
  
  -- Categorization metadata
  ai_category_confidence FLOAT, -- 0.0 to 1.0
  ai_category_raw TEXT, -- raw AI response for debugging

  -- Recurring detection
  is_recurring BOOLEAN DEFAULT FALSE,
  recurring_group_id UUID,

  -- Timestamps
  transacted_at TIMESTAMPTZ NOT NULL, -- actual transaction time
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for common queries
CREATE INDEX idx_transactions_user_date ON public.transactions(user_id, transacted_at DESC);
CREATE INDEX idx_transactions_user_category ON public.transactions(user_id, category_id);
CREATE INDEX idx_transactions_gmail_id ON public.transactions(raw_email_id) WHERE raw_email_id IS NOT NULL;

-- ============================================================
-- GMAIL SYNC LOG (audit trail for sync operations)
-- ============================================================
CREATE TABLE public.gmail_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('started', 'completed', 'failed', 'partial')),
  emails_scanned INTEGER DEFAULT 0,
  transactions_found INTEGER DEFAULT 0,
  transactions_created INTEGER DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- ============================================================
-- BUDGETS
-- ============================================================
CREATE TABLE public.budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.categories(id),
  name TEXT NOT NULL,
  amount INTEGER NOT NULL, -- budget limit in IDR
  period TEXT NOT NULL CHECK (period IN ('weekly', 'monthly', 'yearly')),
  is_active BOOLEAN DEFAULT TRUE,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gmail_sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;

-- Profiles: users can only read/update their own profile
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Wallets: full CRUD on own wallets only
CREATE POLICY "Users manage own wallets" ON public.wallets
  FOR ALL USING (auth.uid() = user_id);

-- Categories: own categories + system categories
CREATE POLICY "Users view own and system categories" ON public.categories
  FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Users manage own categories" ON public.categories
  FOR ALL USING (auth.uid() = user_id);

-- Transactions: full CRUD on own transactions only
CREATE POLICY "Users manage own transactions" ON public.transactions
  FOR ALL USING (auth.uid() = user_id);

-- Sync logs: read own logs only
CREATE POLICY "Users view own sync logs" ON public.gmail_sync_logs
  FOR SELECT USING (auth.uid() = user_id);

-- Budgets: full CRUD on own budgets only
CREATE POLICY "Users manage own budgets" ON public.budgets
  FOR ALL USING (auth.uid() = user_id);
```

---

## 6. FEATURE SPECIFICATIONS

### Feature 1: Authentication
**What it does:** Secure login via Google OAuth only (MVP)

**User flow:**
1. User visits Monvora
2. Sees landing page with "Sign in with Google" button
3. Google OAuth consent screen — scope: profile + email + gmail.readonly
4. On first login → onboarding flow (setup wallets)
5. On subsequent logins → direct to dashboard

**Rules:**
- Session expires after 7 days of inactivity
- Refresh tokens stored securely in httpOnly cookies — never localStorage
- Gmail scope asked upfront with clear explanation of why it's needed

---

### Feature 2: Dashboard
**What it does:** Main screen showing financial overview

**Components:**
- **Balance Card**: Total balance across all wallets
- **Cashflow Summary**: Income vs Expense this month
- **Recent Transactions**: Last 10 transactions with merchant, amount, category icon
- **Spending Breakdown**: Donut chart — top 5 categories this month
- **Quick Entry Button**: Floating action button, always visible

**Design rules for general users:**
- No finance jargon — "Money In" not "Credit", "Money Out" not "Debit"
- Color coding: green = money in, red = money out
- Every number formatted as Rp XX.XXX (Indonesian format)

---

### Feature 3: Quick Entry (Manual Transaction)
**What it does:** Fast manual input for cash and e-wallet transactions

**Target completion time:** Under 10 seconds

**Fields:**
1. Amount (number pad, large and prominent)
2. Category (icon grid, tap to select)
3. Payment method (GoPay / ShopeePay / OVO / DANA / Cash / Other)
4. Note (optional, text field)
5. Date/time (defaults to now, can be changed)

**UX rules:**
- Number pad opens immediately on load
- Category defaults to last used
- Submit on confirmation — no extra screens
- Optimistic update: transaction appears in list instantly before server confirms

---

### Feature 4: Gmail Auto-Sync
**What it does:** Automatically detects bank transaction emails and creates transactions

**Supported banks (MVP):**
- Bank Mandiri
- BCA
- BNI
- BRI
- CIMB Niaga

**How it works:**
1. Inngest job runs every 15 minutes per active user
2. Fetches emails since last sync using Gmail historyId
3. Filters by known sender patterns (see Gmail Integration section)
4. Parses relevant fields from email body
5. Validates with Zod
6. Categorizes via Gemini (with rule-based fallback)
7. Saves to transactions table
8. Marks as `is_verified: false` if confidence is low → user gets notification to confirm

**Duplicate prevention:**
- `raw_email_id` field is unique per user
- Before insert, check if email ID already processed

---

### Feature 5: OCR Screenshot Input
**What it does:** Let users photograph/screenshot e-wallet transaction history

**Flow:**
1. User taps "Scan Screenshot" in quick entry
2. Uploads image (JPG/PNG, max 5MB)
3. Tesseract.js processes client-side
4. Extracted data pre-fills quick entry form
5. User reviews and corrects if needed
6. Submits as manual transaction with `source: 'ocr'`

**Important:** OCR is a helper, not a replacement. User always confirms before saving.

---

### Feature 6: Transaction List & Search
**What it does:** Full history of all transactions with filter and search

**Filters:**
- Date range (this week / this month / last month / custom)
- Category
- Payment method
- Source (auto / manual)
- Amount range

**Search:** Full text search on merchant name and description

---

### Feature 7: Analytics
**What it does:** Visual spending insights — designed to be readable by non-finance users

**Charts:**
- Monthly spending trend (line chart — last 6 months)
- Category breakdown (donut chart)
- Day-of-week spending pattern (bar chart — "you spend most on Fridays")
- Top merchants (ranked list)

**AI Insights (Gemini):**
- "Your food spending increased 35% compared to last month"
- "You have 3 recurring payments totaling Rp 150.000/month"
- Generated once per day, cached — not on every page load

---

### Feature 8: Wallet Management
**What it does:** Manage bank accounts, e-wallets, cash pockets

**Actions:**
- Add wallet (name, type, provider, initial balance)
- Edit wallet
- Archive wallet (soft delete — transactions preserved)
- Set wallet color for visual identification

---

### Feature 9: Budget
**What it does:** Set spending limits per category

**Features:**
- Create budget per category (monthly)
- Visual progress bar: spent vs limit
- Warning at 80% utilization
- Alert at 100% (over budget)

---

## 7. SECURITY BLUEPRINT

### Authentication Security
```typescript
// RULE: Every API route must start with this pattern
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (name) => cookieStore.get(name)?.value } }
  )
  
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  // Continue with session.user.id — never trust user-supplied IDs
}
```

### Input Validation (Zod — Every Route)
```typescript
// Example: transaction creation schema
const createTransactionSchema = z.object({
  amount: z.number().int().positive().max(999_999_999), // max ~1B IDR
  type: z.enum(['expense', 'income', 'transfer']),
  wallet_id: z.string().uuid(),
  category_id: z.string().uuid().optional(),
  description: z.string().max(500).optional(),
  payment_method: z.enum(['qris', 'transfer', 'cash', 'debit', 'credit', 'ewallet', 'other']),
  transacted_at: z.string().datetime(),
})
```

### Gmail Token Security
- OAuth tokens stored in Supabase — never in localStorage or cookies
- `gmail_sync_token` (historyId) stored encrypted in profiles table
- Token refresh handled server-side only — client never touches Gmail tokens
- If token revoked by user → sync disabled gracefully, user notified

### Rate Limiting
```typescript
// Simple rate limiter per user per endpoint
const RATE_LIMITS = {
  '/api/transactions': { requests: 60, window: '1m' },
  '/api/sync/trigger': { requests: 5, window: '1h' },
  '/api/ocr': { requests: 20, window: '1h' },
}
```

### Data Rules
- Never return another user's data — RLS is last line of defense, but API layer must also filter by `user_id = session.user.id`
- Never log transaction amounts or merchant names — only log transaction IDs
- Soft delete only — never hard delete financial records
- Amounts always integer (IDR) — never float

---

## 8. GMAIL INTEGRATION

### OAuth Setup
```
Scopes requested:
- openid (authentication)
- email (user email address)  
- profile (user name + avatar)
- https://www.googleapis.com/auth/gmail.readonly (read emails — minimum necessary)

NEVER request:
- gmail.modify
- gmail.compose  
- mail.google.com (full access)
```

### Email Sender Patterns (Parser Config)
```typescript
const BANK_EMAIL_PATTERNS = {
  mandiri: {
    senders: ['no-reply@bankmandiri.co.id', 'notifikasi@bankmandiri.co.id'],
    subject_patterns: ['Notifikasi Transaksi', 'QRIS Payment', 'Transfer Berhasil'],
  },
  bca: {
    senders: ['klikbca@bca.co.id', 'notify@bca.co.id'],
    subject_patterns: ['Transaksi BCA', 'Notifikasi BCA'],
  },
  bni: {
    senders: ['bni@bni.co.id', 'notifikasi@bni.co.id'],
    subject_patterns: ['Notifikasi BNI', 'BNI Transaction'],
  },
  bri: {
    senders: ['bri@bri.co.id', 'notif@bri.co.id'],
    subject_patterns: ['BRImo', 'Notifikasi BRI'],
  },
}
```

### Parsing Engine Strategy
```typescript
// Each bank has its own parser
interface TransactionParser {
  bank: string
  canParse: (email: GmailMessage) => boolean
  parse: (email: GmailMessage) => ParsedTransaction | null
}

interface ParsedTransaction {
  amount: number        // in IDR integer
  type: 'expense' | 'income' | 'transfer'
  merchant_name: string | null
  description: string | null
  payment_method: string
  transacted_at: Date
  reference_number: string | null
  raw_snippet: string   // original text for debugging
  confidence: number    // 0.0 to 1.0
}
```

### Sync Job (Inngest)
```typescript
// Runs every 15 minutes per user
export const gmailSyncJob = inngest.createFunction(
  { id: 'gmail-sync', retries: 3 },
  { cron: '*/15 * * * *' },
  async ({ step }) => {
    // 1. Get all users with gmail_sync_enabled = true
    // 2. For each user, fetch new emails since last historyId
    // 3. Filter by bank sender patterns
    // 4. Parse each email
    // 5. Validate with Zod
    // 6. Check for duplicates (raw_email_id)
    // 7. Categorize with Gemini
    // 8. Insert to transactions
    // 9. Update gmail_last_synced_at + historyId
    // 10. Log to gmail_sync_logs
  }
)
```

---

## 9. AI CATEGORIZATION

### Strategy: Rule-Based First, AI Second
```typescript
async function categorizeTransaction(transaction: ParsedTransaction): Promise<CategoryResult> {
  // Step 1: Try rule-based first (free, instant)
  const ruleResult = applyRules(transaction)
  if (ruleResult.confidence >= 0.9) return ruleResult

  // Step 2: Use Gemini if rule-based not confident
  const aiResult = await callGemini(transaction)
  return aiResult
}
```

### Rule-Based Patterns (Examples)
```typescript
const CATEGORIZATION_RULES = [
  // Food & Beverage
  { pattern: /mixue|kopi|mcdonalds|kfc|gofood|grabfood|shopee food/i, category: 'Food & Beverage' },
  // Transportation
  { pattern: /gojek|grab|transjakarta|kereta|kai|parkir/i, category: 'Transportation' },
  // Entertainment / Gaming
  { pattern: /steam|netflix|spotify|youtube|valorant|mobile legend/i, category: 'Entertainment' },
  // Shopping
  { pattern: /shopee|tokopedia|lazada|blibli/i, category: 'Shopping' },
  // Bills
  { pattern: /pln|telkom|indihome|pdam|bpjs/i, category: 'Bills & Utilities' },
]
```

### Gemini Prompt Template
```typescript
const CATEGORIZATION_PROMPT = `
You are a transaction categorizer for Indonesian users.
Given this transaction, return ONLY a JSON object.

Transaction:
- Merchant: ${merchant}
- Description: ${description}  
- Amount: Rp ${amount}
- Payment method: ${method}

Available categories: ${categories.join(', ')}

Return only this JSON, nothing else:
{"category": "Food & Beverage", "confidence": 0.95, "reasoning": "Mixue is a beverage chain"}
`
```

### Fallback Behavior
- If Gemini API rate limit hit → use rule-based result (even if confidence < 0.9)
- If no rule matches → assign "Other" category, `is_verified: false`
- User can always manually correct category

---

## 10. UI/UX GUIDELINES

### Design Language
- **Style:** Clean, modern, finance-app feel. Inspired by Wise and Revolut — not traditional banking
- **Primary color:** Deep navy (#0f172a) with green accent (#22c55e) for positive, red (#ef4444) for negative
- **Typography:** Clear hierarchy. Large numbers. No walls of text
- **Icons:** Lucide React — consistent, clean

### Theme System (Light / Dark / System)

**Default behavior:** App follows device system preference automatically on first load. User can override manually in settings.

**Implementation using next-themes:**

```typescript
// app/layout.tsx
import { ThemeProvider } from 'next-themes'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"   // follows device preference by default
          enableSystem={true}     // allows system detection
          disableTransitionOnChange // prevents flash during theme switch
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
```

**Tailwind dark mode config:**
```typescript
// tailwind.config.ts
export default {
  darkMode: 'class', // next-themes adds 'dark' class to <html>
  // ...rest of config
}
```

**Theme toggle component (Settings page):**
```typescript
// components/shared/theme-toggle.tsx
'use client'
import { useTheme } from 'next-themes'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <div className="flex gap-2">
      <button onClick={() => setTheme('light')}>Light</button>
      <button onClick={() => setTheme('dark')}>Dark</button>
      <button onClick={() => setTheme('system')}>System</button>
    </div>
  )
}
```

**Color tokens — must work in both themes:**
```css
/* Use Tailwind semantic classes, never hardcode colors */

/* CORRECT */
<div className="bg-background text-foreground">
<span className="text-green-500 dark:text-green-400">+ Rp 150.000</span>
<span className="text-red-500 dark:text-red-400">- Rp 45.000</span>

/* WRONG — breaks in dark mode */
<div style={{ backgroundColor: '#ffffff', color: '#0f172a' }}>
```

**Theme persistence:** next-themes stores preference in localStorage automatically. User's choice remembered across sessions.

**No flash on load:** `suppressHydrationWarning` on `<html>` tag prevents hydration mismatch. `disableTransitionOnChange` prevents visible flash when theme loads.

---

### General User Design Rules
1. **No jargon.** "Money Out" not "Debit". "Money In" not "Credit"
2. **Big numbers.** Transaction amounts should be the biggest text on the card
3. **Color = meaning.** Green always means money received. Red always means money spent. Never use for decoration
4. **One action per screen.** Don't overwhelm with options
5. **Confirmation before delete.** Never accidentally delete a transaction
6. **Empty states.** Every empty list has a helpful message + action button
7. **Theme aware.** Every new component must be tested in both light and dark mode before commit

### Responsive Design
- Mobile-first (most users on phone)
- Bottom navigation on mobile
- Sidebar navigation on desktop
- PWA installable (manifest.json + service worker)

### Loading States
- Skeleton loaders — never blank white screens
- Optimistic updates for quick entry — feels instant
- Background sync indicator (subtle spinner in header)

### Error States
- User-friendly messages — "Couldn't load your transactions. Try again?" not "500 Internal Server Error"
- Retry buttons on failed loads
- Toast notifications for success/error feedback

---

## 11. DEVELOPMENT PHASES

### Phase 1 — Core Loop (Weeks 1–4)
**Goal:** Fully usable app for manual tracking

**Deliverables:**
- [ ] Project setup (Next.js + Supabase + TypeScript)
- [ ] Google OAuth login (profile + email scope only — no Gmail yet)
- [ ] Supabase schema migration (all tables + RLS)
- [ ] Onboarding flow (create first wallet)
- [ ] Quick entry form (manual transaction)
- [ ] Transaction list page
- [ ] Basic dashboard (balance + recent transactions)
- [ ] Wallet management (CRUD)
- [ ] Category management (system defaults + custom)
- [ ] Deploy to Vercel

**Success criteria:** Developer can log in and record daily transactions manually

---

### Phase 2 — Gmail Automation (Weeks 5–10)
**Goal:** Auto-capture bank transactions from email

**Deliverables:**
- [ ] Expand OAuth scope to include gmail.readonly
- [ ] Gmail API integration + token management
- [ ] Inngest setup + background job infrastructure
- [ ] Email parser for Bank Mandiri (start with one bank)
- [ ] Zod validation for parsed data
- [ ] Duplicate detection logic
- [ ] Rule-based categorization engine
- [ ] Sync status indicator in dashboard
- [ ] Gmail sync settings page (enable/disable, last sync time)
- [ ] Add remaining banks (BCA, BNI, BRI, CIMB)

**Success criteria:** 70%+ of bank transactions captured automatically without user action

---

### Phase 3 — Intelligence Layer (Weeks 11–16)
**Goal:** Smart insights + e-wallet support + polish

**Deliverables:**
- [ ] Gemini API integration for categorization
- [ ] OCR screenshot feature (Tesseract.js)
- [ ] Analytics dashboard (charts + trends)
- [ ] AI-generated insights (daily digest)
- [ ] Budget feature
- [ ] Recurring transaction detection
- [ ] PWA manifest + service worker
- [ ] Performance optimization
- [ ] i18n infrastructure (English + Indonesian)

**Success criteria:** App provides actionable insights without user needing to understand finance

---

### Phase 4 — Public Ready (Weeks 17–20)
**Goal:** Ready for users beyond the developer

**Deliverables:**
- [ ] Landing page
- [ ] Onboarding improvements based on self-use feedback
- [ ] Error monitoring (Sentry)
- [ ] Analytics (privacy-respecting — Plausible or similar)
- [ ] Security audit checklist
- [ ] Rate limiting hardening
- [ ] Documentation for Gmail permission explanation (user trust)
- [ ] Feedback mechanism

---

## 12. FOLDER STRUCTURE

```
monvora/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Auth route group
│   │   ├── login/
│   │   │   └── page.tsx
│   │   └── callback/
│   │       └── route.ts          # OAuth callback handler
│   ├── (dashboard)/              # Protected route group
│   │   ├── layout.tsx            # Dashboard layout + nav
│   │   ├── page.tsx              # Dashboard home
│   │   ├── transactions/
│   │   │   ├── page.tsx
│   │   │   └── [id]/
│   │   │       └── page.tsx
│   │   ├── analytics/
│   │   │   └── page.tsx
│   │   ├── budgets/
│   │   │   └── page.tsx
│   │   ├── wallets/
│   │   │   └── page.tsx
│   │   └── settings/
│   │       ├── page.tsx
│   │       └── gmail/
│   │           └── page.tsx
│   ├── api/                      # API Routes
│   │   ├── auth/
│   │   │   └── callback/
│   │   │       └── route.ts
│   │   ├── transactions/
│   │   │   ├── route.ts          # GET (list) + POST (create)
│   │   │   └── [id]/
│   │   │       └── route.ts      # GET + PATCH + DELETE
│   │   ├── sync/
│   │   │   ├── gmail/
│   │   │   │   └── route.ts      # Trigger manual sync
│   │   │   └── status/
│   │   │       └── route.ts      # Get sync status
│   │   ├── ocr/
│   │   │   └── route.ts
│   │   └── analytics/
│   │       └── route.ts
│   ├── layout.tsx                # Root layout
│   └── globals.css
│
├── components/
│   ├── ui/                       # shadcn components
│   ├── dashboard/
│   │   ├── balance-card.tsx
│   │   ├── cashflow-summary.tsx
│   │   ├── recent-transactions.tsx
│   │   └── spending-breakdown.tsx
│   ├── transactions/
│   │   ├── quick-entry-form.tsx
│   │   ├── transaction-list.tsx
│   │   ├── transaction-card.tsx
│   │   └── ocr-upload.tsx
│   ├── analytics/
│   │   ├── spending-chart.tsx
│   │   └── category-breakdown.tsx
│   └── shared/
│       ├── nav-bottom.tsx
│       ├── nav-sidebar.tsx
│       └── currency-display.tsx
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts             # Browser client
│   │   ├── server.ts             # Server client
│   │   └── middleware.ts
│   ├── gmail/
│   │   ├── client.ts             # Gmail API wrapper
│   │   ├── parsers/
│   │   │   ├── index.ts
│   │   │   ├── mandiri.ts
│   │   │   ├── bca.ts
│   │   │   ├── bni.ts
│   │   │   └── bri.ts
│   │   └── sync.ts               # Sync orchestration
│   ├── ai/
│   │   ├── gemini.ts             # Gemini API client
│   │   ├── categorize.ts         # Categorization logic
│   │   └── rules.ts              # Rule-based fallback
│   ├── inngest/
│   │   ├── client.ts
│   │   └── functions/
│   │       └── gmail-sync.ts
│   ├── validations/
│   │   ├── transaction.ts        # Zod schemas
│   │   ├── wallet.ts
│   │   └── profile.ts
│   └── utils/
│       ├── currency.ts           # IDR formatting
│       ├── date.ts
│       └── errors.ts
│
├── hooks/
│   ├── use-transactions.ts
│   ├── use-wallets.ts
│   └── use-sync-status.ts
│
├── stores/
│   └── quick-entry-store.ts      # Zustand store
│
├── types/
│   ├── database.ts               # Generated Supabase types
│   ├── transaction.ts
│   └── wallet.ts
│
├── inngest.ts                    # Inngest client export
├── middleware.ts                 # Next.js middleware (auth guard)
├── .env.local                    # Local environment variables
├── .env.example                  # Template — committed to git
└── supabase/
    └── migrations/
        └── 001_initial_schema.sql
```

---

## 13. ENVIRONMENT VARIABLES

```bash
# .env.example — commit this to git
# .env.local — NEVER commit this to git

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=        # Server-side only, never expose to client

# Google OAuth + Gmail
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
NEXT_PUBLIC_GOOGLE_CLIENT_ID=     # Safe to expose (used for OAuth redirect)

# Gemini AI
GEMINI_API_KEY=                   # Server-side only

# Inngest
INNGEST_EVENT_KEY=
INNGEST_SIGNING_KEY=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Critical Security Rules for Environment Variables
- `SUPABASE_SERVICE_ROLE_KEY` — server-side ONLY. Never in `NEXT_PUBLIC_*`
- `GEMINI_API_KEY` — server-side ONLY
- `GOOGLE_CLIENT_SECRET` — server-side ONLY
- Never commit `.env.local` to git — add to `.gitignore` immediately
- Rotate keys immediately if accidentally exposed

---

## 14. KNOWN LIMITATIONS & FUTURE ROADMAP

### MVP Limitations (Known and Accepted)
| Limitation | Impact | Future Solution |
|---|---|---|
| No e-wallet auto-sync | Manual entry required for GoPay, ShopeePay, etc. | Phase 3 OCR helps, full solution TBD |
| Gmail only (no SMS) | Misses users who get bank notif via SMS | SMS parsing via Twilio (paid) |
| 5 banks supported | Other banks not parsed | Add parsers incrementally |
| English UI only | Non-English users underserved | i18n in Phase 3 |
| No mobile app | PWA only | Capacitor wrapper if needed |
| Gemini free tier limits | Categorization may fail at high volume | Paid tier or self-hosted model |

### Future Features (Post-MVP)
- [ ] Subscription tracker (detect recurring charges)
- [ ] Predictive spending forecast
- [ ] Split bill feature
- [ ] Export to CSV/Excel
- [ ] WhatsApp bot for quick entry
- [ ] Family/shared wallet mode
- [ ] Tax report generation
- [ ] Investment tracking
- [ ] Facebook + Apple OAuth

---

## APPENDIX: QUICK REFERENCE

### Key Commands
```bash
# Install pnpm (if not already installed)
npm install -g pnpm

# Setup
pnpm create next-app@latest monvora --typescript --tailwind --app
cd monvora
pnpm dlx shadcn@latest init

# Dependencies
pnpm add @supabase/ssr @supabase/supabase-js
pnpm add inngest
pnpm add zod
pnpm add zustand @tanstack/react-query
pnpm add tesseract.js
pnpm add next-themes          # light/dark/system theme

# Supabase CLI
pnpm dlx supabase init
pnpm dlx supabase db push

# Development
pnpm dev
pnpm dlx inngest-cli@latest dev  # run Inngest dev server alongside
```

### Phase 1 Starting Point
When you sit down to code, do this in order:
1. Create Next.js project
2. Initialize Supabase project (cloud)
3. Run database migrations
4. Set up Google OAuth in Google Cloud Console
5. Implement login page
6. Test login works
7. Build quick entry form
8. Test transaction saves to database
9. Build transaction list
10. Build basic dashboard

Do not jump ahead. Each step must work before the next begins.

---

*Document maintained by: Solo Developer*
*Next review: After Phase 1 completion*