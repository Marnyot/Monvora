# MONVORA — Decisions Log
> Architectural Decision Records (ADR) untuk semua keputusan signifikan
> Referenced from: CLAUDE.md, progress.md
> ⚠️ Setiap keputusan arsitektur, product, atau engineering yang tidak trivial harus dicatat di sini

---

## DOCUMENT VERSION HISTORY

| Version | Date | Updated By | Changes |
|---|---|---|---|
| v3 | May 25, 2026 | Claude | Tambah ADR-023 (Bahasa Indonesia UI), update ADR-016, update ADR index |
| v2 | May 25, 2026 | Claude | Tambah section 7: Future Upgrade Path |
| v1 | May 25, 2026 | Claude | Initial creation — konsolidasi dari progress.md + tambah security decisions |

**Current Version:** v3
**Last Updated:** May 25, 2026

---

## CARA BACA DOKUMEN INI

Dokumen ini bukan sekadar log — ini adalah **catatan alasan** di balik setiap keputusan. Dibaca saat:
- Mau mengubah sesuatu yang sudah diputuskan → cek dulu apakah alasan masih relevan
- Ada anggota baru (atau AI agent baru) yang perlu context → baca keputusan yang relevan
- Mau evaluate ulang trade-off → lihat "Review Trigger" di setiap keputusan

### Status Keputusan

| Status | Arti |
|---|---|
| ✅ Active | Keputusan berlaku, tidak perlu di-review |
| 🔄 Under Review | Sedang dievaluasi ulang |
| ❌ Superseded | Diganti oleh keputusan lain (lihat kolom "Diganti oleh") |

---

## TABLE OF CONTENTS

1. [Architecture Decisions](#1-architecture-decisions)
2. [Security Decisions](#2-security-decisions)
3. [Database Decisions](#3-database-decisions)
4. [Product Decisions](#4-product-decisions)
5. [Engineering Process Decisions](#5-engineering-process-decisions)
6. [Tooling Decisions](#6-tooling-decisions)
7. [Future Upgrade Path](#7-future-upgrade-path)

---

## 1. ARCHITECTURE DECISIONS

---

### ADR-001 — Next.js App Router sebagai Framework

| Field | Detail |
|---|---|
| **Tanggal** | May 24, 2026 |
| **Status** | ✅ Active |
| **Kategori** | Architecture |

**Konteks:**
Perlu framework full-stack untuk personal finance app dengan kebutuhan: SSR untuk security (tidak expose data ke client sebelum auth check), API routes dalam satu project, dan ekosistem yang mature.

**Keputusan:**
Next.js 14 dengan App Router. Bukan Pages Router, bukan framework lain.

**Alternatif yang dipertimbangkan:**

| Alternatif | Alasan Ditolak |
|---|---|
| Remix | Ekosistem lebih kecil, less tooling support untuk Supabase |
| SvelteKit | Kurang familiar, risiko untuk solo dev |
| Next.js Pages Router | App Router adalah future — pindah nanti lebih mahal |
| Pure SPA (Vite + React) | Tidak ada SSR built-in, auth lebih kompleks |

**Konsekuensi yang diterima:**
- App Router masih relatif baru, beberapa patterns belum settled
- `use server` / `use client` boundary harus selalu diperhatikan
- Build complexity lebih tinggi dari pure SPA

**Review Trigger:** Jika Next.js App Router terbukti tidak stabil untuk fitur yang dibutuhkan, atau jika Vercel pricing menjadi hambatan signifikan.

---

### ADR-002 — Supabase sebagai Backend-as-a-Service

| Field | Detail |
|---|---|
| **Tanggal** | May 24, 2026 |
| **Status** | ✅ Active |
| **Kategori** | Architecture |

**Konteks:**
Solo developer membutuhkan database, auth, dan realtime dalam satu platform tanpa perlu manage infrastructure sendiri. Data finansial memerlukan RLS yang kuat.

**Keputusan:**
Supabase (PostgreSQL + Auth + RLS). Deploy di region Singapore untuk latency Indonesia.

**Alternatif yang dipertimbangkan:**

| Alternatif | Alasan Ditolak |
|---|---|
| Firebase (Firestore) | NoSQL tidak cocok untuk data finansial relasional, tidak ada RLS native |
| PlanetScale | Tidak ada auth built-in, harus manage auth sendiri |
| Neon + Auth.js | Lebih fleksibel tapi overhead signifikan untuk solo dev |
| Self-hosted PostgreSQL | Overhead ops tidak sebanding untuk MVP |

**Konsekuensi yang diterima:**
- Vendor lock-in ke Supabase (migrasi keluar mahal)
- Pricing bisa jadi concern saat skala bertambah
- Free tier memiliki limitasi (500MB DB, 2GB bandwidth)

**Review Trigger:** Saat MAU > 1000 user atau DB size mendekati 500MB (free tier limit).

---

### ADR-003 — Inngest sebagai Background Job Runner

| Field | Detail |
|---|---|
| **Tanggal** | May 24, 2026 |
| **Status** | ✅ Active |
| **Kategori** | Architecture |

**Konteks:**
Gmail sync harus berjalan sebagai background job — tidak bisa dilakukan dalam request/response cycle karena bisa timeout dan harus bisa di-retry jika gagal.

**Keputusan:**
Inngest untuk background jobs. Bukan cron job, bukan queue self-hosted.

**Alternatif yang dipertimbangkan:**

| Alternatif | Alasan Ditolak |
|---|---|
| Vercel Cron Jobs | Tidak ada retry logic, tidak ada event-driven execution |
| Bull/BullMQ + Redis | Harus manage Redis, overhead ops untuk solo dev |
| Trigger.dev | Mirip Inngest tapi ekosistem lebih kecil saat ini |
| Supabase Edge Functions | Tidak ada durable execution, timeout 2 menit |

**Konsekuensi yang diterima:**
- Dependency tambahan ke Inngest platform
- Free tier: 2500 function runs/bulan — cukup untuk MVP
- Jika Inngest down, sync Gmail tidak berjalan

**Review Trigger:** Jika function runs mendekati batas free tier, atau ada kebutuhan job yang tidak di-support Inngest.

---

### ADR-004 — Skip Monorepo untuk MVP

| Field | Detail |
|---|---|
| **Tanggal** | May 24, 2026 |
| **Status** | ✅ Active |
| **Kategori** | Architecture |

**Konteks:**
Awalnya ada pertimbangan untuk setup Turborepo monorepo. Tapi evaluasi menunjukkan overhead tidak sebanding untuk solo dev pada phase awal.

**Keputusan:**
Single Next.js repository. Semua code dalam satu project.

**Alternatif yang dipertimbangkan:**

| Alternatif | Alasan Ditolak |
|---|---|
| Turborepo monorepo | Overhead setup + CI complexity tidak sebanding untuk MVP |
| Nx monorepo | Lebih complex dari Turborepo, overkill |

**Konsekuensi yang diterima:**
- Jika nanti butuh split (misal: admin panel terpisah), refactor lebih mahal
- Semua dependencies dalam satu package.json
- Acceptable untuk scope MVP yang ada

**Review Trigger:** Saat ada kebutuhan aplikasi kedua yang share code signifikan dengan Monvora.

---

## 2. SECURITY DECISIONS

---

### ADR-005 — RLS sebagai Primary Authorization Layer

| Field | Detail |
|---|---|
| **Tanggal** | May 24, 2026 |
| **Status** | ✅ Active |
| **Kategori** | Security |

**Konteks:**
Data finansial user harus terisolasi dengan sempurna. Perlu memutuskan di layer mana authorization di-enforce — aplikasi atau database.

**Keputusan:**
Row Level Security (RLS) di Supabase sebagai primary layer, dikombinasikan dengan explicit `user_id` filter di API layer (defense in depth). RLS tidak pernah di-disable dalam kondisi apapun.

**Alternatif yang dipertimbangkan:**

| Alternatif | Alasan Ditolak |
|---|---|
| Hanya API layer filter | Satu bug di aplikasi bisa expose semua data user lain |
| Hanya RLS tanpa API check | Lebih rentan jika ada bug di RLS policy itu sendiri |
| ACL berbasis role | Overkill — Monvora hanya punya satu role (authenticated user) |

**Konsekuensi yang diterima:**
- RLS policies harus selalu ditest setiap schema change
- Supabase service role key harus dijaga ketat — bisa bypass RLS
- Slightly more complex queries (harus include `auth.uid()`)

**Review Trigger:** Jika ada kebutuhan multi-role (admin, support) — butuh redesign RLS.

---

### ADR-006 — 404 bukan 403 untuk Data User Lain

| Field | Detail |
|---|---|
| **Tanggal** | May 24, 2026 |
| **Status** | ✅ Active |
| **Kategori** | Security |

**Konteks:**
Saat user mencoba akses resource yang bukan miliknya (atau tidak ada), perlu memutuskan error response yang tepat.

**Keputusan:**
Return 404 (Not Found) untuk semua resource yang bukan milik authenticated user — bukan 403 (Forbidden).

**Alasan:**
403 mengkonfirmasi bahwa resource tersebut *ada* tapi user tidak punya akses. Ini memberi informasi kepada attacker untuk melakukan enumeration. 404 tidak mengkonfirmasi apapun.

**Konsekuensi yang diterima:**
- Developer debugging bisa bingung kenapa dapat 404 saat resource memang ada
- Harus didokumentasikan dengan jelas agar tidak dianggap bug

**Review Trigger:** Tidak ada — ini adalah security best practice yang tidak akan berubah.

---

### ADR-007 — Gmail Scope Minimal (gmail.readonly)

| Field | Detail |
|---|---|
| **Tanggal** | May 24, 2026 |
| **Status** | ✅ Active |
| **Kategori** | Security |

**Konteks:**
Monvora perlu akses Gmail untuk membaca notifikasi transaksi bank. Perlu memutuskan scope OAuth yang diminta.

**Keputusan:**
Hanya request `gmail.readonly` — tidak lebih. Tidak pernah request scope write, modify, atau compose.

**Alasan:**
Prinsip least privilege. Monvora hanya perlu baca email, tidak perlu menulis atau memodifikasi. Scope yang lebih luas dari kebutuhan meningkatkan risiko jika ada bug atau breach.

**Konsekuensi yang diterima:**
- Tidak bisa fitur "reply dari Monvora" di masa depan (tidak mungkin dengan readonly)
- User bisa lebih tenang memberikan permission yang terbatas

**Review Trigger:** Tidak ada — ini adalah aturan absolut yang tidak boleh dilanggar.

---

### ADR-008 — Sentry di Phase 2, Bukan Phase 1

| Field | Detail |
|---|---|
| **Tanggal** | May 25, 2026 |
| **Status** | ✅ Active |
| **Kategori** | Security / Monitoring |

**Konteks:**
Ada pertimbangan untuk menambahkan Sentry lebih awal (Phase 1) untuk mendeteksi silent bug. Tapi ada tradeoff dengan privacy compliance.

**Keputusan:**
Sentry ditambahkan di Phase 2 (saat Gmail sync mulai berjalan), bukan Phase 1. Wajib dikonfigurasi dengan PII scrubbing sebelum aktif.

**Alasan:**
- Phase 1 masih solo use — developer bisa lihat error langsung di Vercel logs
- Sentry tanpa konfigurasi yang benar bisa melanggar privacy rule (capture request body)
- Silent bug baru jadi critical di Phase 2 saat ada background job sync yang tidak bisa dimonitor secara manual

**Konsekuensi yang diterima:**
- Jika ada bug di Phase 1 yang silent, tidak terdeteksi otomatis
- Mitigasi: developer aktif menggunakan aplikasi sendiri (dogfooding)

**Review Trigger:** Jika di Phase 1 ada bug yang sulit dideteksi tanpa monitoring.

---

### ADR-009 — Supabase Automated Backup (Tidak Custom)

| Field | Detail |
|---|---|
| **Tanggal** | May 25, 2026 |
| **Status** | ✅ Active |
| **Kategori** | Security / Data |

**Konteks:**
Finance app memerlukan backup strategy. Ada pertimbangan untuk membuat custom backup script ke external storage.

**Keputusan:**
Rely pada Supabase automated daily backup. Tidak membuat custom backup infrastructure untuk MVP. Wajib melakukan restore test sebelum Phase 2.

**Alasan:**
- Supabase sudah provide automated daily backup dengan 7-day retention
- Custom backup script menambah maintenance burden untuk solo dev
- Yang paling penting adalah *test restore* — bukan membuat backup tambahan

**Konsekuensi yang diterima:**
- Dependent pada Supabase backup reliability
- Jika butuh PITR (Point-in-Time Recovery), harus upgrade ke Pro plan
- Retention hanya 7 hari di free tier

**Review Trigger:** Saat ada user nyata, atau DB size mendekati batas free tier — pertimbangkan upgrade ke Pro untuk PITR.

---

## 3. DATABASE DECISIONS

---

### ADR-010 — Amount Disimpan sebagai INTEGER IDR

| Field | Detail |
|---|---|
| **Tanggal** | May 24, 2026 |
| **Status** | ✅ Active |
| **Kategori** | Database |

**Konteks:**
Perlu memutuskan bagaimana menyimpan nominal uang di database.

**Keputusan:**
Semua amount disimpan sebagai INTEGER dalam satuan rupiah (IDR). Tidak pernah menggunakan FLOAT atau DECIMAL untuk penyimpanan.

**Alasan:**
Floating-point arithmetic tidak presisi untuk uang. `0.1 + 0.2 !== 0.3` di sebagian besar bahasa pemrograman. Integer IDR menghilangkan masalah ini sepenuhnya karena IDR tidak menggunakan desimal.

**Konsekuensi yang diterima:**
- Jika nanti support multi-currency dengan desimal (USD, EUR), perlu pertimbangkan ulang
- Seluruh kalkulasi harus dalam integer sebelum display

**Review Trigger:** Jika Monvora perlu support mata uang dengan sub-unit desimal.

---

### ADR-011 — Soft Delete untuk Semua Data Finansial

| Field | Detail |
|---|---|
| **Tanggal** | May 24, 2026 |
| **Status** | ✅ Active |
| **Kategori** | Database |

**Konteks:**
User bisa menghapus transaksi atau wallet. Perlu memutuskan apakah data benar-benar dihapus dari database.

**Keputusan:**
Soft delete dengan kolom `deleted_at TIMESTAMPTZ` untuk semua data finansial. Hard delete dilarang untuk tabel: transactions, wallets, categories, budgets.

**Alasan:**
- Data finansial punya implikasi hukum dan audit
- User bisa tidak sengaja hapus data penting
- Recovery dari soft delete mudah, dari hard delete tidak mungkin

**Konsekuensi yang diterima:**
- Database storage lebih besar dari waktu ke waktu
- Semua query harus include `WHERE deleted_at IS NULL`
- Perlu partial index untuk performa (sudah ada di ADR-014)

**Review Trigger:** Jika GDPR/privacy regulation memerlukan hard delete saat user request data deletion.

---

### ADR-012 — UUID untuk Primary Key

| Field | Detail |
|---|---|
| **Tanggal** | May 24, 2026 |
| **Status** | ✅ Active |
| **Kategori** | Database |

**Konteks:**
Perlu memutuskan format primary key untuk semua tabel.

**Keputusan:**
UUID (gen_random_uuid()) untuk semua primary key. Tidak menggunakan sequential integer ID.

**Alasan:**
- Sequential ID mengekspose informasi: user bisa menebak ID transaksi lain
- UUID tidak predictable — tidak bisa di-enumerate
- Tidak ada information leakage via URL params

**Konsekuensi yang diterima:**
- Storage lebih besar (16 bytes vs 4 bytes untuk integer)
- Index lebih besar
- Tidak bisa sort by insertion order via ID (gunakan `created_at`)

**Review Trigger:** Tidak ada — ini best practice untuk finance app.

---

### ADR-013 — Missing Indexes Ditambahkan di Migration 003

| Field | Detail |
|---|---|
| **Tanggal** | May 25, 2026 |
| **Status** | ✅ Active |
| **Kategori** | Database |

**Konteks:**
Review schema migrasi awal menemukan beberapa indexes yang hilang: foreign key indexes, partial indexes untuk soft delete filter, dan indexes untuk query patterns yang akan sering dipakai di Phase 2-3.

**Keputusan:**
Buat `migrations/003_missing_indexes.sql` dan apply sekarang (Phase 1) saat tabel masih kosong.

**Alasan:**
- Menambahkan index ke tabel kosong = zero cost
- Menambahkan index ke tabel dengan jutaan baris = expensive operation (lock table)
- Postgres tidak auto-create index untuk foreign key (berbeda dari MySQL)

**Indexes yang ditambahkan:**
- `idx_transactions_active` — partial index untuk soft delete filter
- `idx_wallets_active` — partial index untuk soft delete filter
- `idx_budgets_active` — partial index untuk soft delete + is_active filter
- `idx_transactions_wallet_id` — foreign key index
- `idx_transactions_category_id` — foreign key index
- `idx_budgets_category_id` — foreign key index
- `idx_gmail_sync_logs_user_recent` — untuk dashboard sync status
- `idx_categories_user_system` — untuk query sistem + custom categories

**Review Trigger:** Phase 3 saat analytics query mulai berat — jalankan `EXPLAIN ANALYZE` dan tambahkan index sesuai kebutuhan aktual.

---

## 4. PRODUCT DECISIONS

---

### ADR-014 — Monvora Gratis, Monetisasi Post-Public Release

| Field | Detail |
|---|---|
| **Tanggal** | May 24, 2026 |
| **Status** | ✅ Active |
| **Kategori** | Product |

**Konteks:**
Perlu memutuskan model monetisasi sejak awal karena mempengaruhi feature set dan user acquisition strategy.

**Keputusan:**
Monvora gratis sampai ada user base. Iklan atau freemium model dipertimbangkan post-public release setelah ada data penggunaan nyata.

**Alasan:**
- Butuh user base sebelum bisa tahu value apa yang mau di-monetize
- Gratis mengurangi friction untuk adoption awal
- Data penggunaan nyata lebih valuable dari asumsi monetisasi di awal

**Konsekuensi yang diterima:**
- Tidak ada revenue dalam waktu dekat
- Harus manage cost (Supabase, Vercel, API keys) dari kantong sendiri
- Model monetisasi bisa berubah drastis setelah melihat usage pattern

**Review Trigger:** Saat ada 100+ active user, atau biaya operasional menjadi signifikan.

---

### ADR-015 — Tidak Ada Onboarding Tutorial

| Field | Detail |
|---|---|
| **Tanggal** | May 24, 2026 |
| **Status** | ✅ Active |
| **Kategori** | Product |

**Konteks:**
Perlu memutuskan apakah ada guided onboarding tutorial untuk user baru.

**Keputusan:**
Tidak ada onboarding tutorial. Gunakan empty states yang informatif sebagai pengganti.

**Alasan:**
- Tutorial menambah dev effort signifikan di MVP
- Empty states yang bagus bisa menggantikan tutorial
- Target user (tech-savvy 20-35) cukup bisa self-explore

**Konsekuensi yang diterima:**
- User baru mungkin butuh waktu lebih lama untuk mengerti fitur
- Bisa direvisi di Phase 4 berdasarkan feedback self-use

**Review Trigger:** Jika self-use feedback menunjukkan confusion di onboarding.

---

### ADR-016 — AI Insights dalam Bahasa Indonesia

| Field | Detail |
|---|---|
| **Tanggal** | May 24, 2026 |
| **Status** | ✅ Active |
| **Kategori** | Product |

**Konteks:**
Monvora targets Indonesian users. Perlu memutuskan bahasa untuk AI-generated insights dari Gemini.

**Keputusan:**
AI insights di-generate dalam Bahasa Indonesia. ~~UI lainnya dalam English~~ → **Superseded oleh ADR-023** — seluruh UI juga dalam Bahasa Indonesia.

**Alasan:**
- Target user Indonesia — insights finansial lebih relatable dalam bahasa sendiri
- Gemini mendukung Bahasa Indonesia dengan kualitas yang acceptable
- Diferensiasi dari tools finance global yang semuanya English-only

**Konsekuensi yang diterima:**
- Jika nanti mau expand ke market non-Indonesia, AI insights perlu di-lokalisasi
- Quality Bahasa Indonesia dari Gemini perlu dimonitor

**Review Trigger:** Jika ada feedback bahwa kualitas Bahasa Indonesia AI tidak acceptable.

---

### ADR-017 — Format Angka: Rp 1.500.000 (Titik sebagai Separator)

| Field | Detail |
|---|---|
| **Tanggal** | May 24, 2026 |
| **Status** | ✅ Active |
| **Kategori** | Product |

**Konteks:**
Perlu memutuskan format display angka mata uang untuk konsistensi di seluruh aplikasi.

**Keputusan:**
Format: `Rp 1.500.000` dengan titik sebagai separator ribuan. Mengikuti standar Indonesia (id-ID locale).

**Alasan:**
Standar Indonesia menggunakan titik untuk separator ribuan, bukan koma. Koma untuk desimal (tapi IDR tidak punya desimal yang relevan).

**Implementasi:**
```typescript
new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  minimumFractionDigits: 0,
}).format(amount)
```

**Review Trigger:** Tidak ada — ini adalah standar lokal yang tidak berubah.

---

## 5. ENGINEERING PROCESS DECISIONS

---

### ADR-018 — Test-Driven Development (RED-GREEN-REFACTOR)

| Field | Detail |
|---|---|
| **Tanggal** | May 24, 2026 |
| **Status** | ✅ Active |
| **Kategori** | Engineering Process |

**Konteks:**
Perlu memutuskan pendekatan testing untuk project ini.

**Keputusan:**
Test-first (TDD) dengan siklus RED-GREEN-REFACTOR. Tidak boleh menulis implementasi sebelum ada test yang failing.

**Alasan:**
- Finance app — bug di kalkulasi atau data access berbahaya
- TDD memaksa design yang testable
- Parser email sangat benefit dari test-first approach

**Konsekuensi yang diterima:**
- Velocity awal lebih lambat
- Tidak semua komponen UI perlu test berat — fokus pada logic dan API routes

**Review Trigger:** Tidak ada — ini adalah keputusan engineering fundamental.

---

### ADR-019 — Documentation-First Development

| Field | Detail |
|---|---|
| **Tanggal** | May 24, 2026 |
| **Status** | ✅ Active |
| **Kategori** | Engineering Process |

**Konteks:**
Solo dev dengan AI-assisted workflow membutuhkan cara untuk menjaga konsistensi context antar sesi.

**Keputusan:**
Semua keputusan arsitektur, security rules, dan product decisions didokumentasikan SEBELUM implementasi. Dokumen adalah source of truth.

**Alasan:**
- AI agent (Claude) kehilangan context antar sesi — dokumen menjadi "memory"
- Mencegah second-guessing dan pengulangan diskusi yang sama
- Pre-dev documentation selesai sebelum satu baris kode ditulis

**Konsekuensi yang diterima:**
- Lebih banyak waktu di awal untuk dokumentasi
- Dokumen harus dijaga tetap up-to-date (kalau tidak, jadi misleading)

**Review Trigger:** Tidak ada — ini adalah core workflow Monvora.

---

## 6. TOOLING DECISIONS

---

### ADR-020 — pnpm sebagai Package Manager

| Field | Detail |
|---|---|
| **Tanggal** | May 24, 2026 |
| **Status** | ✅ Active |
| **Kategori** | Tooling |

**Konteks:**
Perlu memilih package manager untuk project Next.js.

**Keputusan:**
pnpm. Tidak npm, tidak yarn.

**Alternatif yang dipertimbangkan:**

| Alternatif | Alasan Ditolak |
|---|---|
| npm | Lebih lambat, tidak ada strict dependency resolution |
| yarn v1 | Legacy, tidak ada keunggulan dibanding pnpm |
| yarn berry (v3+) | Kompleks, PnP mode bisa jadi masalah dengan beberapa tools |

**Konsekuensi yang diterima:**
- CI harus setup pnpm explicitly
- Semua perintah harus gunakan `pnpm`, bukan `npm` atau `yarn`

**Review Trigger:** Tidak ada — komitmen sudah dibuat, konsisten lebih penting dari switch.

---

### ADR-021 — Dependabot + pnpm audit untuk Dependency Security

| Field | Detail |
|---|---|
| **Tanggal** | May 25, 2026 |
| **Status** | ✅ Active |
| **Kategori** | Tooling / Security |

**Konteks:**
Finance app perlu memastikan dependencies tidak mengandung vulnerability yang diketahui. Perlu tooling yang otomatis mendeteksi ini.

**Keputusan:**
Dependabot untuk PR otomatis saat ada update/vulnerability, dikombinasikan dengan `pnpm audit` di CI pipeline.

**Alternatif yang dipertimbangkan:**

| Alternatif | Alasan Ditolak |
|---|---|
| Snyk | Paid untuk fitur lengkap, overkill untuk MVP |
| npm audit manual | Tidak otomatis, mudah terlupakan |
| Renovate | Lebih powerful tapi lebih complex config |

**Konsekuensi yang diterima:**
- Dependabot PR harus di-review manual — tidak boleh auto-merge
- Bisa ada noise dari Dependabot jika banyak dependencies update serentak

**Review Trigger:** Jika jumlah Dependabot PR menjadi terlalu banyak untuk di-manage — pertimbangkan Renovate dengan grouping strategy.

---

### ADR-022 — Gemini API untuk AI Categorization

| Field | Detail |
|---|---|
| **Tanggal** | May 24, 2026 |
| **Status** | ✅ Active |
| **Kategori** | Tooling |

**Konteks:**
Perlu AI untuk kategorisasi transaksi otomatis dan generasi insights. Perlu memilih provider.

**Keputusan:**
Gemini API (gemini-1.5-flash) sebagai AI provider. Rule-based fallback sebagai safety net.

**Alternatif yang dipertimbangkan:**

| Alternatif | Alasan Ditolak |
|---|---|
| OpenAI GPT | Lebih mahal, tidak ada keunggulan signifikan untuk task ini |
| Claude API | Anthropic tidak ada free tier yang equivalent |
| Local LLM | Terlalu berat untuk client-side, latency tinggi |
| Pure rule-based | Tidak scalable untuk kategori yang terus bertambah |

**Konsekuensi yang diterima:**
- Free tier rate limit bisa menjadi bottleneck saat volume tinggi
- Rule-based fallback harus selalu di-maintain sebagai safety net
- Data transaksi tidak boleh dikirim ke Gemini secara verbatim — hanya metadata

**Review Trigger:** Jika Gemini free tier rate limit menghambat user experience, atau ada privacy concern dengan data yang dikirim ke Gemini.

---

### ADR-023 — Bahasa Indonesia sebagai Default Language UI

| Field | Detail |
|---|---|
| **Tanggal** | May 25, 2026 |
| **Status** | ✅ Active |
| **Kategori** | Product |
| **Supersedes** | ADR-016 (bagian "UI dalam English") dan master.md P5 |

**Konteks:**
ADR-016 dan master.md P5 awalnya menetapkan UI dalam English untuk Phase 1-2. Saat implementasi dimulai, semua copy UI ditulis langsung dalam Bahasa Indonesia karena target user adalah Indonesia, dan terjemahan terasa lebih natural untuk fintech lokal.

**Keputusan:**
Seluruh UI Monvora (label, placeholder, toast, error message, navigasi) dalam Bahasa Indonesia sejak Phase 1. i18n (next-intl) tetap di Phase 3 jika ada kebutuhan ekspansi ke market non-Indonesia.

**Alasan:**
- Target user 100% Indonesia untuk Phase 1-3 — tidak ada user non-Indonesia dalam scope ini
- "Pengeluaran", "Pemasukan", "Transfer" lebih natural dari "Expense", "Income" untuk user Indonesia
- Mengurangi cognitive load — user tidak perlu translate di kepalanya
- Tidak ada kerugian: jika nanti butuh English, tinggal tambah i18n di Phase 3

**Konsekuensi yang diterima:**
- Dokumen-dokumen teknis (CLAUDE.md, progress.md, dll) tetap dalam Bahasa Indonesia
- Jika ada contributor non-Indonesia, UI copy perlu penjelasan tambahan
- Saat Phase 3 (i18n), perlu extraction semua string dari kode ke translation files

**Review Trigger:** Jika ada target market non-Indonesia yang konkret di Phase 4.

---

## 7. FUTURE UPGRADE PATH

> Referensi cepat: kapan harus upgrade dari keputusan saat ini, ke apa, dan berapa besar effort-nya.
> Dibaca saat mau menambah fitur besar atau ada sinyal bahwa keputusan lama sudah tidak cukup.
> **Bukan roadmap** — ini daftar kondisi yang memicu re-evaluasi, bukan rencana yang harus dijalankan.

---

### Infrastructure & Hosting

| Kondisi Saat Ini | Sinyal Upgrade | Upgrade Ke | Effort | ADR Terkait |
|---|---|---|---|---|
| Vercel Hobby (free) | Butuh custom domain SLA, atau team collaboration | Vercel Pro | Rendah — tinggal upgrade billing | ADR-001 |
| Supabase Free (500MB, 7-day backup) | DB mendekati 400MB, atau butuh PITR | Supabase Pro ($25/bulan) | Rendah — tinggal upgrade, tidak ada code change | ADR-002 |
| Supabase Free | MAU > 1000, atau butuh dedicated compute | Supabase Pro → Supabase Team | Rendah — tidak ada migrasi data | ADR-002 |
| Supabase (vendor lock-in) | Pricing tidak sustainable, atau butuh full control | Self-hosted Supabase di Railway/Render, atau Neon + Auth.js | Tinggi — butuh migrasi data + refactor auth | ADR-002 |
| Inngest Free (2500 runs/bulan) | Runs mendekati limit, atau butuh observability | Inngest Pro | Rendah — upgrade billing, tidak ada code change | ADR-003 |
| Single repository | Butuh admin panel terpisah, atau mobile app native | Turborepo monorepo | Sedang — restructure repo, setup CI ulang | ADR-004 |

---

### Auth & Security

| Kondisi Saat Ini | Sinyal Upgrade | Upgrade Ke | Effort | ADR Terkait |
|---|---|---|---|---|
| Google OAuth only | Ada user yang minta email/password login | Tambah Supabase Email Auth | Rendah — Supabase sudah support, tambah UI | ADR-001 |
| RLS single-role (user saja) | Butuh admin dashboard, atau customer support bisa lihat data | Redesign RLS dengan multi-role + service account | Tinggi — butuh redesign policies + API layer | ADR-005 |
| In-memory rate limiting | Deploy multi-instance (scale out Vercel), atau rate limit tidak konsisten | Redis (Upstash) sebagai distributed rate limit store | Sedang — tambah dependency, refactor rate limiter | ADR-005 |
| Sentry basic (Phase 2) | Butuh distributed tracing, atau error volume tinggi | Sentry Performance + custom dashboards | Sedang — konfigurasi tambahan, tidak ada refactor | ADR-008 |
| Supabase automated backup | Data loss tolerance < 24 jam, atau ada audit requirement | Supabase Pro (PITR 7 hari) atau custom backup ke S3 | Rendah–Sedang | ADR-009 |

---

### Database & Performance

| Kondisi Saat Ini | Sinyal Upgrade | Upgrade Ke | Effort | ADR Terkait |
|---|---|---|---|---|
| Soft delete tanpa cleanup | Tabel transactions > 1M rows, query mulai lambat | Scheduled archival job — pindahkan deleted rows ke archive table | Sedang — buat Inngest job + migration | ADR-011 |
| Indexes current (migration 001 + 003) | EXPLAIN ANALYZE menunjukkan Seq Scan di query analytics | Review + tambah composite index sesuai query actual | Rendah — tidak ada downtime untuk tabel kecil | ADR-013 |
| PostgreSQL tanpa read replica | Dashboard analytics terasa lambat di peak usage | Supabase read replica (Pro feature) | Rendah — toggle di dashboard, update connection string | ADR-002 |
| Integer IDR only | Butuh support multi-currency (USD, SGD) | Tambah kolom `currency TEXT` + `amount_local INTEGER` + konversi saat display | Tinggi — butuh migration + refactor semua kalkulasi | ADR-010 |

---

### AI & Processing

| Kondisi Saat Ini | Sinyal Upgrade | Upgrade Ke | Effort | ADR Terkait |
|---|---|---|---|---|
| Gemini free tier | Rate limit sering kena, atau butuh SLA | Gemini Pay-as-you-go atau Gemini Pro | Rendah — ganti API key tier, tidak ada code change | ADR-022 |
| Gemini sebagai sole AI provider | Gemini quality tidak memuaskan, atau pricing naik drastis | Abstraksi AI provider layer → bisa switch ke OpenAI/Claude | Sedang — refactor ke provider-agnostic interface | ADR-022 |
| Rule-based parser per bank | Bank baru butuh waktu lama untuk di-support | AI-assisted parser (Gemini parse email langsung) | Sedang — perlu evaluasi accuracy + PII implications | ADR-003 |
| Tesseract.js client-side OCR | Accuracy tidak cukup, atau butuh process format baru | Google Cloud Vision API atau Gemini Vision | Sedang — pindah ke server-side, tambah API cost | — |

---

### Monetisasi & Scale

| Kondisi Saat Ini | Sinyal Upgrade | Upgrade Ke | Effort | ADR Terkait |
|---|---|---|---|---|
| Gratis tanpa monetisasi | 100+ active user, atau biaya infra > Rp 500rb/bulan | Freemium model (basic gratis, fitur premium berbayar) | Tinggi — butuh billing system, feature gating, landing page update | ADR-014 |
| Freemium (jika dijalankan) | Perlu payment gateway Indonesia | Midtrans atau Xendit (paling umum di Indonesia) | Sedang — integrasi API + webhook + UI checkout | ADR-014 |
| Indonesia-only (IDR, id-ID) | Ada demand dari user luar Indonesia | Multi-currency + i18n penuh (sudah ada infrastructure-nya di Phase 3) | Sedang — extend i18n, tambah currency conversion | ADR-010, ADR-016 |

---

### Cara Pakai Tabel Ini

```
1. Ada sinyal yang cocok di kolom "Sinyal Upgrade"?
   → Baca ADR terkait untuk pahami konteks keputusan asal
   → Evaluasi apakah sinyal ini benar-benar sudah terpenuhi

2. Effort "Rendah" = bisa diputuskan dan dieksekusi dalam 1 sesi
   Effort "Sedang" = butuh planning + mungkin 1-2 sprint
   Effort "Tinggi" = butuh ADR baru, design doc, dan phase tersendiri

3. Setelah upgrade dieksekusi:
   → Update ADR terkait (status + catatan)
   → Tambah ADR baru jika keputusan berubah signifikan
   → Update tabel ini jika kondisi baru sudah tidak relevan
```

---

*Document maintained by: Solo Developer*
*Referenced from: CLAUDE.md, progress.md*
*Update setiap ada keputusan baru — jangan tunggu phase selesai*
*Format: ADR-XXX, increment dari nomor terakhir*
