# MONVORA — Security Document
> Defines security rules, threat models, and implementation requirements
> Referenced from: master.md, CLAUDE.md
> ⚠️ Dokumen ini wajib dibaca sebelum menulis kode apapun yang menyentuh auth, data user, atau external API

---

## DOCUMENT VERSION HISTORY

| Version | Date | Updated By | Changes |
|---|---|---|---|
| v1 | May 24, 2026 | Claude | Initial creation |

**Current Version:** v1
**Last Updated:** May 24, 2026

---

## TABLE OF CONTENTS

1. [Security Philosophy](#1-security-philosophy)
2. [Threat Model](#2-threat-model)
3. [Authentication Security](#3-authentication-security)
4. [Authorization & RLS](#4-authorization--rls)
5. [Input Validation](#5-input-validation)
6. [API Security](#6-api-security)
7. [Data Security](#7-data-security)
8. [Gmail OAuth Security](#8-gmail-oauth-security)
9. [Environment Variables](#9-environment-variables)
10. [Logging & Monitoring](#10-logging--monitoring)
11. [Security Checklist](#11-security-checklist)
12. [Incident Response](#12-incident-response)

---

## 1. SECURITY PHILOSOPHY

### Prinsip Utama

**Security bukan fitur. Security adalah fondasi.**

Monvora menyimpan data keuangan pribadi yang sangat sensitif. Satu kebocoran data bisa menghancurkan kepercayaan user selamanya. Tidak ada fitur yang cukup penting untuk mengorbankan keamanan.

### Defense in Depth
Keamanan Monvora tidak bergantung pada satu lapisan saja. Setiap lapisan harus bisa berdiri sendiri:

```
Layer 1: Input Validation (Zod)          → tolak input berbahaya
Layer 2: Authentication (Supabase Auth)  → verifikasi identitas
Layer 3: Authorization (API layer)       → verifikasi hak akses
Layer 4: RLS (Database)                  → enforce di level database
Layer 5: Encryption (Supabase at rest)   → data aman meski bocor ke storage
```

Jika Layer 3 gagal, Layer 4 masih melindungi. Jika Layer 2 gagal, Layer 1 sudah memblokir input berbahaya.

### Aturan Absolut
Tidak ada pengecualian untuk aturan berikut, dalam kondisi apapun:

1. ❌ Tidak pernah hard delete data finansial
2. ❌ Tidak pernah log nominal transaksi atau nama merchant
3. ❌ Tidak pernah expose API key atau secret ke client
4. ❌ Tidak pernah trust user-supplied user_id — selalu gunakan dari session
5. ❌ Tidak pernah disable RLS meski untuk testing
6. ❌ Tidak pernah store token OAuth di localStorage
7. ❌ Tidak pernah request Gmail scope lebih dari `gmail.readonly`

---

## 2. THREAT MODEL

### Aset yang Dilindungi

| Aset | Nilai | Dampak Jika Bocor |
|---|---|---|
| Data transaksi user | Sangat Tinggi | Privasi finansial terekspos |
| Gmail OAuth token | Sangat Tinggi | Akses baca seluruh email user |
| Supabase service role key | Sangat Tinggi | Bypass RLS, akses semua data |
| Gemini API key | Sedang | Biaya tak terduga, abuse |
| Data profil user | Sedang | Nama, email terekspos |

### Threat Actors

| Aktor | Motivasi | Kemampuan |
|---|---|---|
| Script kiddie | Iseng, coba-coba | Rendah — pakai tools umum |
| Data scraper | Jual data user | Sedang — automated requests |
| Targeted attacker | Curi data finansial spesifik | Tinggi — sophisticated |
| Insider (developer sendiri) | Tidak disengaja (human error) | Tinggi — akses penuh |

### Attack Vectors yang Paling Relevan

```
1. SQL Injection
   → Mitigasi: Supabase client parameterized queries + Zod validation

2. Broken Access Control (IDOR)
   → User A akses data User B dengan manipulasi ID
   → Mitigasi: RLS + API layer filter by session.user.id

3. Token Leakage
   → Gmail OAuth token bocor via logs atau error messages
   → Mitigasi: Tidak pernah log token, store di Supabase (terenkripsi)

4. Exposed Environment Variables
   → API key commit ke git atau expose via client bundle
   → Mitigasi: .env.local di .gitignore, NEXT_PUBLIC_ hanya untuk non-secret

5. Insecure Direct Object Reference
   → /api/transactions/[id] tanpa validasi ownership
   → Mitigasi: Selalu verifikasi user_id dari session bukan dari URL

6. Rate Limit Abuse
   → Spam request ke Gmail sync trigger atau AI endpoints
   → Mitigasi: Rate limiter per user per endpoint

7. XSS via Merchant Name
   → Merchant name dari email parsing mengandung script tag
   → Mitigasi: Zod string validation + React auto-escaping
```

---

## 3. AUTHENTICATION SECURITY

### Google OAuth Implementation

```typescript
// BENAR: Scopes sesempit mungkin
const { data, error } = await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: {
    scopes: 'openid email profile https://www.googleapis.com/auth/gmail.readonly',
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
  }
})

// SALAH: Scope terlalu luas
scopes: 'https://mail.google.com/'  // ❌ akses penuh Gmail
scopes: 'https://www.googleapis.com/auth/gmail.modify'  // ❌ bisa edit email
```

### Session Storage

```
✅ httpOnly cookie (Supabase SSR default)
   - Tidak bisa diakses JavaScript
   - Aman dari XSS

❌ localStorage
   - Rentan XSS
   - TIDAK DIGUNAKAN di Monvora

❌ sessionStorage
   - Rentan XSS
   - TIDAK DIGUNAKAN di Monvora
```

### Session Configuration

```typescript
// Supabase Auth config
{
  session: {
    maxAge: 60 * 60 * 24 * 7,        // 7 hari refresh token
    updateAge: 60 * 60,              // refresh access token tiap 1 jam
  },
  cookies: {
    name: 'monvora-session',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',  // HTTPS only di production
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
  }
}
```

### Logout Security

```typescript
// Logout harus invalidate session di server, bukan hanya clear cookie
export async function POST(request: Request) {
  const supabase = createServerClient(...)
  await supabase.auth.signOut()  // invalidate di Supabase server
  // Supabase SSR otomatis clear cookie
  return redirect('/login')
}
```

---

## 4. AUTHORIZATION & RLS

### Aturan Dasar Authorization

**Selalu gunakan user_id dari session, bukan dari request body atau URL params.**

```typescript
// ✅ BENAR
const { data: { session } } = await supabase.auth.getSession()
const userId = session.user.id  // dari token yang sudah diverifikasi

const transaction = await supabase
  .from('transactions')
  .select('*')
  .eq('id', transactionId)
  .eq('user_id', userId)  // filter eksplisit
  .single()

// ❌ SALAH — IDOR vulnerability
const { userId } = await request.json()  // jangan trust input ini
const transaction = await supabase
  .from('transactions')
  .select('*')
  .eq('id', transactionId)
  // tidak ada filter user_id — user bisa akses transaksi siapapun
```

### RLS Policies (Lengkap)

```sql
-- ============================================================
-- PROFILES
-- ============================================================
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- INSERT via trigger otomatis saat user baru, tidak via policy

-- ============================================================
-- WALLETS
-- ============================================================
CREATE POLICY "wallets_all_own" ON public.wallets
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- CATEGORIES
-- ============================================================
-- Baca: kategori milik sendiri + kategori sistem (user_id NULL)
CREATE POLICY "categories_select" ON public.categories
  FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

-- Write: hanya kategori milik sendiri
CREATE POLICY "categories_insert_own" ON public.categories
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "categories_update_own" ON public.categories
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "categories_delete_own" ON public.categories
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- TRANSACTIONS
-- ============================================================
CREATE POLICY "transactions_all_own" ON public.transactions
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- GMAIL SYNC LOGS
-- ============================================================
CREATE POLICY "gmail_logs_select_own" ON public.gmail_sync_logs
  FOR SELECT USING (auth.uid() = user_id);

-- INSERT hanya via service role (Inngest background job)
-- User tidak bisa insert atau modify logs sendiri

-- ============================================================
-- BUDGETS
-- ============================================================
CREATE POLICY "budgets_all_own" ON public.budgets
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

### Verifikasi Ownership pada Update/Delete

```typescript
// Selalu verifikasi ownership sebelum update atau delete
// Jangan hanya cek dari URL param

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSession()
  if (!session) return unauthorized()

  // Cek ownership — RLS sudah handle ini,
  // tapi explicit check di API layer lebih defensif
  const { data: transaction } = await supabase
    .from('transactions')
    .select('id')
    .eq('id', params.id)
    .eq('user_id', session.user.id)  // double check
    .single()

  if (!transaction) {
    return Response.json({ error: 'Not found' }, { status: 404 })
    // Jangan expose 403 — tidak perlu beri tahu attacker bahwa data ada
  }

  // Lanjut update...
}
```

---

## 5. INPUT VALIDATION

### Zod Schema — Wajib di Setiap Route

```typescript
// lib/validations/transaction.ts

export const createTransactionSchema = z.object({
  amount: z
    .number()
    .int('Amount harus bilangan bulat')
    .positive('Amount harus positif')
    .max(999_999_999, 'Amount maksimal Rp 999.999.999'),

  type: z.enum(['expense', 'income', 'transfer']),

  wallet_id: z.string().uuid('wallet_id harus UUID valid'),

  category_id: z.string().uuid().optional(),

  description: z
    .string()
    .max(500, 'Deskripsi maksimal 500 karakter')
    .optional()
    .transform(val => val?.trim()),  // trim whitespace

  merchant_name: z
    .string()
    .max(200)
    .optional()
    .transform(val => val?.trim()),

  payment_method: z.enum([
    'qris', 'transfer', 'cash', 'debit', 'credit', 'ewallet', 'other'
  ]),

  transacted_at: z
    .string()
    .datetime('Format datetime tidak valid'),
})

export const updateTransactionSchema = createTransactionSchema
  .partial()  // semua field opsional untuk update
  .omit({ wallet_id: true })  // wallet tidak bisa diubah setelah dibuat
```

### Sanitasi Data dari Parser

Data yang datang dari Gmail parsing harus diperlakukan sebagai **untrusted input**:

```typescript
// lib/validations/transaction.ts
export const parsedTransactionSchema = z.object({
  amount: z.number().int().positive().max(999_999_999),
  type: z.enum(['expense', 'income', 'transfer']),
  merchant_name: z.string().max(200).nullable()
    .transform(val => val?.replace(/<[^>]*>/g, '')),  // strip HTML tags
  description: z.string().max(500).nullable()
    .transform(val => val?.replace(/<[^>]*>/g, '')),
  payment_method: z.string().max(50),
  transacted_at: z.date(),
  reference_number: z.string().max(100).nullable(),
  raw_email_id: z.string().max(200),
  raw_snippet: z.string().max(1000),
  confidence: z.number().min(0).max(1),
})
```

### Validasi UUID

```typescript
// Selalu validasi UUID dari URL params
const uuidSchema = z.string().uuid()

const result = uuidSchema.safeParse(params.id)
if (!result.success) {
  return Response.json({ error: 'Invalid ID' }, { status: 400 })
}
```

---

## 6. API SECURITY

### Template Route Handler (Wajib Diikuti)

```typescript
// Template ini WAJIB dipakai di setiap route handler
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { z } from 'zod'

export async function POST(request: Request) {
  // ─── 1. SETUP CLIENT ───────────────────────────────────────
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (name) => cookieStore.get(name)?.value } }
  )

  // ─── 2. AUTH CHECK ─────────────────────────────────────────
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // ─── 3. RATE LIMIT ─────────────────────────────────────────
  const rateLimitResult = await checkRateLimit(session.user.id, '/api/transactions')
  if (!rateLimitResult.allowed) {
    return Response.json(
      { error: 'Too many requests' },
      { status: 429, headers: { 'Retry-After': '60' } }
    )
  }

  // ─── 4. PARSE & VALIDATE INPUT ─────────────────────────────
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = createTransactionSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { error: 'Invalid input', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  // ─── 5. BUSINESS LOGIC ─────────────────────────────────────
  try {
    const result = await createTransaction(session.user.id, parsed.data)
    return Response.json(result, { status: 201 })
  } catch (error) {
    // Log hanya error ID, bukan data sensitif
    const errorId = crypto.randomUUID()
    console.error('Transaction creation failed', { errorId, userId: session.user.id })
    return Response.json(
      { error: 'Something went wrong', errorId },
      { status: 500 }
    )
  }
}
```

### Rate Limiting

```typescript
// lib/utils/rate-limit.ts
const RATE_LIMITS: Record<string, { requests: number; windowMs: number }> = {
  '/api/transactions':    { requests: 60,  windowMs: 60_000 },      // 60/menit
  '/api/sync/gmail':      { requests: 5,   windowMs: 3_600_000 },   // 5/jam
  '/api/ocr':             { requests: 20,  windowMs: 3_600_000 },   // 20/jam
  '/api/analytics':       { requests: 30,  windowMs: 60_000 },      // 30/menit
  '/api/auth':            { requests: 10,  windowMs: 60_000 },      // 10/menit
}

// Implementasi: in-memory Map untuk MVP
// Upgrade ke Redis jika skala bertambah
```

### Security Headers

```typescript
// next.config.ts
const securityHeaders = [
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'X-Frame-Options', value: 'DENY' },             // prevent clickjacking
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()'     // minimal permissions
  },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline'",  // Next.js butuh ini
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' blob: data: lh3.googleusercontent.com",
      "connect-src 'self' *.supabase.co accounts.google.com",
    ].join('; ')
  },
]
```

---

## 7. DATA SECURITY

### Aturan Penyimpanan Data

```
✅ Nominal transaksi    → INTEGER IDR di database (terenkripsi at rest oleh Supabase)
✅ Gmail sync token     → Supabase profiles table (bukan localStorage)
✅ OAuth refresh token  → Supabase Auth internal storage (tidak bisa diakses langsung)
✅ API keys             → Environment variables server-side only

❌ Token apapun         → localStorage atau sessionStorage
❌ Data sensitif        → Log files atau error messages
❌ Floating point       → Untuk nominal uang
```

### Soft Delete — Tidak Pernah Hard Delete

```typescript
// ✅ BENAR — soft delete
const { error } = await supabase
  .from('transactions')
  .update({ deleted_at: new Date().toISOString() })
  .eq('id', transactionId)
  .eq('user_id', userId)

// ❌ SALAH — hard delete data finansial
const { error } = await supabase
  .from('transactions')
  .delete()
  .eq('id', transactionId)
```

### Data yang Tidak Boleh Disimpan

| Data | Alasan |
|---|---|
| Password dalam bentuk apapun | Gunakan OAuth, tidak ada password |
| Raw Gmail access token | Disimpan internal oleh Supabase Auth |
| Konten lengkap email | Hanya snippet untuk debugging |
| Screenshot OCR original | Diproses client-side, tidak diupload |

### Currency Handling

```typescript
// ✅ BENAR — integer IDR
const amount = 150000  // Rp 150.000

// ❌ SALAH — floating point
const amount = 150000.50  // presisi tidak terjamin

// Format tampilan (bukan storage)
export function formatIDR(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount)
  // Output: Rp 150.000
}
```

---

## 8. GMAIL OAUTH SECURITY

### Scope Minimal

```
✅ Diminta:
   https://www.googleapis.com/auth/gmail.readonly

❌ TIDAK PERNAH diminta:
   https://mail.google.com/              (akses penuh)
   https://www.googleapis.com/auth/gmail.modify
   https://www.googleapis.com/auth/gmail.compose
   https://www.googleapis.com/auth/gmail.send
```

### Token Storage & Refresh

```typescript
// Gmail OAuth tokens dikelola sepenuhnya oleh Supabase Auth
// Developer tidak perlu (dan tidak boleh) handle raw tokens

// Yang boleh disimpan di profiles table:
// - gmail_sync_enabled: boolean
// - gmail_last_synced_at: timestamp
// - gmail_sync_token: Gmail historyId (bukan OAuth token)

// Yang TIDAK boleh disimpan di profiles atau anywhere:
// - access_token
// - refresh_token
// Ini semua ada di Supabase Auth internal storage
```

### Revokasi Access

```typescript
// Saat user disconnect Gmail:
export async function disconnectGmail(userId: string) {
  // 1. Update profile — disable sync
  await supabase
    .from('profiles')
    .update({
      gmail_sync_enabled: false,
      gmail_sync_token: null,
      gmail_last_synced_at: null,
    })
    .eq('id', userId)

  // 2. Data transaksi yang sudah masuk TETAP ada (tidak dihapus)
  // User hanya disconnect sync, bukan hapus histori

  // Note: Untuk truly revoke OAuth, user harus pergi ke
  // myaccount.google.com/permissions dan remove Monvora dari sana
}
```

### Filtering Email — Prinsip Least Privilege

```typescript
// Jangan fetch semua email — gunakan filter ketat
const response = await gmail.users.messages.list({
  userId: 'me',
  q: buildBankEmailQuery(),  // query yang sangat spesifik
  maxResults: 50,            // batasi per sync
})

function buildBankEmailQuery(): string {
  // Hanya ambil email dari sender yang dikenal
  // Ini mengurangi exposure ke konten email non-finansial
  const senders = KNOWN_BANK_SENDERS.map(s => `from:${s}`).join(' OR ')
  return `(${senders}) after:${getLastSyncTimestamp()}`
}
```

---

## 9. ENVIRONMENT VARIABLES

### Klasifikasi

```bash
# ─── CLIENT-SAFE (boleh ada di bundle browser) ─────────────────
NEXT_PUBLIC_SUPABASE_URL=          # URL Supabase project
NEXT_PUBLIC_SUPABASE_ANON_KEY=     # Anon key (RLS melindungi data)
NEXT_PUBLIC_APP_URL=               # URL aplikasi
NEXT_PUBLIC_GOOGLE_CLIENT_ID=      # Untuk OAuth redirect

# ─── SERVER-ONLY (tidak boleh ada NEXT_PUBLIC_) ────────────────
SUPABASE_SERVICE_ROLE_KEY=         # Bypass RLS — server only
GOOGLE_CLIENT_SECRET=              # OAuth secret
GEMINI_API_KEY=                    # AI API key
INNGEST_EVENT_KEY=                 # Inngest auth
INNGEST_SIGNING_KEY=               # Inngest webhook verification
```

### Aturan Kritis

```
1. SUPABASE_SERVICE_ROLE_KEY
   → TIDAK PERNAH ada di NEXT_PUBLIC_
   → Hanya dipakai di Inngest background jobs (server)
   → Jika exposed: seluruh database bisa diakses tanpa RLS

2. GEMINI_API_KEY
   → Hanya dipanggil dari API routes (server)
   → Jika exposed: orang lain bisa pakai API atas nama kamu (biaya)

3. GOOGLE_CLIENT_SECRET
   → Hanya di server
   → Jika exposed: orang bisa impersonate Monvora di OAuth

4. .env.local TIDAK PERNAH di-commit ke git
   → Pastikan ada di .gitignore sebelum commit pertama
   → Jika sudah terlanjur commit: rotate semua keys SEKARANG
```

### .gitignore (Wajib Ada)

```gitignore
# Environment
.env.local
.env.*.local
.env.production

# Jangan commit ini
*.pem
*.key
```

### Jika Keys Bocor — Langkah Darurat

```
1. Supabase service role key bocor:
   → Supabase Dashboard → Settings → API → Regenerate service role key
   → Update di Vercel environment variables
   → Redeploy

2. Google Client Secret bocor:
   → Google Cloud Console → Credentials → Delete client → Buat baru
   → Update GOOGLE_CLIENT_SECRET di Vercel
   → Semua user perlu login ulang (session invalid)

3. Gemini API key bocor:
   → Google AI Studio → Delete key → Buat key baru
   → Update GEMINI_API_KEY di Vercel

4. Inngest keys bocor:
   → Inngest Dashboard → Rotate keys
   → Update di Vercel
```

---

## 10. LOGGING & MONITORING

### Aturan Logging

```typescript
// ✅ BOLEH di-log
console.error('Sync failed', {
  errorId: crypto.randomUUID(),
  userId: session.user.id,    // hanya ID, bukan data profil
  endpoint: '/api/sync/gmail',
  timestamp: new Date().toISOString(),
  statusCode: 500,
})

// ❌ TIDAK BOLEH di-log (data sensitif)
console.log('Transaction created', {
  amount: transaction.amount,           // ❌ nominal uang
  merchant: transaction.merchant_name,  // ❌ nama merchant
  email: user.email,                    // ❌ email user
  token: gmailToken,                    // ❌ token OAuth
})
```

### Yang Boleh dan Tidak Boleh Di-log

| Boleh Di-log | TIDAK Boleh Di-log |
|---|---|
| Error ID (UUID random) | Nominal transaksi |
| User ID (UUID) | Nama merchant |
| Endpoint yang dipanggil | Email user |
| Status code | Nama lengkap user |
| Timestamp | OAuth token apapun |
| Sync job ID | Snippet email |
| Error type/message umum | Stack trace dengan data user |

### Error Monitoring (Phase 4)
Setelah public release, tambahkan Sentry dengan konfigurasi:
- Scrub PII dari semua error reports
- Tidak kirim request/response body
- Hanya kirim stack trace dan metadata

---

## 11. SECURITY CHECKLIST

### Checklist Sebelum Setiap Commit

```
AUTH
[ ] Setiap route baru sudah ada session check di baris pertama?
[ ] user_id diambil dari session, bukan dari request body?
[ ] Logout benar-benar invalidate session di server?

INPUT VALIDATION
[ ] Semua input user divalidasi dengan Zod?
[ ] UUID dari URL params divalidasi format-nya?
[ ] String di-trim dan HTML tags di-strip?
[ ] Amount selalu integer, tidak pernah float?

DATA ACCESS
[ ] Query database selalu include filter user_id dari session?
[ ] Soft delete dipakai, bukan hard delete?
[ ] RLS tidak pernah di-disable?

ENVIRONMENT
[ ] Tidak ada secret di kode (hardcoded)?
[ ] Tidak ada NEXT_PUBLIC_ untuk server-only vars?
[ ] .env.local tidak ikut ke dalam commit?

LOGGING
[ ] Tidak ada data sensitif di console.log atau console.error?
[ ] Error message ke user tidak expose internal details?

GMAIL
[ ] Scope yang diminta hanya gmail.readonly?
[ ] Token tidak disimpan di localStorage?
[ ] Email query cukup spesifik (tidak fetch semua email)?
```

### Checklist Sebelum Setiap Deploy ke Production

```
[ ] Semua checklist commit sudah dipenuhi?
[ ] Environment variables di Vercel sudah benar?
[ ] Security headers sudah terpasang?
[ ] Rate limiting aktif di semua endpoint sensitif?
[ ] Tidak ada console.log debug yang tertinggal?
[ ] Test manual: login → transaksi → logout berjalan normal?
[ ] Test manual: akses URL transaksi user lain → 404 (bukan 403)?
```

---

## 12. INCIDENT RESPONSE

### Skenario 1: Data Breach (Data User Bocor)

```
LANGKAH SEGERA (dalam 1 jam):
1. Identifikasi scope: data apa yang bocor, berapa user terdampak
2. Putus akses: revoke keys yang terdampak
3. Preserve evidence: jangan hapus logs

LANGKAH BERIKUTNYA (dalam 24 jam):
4. Patch vulnerability
5. Deploy fix
6. Notifikasi user yang terdampak (jujur, jelas, actionable)
7. Post-mortem: apa yang terjadi, kenapa, bagaimana mencegahnya
```

### Skenario 2: API Key Bocor di Git

```
LANGKAH SEGERA:
1. Rotate key yang bocor SEKARANG (lihat section 9)
2. Force push atau rewrite git history untuk hapus key dari commit
   git filter-branch atau BFG Repo Cleaner
3. Verifikasi key lama sudah tidak bisa dipakai
4. Audit: apakah key sudah dipakai oleh pihak lain? (cek usage logs)
```

### Skenario 3: User Laporkan Data Salah / Akses Tidak Sah

```
1. Minta user screenshot dan detail kejadian
2. Cek gmail_sync_logs untuk user tersebut
3. Cek transactions table: ada data yang bukan milik user?
4. Jika ada IDOR: patch segera, audit semua routes
5. Jika parser salah: koreksi data, update parser
```

### Skenario 4: Serangan Rate Limit / DDoS

```
1. Identifikasi sumber (IP, user ID)
2. Block di Vercel firewall jika perlu
3. Tighten rate limits sementara
4. Monitor sampai traffic normal
```

---

*Document maintained by: Solo Developer*
*Referenced from: master.md v2, architecture.md v1*
*⚠️ Review dokumen ini setiap kali ada fitur baru yang menyentuh auth atau data user*
*Next review: Before Phase 2 (Gmail integration)*
