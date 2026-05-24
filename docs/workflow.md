# MONVORA — Workflow Document
> Covers: Development Workflow + System Workflow + User Workflow
> Referenced from master.md

---

## DOCUMENT VERSION HISTORY

| Version | Date | Updated By | Changes |
|---|---|---|---|
| v2 | May 24, 2026 | Claude | Switch npm → pnpm throughout dev workflow, add theme toggle to user settings workflow |
| v1 | May 24, 2026 | Claude | Initial creation — full workflow document |

**Current Version:** v2
**Last Updated:** May 24, 2026

---

## TABLE OF CONTENTS

1. [Development Workflow](#1-development-workflow)
   - 1.1 Environment Setup
   - 1.2 Git Branching Strategy
   - 1.3 Daily Dev Routine
   - 1.4 Testing Before Push
   - 1.5 Deployment Workflow
2. [System Workflow](#2-system-workflow)
   - 2.1 Authentication Flow
   - 2.2 Gmail Sync Flow
   - 2.3 Email Parsing Flow
   - 2.4 AI Categorization Flow
   - 2.5 Manual Entry Flow
   - 2.6 OCR Flow
   - 2.7 Analytics Generation Flow
3. [User Workflow](#3-user-workflow)
   - 3.1 First Time User
   - 3.2 Returning User — Daily Use
   - 3.3 Reviewing & Correcting Transactions
   - 3.4 Managing Budgets
   - 3.5 Settings & Gmail Connection

---

## 1. DEVELOPMENT WORKFLOW

### 1.1 Environment Setup
> Lakukan sekali di awal. Jangan skip langkah apapun.

```
STEP 1 — Akun & Services (lakukan di browser dulu sebelum coding)
│
├── Buat akun Supabase → supabase.com
│   └── New project → nama: monvora → region: Singapore (terdekat ke Indonesia)
│
├── Buat project Google Cloud Console → console.cloud.google.com
│   ├── New project → nama: monvora
│   ├── Enable APIs:
│   │   ├── Gmail API
│   │   └── Google+ API (untuk OAuth)
│   ├── OAuth consent screen → External → isi nama app + email
│   ├── Credentials → OAuth 2.0 Client ID → Web Application
│   │   ├── Authorized origins: http://localhost:3000
│   │   └── Authorized redirect URIs: http://localhost:3000/auth/callback
│   └── Simpan Client ID + Client Secret
│
├── Buat akun Inngest → inngest.com
│   └── New app → nama: monvora → simpan Event Key + Signing Key
│
└── Buat akun Google AI Studio → aistudio.google.com
    └── Get API Key → simpan Gemini API Key


STEP 2 — Local Project Setup
│
├── Install pnpm (jika belum ada)
│   └── npm install -g pnpm
│
├── Buat Next.js project
│   └── pnpm create next-app@latest monvora --typescript --tailwind --app
│
├── Masuk folder
│   └── cd monvora
│
├── Install dependencies
│   ├── pnpm dlx shadcn@latest init
│   ├── pnpm add @supabase/ssr @supabase/supabase-js
│   ├── pnpm add inngest
│   ├── pnpm add zod
│   ├── pnpm add zustand
│   ├── pnpm add @tanstack/react-query
│   ├── pnpm add tesseract.js
│   ├── pnpm add next-themes
│   └── pnpm add lucide-react
│
├── Buat file .env.local di root project
│   └── Isi semua variable dari .env.example di master.md
│
├── Tambah .env.local ke .gitignore
│   └── Pastikan sudah ada sebelum git commit pertama
│
├── Init Supabase CLI
│   ├── pnpm dlx supabase init
│   └── pnpm dlx supabase login
│
└── Jalankan dev server
    ├── pnpm dev                     → Next.js di localhost:3000
    └── pnpm dlx inngest-cli@latest dev → Inngest di localhost:8288
```

---

### 1.2 Git Branching Strategy
> Simple branching untuk solo developer. Tidak perlu kompleks.

```
BRANCH STRUCTURE

main
│── Hanya berisi kode yang sudah berjalan dan tested
│── Tidak pernah langsung coding di sini
│── Setiap push ke main = otomatis deploy ke Vercel
│
develop
│── Branch utama untuk development aktif
│── Merge ke main hanya kalau fitur sudah selesai dan tested
│
feature/[nama-fitur]
│── Branch untuk setiap fitur baru
│── Contoh: feature/quick-entry, feature/gmail-sync, feature/ocr
│── Dibuat dari develop, merge kembali ke develop
│
fix/[nama-bug]
    └── Branch untuk bug fix
        Contoh: fix/duplicate-transaction, fix/auth-redirect


WORKFLOW HARIAN

1. Mulai kerja
   git checkout develop
   git pull origin develop

2. Buat feature branch
   git checkout -b feature/quick-entry

3. Coding...

4. Simpan progress
   git add .
   git commit -m "feat: add amount input to quick entry form"

5. Selesai fitur → merge ke develop
   git checkout develop
   git merge feature/quick-entry
   git push origin develop

6. Fitur Phase 1 semua selesai → merge ke main
   git checkout main
   git merge develop
   git push origin main  ← ini trigger deploy Vercel


COMMIT MESSAGE FORMAT
feat: tambah fitur baru
fix: perbaiki bug
refactor: ubah struktur kode tanpa ubah fungsi
style: perubahan UI/CSS
docs: update dokumentasi
chore: setup, config, dependency
```

---

### 1.3 Daily Dev Routine

```
SEBELUM MULAI CODING
│
├── Buka master.md → cek phase yang sedang berjalan
├── Buka workflow.md → cek system flow fitur yang akan dibangun
├── Tentukan 1 task yang akan diselesaikan hari ini (hanya 1)
└── Buat atau checkout ke feature branch yang sesuai


SAAT CODING
│
├── Selalu mulai dari API route / data layer → baru ke UI
│   Alasan: kalau data-nya salah, UI apapun tidak berguna
│
├── Setiap API route baru → wajib tambahkan:
│   ├── Session check (auth guard)
│   ├── Zod validation untuk input
│   └── Error handling yang proper
│
├── Setiap komponen baru → tanya dulu:
│   ├── Apakah user perlu memahami istilah ini?
│   ├── Apakah ada loading state?
│   └── Apakah ada empty state?
│
└── Kalau stuck lebih dari 30 menit di satu masalah:
    ├── Tulis dulu apa yang sudah dicoba
    ├── Cari solusi di dokumentasi resmi
    └── Jangan ganti approach tanpa tahu kenapa yang lama gagal


SEBELUM SELESAI KERJA
│
├── Test manual flow yang baru dibuat
├── Commit semua perubahan (jangan tinggalkan uncommitted code)
└── Catat di mana harus lanjut besok (comment di kode atau notes)
```

---

### 1.4 Testing Before Push

```
CHECKLIST SEBELUM SETIAP COMMIT KE DEVELOP

Auth & Security
├── [ ] Route baru sudah ada session check?
├── [ ] Input baru sudah ada Zod validation?
├── [ ] Tidak ada data user lain yang bisa diakses?
└── [ ] Tidak ada API key / secret di dalam kode?

Data Integrity
├── [ ] Amount selalu integer (bukan float)?
├── [ ] Transaksi baru memiliki user_id yang benar?
├── [ ] Soft delete (deleted_at) bukan hard delete?
└── [ ] Duplicate check untuk Gmail transactions?

UI / UX
├── [ ] Loading state sudah ada?
├── [ ] Error state sudah ada?
├── [ ] Empty state sudah ada?
└── [ ] Angka rupiah sudah diformat dengan benar (Rp XX.XXX)?

Manual Test Flow (lakukan di browser)
├── [ ] Login → berhasil redirect ke dashboard?
├── [ ] Fitur baru → happy path berjalan?
├── [ ] Fitur baru → kalau input salah → error message muncul?
└── [ ] Logout → session benar-benar terhapus?
```

---

### 1.5 Deployment Workflow

```
ENVIRONMENT

Local (localhost:3000)
│── Development aktif
│── Gunakan Supabase project terpisah khusus development
│── .env.local berisi development keys
│
Production (monvora.vercel.app atau custom domain)
    └── Hanya dari merge ke main branch
        Gunakan Supabase project production yang berbeda
        Environment variables diset di Vercel dashboard


DEPLOY PROCESS

1. Pastikan semua test manual lolos (checklist di 1.4)
2. Merge develop → main
   git checkout main
   git merge develop
   git push origin main

3. Vercel otomatis deploy (biasanya 1-2 menit)

4. Setelah deploy → test di production URL:
   ├── Login masih berjalan?
   ├── Transaksi bisa disimpan?
   └── Dashboard menampilkan data?

5. Kalau ada masalah di production:
   ├── Jangan panic-fix langsung di main
   ├── Buat branch fix/ dari main
   ├── Fix → test lokal → merge ke main
   └── Vercel akan redeploy otomatis


ROLLBACK (kalau production rusak parah)
Vercel dashboard → Deployments → pilih deployment sebelumnya → Redeploy
```

---

## 2. SYSTEM WORKFLOW

### 2.1 Authentication Flow

```
USER KLIK "Sign in with Google"
│
▼
Next.js redirect ke Google OAuth
│  URL: accounts.google.com/oauth2/...
│  Scopes: openid, email, profile, gmail.readonly
│
▼
User melihat Google consent screen
│  Menampilkan: "Monvora ingin mengakses Gmail (read only)"
│
▼
User klik "Allow"
│
▼
Google redirect ke /auth/callback dengan authorization code
│
▼
/auth/callback route handler (server-side)
│  ├── Exchange code → access token + refresh token
│  ├── Supabase Auth menyimpan session
│  └── Check: apakah user sudah punya profile?
│
├── JIKA USER BARU
│   └── Insert ke public.profiles
│       └── Redirect ke /onboarding
│
└── JIKA USER LAMA
    └── Redirect ke /dashboard


ONBOARDING FLOW (User Baru Saja)
│
▼
Step 1: Welcome screen
│  "Selamat datang di Monvora, [Nama]"
│  Tombol: "Let's get started"
│
▼
Step 2: Add first wallet
│  User mengisi:
│  ├── Wallet name (contoh: "Mandiri Main")
│  ├── Wallet type (Bank / E-wallet / Cash)
│  ├── Provider (pilih dari list)
│  └── Initial balance (boleh 0)
│
▼
Step 3: Gmail sync prompt
│  Penjelasan sederhana: "Kami bisa membaca email notifikasi bank kamu
│  untuk mencatat transaksi otomatis. Kami hanya bisa baca — tidak bisa
│  kirim atau hapus email kamu."
│  ├── Tombol: "Enable Auto-Sync" → aktifkan Gmail sync
│  └── Tombol: "Skip for now" → bisa diaktifkan nanti di Settings
│
▼
Step 4: Done
│  Redirect ke /dashboard
│  Update profiles.onboarding_completed = true


SESSION MANAGEMENT
│
├── Session aktif selama 7 hari
├── Auto-refresh token sebelum expired (Supabase handle otomatis)
├── Kalau session expired → redirect ke /login
└── Logout → hapus session dari Supabase + clear cookies
```

---

### 2.2 Gmail Sync Flow

```
TRIGGER: Inngest job setiap 15 menit
│
▼
Fetch semua users dengan:
│  gmail_sync_enabled = true
│
▼
Untuk setiap user (diproses paralel, bukan sequential):
│
▼
Ambil Gmail OAuth token dari Supabase
│  ├── Token masih valid? → lanjut
│  └── Token expired? → refresh dulu menggunakan refresh token
│      └── Kalau refresh gagal → disable sync, notify user
│
▼
Insert ke gmail_sync_logs: status = 'started'
│
▼
Panggil Gmail API
│  Method: users.history.list
│  Parameter: startHistoryId = profiles.gmail_sync_token
│  Filter: hanya email baru sejak sync terakhir
│
▼
Filter emails berdasarkan sender patterns
│  ├── Cocok dengan pola bank yang dikenal? → proses
│  └── Tidak cocok? → skip
│
▼
Untuk setiap email yang lolos filter:
│  └── Kirim ke Email Parsing Flow (2.3)
│
▼
Update profiles:
│  ├── gmail_last_synced_at = NOW()
│  └── gmail_sync_token = historyId terbaru
│
▼
Update gmail_sync_logs:
│  ├── status = 'completed' (atau 'partial' kalau ada error)
│  ├── emails_scanned = N
│  ├── transactions_found = N
│  └── completed_at = NOW()


ERROR HANDLING
│
├── Gmail API rate limit → Inngest retry otomatis (max 3x, backoff exponential)
├── Parse gagal 1 email → skip email itu, lanjut email berikutnya
├── Database error → rollback, log error, status = 'failed'
└── Token invalid → disable sync, flag di profile, email notifikasi ke user
```

---

### 2.3 Email Parsing Flow

```
INPUT: Raw Gmail message object
│
▼
Identifikasi bank pengirim
│  ├── Cek sender email address
│  ├── Cek subject pattern
│  └── Assign parser yang sesuai (mandiri/bca/bni/bri)
│
▼
Cek duplikat
│  Query: SELECT id FROM transactions WHERE raw_email_id = [gmail_message_id]
│  ├── Sudah ada? → STOP, skip email ini (idempoten)
│  └── Belum ada? → lanjut parsing
│
▼
Jalankan bank-specific parser
│
│  CONTOH: Mandiri Parser
│  ├── Extract amount dari pola: "Rp X.XXX.XXX"
│  ├── Extract merchant dari pola: "Kepada: [nama]" atau "Merchant: [nama]"
│  ├── Extract tanggal dari header email
│  ├── Extract reference number
│  └── Tentukan type: expense / income / transfer
│
▼
Validasi dengan Zod schema
│  ├── Amount: harus integer positif
│  ├── transacted_at: harus valid datetime
│  ├── type: harus salah satu dari enum
│  └── Kalau validasi gagal → log error, skip transaksi ini
│
▼
Set confidence score
│  ├── Semua field berhasil di-extract → confidence: 0.9+
│  ├── Ada field yang missing → confidence: 0.5–0.8
│  └── Banyak field missing → confidence: < 0.5
│
▼
Kirim ke AI Categorization Flow (2.4)
│
▼
Simpan ke database
│  ├── confidence >= 0.7 → is_verified: true (auto-approved)
│  └── confidence < 0.7 → is_verified: false (perlu konfirmasi user)


OUTPUT: ParsedTransaction object siap disimpan ke Supabase
```

---

### 2.4 AI Categorization Flow

```
INPUT: ParsedTransaction (merchant_name, description, amount, payment_method)
│
▼
STEP 1: Rule-based classifier (selalu dicoba dulu)
│
│  Loop melalui CATEGORIZATION_RULES:
│  ├── Ada pattern yang cocok dengan merchant/description?
│  │   ├── YA → return category + confidence: 0.95
│  │   └── TIDAK → lanjut ke rule berikutnya
│  └── Tidak ada rule yang cocok → confidence: 0.0, lanjut ke Step 2
│
▼
STEP 2: Gemini API (hanya kalau rule-based confidence < 0.9)
│
│  Buat prompt dengan konteks transaksi
│  Kirim ke gemini-1.5-flash
│  │
│  ├── Response valid JSON? → parse category + confidence
│  ├── Response tidak valid → fallback ke "Other", confidence: 0.3
│  └── API error / rate limit? → fallback ke rule-based result
│       └── Kalau rule-based juga tidak ada → "Other", confidence: 0.3
│
▼
STEP 3: Return hasil
│
│  {
│    category_id: UUID,
│    confidence: 0.0–1.0,
│    method: 'rule-based' | 'gemini' | 'fallback'
│  }
│
▼
Attach ke transaction sebelum disimpan:
├── ai_category_confidence = confidence score
└── ai_category_raw = raw response untuk debugging


CATATAN PENTING
├── Rule-based tidak pernah gagal total (selalu return sesuatu)
├── Gemini hanya dipakai kalau benar-benar perlu (hemat quota)
└── User selalu bisa ganti kategori manual → override apapun hasil AI
```

---

### 2.5 Manual Entry Flow

```
USER KLIK tombol "+" (Quick Entry)
│
▼
Quick Entry sheet/modal muncul dari bawah
│
▼
STEP 1: Input Amount
│  ├── Number pad muncul otomatis (tidak perlu tap field dulu)
│  ├── Format real-time: 50000 → Rp 50.000
│  └── User ketik nominal → klik Next
│
▼
STEP 2: Pilih Type
│  ├── Money Out (default)
│  ├── Money In
│  └── Transfer
│
▼
STEP 3: Pilih Category
│  ├── Grid icon kategori (visual, bukan dropdown)
│  ├── Default: kategori terakhir yang dipakai
│  └── User tap kategori → highlight, lanjut otomatis
│
▼
STEP 4: Pilih Payment Method
│  ├── List: GoPay / ShopeePay / OVO / DANA / Cash / Bank Transfer / Other
│  └── Default: payment method terakhir yang dipakai
│
▼
STEP 5: Detail (optional)
│  ├── Note / description (opsional)
│  ├── Date & time (default: sekarang, bisa diubah)
│  └── Merchant name (opsional)
│
▼
USER KLIK "Save"
│
▼
Optimistic update (UI langsung update sebelum server konfirmasi)
│  └── Transaksi muncul di list dengan loading indicator kecil
│
▼
Kirim ke API: POST /api/transactions
│  ├── Session check
│  ├── Zod validation
│  └── Insert ke Supabase
│
▼
Server response:
│  ├── SUCCESS → hapus loading indicator, transaksi confirmed
│  └── GAGAL → rollback optimistic update, tampilkan error toast
│      └── "Gagal menyimpan. Coba lagi?"
│
▼
Quick Entry tertutup otomatis
Dashboard balance + list terupdate
```

---

### 2.6 OCR Flow

```
USER KLIK "Scan Screenshot" di Quick Entry
│
▼
Image picker muncul
│  ├── Pilih dari gallery
│  └── Ambil foto langsung (camera)
│  Limit: JPG/PNG, max 5MB
│
▼
Gambar dipilih
│
▼
Tesseract.js memproses CLIENT-SIDE (tidak diupload ke server dulu)
│  ├── Loading indicator: "Reading your screenshot..."
│  └── Extract semua teks dari gambar
│
▼
Parsing engine memproses teks hasil OCR
│  ├── Cari pola nominal (Rp X.XXX.XXX atau angka besar)
│  ├── Cari pola tanggal
│  ├── Cari nama merchant jika ada
│  └── Tentukan payment method dari konteks (logo/teks e-wallet)
│
▼
Pre-fill Quick Entry form dengan hasil OCR
│  ├── Amount → terisi otomatis
│  ├── Date → terisi otomatis
│  ├── Merchant → terisi jika ditemukan
│  └── Field yang tidak ditemukan → kosong, user isi manual
│
▼
USER REVIEW hasil pre-fill
│  ├── Benar semua? → langsung Save
│  └── Ada yang salah? → koreksi manual → Save
│
▼
Disimpan sebagai transaksi manual dengan source: 'ocr'
│
CATATAN:
└── OCR tidak pernah auto-save tanpa konfirmasi user
    User selalu jadi "last check" sebelum data masuk database
```

---

### 2.7 Analytics Generation Flow

```
USER BUKA halaman Analytics
│
▼
React Query check cache
│  ├── Cache masih valid (< 5 menit)? → tampilkan dari cache langsung
│  └── Cache expired atau belum ada? → fetch dari API
│
▼
GET /api/analytics?period=monthly&month=2026-05
│  ├── Session check
│  └── Query Supabase dengan aggregasi:
│
│      Spending by category:
│      SELECT category_id, SUM(amount) FROM transactions
│      WHERE user_id = ? AND type = 'expense'
│      AND transacted_at >= [start] AND transacted_at <= [end]
│      GROUP BY category_id
│
│      Monthly trend (6 bulan terakhir):
│      SELECT DATE_TRUNC('month', transacted_at), SUM(amount)
│      FROM transactions WHERE user_id = ? AND type = 'expense'
│      GROUP BY 1 ORDER BY 1
│
│      Top merchants:
│      SELECT merchant_name, COUNT(*), SUM(amount)
│      FROM transactions WHERE user_id = ?
│      GROUP BY merchant_name ORDER BY SUM(amount) DESC LIMIT 5
│
▼
AI Insights (sekali per hari, bukan per request)
│  ├── Check: apakah insight hari ini sudah di-generate?
│  │   ├── Sudah (cache hit) → return cached insights
│  │   └── Belum → generate dengan Gemini
│  │
│  └── Gemini prompt berisi summary data bulan ini vs bulan lalu
│      Return: array of insight strings dalam bahasa Inggris
│      Contoh: "Food spending up 35% vs last month"
│
▼
Return semua data ke frontend
│
▼
Frontend render:
├── Donut chart → category breakdown
├── Line chart → monthly trend
├── Bar chart → day of week pattern
├── Ranked list → top merchants
└── Insight cards → AI-generated observations
```

---

## 3. USER WORKFLOW

### 3.1 First Time User

```
[1] DISCOVERY
    User menemukan Monvora (link, referral, dst)
    Membuka monvora.app di browser
    │
    ▼
[2] LANDING PAGE
    Melihat value proposition: "Track your spending automatically"
    Melihat preview dashboard (screenshot/demo)
    Klik "Get Started — it's free"
    │
    ▼
[3] LOGIN
    Klik "Sign in with Google"
    Pilih akun Google
    Google consent screen muncul
    User membaca permission yang diminta
    Klik "Allow"
    │
    ▼
[4] ONBOARDING — Step 1: Welcome
    "Welcome to Monvora, [Nama]!"
    Penjelasan singkat 3 kalimat tentang apa itu Monvora
    Klik "Let's set up your account"
    │
    ▼
[5] ONBOARDING — Step 2: Add First Wallet
    "Where do you keep your money?"
    User mengisi:
    ├── Nama wallet (contoh: Mandiri Main)
    ├── Tipe (Bank Account)
    ├── Provider (Mandiri)
    └── Saldo awal (boleh 0 kalau tidak tahu)
    Klik "Add Wallet"
    │
    ▼
[6] ONBOARDING — Step 3: Gmail Auto-sync
    "Want Monvora to track bank transactions automatically?"
    Penjelasan singkat + jaminan: "Read only. We can never send or delete emails."
    │
    ├── Klik "Yes, enable auto-sync"
    │   └── OAuth scope gmail.readonly dikonfirmasi
    │       Inngest job dijadwalkan untuk user ini
    │
    └── Klik "Maybe later"
        └── Bisa diaktifkan di Settings > Gmail Sync
    │
    ▼
[7] DASHBOARD (pertama kali)
    Empty state yang friendly:
    ├── "No transactions yet"
    ├── "Add your first transaction manually"
    └── Tombol besar: "+ Add Transaction"
    │
    ▼
[8] USER MENCOBA QUICK ENTRY
    Input transaksi pertama secara manual
    Melihat transaksi muncul di dashboard
    Mulai memahami cara kerja app
```

---

### 3.2 Returning User — Daily Use

```
PAGI HARI
│
[1] Buka Monvora (bookmark / PWA icon di homescreen)
    Auto-login karena session masih aktif
    │
    ▼
[2] Dashboard langsung muncul
    User melihat:
    ├── Total balance semua wallet
    ├── Berapa yang sudah keluar bulan ini
    └── Transaksi terbaru (mungkin sudah ada yang masuk otomatis dari Gmail)
    │
    ▼
[3] Cek transaksi otomatis
    "3 new transactions synced from your bank"
    User scroll recent transactions
    Semua terlihat benar → tidak perlu action apapun
    │

SIANG HARI — Setelah Bayar Makan Pakai GoPay
│
[1] Buka Monvora
    Klik tombol "+" di kanan bawah
    │
    ▼
[2] Quick Entry terbuka
    Number pad langsung aktif
    Ketik: 45000
    │
    ▼
[3] Pilih Type: Money Out
    Pilih Category: Food & Beverage (icon makanan)
    Pilih Payment: GoPay
    │
    ▼
[4] Klik Save
    Transaksi tersimpan dalam < 3 detik
    Dashboard terupdate
    Kembali ke aktivitas normal
    │

MALAM HARI — Review Pengeluaran Hari Ini
│
[1] Buka Monvora
    Lihat dashboard
    │
    ▼
[2] Tap "This Month" summary
    Lihat total pengeluaran hari ini
    Lihat kategori terbanyak
    │
    ▼
[3] Kalau ada transaksi mencurigakan atau salah kategori
    Tap transaksi → Edit → ubah kategori → Save
    │
    ▼
[4] Tutup app
    Selesai — kurang dari 2 menit
```

---

### 3.3 Reviewing & Correcting Transactions

```
SKENARIO: Ada transaksi yang dikategorikan salah oleh AI
│
[1] User melihat notifikasi atau badge:
    "2 transactions need your review"
    (Transaksi dengan is_verified: false)
    │
    ▼
[2] Buka Transactions page
    Filter: "Needs Review"
    │
    ▼
[3] Tap transaksi yang perlu direview
    Detail transaksi muncul:
    ├── Amount: Rp 89.000
    ├── Merchant: STEAM PURCHASE
    ├── AI Category: Shopping (confidence: 65%)
    └── "AI tidak yakin dengan kategori ini. Pilih yang benar:"
    │
    ▼
[4] User tap kategori yang benar: Entertainment
    │
    ▼
[5] Klik "Confirm"
    ├── is_verified: true
    ├── Category diupdate
    └── AI rule baru ditambahkan: "STEAM" → Entertainment
        (agar next time langsung benar)
    │
    ▼
[6] Kembali ke list
    Badge "Needs Review" berkurang 1


SKENARIO: Transaksi duplikat terdeteksi
│
[1] User melihat transaksi yang sama muncul 2x
    (Bisa terjadi kalau manual entry + Gmail sync keduanya mencatat)
    │
    ▼
[2] Tap transaksi yang duplikat
    Klik "Delete"
    Konfirmasi: "Are you sure? This cannot be undone."
    Klik "Yes, delete"
    │
    ▼
[3] Transaksi di-soft delete (deleted_at diisi, tidak hilang dari database)
    Dashboard terupdate
```

---

### 3.4 Managing Budgets

```
SETUP BUDGET (pertama kali)
│
[1] Buka menu Budgets
    Empty state: "No budgets yet. Set limits to track your spending."
    Klik "+ Add Budget"
    │
    ▼
[2] Isi form budget:
    ├── Category: Food & Beverage
    ├── Monthly limit: Rp 1.500.000
    └── Klik "Save Budget"
    │
    ▼
[3] Budget card muncul:
    ├── Food & Beverage
    ├── Progress bar: Rp 450.000 / Rp 1.500.000 (30%)
    └── "Rp 1.050.000 remaining this month"


MONITORING BUDGET — Daily
│
[1] Dashboard menampilkan budget summary
    ├── Hijau: di bawah 80% limit
    ├── Kuning: 80–99% limit → warning
    └── Merah: 100%+ → over budget
    │
    ▼
[2] Kalau over budget:
    Notifikasi muncul: "You've exceeded your Food & Beverage budget"
    User bisa:
    ├── Terima (tetap catat pengeluaran)
    └── Adjust budget limit untuk bulan ini
```

---

### 3.5 Settings & Gmail Connection

```
MENGAKTIFKAN GMAIL SYNC (kalau skip saat onboarding)
│
[1] Buka Settings
    Tap "Gmail Sync"
    │
    ▼
[2] Status: Disconnected
    Penjelasan: "Connect Gmail to automatically import bank transactions"
    List bank yang didukung: Mandiri, BCA, BNI, BRI, CIMB
    Klik "Connect Gmail"
    │
    ▼
[3] Google OAuth consent (gmail.readonly scope)
    User klik Allow
    │
    ▼
[4] Redirect kembali ke Settings
    Status: Connected ✓
    "Last synced: just now"
    "3 transactions imported"
    │

MENONAKTIFKAN GMAIL SYNC
│
[1] Settings → Gmail Sync
    Klik "Disconnect Gmail"
    Konfirmasi: "This will stop automatic sync. Existing transactions are kept."
    Klik "Yes, disconnect"
    │
    ▼
[2] Token dihapus dari database
    gmail_sync_enabled = false
    Transaksi lama tetap ada (tidak dihapus)
    │

MENGUBAH PREFERENSI LAIN
│
Settings page berisi:
├── Profile (nama, avatar dari Google)
├── Wallets (kelola daftar wallet)
├── Categories (tambah/edit kategori custom)
├── Gmail Sync (status + toggle)
├── Appearance
│   ├── Theme: Light / Dark / System (default)
│   └── System = mengikuti setting device secara otomatis
├── Notifications (coming soon)
├── Language (English / Indonesia — Phase 3)
└── Sign Out
```

---

## QUICK REFERENCE: FLOW DECISION TREE

```
Ada transaksi baru?
│
├── Dari bank? → Tunggu Gmail auto-sync (tiap 15 menit)
│               atau trigger manual sync di Settings
│
├── Dari e-wallet? (GoPay, ShopeePay, dll)
│   ├── Ada screenshot struk? → Pakai OCR Scan
│   └── Tidak ada? → Quick Entry manual
│
└── Cash? → Quick Entry manual


Transaksi sudah masuk tapi salah?
│
├── Salah kategori? → Tap transaksi → Edit kategori
├── Salah nominal? → Tap transaksi → Edit amount
├── Duplikat? → Tap transaksi → Delete
└── Tidak perlu dicatat? → Tap transaksi → Delete


Mau lihat laporan?
│
├── Hari ini → Dashboard (scroll ke bawah)
├── Bulan ini → Analytics → Monthly view
├── Kategori tertentu → Transactions → Filter by category
└── Merchant tertentu → Transactions → Search merchant name
```

---

*Document maintained by: Solo Developer*
*Referenced from: master.md v2*
*Next review: After Phase 1 completion*
