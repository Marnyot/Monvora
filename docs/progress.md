# MONVORA — Progress Tracker
> Dokumen living — diupdate setiap kali ada progress, keputusan baru, atau perubahan arah
> Referenced from: CLAUDE.md
> ⚠️ Update dokumen ini setiap selesai satu task — jangan tunggu phase selesai

---

## DOCUMENT VERSION HISTORY

| Version | Date | Updated By | Changes |
|---|---|---|---|
| v1 | May 24, 2026 | Claude | Initial creation — project kickoff |

**Current Version:** v1
**Last Updated:** May 24, 2026

---

## TABLE OF CONTENTS

1. [Project Status](#1-project-status)
2. [Phase Overview](#2-phase-overview)
3. [Phase 1 — Core Loop](#3-phase-1--core-loop)
4. [Phase 2 — Gmail Automation](#4-phase-2--gmail-automation)
5. [Phase 3 — Intelligence Layer](#5-phase-3--intelligence-layer)
6. [Phase 4 — Public Ready](#6-phase-4--public-ready)
7. [Decisions Log](#7-decisions-log)
8. [Blockers & Issues](#8-blockers--issues)
9. [Lessons Learned](#9-lessons-learned)
10. [App Version History](#10-app-version-history)

---

## 1. PROJECT STATUS

```
Status          : 🟢 Development — Phase 1
Current Phase   : Phase 1 — Core Loop
App Version     : v0.1.0-dev (auth + DB done)
Last Updated    : May 25, 2026
Next Milestone  : Onboarding flow + Wallet management
```

### Overall Progress

```
Documentation   ████████████████████ 100% (10/10 docs selesai)
Phase 1         ███████░░░░░░░░░░░░░  35% (DB + auth + wallet CRUD done, mulai categories)
Phase 2         ░░░░░░░░░░░░░░░░░░░░   0%
Phase 3         ░░░░░░░░░░░░░░░░░░░░   0%
Phase 4         ░░░░░░░░░░░░░░░░░░░░   0%
```

### Status Legend
```
✅ Done          — selesai dan tested
🔄 In Progress   — sedang dikerjakan
⏳ Pending       — belum dimulai, tidak ada blocker
🔴 Blocked       — ada blocker yang harus diselesaikan dulu
⏭️ Skipped       — sengaja dilewati dengan alasan
```

---

## 2. PHASE OVERVIEW

| Phase | Fokus | Target | Status | App Version |
|---|---|---|---|---|
| Pre-Dev | Documentation | May 24, 2026 | ✅ Done | v0.0.0 |
| Phase 1 | Core Loop (manual tracking) | Week 4 | ⏳ Pending | v0.1.0 |
| Phase 2 | Gmail Automation | Week 10 | ⏳ Pending | v0.2.0 |
| Phase 3 | Intelligence Layer | Week 16 | ⏳ Pending | v0.3.0 |
| Phase 4 | Public Ready | Week 20 | ⏳ Pending | v1.0.0 |

---

## 3. PHASE 1 — CORE LOOP

**Goal:** App bisa dipakai sendiri untuk tracking transaksi manual
**Target App Version:** v0.1.0
**Estimated Duration:** 4 minggu

### Setup & Infrastructure

| Task | Status | Notes |
|---|---|---|
| Install pnpm | ✅ | pnpm v10.33.0, Node v24.14.1 |
| Create Next.js 14 project | ✅ | next@14.2.35, TypeScript, Tailwind v3, App Router, `@/*` alias |
| Install semua dependencies | ✅ | shadcn (manual config: default style, slate, CSS vars), supabase, inngest, zod, zustand, tanstack-query, next-themes, lucide-react, sonner |
| Setup Supabase project (cloud) | ✅ | Migrations applied via MCP (region: Singapore) |
| Run database migrations | ✅ | 001_initial_schema.sql + 002_seed_categories.sql applied |
| Setup Google Cloud Console | ⏳ | Enable Gmail API + OAuth |
| Configure OAuth credentials | ⏳ | Authorized origins + redirect URIs |
| Setup Inngest account | ⏳ | |
| Setup Gemini API key | ⏳ | Google AI Studio |
| Setup .env.local | ⏳ | Dari .env.example |
| Add .env.local ke .gitignore | ✅ | Covered oleh `.env*.local` pattern |
| Init git + push ke GitHub | ⏳ | |
| Deploy ke Vercel (awal) | ⏳ | Setup CI dari awal |
| Setup Vitest + Testing Library | ✅ | 21 tests passing (currency + date + auth) |

### Authentication

| Task | Status | Notes |
|---|---|---|
| Google OAuth login page | ✅ | `app/(auth)/login/page.tsx` dengan GoogleLoginButton + error state |
| OAuth callback handler | ✅ | `app/auth/callback/route.ts` — exchange code → redirect /dashboard |
| Session middleware | ✅ | `middleware.ts` — guard semua `/dashboard/*` |
| Auto-create profile on first login | ✅ | DB trigger `on_auth_user_created` di migration |
| Redirect logic (login ↔ dashboard) | ✅ | Di middleware + root page redirect |
| Logout endpoint | ✅ | `app/api/auth/logout/route.ts` — POST → signOut → /login |
| **Test: auth flow** | ⏳ | E2E: login → dashboard → logout |

### Database Schema

| Task | Status | Notes |
|---|---|---|
| Migration: profiles table + RLS | ✅ | Applied via Supabase MCP |
| Migration: wallets table + RLS | ✅ | Applied via Supabase MCP |
| Migration: categories table + RLS | ✅ | Applied via Supabase MCP |
| Migration: transactions table + RLS | ✅ | Applied via Supabase MCP |
| Migration: budgets table + RLS | ✅ | Applied via Supabase MCP |
| Migration: gmail_sync_logs table + RLS | ✅ | Applied via Supabase MCP |
| Seed: default categories | ✅ | 20 kategori sistem (12 expense, 7 income, 1 transfer) |
| Generate Supabase TypeScript types | ✅ | `types/database.ts` ter-generate dari schema live |
| **Test: RLS policies** | ⏳ | Verifikasi user A tidak bisa akses data user B |

### Onboarding

| Task | Status | Notes |
|---|---|---|
| Welcome screen | ⏳ | |
| Add first wallet step | ⏳ | |
| Gmail sync prompt step | ⏳ | Dengan penjelasan permission |
| Mark onboarding_completed | ⏳ | |
| Redirect ke dashboard setelah selesai | ⏳ | |

### Wallet Management

| Task | Status | Notes |
|---|---|---|
| API: GET /api/wallets | ✅ | Auth-gated, filters deleted_at IS NULL |
| API: POST /api/wallets | ✅ | Zod validation, user_id dari session |
| API: PATCH /api/wallets/:id | ✅ | Ownership check → 404 jika bukan milik user |
| API: DELETE /api/wallets/:id (soft) | ✅ | Soft delete via deleted_at |
| UI: Wallet list page | ✅ | `app/(dashboard)/wallets/page.tsx` — Server Component |
| UI: Add wallet form | ✅ | Bottom sheet, color picker, Zod validation client-side |
| UI: Edit wallet | ✅ | Same form with pre-filled data |
| UI: Archive wallet | ✅ | Soft delete via ConfirmDialog → DELETE /api/wallets/:id |
| **Test: wallet CRUD** | ✅ | WalletCard component tests, validation schema tests (45 total) |

### Category Management

| Task | Status | Notes |
|---|---|---|
| API: GET /api/categories | ⏳ | Sistem + milik user |
| API: POST /api/categories | ⏳ | Hanya custom |
| API: PATCH /api/categories/:id | ⏳ | |
| API: DELETE /api/categories/:id | ⏳ | |
| UI: Category list | ⏳ | Icon grid |
| UI: Add custom category | ⏳ | |
| **Test: category API** | ⏳ | |

### Quick Entry (Manual Transaction)

| Task | Status | Notes |
|---|---|---|
| API: POST /api/transactions | ⏳ | Dengan Zod validation |
| UI: FAB button (floating) | ⏳ | Fixed bottom right |
| UI: Quick entry bottom sheet | ⏳ | Slide dari bawah |
| UI: Number pad / amount input | ⏳ | inputMode="numeric", autoFocus |
| UI: Type selector (in/out/transfer) | ⏳ | |
| UI: Category icon grid | ⏳ | |
| UI: Payment method selector | ⏳ | |
| UI: Note input (optional) | ⏳ | |
| UI: Date picker (default now) | ⏳ | |
| Optimistic update | ⏳ | Transaksi langsung muncul sebelum server confirm |
| **Test: quick entry < 10 detik** | ⏳ | E2E timer test |
| **Test: form validation** | ⏳ | Amount 0, tanpa kategori |

### Transaction List

| Task | Status | Notes |
|---|---|---|
| API: GET /api/transactions | ⏳ | Dengan pagination + filter |
| UI: Transaction list page | ⏳ | |
| UI: Transaction card component | ⏳ | |
| UI: Filter bar | ⏳ | Type, kategori, tanggal |
| UI: Search input | ⏳ | Merchant + description |
| UI: Pagination | ⏳ | |
| UI: Empty state | ⏳ | |
| UI: Skeleton loader | ⏳ | |
| **Test: filter + search** | ⏳ | |

### Transaction Detail & Edit

| Task | Status | Notes |
|---|---|---|
| API: GET /api/transactions/:id | ⏳ | |
| API: PATCH /api/transactions/:id | ⏳ | |
| API: DELETE /api/transactions/:id (soft) | ⏳ | |
| UI: Transaction detail page | ⏳ | |
| UI: Edit form | ⏳ | |
| UI: Delete dengan konfirmasi | ⏳ | |
| **Test: ownership verification** | ⏳ | User A tidak bisa edit transaksi User B |

### Dashboard

| Task | Status | Notes |
|---|---|---|
| API: GET /api/analytics (basic) | ⏳ | Hanya summary bulan ini |
| UI: Balance card | ⏳ | Total semua wallet |
| UI: Cashflow summary | ⏳ | Income vs expense bulan ini |
| UI: Recent transactions | ⏳ | 10 terakhir |
| UI: Empty state (user baru) | ⏳ | |
| UI: Skeleton loader | ⏳ | |
| **Test: dashboard render** | ⏳ | |

### Theme & UI Foundation

| Task | Status | Notes |
|---|---|---|
| Setup next-themes ThemeProvider | ✅ | `components/providers.tsx`, lang="id", suppressHydrationWarning |
| Configure Tailwind dark mode | ✅ | darkMode: ["class"], font-sans → Geist via CSS var |
| Theme toggle component | ✅ | `components/shared/theme-toggle.tsx` — dropdown Light/Dark/System |
| Bottom navigation (mobile) | ⏳ | |
| Sidebar navigation (desktop) | ⏳ | |
| AmountDisplay component | ✅ | Hijau income / merah expense / neutral transfer, prefix ±− |
| CurrencyDisplay component | ✅ | Wraps formatIDR, tabular-nums |
| EmptyState component | ✅ | Icon + title + desc + optional action button |
| SkeletonCard component | ✅ | SkeletonCard + SkeletonList helper |
| ConfirmDialog component | ✅ | Dialog wrapper, destructive variant, isPending state |
| Toast notifications (Sonner) | ⏳ | |
| **Test: light + dark mode** | ⏳ | Visual check semua halaman |

### Phase 1 Completion Criteria
```
✅ Developer bisa login dengan Google
✅ Developer bisa tambah wallet
✅ Developer bisa input transaksi manual < 10 detik
✅ Developer bisa lihat daftar transaksi
✅ Developer bisa edit dan hapus transaksi
✅ Dashboard menampilkan total balance dan cashflow bulan ini
✅ Light/dark/system theme berfungsi
✅ Semua test passing
✅ Deploy ke Vercel berjalan
✅ Tidak ada data user lain yang bisa diakses
```

---

## 4. PHASE 2 — GMAIL AUTOMATION

**Goal:** 70%+ transaksi bank masuk otomatis tanpa input manual
**Target App Version:** v0.2.0
**Estimated Duration:** 6 minggu (Week 5–10)
**Prerequisite:** Phase 1 selesai 100%

### Gmail Integration

| Task | Status | Notes |
|---|---|---|
| Expand OAuth scope ke gmail.readonly | ⏳ | Update Google Cloud Console |
| Gmail API client wrapper | ⏳ | `lib/gmail/client.ts` |
| Token management (store historyId) | ⏳ | Di profiles.gmail_sync_token |
| Token refresh handling | ⏳ | Supabase handle otomatis |
| Revocation handling (graceful disable) | ⏳ | |

### Inngest Background Jobs

| Task | Status | Notes |
|---|---|---|
| Setup Inngest client | ⏳ | |
| Job: gmail-sync (setiap 15 menit) | ⏳ | |
| Job error handling + retry logic | ⏳ | Max 3x, exponential backoff |
| Logging ke gmail_sync_logs | ⏳ | |
| Concurrency control (max 10 user paralel) | ⏳ | |

### Parser Engine

| Task | Status | Notes |
|---|---|---|
| Base parser interface | ⏳ | `lib/gmail/parsers/base.ts` |
| Parser registry + auto-detection | ⏳ | `lib/gmail/parsers/index.ts` |
| Mandiri parser | ⏳ | Prioritas pertama |
| BCA parser | ⏳ | |
| BNI parser | ⏳ | |
| BRI parser | ⏳ | |
| CIMB parser | ⏳ | |
| Generic fallback parser | ⏳ | |
| Duplicate detection (raw_email_id) | ⏳ | |
| Confidence scoring | ⏳ | |
| Zod validation untuk ParsedTransaction | ⏳ | |
| **Test: setiap parser dengan email fixture** | ⏳ | Min 5 test case per bank |
| **Test: duplicate detection** | ⏳ | |
| **Test: generic fallback** | ⏳ | |

### AI Categorization

| Task | Status | Notes |
|---|---|---|
| Rule-based engine | ⏳ | `lib/ai/rules.ts` |
| Gemini API client | ⏳ | `lib/ai/gemini.ts` |
| Categorization orchestration | ⏳ | Rules → Gemini → fallback |
| **Test: rule coverage ≥ 80% merchant umum** | ⏳ | |
| **Test: Gemini fallback saat API error** | ⏳ | |

### Settings — Gmail

| Task | Status | Notes |
|---|---|---|
| UI: Gmail sync settings page | ⏳ | Status + enable/disable |
| UI: Connect Gmail button | ⏳ | |
| UI: Disconnect Gmail | ⏳ | Dengan konfirmasi |
| UI: Last synced timestamp | ⏳ | |
| UI: Recent sync logs | ⏳ | |
| API: POST /api/sync/gmail (manual trigger) | ⏳ | |
| API: GET /api/sync/status | ⏳ | |
| Sync status indicator di dashboard | ⏳ | Badge kecil |

### Phase 2 Completion Criteria
```
✅ Gmail sync berjalan otomatis setiap 15 menit
✅ Minimal 70% transaksi bank terbaca otomatis
✅ Parse accuracy ≥ 95% untuk nominal transaksi
✅ Kategorisasi accuracy ≥ 80% tanpa koreksi manual
✅ Duplicate tidak pernah terjadi
✅ Gagal sync di-log dan tidak crash app
✅ User bisa connect/disconnect Gmail dari settings
✅ Semua parser tested dengan email fixtures nyata
```

---

## 5. PHASE 3 — INTELLIGENCE LAYER

**Goal:** Insight cerdas + OCR + analytics + budget
**Target App Version:** v0.3.0
**Estimated Duration:** 6 minggu (Week 11–16)
**Prerequisite:** Phase 2 selesai 100%

### Analytics

| Task | Status | Notes |
|---|---|---|
| API: GET /api/analytics (lengkap) | ⏳ | |
| UI: Analytics page | ⏳ | |
| UI: Spending trend chart (6 bulan) | ⏳ | Recharts atau Chart.js |
| UI: Category breakdown donut chart | ⏳ | |
| UI: Top merchants list | ⏳ | |
| UI: Day-of-week pattern | ⏳ | |
| TanStack Query caching (5 menit) | ⏳ | |

### AI Insights

| Task | Status | Notes |
|---|---|---|
| Inngest job: daily-insights (07:00 WIB) | ⏳ | |
| Gemini prompt untuk insights Bahasa Indonesia | ⏳ | |
| Cache insights di database (24 jam) | ⏳ | |
| UI: AI insights cards di dashboard | ⏳ | |
| **Test: insights dalam Bahasa Indonesia** | ⏳ | |

### OCR Screenshot

| Task | Status | Notes |
|---|---|---|
| Tesseract.js client-side processing | ⏳ | Tidak upload gambar ke server |
| API: POST /api/ocr (terima teks, bukan gambar) | ⏳ | |
| OCR parsing engine | ⏳ | Extract amount, merchant, tanggal |
| UI: Scan screenshot button di quick entry | ⏳ | |
| UI: Image picker (gallery + camera) | ⏳ | |
| UI: Pre-fill form dari hasil OCR | ⏳ | |
| UI: User review sebelum save | ⏳ | |
| **Test: OCR parsing berbagai format** | ⏳ | GoPay, ShopeePay, OVO |

### Budget System

| Task | Status | Notes |
|---|---|---|
| API: CRUD /api/budgets | ⏳ | |
| Budget utilization calculation | ⏳ | |
| Warning trigger di 80% | ⏳ | |
| Over budget trigger di 100% | ⏳ | |
| UI: Budget list page | ⏳ | |
| UI: Budget card + progress bar | ⏳ | |
| UI: Create/edit budget form | ⏳ | |
| UI: Budget summary di dashboard | ⏳ | |

### Recurring Detection

| Task | Status | Notes |
|---|---|---|
| Algorithm: deteksi transaksi berulang | ⏳ | Sama merchant + interval reguler |
| Tag transaksi sebagai recurring | ⏳ | `is_recurring: true` |
| UI: Recurring badge di transaction card | ⏳ | |
| UI: Recurring summary di analytics | ⏳ | |

### PWA

| Task | Status | Notes |
|---|---|---|
| manifest.json | ⏳ | App name, icons, theme color |
| Service worker (Next.js built-in) | ⏳ | |
| Installable di iOS + Android | ⏳ | |
| Offline fallback page | ⏳ | |

---

## 6. PHASE 4 — PUBLIC READY

**Goal:** Siap dipakai orang lain selain developer
**Target App Version:** v1.0.0
**Estimated Duration:** 4 minggu (Week 17–20)
**Prerequisite:** Phase 3 selesai + self-use minimal 2 minggu

### Polish & Onboarding

| Task | Status | Notes |
|---|---|---|
| Landing page | ⏳ | Value proposition + CTA |
| Onboarding flow improvements | ⏳ | Berdasarkan self-use feedback |
| Error monitoring setup (Sentry) | ⏳ | Dengan PII scrubbing |
| Analytics (Plausible — privacy first) | ⏳ | |

### Security Hardening

| Task | Status | Notes |
|---|---|---|
| Security audit semua API routes | ⏳ | Ikuti checklist security.md |
| Rate limiting hardening | ⏳ | |
| Security headers verification | ⏳ | |
| Penetration test manual (IDOR, auth bypass) | ⏳ | |

### Documentation User

| Task | Status | Notes |
|---|---|---|
| Penjelasan Gmail permission (halaman dedicated) | ⏳ | Bangun kepercayaan user |
| Privacy policy | ⏳ | |
| Feedback mechanism | ⏳ | Simple form atau email |

---

## 7. DECISIONS LOG

Keputusan yang sudah dibuat dan tidak perlu didiskusikan ulang.
Untuk keputusan product, lihat juga `product.md` section 11.

| # | Tanggal | Keputusan | Alasan |
|---|---|---|---|
| D01 | May 24, 2026 | pnpm sebagai package manager | Faster, stricter dependency resolution |
| D02 | May 24, 2026 | Skip monorepo untuk MVP | Overhead tidak sebanding untuk solo dev pemula |
| D03 | May 24, 2026 | next-themes untuk theme system | Handles system preference + no flash |
| D04 | May 24, 2026 | Opsi B untuk agents (system prompt Claude) | Realistis untuk solo dev, bukan automated agents |
| D05 | May 24, 2026 | 6 agents: Planner, Frontend, Backend, Reviewer, Security, QA | Cukup tanpa overkill |
| D06 | May 24, 2026 | Superpowers via Claude Code plugin | Framework skills terbaik untuk Claude Code |
| D07 | May 24, 2026 | Monvora gratis dulu, iklan post-public release | Butuh user base dulu sebelum monetisasi |
| D08 | May 24, 2026 | Format angka: Rp 1.500.000 (titik) | Standar Indonesia |
| D09 | May 24, 2026 | AI insights dalam Bahasa Indonesia | Lebih relatable untuk target user |
| D10 | May 24, 2026 | Tidak ada onboarding tutorial | Empty states yang informatif sudah cukup |
| D11 | May 24, 2026 | Universal bank parser via registry pattern | Mudah tambah bank baru tanpa ubah core logic |
| D12 | May 24, 2026 | Soft delete untuk semua data finansial | Data tidak boleh hilang permanen |
| D13 | May 24, 2026 | Amount stored as INTEGER IDR | Tidak ada floating point untuk uang |
| D14 | May 24, 2026 | 404 bukan 403 untuk data user lain | Tidak mengkonfirmasi eksistensi data ke attacker |

---

## 8. BLOCKERS & ISSUES

### Active Blockers
*Tidak ada saat ini*

### Resolved Blockers

| # | Tanggal | Blocker | Resolusi |
|---|---|---|---|
| — | — | — | — |

### Known Issues (Bukan Blocker)

| # | Issue | Dampak | Plan |
|---|---|---|---|
| I01 | E-wallet tidak bisa auto-sync | User harus input manual untuk GoPay/ShopeePay/dll | OCR di Phase 3 sebagai solusi parsial |
| I02 | SMS notifikasi bank tidak bisa dibaca | User yang bank notifnya via SMS tidak dapat manfaat auto-sync | Post-MVP, butuh Twilio atau solusi lain |
| I03 | Gemini free tier rate limit | Kategorisasi bisa gagal saat volume tinggi | Rule-based fallback sudah ada, upgrade tier nanti |
| I04 | Bank di luar 5 bank utama belum di-support | Parser hanya untuk Mandiri, BCA, BNI, BRI, CIMB | Generic fallback ada, tambah parser bertahap |

---

## 9. LESSONS LEARNED

*Diisi seiring berjalannya development. Update setiap kali ada learning yang signifikan.*

### Pre-Development
| Tanggal | Learning |
|---|---|
| May 24, 2026 | Documentation-first approach sangat membantu — semua keputusan sudah dipikirkan sebelum mulai coding, mengurangi second-guessing saat implementasi |

### Phase 1
*Belum dimulai*

### Phase 2
*Belum dimulai*

### Phase 3
*Belum dimulai*

---

## 10. APP VERSION HISTORY

| Version | Tanggal | Phase | Highlights |
|---|---|---|---|
| v0.0.0 | May 24, 2026 | Pre-Dev | Project kickoff, semua docs dibuat |
| v0.1.0 | TBD | Phase 1 | Core loop: auth, manual entry, dashboard |
| v0.2.0 | TBD | Phase 2 | Gmail auto-sync, parser engine, AI categorization |
| v0.3.0 | TBD | Phase 3 | Analytics, OCR, budget, AI insights, PWA |
| v1.0.0 | TBD | Phase 4 | Public release ready |

---

## CARA UPDATE DOKUMEN INI

```
Setelah selesai 1 task:
1. Ubah ⏳ → ✅ untuk task yang selesai
2. Tambah catatan di kolom Notes jika ada yang perlu diingat
3. Update progress bar di section 1
4. Update "Last Updated" di header

Setelah ada keputusan baru:
1. Tambah ke Decisions Log (section 7)
2. Update dokumen yang relevan (master.md, product.md, dll)
3. Bump version dokumen yang diupdate

Jika ada blocker:
1. Tambah ke Active Blockers (section 8)
2. Tulis blocker dengan jelas: apa masalahnya, apa yang sudah dicoba
3. Pindah ke Resolved setelah selesai

Setelah phase selesai:
1. Update Phase Overview table
2. Update App Version History
3. Isi Lessons Learned
4. Bump app version (v0.1.0, v0.2.0, dst)
```

---

*Document maintained by: Solo Developer*
*Referenced from: CLAUDE.md*
*Update frequency: Setiap hari ada progress*
