# MONVORA — API Conventions
> Defines standards for all API routes, request/response formats, and naming conventions
> Referenced from: master.md, CLAUDE.md
> ⚠️ Semua API route wajib mengikuti konvensi ini tanpa pengecualian

---

## DOCUMENT VERSION HISTORY

| Version | Date | Updated By | Changes |
|---|---|---|---|
| v1 | May 24, 2026 | Claude | Initial creation |

**Current Version:** v1
**Last Updated:** May 24, 2026

---

## TABLE OF CONTENTS

1. [General Rules](#1-general-rules)
2. [URL Structure](#2-url-structure)
3. [HTTP Methods](#3-http-methods)
4. [Request Format](#4-request-format)
5. [Response Format](#5-response-format)
6. [Error Format](#6-error-format)
7. [Status Codes](#7-status-codes)
8. [Pagination](#8-pagination)
9. [Filtering & Sorting](#9-filtering--sorting)
10. [Route Reference](#10-route-reference)
11. [Versioning](#11-versioning)

---

## 1. GENERAL RULES

### Aturan Wajib

1. **Semua route harus di bawah `/api/`** — tidak ada business logic di page routes
2. **Semua route harus ada session check** — tidak ada route publik kecuali `/api/auth/*`
3. **Semua input harus divalidasi dengan Zod** — tidak ada akses database tanpa validasi
4. **Semua response harus JSON** — tidak ada plain text response
5. **Semua error harus konsisten** — ikuti format error di section 6
6. **user_id selalu dari session** — tidak pernah dari request body atau URL

### Naming Conventions

```
URL          : lowercase, kebab-case
              /api/quick-entry ✅
              /api/quickEntry  ❌
              /api/QuickEntry  ❌

File         : route.ts di dalam folder sesuai URL
              app/api/transactions/route.ts       → GET /api/transactions
              app/api/transactions/[id]/route.ts  → GET /api/transactions/:id

Function     : camelCase, nama HTTP method
              export async function GET(...)
              export async function POST(...)
              export async function PATCH(...)
              export async function DELETE(...)

JSON keys    : snake_case (konsisten dengan database)
              { "wallet_id": "...", "created_at": "..." }  ✅
              { "walletId": "...", "createdAt": "..." }     ❌
```

---

## 2. URL STRUCTURE

### Pattern

```
/api/[resource]              → koleksi
/api/[resource]/[id]         → item spesifik
/api/[resource]/[id]/[sub]   → sub-resource
```

### Semua Routes Monvora

```
AUTH
POST   /api/auth/callback          → OAuth callback handler

TRANSACTIONS
GET    /api/transactions            → list transaksi dengan filter
POST   /api/transactions            → buat transaksi baru
GET    /api/transactions/:id        → detail transaksi
PATCH  /api/transactions/:id        → update transaksi
DELETE /api/transactions/:id        → soft delete transaksi

WALLETS
GET    /api/wallets                 → list semua wallet
POST   /api/wallets                 → buat wallet baru
GET    /api/wallets/:id             → detail wallet
PATCH  /api/wallets/:id             → update wallet
DELETE /api/wallets/:id             → archive wallet (soft delete)

CATEGORIES
GET    /api/categories              → list kategori (sistem + milik user)
POST   /api/categories              → buat kategori custom
PATCH  /api/categories/:id          → update kategori (hanya milik sendiri)
DELETE /api/categories/:id          → hapus kategori custom

BUDGETS
GET    /api/budgets                 → list semua budget aktif
POST   /api/budgets                 → buat budget baru
PATCH  /api/budgets/:id             → update budget
DELETE /api/budgets/:id             → nonaktifkan budget

SYNC
POST   /api/sync/gmail              → trigger manual Gmail sync
GET    /api/sync/status             → status sync terakhir + logs

ANALYTICS
GET    /api/analytics               → data analytics dengan query params

OCR
POST   /api/ocr                     → parse hasil OCR (text input)

PROFILE
GET    /api/profile                 → data profil user
PATCH  /api/profile                 → update preferensi profil
```

---

## 3. HTTP METHODS

### Penggunaan yang Benar

| Method | Kegunaan | Body | Idempoten? |
|---|---|---|---|
| `GET` | Ambil data — tidak mengubah apapun | ❌ | ✅ |
| `POST` | Buat resource baru | ✅ | ❌ |
| `PATCH` | Update sebagian field | ✅ | ✅ |
| `DELETE` | Hapus / nonaktifkan resource | ❌ | ✅ |
| `PUT` | **Tidak dipakai** di Monvora | — | — |

### Kenapa PATCH bukan PUT

`PUT` mengganti seluruh resource — jika ada field yang tidak dikirim, field tersebut akan null. `PATCH` hanya update field yang dikirim. Untuk aplikasi finance, ini lebih aman karena mencegah data hilang tidak sengaja.

---

## 4. REQUEST FORMAT

### Headers Wajib

```http
Content-Type: application/json
```

Session otomatis dibaca dari httpOnly cookie — tidak perlu Authorization header.

### GET Request — Query Params

```
GET /api/transactions?
  type=expense              → filter by type
  &category_id=uuid         → filter by kategori
  &wallet_id=uuid           → filter by wallet
  &start_date=2026-05-01    → dari tanggal (ISO 8601)
  &end_date=2026-05-31      → sampai tanggal
  &search=mixue             → search merchant + description
  &page=1                   → halaman (default: 1)
  &limit=20                 → item per halaman (default: 20, max: 100)
  &sort_by=transacted_at    → kolom untuk sort
  &sort_order=desc          → asc atau desc (default: desc)
```

### POST / PATCH Request — Body

```json
// POST /api/transactions
{
  "amount": 45000,
  "type": "expense",
  "wallet_id": "uuid-here",
  "category_id": "uuid-here",
  "description": "Makan siang",
  "merchant_name": "Warteg Barokah",
  "payment_method": "cash",
  "transacted_at": "2026-05-24T12:30:00+07:00"
}

// PATCH /api/transactions/:id (partial — hanya field yang ingin diubah)
{
  "category_id": "uuid-baru",
  "description": "Koreksi kategori"
}
```

### Tanggal & Waktu

```
Format  : ISO 8601 dengan timezone
Contoh  : "2026-05-24T12:30:00+07:00"   (WIB)
           "2026-05-24T05:30:00Z"        (UTC — ekuivalen)

Zona waktu default : Asia/Jakarta (WIB, UTC+7)
Storage di database: TIMESTAMPTZ (timezone-aware)

JANGAN kirim: "2026-05-24" (tanpa waktu)
JANGAN kirim: "24/05/2026" (format non-standard)
```

---

## 5. RESPONSE FORMAT

### Success Response

```json
// Single resource (GET /:id, POST, PATCH)
{
  "data": {
    "id": "uuid",
    "amount": 45000,
    "type": "expense",
    "merchant_name": "Warteg Barokah",
    "category": {
      "id": "uuid",
      "name": "Food & Beverage",
      "icon": "utensils",
      "color": "#f59e0b"
    },
    "wallet": {
      "id": "uuid",
      "name": "Mandiri Main"
    },
    "payment_method": "cash",
    "transacted_at": "2026-05-24T12:30:00+07:00",
    "source": "manual",
    "is_verified": true,
    "created_at": "2026-05-24T12:31:00+07:00"
  }
}

// Collection (GET tanpa /:id)
{
  "data": [...],
  "meta": {
    "total": 150,
    "page": 1,
    "limit": 20,
    "total_pages": 8,
    "has_next": true,
    "has_prev": false
  }
}

// Delete / Archive (tidak return data)
{
  "success": true,
  "message": "Transaction deleted"
}
```

### Field yang Selalu Ada di Response

```
id           : UUID resource
created_at   : Waktu dibuat (TIMESTAMPTZ)
updated_at   : Waktu terakhir diubah (TIMESTAMPTZ)
```

### Field yang Tidak Pernah di-return ke Client

```
deleted_at              : Internal soft delete marker
raw_email_id            : Internal Gmail reference
raw_email_snippet       : Internal debugging data
ai_category_raw         : Internal AI response
gmail_sync_token        : Internal Gmail historyId
```

---

## 6. ERROR FORMAT

### Struktur Error yang Konsisten

```json
// Error umum
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "You must be logged in to access this resource"
  }
}

// Validation error (dari Zod)
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input",
    "details": {
      "amount": ["Amount harus bilangan bulat positif"],
      "wallet_id": ["wallet_id harus UUID valid"]
    }
  }
}

// Server error (tidak expose internal details)
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "Something went wrong. Please try again.",
    "error_id": "uuid-untuk-debugging"  
  }
}
```

### Error Codes

| Code | HTTP Status | Kapan Dipakai |
|---|---|---|
| `UNAUTHORIZED` | 401 | Tidak ada session atau session expired |
| `FORBIDDEN` | 403 | Ada session tapi tidak punya akses (jarang — gunakan 404) |
| `NOT_FOUND` | 404 | Resource tidak ada atau tidak milik user ini |
| `VALIDATION_ERROR` | 400 | Input tidak valid (Zod gagal) |
| `RATE_LIMITED` | 429 | Terlalu banyak request |
| `CONFLICT` | 409 | Duplikat (contoh: email sudah sync) |
| `INTERNAL_ERROR` | 500 | Error tidak terduga di server |

### Kenapa 404 bukan 403 untuk Data Orang Lain

Mengembalikan 403 (Forbidden) mengkonfirmasi bahwa resource tersebut ada, hanya saja user tidak punya akses. Ini membocorkan informasi ke potential attacker. 404 lebih aman karena tidak mengkonfirmasi eksistensi data.

---

## 7. STATUS CODES

### Yang Dipakai di Monvora

| Status | Kapan |
|---|---|
| `200 OK` | GET berhasil, PATCH berhasil |
| `201 Created` | POST berhasil membuat resource baru |
| `204 No Content` | DELETE berhasil (tidak return body) |
| `400 Bad Request` | Input tidak valid |
| `401 Unauthorized` | Tidak ada session |
| `404 Not Found` | Resource tidak ada atau tidak milik user |
| `409 Conflict` | Duplikat resource |
| `429 Too Many Requests` | Rate limit tercapai |
| `500 Internal Server Error` | Error tidak terduga |

### Yang Tidak Dipakai

```
301, 302  → Next.js handle redirect, bukan API
403       → Gunakan 404 (lihat penjelasan di atas)
422       → Gunakan 400 dengan details dari Zod
```

---

## 8. PAGINATION

### Default Values

```
page    : 1 (mulai dari 1, bukan 0)
limit   : 20
max     : 100 (tidak bisa request lebih dari 100 per halaman)
```

### Request

```
GET /api/transactions?page=2&limit=20
```

### Response Meta

```json
{
  "data": [...],
  "meta": {
    "total": 150,        // total semua record (tanpa pagination)
    "page": 2,           // halaman sekarang
    "limit": 20,         // item per halaman
    "total_pages": 8,    // total halaman
    "has_next": true,    // ada halaman berikutnya?
    "has_prev": true     // ada halaman sebelumnya?
  }
}
```

### Implementasi di Supabase

```typescript
const { page = 1, limit = 20 } = parsedQuery

const from = (page - 1) * limit
const to = from + limit - 1

const { data, count, error } = await supabase
  .from('transactions')
  .select('*', { count: 'exact' })
  .eq('user_id', userId)
  .is('deleted_at', null)
  .order('transacted_at', { ascending: false })
  .range(from, to)

return Response.json({
  data,
  meta: {
    total: count ?? 0,
    page,
    limit,
    total_pages: Math.ceil((count ?? 0) / limit),
    has_next: page * limit < (count ?? 0),
    has_prev: page > 1,
  }
})
```

---

## 9. FILTERING & SORTING

### Filter Parameters

```typescript
// lib/validations/query.ts

export const transactionQuerySchema = z.object({
  // Pagination
  page:       z.coerce.number().int().min(1).default(1),
  limit:      z.coerce.number().int().min(1).max(100).default(20),

  // Filter
  type:         z.enum(['expense', 'income', 'transfer']).optional(),
  category_id:  z.string().uuid().optional(),
  wallet_id:    z.string().uuid().optional(),
  payment_method: z.enum([
    'qris', 'transfer', 'cash', 'debit', 'credit', 'ewallet', 'other'
  ]).optional(),
  source:       z.enum(['manual', 'gmail', 'ocr']).optional(),
  is_verified:  z.coerce.boolean().optional(),
  start_date:   z.string().datetime().optional(),
  end_date:     z.string().datetime().optional(),
  search:       z.string().max(100).optional(),

  // Sort
  sort_by:    z.enum([
    'transacted_at', 'amount', 'created_at'
  ]).default('transacted_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc'),
})
```

### Implementasi Filter di Supabase

```typescript
let query = supabase
  .from('transactions')
  .select(`
    *,
    category:categories(id, name, icon, color),
    wallet:wallets(id, name)
  `)
  .eq('user_id', userId)
  .is('deleted_at', null)  // exclude soft deleted

// Apply filters dinamis
if (params.type)            query = query.eq('type', params.type)
if (params.category_id)     query = query.eq('category_id', params.category_id)
if (params.wallet_id)       query = query.eq('wallet_id', params.wallet_id)
if (params.payment_method)  query = query.eq('payment_method', params.payment_method)
if (params.source)          query = query.eq('source', params.source)
if (params.is_verified !== undefined) {
  query = query.eq('is_verified', params.is_verified)
}
if (params.start_date) {
  query = query.gte('transacted_at', params.start_date)
}
if (params.end_date) {
  query = query.lte('transacted_at', params.end_date)
}
if (params.search) {
  query = query.or(
    `merchant_name.ilike.%${params.search}%,description.ilike.%${params.search}%`
  )
}

// Sort
query = query.order(params.sort_by, { ascending: params.sort_order === 'asc' })

// Pagination
query = query.range(from, to)
```

---

## 10. ROUTE REFERENCE

### GET /api/transactions

**Query params:** `type, category_id, wallet_id, payment_method, source, is_verified, start_date, end_date, search, page, limit, sort_by, sort_order`

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "amount": 45000,
      "type": "expense",
      "merchant_name": "Mixue",
      "description": null,
      "payment_method": "qris",
      "source": "gmail",
      "is_verified": true,
      "transacted_at": "2026-05-24T12:30:00+07:00",
      "category": { "id": "uuid", "name": "Food & Beverage", "icon": "utensils", "color": "#f59e0b" },
      "wallet": { "id": "uuid", "name": "Mandiri Main" },
      "created_at": "2026-05-24T12:31:00+07:00"
    }
  ],
  "meta": { "total": 150, "page": 1, "limit": 20, "total_pages": 8, "has_next": true, "has_prev": false }
}
```

---

### POST /api/transactions

**Body:**
```json
{
  "amount": 45000,
  "type": "expense",
  "wallet_id": "uuid",
  "category_id": "uuid",
  "merchant_name": "Mixue",
  "description": "Minuman sore",
  "payment_method": "qris",
  "transacted_at": "2026-05-24T15:30:00+07:00"
}
```

**Response `201`:**
```json
{
  "data": { "id": "uuid", "amount": 45000, ... }
}
```

---

### PATCH /api/transactions/:id

**Body (semua field opsional):**
```json
{
  "category_id": "uuid-baru",
  "description": "Koreksi deskripsi",
  "is_verified": true
}
```

**Response `200`:**
```json
{
  "data": { "id": "uuid", "category_id": "uuid-baru", ... }
}
```

---

### DELETE /api/transactions/:id

Soft delete — set `deleted_at = NOW()`

**Response `200`:**
```json
{
  "success": true,
  "message": "Transaction deleted"
}
```

---

### GET /api/analytics

**Query params:**
```
period    : "weekly" | "monthly" | "yearly" (default: "monthly")
month     : "2026-05" (jika period = monthly)
year      : "2026" (jika period = yearly)
wallet_id : UUID (opsional, filter by wallet)
```

**Response:**
```json
{
  "data": {
    "summary": {
      "total_expense": 2500000,
      "total_income": 8000000,
      "net": 5500000,
      "period": "2026-05"
    },
    "by_category": [
      { "category_id": "uuid", "name": "Food & Beverage", "total": 800000, "percentage": 32 }
    ],
    "by_month": [
      { "month": "2026-01", "total_expense": 2000000, "total_income": 8000000 }
    ],
    "top_merchants": [
      { "merchant_name": "Mixue", "count": 12, "total": 300000 }
    ],
    "insights": [
      "Pengeluaran makananmu naik 35% dibanding bulan lalu.",
      "Kamu punya 3 langganan rutin totalnya Rp 150.000 per bulan."
    ],
    "insights_generated_at": "2026-05-24T07:00:00+07:00"
  }
}
```

---

### POST /api/sync/gmail

Trigger manual sync untuk user yang sedang login.

**Body:** tidak ada

**Response `200`:**
```json
{
  "data": {
    "sync_id": "uuid",
    "status": "started",
    "message": "Sync started. Check status in a few seconds."
  }
}
```

**Response `429` (sudah sync dalam 5 menit terakhir):**
```json
{
  "error": {
    "code": "RATE_LIMITED",
    "message": "Please wait before triggering another sync",
    "retry_after_seconds": 240
  }
}
```

---

### GET /api/sync/status

**Response:**
```json
{
  "data": {
    "gmail_sync_enabled": true,
    "last_synced_at": "2026-05-24T12:00:00+07:00",
    "recent_logs": [
      {
        "id": "uuid",
        "status": "completed",
        "emails_scanned": 15,
        "transactions_found": 3,
        "transactions_created": 3,
        "started_at": "2026-05-24T12:00:00+07:00",
        "completed_at": "2026-05-24T12:00:05+07:00"
      }
    ]
  }
}
```

---

### POST /api/ocr

Menerima teks hasil OCR dari client, bukan gambar.

**Body:**
```json
{
  "text": "GoPay\nPembayaran Berhasil\nRp 45.000\nMixue Grand Indonesia\n24 Mei 2026 15:30"
}
```

**Response `200`:**
```json
{
  "data": {
    "amount": 45000,
    "merchant_name": "Mixue Grand Indonesia",
    "payment_method": "ewallet",
    "transacted_at": "2026-05-24T15:30:00+07:00",
    "confidence": 0.85,
    "raw_text": "GoPay\nPembayaran Berhasil\n..."
  }
}
```

---

## 11. VERSIONING

### Kebijakan Versi API

Monvora **tidak menggunakan versioning URL** (`/api/v1/`) untuk MVP. Alasan:
- Satu-satunya client adalah frontend Monvora sendiri
- Tidak ada public API untuk third-party
- Menambah kompleksitas tanpa manfaat nyata

Jika suatu saat Monvora membuka public API, versioning akan ditambahkan saat itu.

### Breaking Changes

Jika ada perubahan breaking di API (rename field, hapus field, ubah tipe data):
1. Update Zod schema
2. Update TypeScript types di `/types/api.ts`
3. Update frontend yang mengkonsumsi endpoint tersebut
4. Update dokumen ini
5. Semua dalam satu commit — tidak boleh ada state setengah-jalan

---

*Document maintained by: Solo Developer*
*Referenced from: master.md v2, architecture.md v1, security.md v1*
*Next review: After Phase 1 completion*
