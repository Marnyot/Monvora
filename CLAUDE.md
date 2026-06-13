# CLAUDE.md
d> Entry point untuk Claude Code — dibaca otomatis di setiap sesi
> Versi: v2 | May 26, 2026 | Tambah PARSER_GUIDE.md

---

## PROYEK INI

**Nama:** Monvora
**Deskripsi:** Personal finance operating system untuk pengguna Indonesia. Otomatis membaca notifikasi transaksi bank dari Gmail, menyediakan quick entry untuk e-wallet dan cash, dan memberikan insight finansial yang mudah dimengerti.
**Stack:** Next.js 14 (App Router) + TypeScript + Tailwind + shadcn/ui + Supabase + Inngest + Gemini API
**Package Manager:** pnpm (selalu gunakan pnpm, tidak pernah npm atau yarn)
**Developer:** Solo developer

---

## BACA DOKUMEN INI SEBELUM MULAI

Sebelum mengerjakan task apapun, Claude wajib membaca dokumen yang relevan. Urutan dokumen sesuai prioritas:

### Wajib Dibaca di Setiap Sesi
```
1. CLAUDE.md          → kamu sedang membacanya
2. progress.md        → lihat status saat ini + task yang sedang dikerjakan
```

### Baca Sesuai Konteks Task

| Sedang mengerjakan... | Baca dokumen ini |
|---|---|
| Fitur baru (apapun) | `master.md` → `architecture.md` |
| Keputusan arsitektur | `decisions.md` |
| UI / komponen | `ui-rules.md` |
| API route | `api-conventions.md` → `security.md` |
| Database / schema | `architecture.md` → `security.md` |
| Gmail sync / parsing | `architecture.md` → `security.md` → `PARSER_GUIDE.md` |
| Parser bank (tulis/edit/debug) | `PARSER_GUIDE.md` — baca ini DULU sebelum menyentuh kode parser |
| Tambah bank baru ke parser | `PARSER_GUIDE.md` → ikuti template di bagian "Template Parser Baru" |
| OCR screenshot (Phase 3) | `PARSER_GUIDE.md` → bagian "OCR Compatibility" |
| Auth / session | `security.md` |
| Test | `tdd.md` |
| Keputusan product | `decisions.md` → `product.md` |
| Alur kerja sistem | `workflow.md` |

### Dokumen Referensi Lengkap

```
master.md          → Tech stack, database schema, phase plan, environment vars
product.md         → Vision, personas, feature list
decisions.md       → Semua keputusan arsitektur, security, product, tooling (ADR format)
workflow.md        → Development workflow, system flow, user flow
architecture.md    → Layer breakdown, data flow, folder structure
security.md        → Threat model, auth rules, RLS, API security, backup, dependency security
api-conventions.md → URL structure, request/response format, semua routes
ui-rules.md        → Design tokens, component rules, accessibility, copy
tdd.md             → Testing philosophy, tools, RED-GREEN-REFACTOR cycle
progress.md        → Status per task, blockers, lessons learned
PARSER_GUIDE.md    → Panduan lengkap parser email bank: interface, regex, amount/date parsing,
                     confidence scoring, template tambah bank baru, OCR compatibility
CLAUDE.md          → File ini — entry point
```

---

## ATURAN YANG TIDAK BOLEH DILANGGAR

Ini adalah aturan absolut. Tidak ada pengecualian apapun:

### Security
```
❌ Tidak pernah hardcode API key atau secret di dalam kode
❌ Tidak pernah gunakan user_id dari request body — selalu dari session
❌ Tidak pernah disable RLS di Supabase bahkan untuk testing
❌ Tidak pernah hard delete data finansial — selalu soft delete
❌ Tidak pernah store token OAuth di localStorage
❌ Tidak pernah request Gmail scope lebih dari gmail.readonly
❌ Tidak pernah log nominal transaksi atau nama merchant
```

### Data
```
❌ Tidak pernah store amount sebagai float — selalu INTEGER IDR
❌ Tidak pernah query database tanpa filter user_id dari session
❌ Tidak pernah return field internal ke client (deleted_at, raw_email_id, dll)
```

### Code Quality
```
❌ Tidak pernah tulis implementasi sebelum ada test (RED dulu)
❌ Tidak pernah commit jika ada test yang gagal
❌ Tidak pernah gunakan npm atau yarn — selalu pnpm
❌ Tidak pernah hardcode warna atau spacing — selalu Tailwind tokens
❌ Tidak pernah akses Supabase langsung dari client untuk operasi sensitif
```

### UI
```
❌ Tidak pernah gunakan istilah finance yang membingungkan (debit, kredit)
❌ Tidak pernah pakai merah/hijau untuk tujuan selain indikator finansial
❌ Tidak pernah buat komponen tanpa loading state, error state, dan empty state
❌ Tidak pernah hardcode string — semua teks harus siap untuk i18n (Phase 3)
```

---

## WORKFLOW SETIAP SESI

### Saat Memulai Task Baru
```
1. Baca progress.md → pahami status terkini
2. Baca dokumen relevan sesuai tabel di atas
3. Tulis test dulu (RED) sebelum implementasi
4. Implementasi minimal untuk buat test hijau (GREEN)
5. Refactor jika perlu
6. Update progress.md → tandai task selesai
7. Commit dengan format yang benar
```

### Format Commit
```
feat: [deskripsi fitur baru]
fix: [deskripsi bug fix]
test: [deskripsi test yang ditambahkan]
refactor: [deskripsi refactor]
docs: [deskripsi update dokumentasi]
chore: [setup, config, dependency]

Contoh:
feat: add quick entry form with optimistic update
test: add mandiri parser tests with email fixtures
fix: prevent duplicate transaction from gmail sync
```

⚠️ **Trailer commit:** Selalu gunakan `git commit --no-trailer` agar tidak ada `Co-Authored-By` otomatis. Jangan pakai `git commit` saja.

### Sebelum Setiap Commit — Checklist Cepat
```
[ ] Session check ada di setiap API route baru?
[ ] Input divalidasi dengan Zod?
[ ] user_id dari session, bukan dari request?
[ ] Soft delete dipakai, bukan hard delete?
[ ] Amount disimpan sebagai integer?
[ ] Test passing semua?
[ ] Tidak ada console.log debug yang tertinggal?
[ ] Tidak ada secret hardcoded?
[ ] Komponen sudah dicek di light + dark mode?
```

---

## AGENTS

Monvora menggunakan 6 agent sebagai persona Claude Code. Setiap agent punya scope yang jelas.

### Main Core — Aktif di Setiap Sesi

**🗺️ Planner Agent** `agents/planner.md`
Aktif di awal setiap task baru. Bertanya tentang apa yang ingin dicapai, breakdown task menjadi langkah-langkah kecil, pastikan tidak ada langkah yang dilewati. Enforce RED-GREEN-REFACTOR.

**🔍 Reviewer Agent** `agents/reviewer.md`
Aktif sebelum setiap commit. Review kode terhadap spec, security rules, dan code quality. Laporkan issue berdasarkan severity. Issue critical harus diselesaikan sebelum commit.

### Sub Core — Aktif Sesuai Domain

**🎨 Frontend Agent** `agents/frontend.md`
Aktif saat mengerjakan UI, komponen, styling, animasi. Enforce ui-rules.md. Pastikan semua komponen punya 4 state (loading/error/empty/data). Cek light + dark mode.

**⚙️ Backend Agent** `agents/backend.md`
Aktif saat mengerjakan API routes, database, Inngest jobs, parsing engine. Enforce api-conventions.md dan security.md. Pastikan setiap route mengikuti template wajib.

**🔒 Security Agent** `agents/security.md`
Aktif saat mengerjakan auth, data sensitif, external API, dan sebelum setiap deploy. Enforce semua aturan di security.md. Tidak ada kompromi.

### Optional — Aktif Situasional

**🧪 QA/Test Agent** `agents/qa.md`
Aktif saat menulis test, debugging, dan verifikasi fix. Enforce tdd.md. Pastikan coverage tidak turun. Jalankan test setelah setiap perubahan.

---

## SKILLS & PLUGINS

Semua skills dan plugins sudah terinstall. Berikut daftar lengkap beserta kapan digunakan:

### Plugins (Claude Code)

| Plugin | Kapan Digunakan |
|---|---|
| `superpowers` | Selalu aktif — subagent, brainstorming, planning |
| `code-review` | Sebelum setiap commit — review kode otomatis |
| `security-review` | Sebelum deploy + saat menyentuh auth/data sensitif |

### Skills (Context & Reference)

| Skill | Kapan Digunakan |
|---|---|
| `frontend-design` | Saat membuat komponen, halaman, UI baru |
| `next-best-practices` | Saat membuat route, layout, server/client component |
| `supabase` | Saat query database, RLS, auth, migrations |
| `shadcn/ui` | Saat pakai atau extend komponen shadcn |
| `tailwind-design-system` | Saat styling, design tokens, responsive |
| `zustand` | Saat setup atau update client state |
| `tanstack-query-expert` | Saat data fetching, caching, optimistic update |
| `mastering-typescript` | Saat typing complex interfaces atau generics |
| `gstack` | Referensi stack pattern keseluruhan |
| `tesseract-ocr` | Saat mengerjakan fitur OCR screenshot (Phase 3) |

### Tools Tambahan

| Tool | Kegunaan |
|---|---|
| `Context7 MCP` | Context-aware documentation lookup |
| `claude-mem` | Memory antar sesi Claude Code |
| `next-themes` | Sudah terinstall sebagai npm dependency |
| `serena-agent` | Python agent untuk task otomasi jika dibutuhkan |

### Prioritas Penggunaan Skills
```
1. Baca CLAUDE.md + progress.md dulu (selalu)
2. Aktifkan skill yang relevan dengan task
3. Jika ada konflik antara skill dan dokumen Monvora
   → dokumen Monvora yang menang (sudah disesuaikan dengan project)
```

---

## TECH STACK QUICK REFERENCE

```
Framework      : Next.js 14 (App Router)
Language       : TypeScript (strict mode)
Styling        : Tailwind CSS + shadcn/ui
Theme          : next-themes (default: system)
State          : Zustand (client) + TanStack Query (server)
Database       : Supabase (PostgreSQL + RLS)
Auth           : Supabase Auth + Google OAuth
Background     : Inngest
AI             : Gemini API (gemini-2.5-flash) — categorize, insights, OCR vision, Gmail parser fallback
OCR            : Tesseract.js (client-side)
Testing        : Vitest + Testing Library + Playwright
Package Manager: pnpm
Hosting        : Vercel + Supabase Cloud
```

---

## STRUKTUR FOLDER PENTING

```
app/
├── (auth)/          → Login, OAuth callback
├── (dashboard)/     → Semua halaman protected
└── api/             → Semua API routes

lib/
├── supabase/        → Client + server Supabase
├── gmail/           → Gmail API + parsers
├── ai/              → Gemini + rule-based categorization
├── inngest/         → Background jobs
├── validations/     → Zod schemas
└── utils/           → Currency, date, errors

components/
├── ui/              → shadcn (jangan edit)
├── dashboard/       → Dashboard components
├── transactions/    → Transaction components
├── analytics/       → Chart components
└── shared/          → Reusable components

tests/
├── unit/            → Logic murni
├── integration/     → API + database
├── components/      → React components
└── e2e/             → End-to-end flows
```

---

## FORMAT ANGKA & TANGGAL

```
Uang     : Rp 1.500.000 (titik sebagai separator ribuan)
Storage  : INTEGER IDR (tidak pernah float)
Tanggal  : ISO 8601 dengan timezone → "2026-05-24T12:30:00+07:00"
Timezone : Asia/Jakarta (WIB, UTC+7) sebagai default
```

---

## CURRENT STATUS

```
Phase    : Phase 1 — Setup Project
Docs     : 10/10 selesai ✅
Skills   : Semua terinstall ✅
App      : v0.0.0 — setup sedang berjalan
Next     : Selesaikan setup project → mulai auth
```

Lihat `progress.md` untuk detail lengkap status setiap task.

---

## JIKA RAGU

Urutan prioritas saat ada konflik atau ketidakjelasan:

```
1. security.md       → keamanan selalu menang
2. decisions.md      → lihat keputusan yang sudah dibuat dan alasannya
3. progress.md       → lihat status dan blocker terkini
4. product.md        → visi dan scope product
5. master.md         → source of truth teknis
6. Tanya developer   → jangan assume jika tidak yakin
```

---

*CLAUDE.md v2 | May 26, 2026*
*Update dokumen ini setiap kali ada perubahan major pada struktur project atau keputusan fundamental*
