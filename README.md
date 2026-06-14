# Monvora

**Personal finance OS untuk pengguna Indonesia.**
Catat pengeluaran tanpa repot — Monvora membaca notifikasi transaksi bank dari Gmail kamu, mengenali transaksi e-wallet dari screenshot, dan merangkum keuangan kamu jadi insight yang gampang dimengerti.

---

## Kenapa Monvora?

Aplikasi pencatat keuangan kebanyakan butuh kamu input manual semua transaksi. Monvora otomatisasi bagian yang membosankan, jadi kamu cuma fokus ke yang penting: tahu uang kamu lari ke mana.

- 📧 **Auto-sync dari Gmail** — Notifikasi transaksi Mandiri, BCA, BNI, BRI, CIMB langsung jadi catatan, tanpa input manual.
- 📸 **Scan struk & screenshot** — Foto struk atau screenshot GoPay / ShopeePay / OVO / DANA / QRIS, semua di-extract otomatis.
- ✍️ **Quick entry** — Cash dan e-wallet yang tidak ter-track tinggal masuk dalam 3 detik.
- 📊 **Insight harian** — Ringkasan AI tiap pagi: kategori boros, tren mingguan, langganan berulang.
- 🎯 **Budget per kategori** — Set target mingguan / bulanan / tahunan, dapat warning di 80% dan 100%.
- 💼 **Multi-wallet** — Pisah cash, rekening, dan e-wallet biar saldo per dompet kelihatan jelas.

---

## Fitur Lengkap

| Fitur | Detail |
|---|---|
| **Gmail Sync** | Auto-import dari 5 bank besar (Mandiri, BCA, BNI, BRI, CIMB). Cuma akses `gmail.readonly` — kami tidak bisa kirim atau hapus email kamu. |
| **OCR Screenshot** | Powered by Gemini Vision. Otomatis kenali nominal, merchant, tanggal, metode bayar. |
| **Quick Entry** | Tab Pengeluaran / Pemasukan / Top-up. Optimistic update — UI langsung jalan walau koneksi lambat. |
| **Multi-Wallet** | Bank, e-wallet, cash. Saldo per dompet + saldo total. |
| **Analytics** | Tren pengeluaran, breakdown kategori (donut), top merchant, pola hari. |
| **AI Insights** | Ringkasan harian (cron jam 7 pagi WIB). Bahasa Indonesia, fokus actionable. |
| **Budget** | Target per kategori (mingguan/bulanan/tahunan). Progress bar + warning. |
| **Recurring** | Otomatis deteksi langganan berulang (Netflix, Spotify, dsb) dan tag-kan. |
| **PWA** | Bisa di-install ke home screen. Ada halaman offline. |
| **Dark mode** | Mengikuti system, atau pilih manual. |
| **Privacy-first** | Tidak ada iklan. Tidak jual data. Bisa cabut akses Gmail & hapus akun kapan saja. |

---

## Privacy & Keamanan

Aplikasi keuangan = data sensitif. Beberapa janji teknis:

- **Gmail scope minimal** — hanya `gmail.readonly`. Tidak bisa modify, kirim, atau hapus email.
- **Token disimpan server-side** — bukan di localStorage browser. Cookie session HttpOnly.
- **Row-Level Security** — di tingkat database, user A secara fisik tidak bisa baca data user B.
- **Soft delete** — data finansial tidak pernah hilang permanen. Bisa di-recover.
- **TLS in transit** — semua koneksi terenkripsi.
- **Hosting** — Supabase Singapore (data residency Asia Tenggara) + Vercel.

Detail di halaman [`/privacy`](./app/privacy/page.tsx) dan [`/gmail-permissions`](./app/gmail-permissions/page.tsx).

---

## Tech Stack

| Layer | Pilihan |
|---|---|
| Framework | Next.js 16 (App Router) + TypeScript |
| UI | Tailwind CSS + shadcn/ui + Recharts |
| State | Zustand + TanStack Query |
| Database | Supabase (PostgreSQL + Row-Level Security) |
| Auth | Supabase Auth + Google OAuth |
| Background jobs | Inngest |
| AI | Gemini 2.5 Flash (insights, OCR vision, parser fallback) |
| PWA | Serwist |
| Monitoring | Sentry + Vercel Speed Insights + Plausible (opsional) |
| Testing | Vitest · Testing Library · Playwright |
| Hosting | Vercel + Supabase Cloud |

---

## Jalankan Secara Lokal

**Prasyarat:** Node.js 20+, pnpm, project Supabase, Google OAuth credentials, Gemini API key.

```bash
# 1. Clone & install
git clone <repo-url>
cd Monvora
pnpm install

# 2. Setup environment
cp .env.example .env.local
# Isi semua variabel — lihat .env.example untuk daftar lengkap

# 3. Apply database migrations
# Lewat dashboard Supabase atau Supabase CLI:
#   supabase db push

# 4. Jalankan dev server
pnpm dev

# 5. (Opsional, kalau mau test background job)
pnpm inngest
```

Buka [http://localhost:3000](http://localhost:3000).

### Environment Variables

Yang wajib di-set:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GEMINI_API_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Yang opsional: Sentry, Plausible, Google Pub/Sub (untuk push notification Gmail di production). Lengkap di `.env.example`.

---

## Scripts

```bash
pnpm dev              # Dev server
pnpm build            # Production build
pnpm start            # Serve production build
pnpm lint             # Lint

pnpm test             # Unit tests (Vitest)
pnpm test:watch       # Watch mode
pnpm test:coverage    # Coverage report
pnpm test:e2e         # E2E (Playwright)
pnpm test:all         # Unit + E2E

pnpm inngest          # Inngest dev server
```

---

## Struktur Project

```
app/                  → Halaman Next.js (App Router) + API routes
components/           → UI components (shadcn primitives + custom)
lib/                  → Business logic (Gmail, AI, OCR, analytics, budget, dll)
supabase/migrations/  → SQL migrations
tests/                → Unit + integration tests
docs/                 → Dokumentasi teknis lengkap
public/               → Static assets + PWA icons
```

---

## Status Pengembangan

```
Versi App   : v0.3.0
Phase saat ini : Public Ready (in progress)
Test suite  : 577 passing
```

| Phase | Status | Highlight |
|---|---|---|
| 1 — Core Loop | ✅ | Auth, multi-wallet, transactions CRUD, dashboard |
| 2 — Gmail Automation | ✅ | Parser 5 bank, AI categorization, sync job |
| 3 — Intelligence Layer | ✅ | PWA, analytics, AI insights, budget, OCR, recurring |
| 4 — Public Ready | 🔄 | Hardening, privacy, landing, feedback, onboarding |

---

## Kontak

- Privacy / data: privasi@monvora.app
- Pertanyaan umum: lewat halaman Settings → Feedback di dalam app

---

## Lisensi

Proprietary. All rights reserved.
