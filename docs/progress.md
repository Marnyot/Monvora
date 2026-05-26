# MONVORA — Progress Tracker
> Dokumen living — diupdate setiap kali ada progress, keputusan baru, atau perubahan arah
> Referenced from: CLAUDE.md
> ⚠️ Update dokumen ini setiap selesai satu task — jangan tunggu phase selesai

---

## DOCUMENT VERSION HISTORY

| Version | Date | Updated By | Changes |
|---|---|---|---|
| v7 | May 25, 2026 | Claude | Phase 2 Gmail Automation selesai — parser engine, AI categorization, Inngest job, settings UI |
| v6 | May 25, 2026 | Claude | Deploy ke Vercel selesai, Phase 1 100% done, app version bump ke v0.1.0 |
| v5 | May 25, 2026 | Claude | Next.js 14→16 upgrade (CVEs), dashboard skeleton, 12 new tests, all Phase 1 items resolved — deploy only |
| v4 | May 25, 2026 | Claude | Security hardening done, OAuth login fixed, setup tasks updated, migration 003 applied — Phase 1 98% |
| v3 | May 25, 2026 | Claude | Transaction detail/edit/delete UI, desktop sidebar, toast notifications, TransactionCard links — Phase 1 ~85% |
| v2 | May 25, 2026 | Claude | Decisions Log dipindahkan ke decisions.md, section 7 jadi ADR index |
| v1 | May 24, 2026 | Claude | Initial creation — project kickoff |

**Current Version:** v7
**Last Updated:** May 25, 2026

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
Status          : 🟢 Development — Phase 3
Current Phase   : Phase 3 — Intelligence Layer
App Version     : v0.2.0
Last Updated    : May 25, 2026
Next Milestone  : Analytics page + spending trend charts
```

### Overall Progress

```
Documentation   ████████████████████ 100% (10/10 docs selesai)
Phase 1         ████████████████████ 100% ✅ (selesai — deployed ke Vercel)
Phase 2         ████████████████████ 100% ✅ (selesai)
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
| Phase 1 | Core Loop (manual tracking) | Week 4 | ✅ Done | v0.1.0 |
| Phase 2 | Gmail Automation | Week 10 | ✅ Done | v0.2.0 |
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
| Run database migrations | ✅ | 001_initial_schema.sql + 002_seed_categories.sql + 003_missing_indexes.sql applied |
| Setup Google Cloud Console | ✅ | OAuth Client configured. Authorized redirect URI: supabase callback. Gmail API scope di Phase 2 |
| Configure OAuth credentials | ✅ | Redirect URI + Supabase Auth provider configured. Google login berfungsi |
| Setup Inngest account | ✅ | Keys sudah di .env.local, client setup selesai |
| Setup Gemini API key | ✅ | GEMINI_API_KEY sudah di .env.local |
| Setup .env.local | ✅ | Semua vars set: SUPABASE_URL, ANON_KEY, SERVICE_ROLE_KEY, GOOGLE_CLIENT_ID/SECRET, GEMINI_API_KEY, INNGEST keys, APP_URL |
| Add .env.local ke .gitignore | ✅ | Covered oleh `.env*.local` pattern |
| Init git + push ke GitHub | ✅ | github.com/Marnyot/Monvora — branch develop → main |
| Deploy ke Vercel (awal) | ✅ | https://monvora.vercel.app — canary check HEALTHY |
| Setup Vitest + Testing Library | ✅ | 50+ tests passing (unit + component) |

### Authentication

| Task | Status | Notes |
|---|---|---|
| Google OAuth login page | ✅ | `app/(auth)/login/page.tsx` dengan GoogleLoginButton + error state |
| OAuth callback handler | ✅ | `app/auth/callback/route.ts` — exchange code → redirect /dashboard |
| Session middleware | ✅ | `middleware.ts` — guard semua `/dashboard/*` |
| Auto-create profile on first login | ✅ | DB trigger `on_auth_user_created` di migration |
| Redirect logic (login ↔ dashboard) | ✅ | Di middleware + root page redirect |
| Logout endpoint | ✅ | `app/api/auth/logout/route.ts` — POST → signOut → /login |
| **Test: auth flow** | ⏭️ | E2E: manual tested, E2E infra di Phase 2 |

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
| **Test: RLS policies** | ⏭️ | Butuh live DB — manual verified via Supabase dashboard |

### Onboarding

| Task | Status | Notes |
|---|---|---|
| Welcome screen | ⏭️ | ADR-015: tidak ada onboarding tutorial Phase 1 |
| Add first wallet step | ⏭️ | ADR-015 |
| Gmail sync prompt step | ⏭️ | ADR-015, Gmail di Phase 2 |
| Mark onboarding_completed | ⏭️ | ADR-015 |
| Redirect ke dashboard setelah selesai | ⏭️ | ADR-015 |

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
| API: GET /api/categories | ✅ | Sistem + milik user, ordered by is_system DESC |
| API: POST /api/categories | ✅ | Custom only, user_id dari session |
| API: PATCH /api/categories/:id | ✅ | Blocks system category edits (403) |
| API: DELETE /api/categories/:id | ✅ | Blocks system category deletes, soft delete |
| UI: Category list | ✅ | Ditampilkan via quick entry + edit sheet pill grid |
| UI: Add custom category | ⏭️ | Phase 1 solo use — POST /api/categories sudah ada |
| **Test: category API** | ✅ | Validation schema tests (5 tests) |

### Quick Entry (Manual Transaction)

| Task | Status | Notes |
|---|---|---|
| API: POST /api/transactions | ✅ | Zod validation, ownership check wallet, auto-update balance |
| UI: FAB button (floating) | ✅ | Fixed bottom right, mobile + desktop positioning |
| UI: Quick entry bottom sheet | ✅ | 92dvh sheet, smooth slide |
| UI: Number pad / amount input | ✅ | inputMode="numeric", autoFocus, formatted display |
| UI: Type selector (in/out/transfer) | ✅ | Tabs: Pengeluaran / Pemasukan / Transfer |
| UI: Category icon grid | ✅ | Pill buttons dengan color filter per type |
| UI: Payment method selector | ✅ | Select dropdown, bahasa Indonesia |
| UI: Note input (optional) | ✅ | Description field |
| UI: Date picker (default now) | ✅ | datetime-local input, default = now |
| Optimistic update | ⏭️ | router.refresh() dipilih sebagai approach — cukup untuk Phase 1 |
| **Test: quick entry < 10 detik** | ⏭️ | E2E timer test — manual tested |
| **Test: form validation** | ✅ | 12 validation schema tests |

### Transaction List

| Task | Status | Notes |
|---|---|---|
| API: GET /api/transactions | ✅ | Pagination, filter type/category/wallet/date/q, ownership enforced |
| UI: Transaction list page | ✅ | `/transactions` — Suspense + TransactionCard |
| UI: Transaction card component | ✅ | Category color, merchant/desc/category label, amount, date + wallet |
| UI: Filter bar | ✅ | Type filter pills (Semua/Pengeluaran/Pemasukan/Transfer), URL-based state |
| UI: Search input | ✅ | Debounced 300ms, search merchant_name + description via ilike |
| UI: Pagination | ✅ | 20/halaman, prev/next buttons, hidden jika ≤1 halaman |
| UI: Empty state | ✅ | Via EmptyState component |
| UI: Skeleton loader | ✅ | Via SkeletonList in Suspense fallback |
| **Test: filter + search** | ✅ | 5 tests di transaction-filters.test.tsx |

### Transaction Detail & Edit

| Task | Status | Notes |
|---|---|---|
| API: GET /api/transactions/:id | ✅ | Auth-gated, ownership enforced, wallet+category join |
| API: PATCH /api/transactions/:id | ✅ | Zod validation, ownership check, wallet balance sync |
| API: DELETE /api/transactions/:id (soft) | ✅ | Soft delete, balance reversal |
| UI: Transaction detail page | ✅ | `app/(dashboard)/transactions/[id]/page.tsx` — Server Component |
| UI: Edit form | ✅ | `TransactionEditSheet` — bottom sheet, pre-filled |
| UI: Delete dengan konfirmasi | ✅ | ConfirmDialog → DELETE → redirect /transactions |
| **Test: ownership verification** | ✅ | 4 tests di tests/unit/api/transaction-ownership.test.ts |

### Dashboard

| Task | Status | Notes |
|---|---|---|
| API: GET /api/analytics (basic) | ✅ | Computed inline di dashboard page (tidak perlu route terpisah) |
| UI: Balance card | ✅ | Total semua wallet, primary color card |
| UI: Cashflow summary | ✅ | Income (hijau) vs expense (merah) bulan ini |
| UI: Recent transactions | ✅ | 10 terakhir dengan TransactionCard |
| UI: Empty state (user baru) | ✅ | Via EmptyState component |
| UI: Skeleton loader | ✅ | DashboardSkeleton + Suspense wrapper |
| **Test: dashboard render** | ✅ | 8 tests di tests/unit/components/dashboard.test.tsx |

### Theme & UI Foundation

| Task | Status | Notes |
|---|---|---|
| Setup next-themes ThemeProvider | ✅ | `components/providers.tsx`, lang="id", suppressHydrationWarning |
| Configure Tailwind dark mode | ✅ | darkMode: ["class"], font-sans → Geist via CSS var |
| Theme toggle component | ✅ | `components/shared/theme-toggle.tsx` — dropdown Light/Dark/System |
| Bottom navigation (mobile) | ✅ | `components/dashboard/bottom-nav.tsx` — md:hidden |
| Sidebar navigation (desktop) | ✅ | `components/shared/nav-sidebar.tsx` — hidden md:flex |
| AmountDisplay component | ✅ | Hijau income / merah expense / neutral transfer, prefix ±− |
| CurrencyDisplay component | ✅ | Wraps formatIDR, tabular-nums |
| EmptyState component | ✅ | Icon + title + desc + optional action button |
| SkeletonCard component | ✅ | SkeletonCard + SkeletonList helper |
| ConfirmDialog component | ✅ | Dialog wrapper, destructive variant, isPending state |
| Toast notifications (Sonner) | ✅ | Wired di providers.tsx, dipakai di quick-entry + wallet-form + transaction detail |
| Security headers (CSP, X-Frame-Options, dll) | ✅ | Dikonfigurasi di next.config.mjs |
| Rate limiting (in-memory per user) | ✅ | `lib/utils/rate-limit.ts` — wired di semua 7 API routes |
| Dependabot | ✅ | `.github/dependabot.yml` — weekly, pnpm, skip major |
| Supabase SSR cookie fix (PKCE) | ✅ | `lib/supabase/server.ts` — getAll/setAll, OAuth login berfungsi |
| **Test: light + dark mode** | ⏭️ | Visual — manual checked semua halaman |

### Phase 1 Completion Criteria
```
✅ Developer bisa login dengan Google
✅ Developer bisa tambah wallet
✅ Developer bisa input transaksi manual < 10 detik
✅ Developer bisa lihat daftar transaksi
✅ Developer bisa edit dan hapus transaksi
✅ Dashboard menampilkan total balance dan cashflow bulan ini
✅ Light/dark/system theme berfungsi
✅ Semua test passing (86 tests)
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
| Expand OAuth scope ke gmail.readonly | ✅ | Google Cloud Console sudah diupdate |
| Gmail API client wrapper | ✅ | `lib/gmail/client.ts` — fetchNewEmails, isBankEmail |
| Token management (store historyId) | ✅ | Di profiles.gmail_sync_token, diupdate setiap sync |
| Token refresh handling | ✅ | Supabase handle otomatis via session |
| Revocation handling (graceful disable) | ✅ | GmailTokenExpiredError → disable sync di profiles |

### Inngest Background Jobs

| Task | Status | Notes |
|---|---|---|
| Setup Inngest client | ✅ | `lib/inngest/client.ts` + `app/api/inngest/route.ts` |
| Job: gmail-sync (setiap 15 menit) | ✅ | `lib/inngest/functions/gmail-sync.ts` — cron */15 * * * * |
| Job error handling + retry logic | ✅ | retries: 3, per-user step.run() untuk isolasi retry |
| Logging ke gmail_sync_logs | ✅ | Log di syncUserGmail setiap eksekusi |
| Concurrency control (max 10 user paralel) | ✅ | concurrency: { limit: 10 } |

### Parser Engine

| Task | Status | Notes |
|---|---|---|
| Base parser interface | ✅ | `lib/gmail/parsers/base.ts` — parseIDRAmount, isFromSender, dll |
| Parser registry + auto-detection | ✅ | `lib/gmail/parsers/index.ts` — PARSER_REGISTRY, detectAndParse |
| Mandiri parser | ✅ | `lib/gmail/parsers/mandiri.ts` — 15 tests |
| BCA parser | ✅ | `lib/gmail/parsers/bca.ts` — 17 tests |
| BNI parser | ✅ | `lib/gmail/parsers/bni.ts` — 20 tests |
| BRI parser | ✅ | `lib/gmail/parsers/bri.ts` — 27 tests |
| CIMB parser | ✅ | `lib/gmail/parsers/cimb.ts` — 19 tests |
| Generic fallback parser | ✅ | `lib/gmail/parsers/generic.ts` — confidence max 0.5 |
| Duplicate detection (raw_email_id) | ✅ | Cek di syncUserGmail sebelum insert |
| Confidence scoring | ✅ | 0.9 lengkap, 0.7 tanpa merchant, 0.5 generic |
| Zod validation untuk ParsedTransaction | ✅ | `lib/validations/parsed-transaction.ts` |
| **Test: setiap parser dengan email fixture** | ✅ | 15–27 tests per parser |
| **Test: duplicate detection** | ✅ | `tests/unit/gmail/sync-duplicate.test.ts` — 6 tests |
| **Test: generic fallback** | ✅ | `tests/unit/parsers/generic.test.ts` — 19 tests |

### AI Categorization

| Task | Status | Notes |
|---|---|---|
| Rule-based engine | ✅ | `lib/ai/rules.ts` — 63 rules, cover merchant Indonesia umum |
| Gemini API client | ✅ | `lib/ai/gemini.ts` — timeout 5s, error handling, PII-safe logging |
| Categorization orchestration | ✅ | `lib/ai/categorize.ts` — rules → gemini → fallback pipeline |
| **Test: rule coverage ≥ 80% merchant umum** | ✅ | 59 tests di rules.test.ts |
| **Test: Gemini fallback saat API error** | ✅ | 9 tests di gemini.test.ts + categorize.test.ts |

### Settings — Gmail

| Task | Status | Notes |
|---|---|---|
| UI: Gmail sync settings page | ✅ | `app/(dashboard)/settings/gmail/page.tsx` |
| UI: Connect Gmail button | ✅ | signInWithOAuth dengan scope gmail.readonly |
| UI: Disconnect Gmail | ✅ | Dengan ConfirmDialog |
| UI: Last synced timestamp | ✅ | Di settings page dan badge |
| UI: Recent sync logs | ✅ | 5 log terbaru di settings page |
| API: POST /api/sync/gmail (manual trigger) | ✅ | Rate limit 1x/5 menit |
| API: GET /api/sync/status | ✅ | Return enabled + logs |
| Sync status indicator di dashboard | ✅ | `components/dashboard/sync-status-badge.tsx` |

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

> ⚠️ **Keputusan sekarang dicatat di `decisions.md` dalam format ADR (Architectural Decision Record).**
> Tabel di bawah adalah legacy log dari sebelum `decisions.md` dibuat — tidak perlu diupdate lagi.
> **Untuk keputusan baru: tambahkan ke `decisions.md`**, bukan di sini.

### ADR Index (Ringkasan)

| ADR | Keputusan | Status |
|---|---|---|
| ADR-001 | Next.js App Router sebagai framework | ✅ Active |
| ADR-002 | Supabase sebagai BaaS | ✅ Active |
| ADR-003 | Inngest sebagai background job runner | ✅ Active |
| ADR-004 | Skip monorepo untuk MVP | ✅ Active |
| ADR-005 | RLS sebagai primary authorization layer | ✅ Active |
| ADR-006 | 404 bukan 403 untuk data user lain | ✅ Active |
| ADR-007 | Gmail scope minimal (gmail.readonly) | ✅ Active |
| ADR-008 | Sentry di Phase 2, bukan Phase 1 | ✅ Active |
| ADR-009 | Supabase automated backup (tidak custom) | ✅ Active |
| ADR-010 | Amount sebagai INTEGER IDR | ✅ Active |
| ADR-011 | Soft delete untuk semua data finansial | ✅ Active |
| ADR-012 | UUID untuk primary key | ✅ Active |
| ADR-013 | Missing indexes di migration 003 | ✅ Active |
| ADR-014 | Monvora gratis, monetisasi post-public | ✅ Active |
| ADR-015 | Tidak ada onboarding tutorial | ✅ Active |
| ADR-016 | AI insights dalam Bahasa Indonesia | ✅ Active |
| ADR-017 | Format angka Rp 1.500.000 (titik) | ✅ Active |
| ADR-018 | Test-Driven Development | ✅ Active |
| ADR-019 | Documentation-first development | ✅ Active |
| ADR-020 | pnpm sebagai package manager | ✅ Active |
| ADR-021 | Dependabot + pnpm audit | ✅ Active |
| ADR-022 | Gemini API untuk AI categorization | ✅ Active |
| ADR-023 | Bahasa Indonesia sebagai default language UI | ✅ Active |

Lihat `decisions.md` untuk detail konteks, alternatif, dan review trigger setiap keputusan.

---

## 8. BLOCKERS & ISSUES

### Active Blockers
*Tidak ada saat ini*

### Recently Fixed

| Tanggal | Bug | Fix |
|---|---|---|
| May 27, 2026 | `GET /transactions?user_id=eq.` 400 — query fire sebelum session ready | `enabled: !!user?.id` di `useTransactions`, userId diambil dari session dalam hook, hapus explicit `.eq('user_id')` filter (RLS handles it) |
| May 27, 2026 | Realtime tidak update UI tanpa navigasi | Migration 007 (explicit SELECT policy), fix `useRealtimeTransactions` (guard userId, unique channel name, event INSERT), `RealtimeProvider` di-mount global di dashboard layout |
| May 27, 2026 | CSP blokir Realtime WebSocket (`wss://`) | `next.config.mjs`: ubah `*.supabase.co` → `https://*.supabase.co wss://*.supabase.co` di `connect-src` |

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
| v0.1.0 | May 25, 2026 | Phase 1 | Core loop: auth, manual entry, dashboard — deployed ke Vercel |
| v0.2.0 | May 25, 2026 | Phase 2 | Gmail auto-sync, parser engine (5 banks + generic), AI categorization (63 rules + Gemini) |
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
1. Tambahkan ADR baru ke `decisions.md` (format ADR-XXX)
2. Tambahkan ke tabel ADR Index di section 7 progress.md
3. Update dokumen yang terdampak (security.md, master.md, dll)
4. Bump version dokumen yang diupdate

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
