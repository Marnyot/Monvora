# MONVORA — Product Document
> Defines what Monvora is, who it's for, and why it exists
> Referenced from: master.md, CLAUDE.md

---

## DOCUMENT VERSION HISTORY

| Version | Date | Updated By | Changes |
|---|---|---|---|
| v2 | May 24, 2026 | Claude | Rename Tier → Main Core/Sub Core/Optional/Future, jawab Q1–Q5, tambah monetization section, update parser jadi universal semua bank, tambah agent structure section |
| v1 | May 24, 2026 | Claude | Initial creation |

**Current Version:** v2
**Last Updated:** May 24, 2026

---

## TABLE OF CONTENTS

1. [Problem Statement](#1-problem-statement)
2. [Product Vision](#2-product-vision)
3. [Target Users](#3-target-users)
4. [User Personas](#4-user-personas)
5. [Core Jobs To Be Done](#5-core-jobs-to-be-done)
6. [Feature List](#6-feature-list)
7. [Out of Scope](#7-out-of-scope)
8. [Success Metrics](#8-success-metrics)
9. [Competitive Landscape](#9-competitive-landscape)
10. [Monetization](#10-monetization)
11. [Product Decisions Log](#11-product-decisions-log)
12. [Agent Structure](#12-agent-structure)

---

## 1. PROBLEM STATEMENT

### Situasi Saat Ini
Masyarakat Indonesia, khususnya generasi muda yang aktif bertransaksi digital, menggunakan rata-rata 2–4 metode pembayaran berbeda setiap harinya — kombinasi dari rekening bank, QRIS, GoPay, ShopeePay, OVO, DANA, dan cash. Tidak ada satu platform pun yang menyatukan semua data ini secara otomatis.

### Akibatnya
- Pengeluaran tidak terpantau karena tersebar di banyak tempat
- Sulit mengetahui berapa sebenarnya yang sudah dihabiskan bulan ini
- Budgeting tidak bisa dilakukan karena data tidak lengkap
- Pengguna baru sadar masalah keuangan setelah sudah terlambat

### Solusi yang Ada Sekarang — dan Masalahnya
| Solusi | Masalah |
|---|---|
| Catat manual di notes/Excel | Tidak konsisten, mudah lupa, tidak ada analitik |
| Aplikasi finance tracker umum (Money Manager, dll) | Tidak support metode pembayaran Indonesia, UI kompleks |
| Fitur laporan bawaan e-wallet | Hanya menampilkan 1 wallet, tidak terintegrasi |
| Banking app | Hanya menampilkan 1 rekening, tidak ada insight |

### Gap yang Diisi Monvora
Tidak ada aplikasi yang:
1. Otomatis membaca notifikasi transaksi bank Indonesia
2. Terintegrasi dengan kebiasaan pembayaran lokal (QRIS, e-wallet Indonesia)
3. Cukup sederhana untuk digunakan orang yang tidak paham finance
4. Memberikan insight yang actionable, bukan sekadar daftar transaksi

---

## 2. PRODUCT VISION

### Vision Statement
> "Monvora hadir agar setiap orang Indonesia bisa memahami ke mana uangnya pergi — tanpa perlu jadi ahli keuangan."

### Mission
Membangun personal finance OS yang bekerja secara otomatis di background, sehingga pengguna cukup hidup normal dan Monvora yang mencatat, menganalisa, dan memberikan insight.

### Tagline
> "Your money, finally making sense."

### Posisi Produk
Monvora bukan aplikasi pembukuan. Bukan juga aplikasi investasi. Monvora adalah **financial awareness tool** — alat untuk membuat pengguna sadar dan paham terhadap perilaku keuangan mereka sendiri, tanpa perlu usaha ekstra.

---

## 3. TARGET USERS

### Primary User (MVP)
**Developer sendiri** — ini adalah dogfooding. Produk harus cukup berguna untuk dipakai sendiri setiap hari sebelum ditawarkan ke orang lain.

### Secondary User (Post-MVP)
Profesional muda Indonesia usia 20–35 tahun yang:
- Punya minimal 1 rekening bank aktif yang mengirim notifikasi email
- Menggunakan minimal 1 e-wallet (GoPay, ShopeePay, OVO, atau DANA)
- Bertransaksi digital minimal 5x seminggu
- Belum punya sistem pencatatan keuangan yang konsisten
- Tidak memiliki latar belakang finance — tidak tahu apa itu "debit" vs "kredit"

### Bukan Target User (Eksplisit)
- Akuntan atau profesional keuangan → butuh fitur yang jauh lebih kompleks
- Pengguna yang transaksi dominan cash → otomasi tidak akan banyak membantu
- Pemilik bisnis/UMKM → kebutuhan berbeda, butuh fitur invoice, pajak, dll
- Pengguna yang tidak punya akun Google → Gmail integration tidak bisa dipakai

---

## 4. USER PERSONAS

### Persona 1 — Rafi, 24 tahun, Fresh Graduate
**Latar belakang:**
Baru mulai kerja pertama di Jakarta. Gaji pertama sudah habis sebelum akhir bulan tapi tidak tahu ke mana. Punya rekening Mandiri (gaji) dan sering pakai GoPay untuk makan siang dan Shopee untuk belanja online.

**Pain point:**
- Tidak sadar kebiasaan belanja Shopee menyedot 30% gajinya
- Takut buka banking app karena tidak mau lihat saldonya
- Pernah coba Excel tapi menyerah di minggu kedua

**Yang diinginkan:**
- Tahu pengeluaran bulanan tanpa harus input manual setiap hari
- Dapat peringatan kalau sudah kebablasan di satu kategori
- Tampilan yang tidak bikin pusing

**Bagaimana Monvora membantu:**
Gmail sync otomatis capture transaksi Mandiri. Quick entry untuk GoPay. Dashboard menampilkan "kamu sudah habis Rp 800.000 untuk Food bulan ini" dalam bahasa yang mudah dimengerti.

---

### Persona 2 — Dinda, 29 tahun, Marketing Executive
**Latar belakang:**
Sudah kerja 5 tahun, penghasilan cukup, tapi tetap merasa uang "menghilang" begitu saja. Pakai BCA untuk gaji, OVO untuk transportasi, dan DANA untuk bayar tagihan. Sudah pernah coba beberapa app finance tapi selalu berhenti karena terlalu ribet.

**Pain point:**
- Punya 3 wallet berbeda, tidak ada gambaran total keuangan
- Sering lupa ada subscription yang auto-debit tiap bulan
- Mau nabung tapi tidak tahu harus dari mana mulainya

**Yang diinginkan:**
- Satu dashboard yang menampilkan semua wallet sekaligus
- Tahu berapa total yang keluar bulan ini dari semua sumber
- Deteksi otomatis tagihan langganan

**Bagaimana Monvora membantu:**
Multi-wallet dashboard. Gmail sync untuk BCA. Recurring transaction detection menampilkan "kamu punya 4 subscription total Rp 200.000/bulan."

---

### Persona 3 — Developer (Self)
**Latar belakang:**
Membangun Monvora karena kebutuhan sendiri. Transaksi mix antara bank transfer (BCA/Mandiri), GoPay untuk sehari-hari, dan sesekali pembelian digital (Steam, Google Play, domain, hosting).

**Pain point:**
- Pengeluaran developer (domain, hosting, tools) sering tidak dianggap "pengeluaran serius"
- Tidak ada kategori yang pas untuk pengeluaran tech di app finance konvensional
- Butuh data akurat untuk tahu apakah side project layak dilanjutkan

**Yang diinginkan:**
- Kategori custom (Dev Tools, Hosting, Gaming)
- Export data untuk analisis lebih lanjut
- Dashboard yang bisa dilihat sekilas tanpa harus buka laptop

**Bagaimana Monvora membantu:**
Custom categories. Gmail sync untuk semua transaksi bank. PWA yang bisa diakses dari HP kapan saja.

---

## 5. CORE JOBS TO BE DONE

Framework: "When I [situasi], I want to [motivasi], so I can [outcome]."

### Job 1 — Awareness
> "Ketika saya penasaran berapa yang sudah saya habiskan bulan ini, saya ingin langsung tahu angkanya tanpa harus hitung manual, sehingga saya bisa membuat keputusan finansial hari ini dengan informasi yang akurat."

### Job 2 — Auto-Capture
> "Ketika saya baru saja bayar pakai kartu atau transfer bank, saya ingin transaksinya langsung tercatat sendiri, sehingga saya tidak perlu ingat untuk input manual."

### Job 3 — Pattern Recognition
> "Ketika akhir bulan tiba, saya ingin tahu pola pengeluaran saya selama sebulan terakhir, sehingga saya bisa identifikasi mana yang bisa dikurangi bulan depan."

### Job 4 — Quick Capture
> "Ketika saya baru saja bayar pakai GoPay atau cash, saya ingin bisa mencatat transaksi ini dalam 10 detik, sehingga data saya tetap lengkap meski tidak semua bisa otomatis."

### Job 5 — Budget Control
> "Ketika saya mau disiplin di kategori tertentu, saya ingin set limit dan dapat peringatan kalau sudah mendekati batas, sehingga saya tidak overspending tanpa sadar."

---

## 6. FEATURE LIST

### Main Core — Wajib Ada (MVP, Phase 1)
Tanpa fitur ini, produk tidak berguna sama sekali. Harus selesai sebelum Phase 2 dimulai.

| # | Fitur | Deskripsi Singkat |
|---|---|---|
| F01 | Google OAuth Login | Masuk menggunakan akun Google |
| F02 | Multi-wallet Management | Tambah dan kelola beberapa wallet (bank, e-wallet, cash) |
| F03 | Manual Quick Entry | Input transaksi dalam < 10 detik |
| F04 | Transaction List | Lihat semua transaksi dengan filter dan search |
| F05 | Basic Dashboard | Balance total, cashflow bulan ini, transaksi terbaru |
| F06 | Category System | Kategori default + custom |
| F07 | Light/Dark/System Theme | Tampilan menyesuaikan preferensi device |

### Sub Core — Pembeda Utama (Phase 2)
Fitur yang membuat Monvora berbeda dari semua kompetitor. Prioritas setelah Main Core selesai.

| # | Fitur | Deskripsi Singkat |
|---|---|---|
| F08 | Gmail Auto-Sync | Baca notifikasi transaksi bank dari email otomatis |
| F09 | Universal Bank Parser | Deteksi dan parse email dari **semua bank Indonesia** yang push notif ke Gmail — dimulai dari Mandiri, diperluas ke bank lain secara bertahap |
| F10 | AI Categorization | Gemini + rule-based untuk kategorisasi otomatis. Insight dalam Bahasa Indonesia |
| F11 | Duplicate Detection | Cegah transaksi tercatat dua kali |
| F12 | Sync Status Indicator | User tahu kapan terakhir sync dan berapa transaksi masuk |

### Optional — Nilai Tambah (Phase 3)
Fitur yang meningkatkan nilai produk secara signifikan tapi tidak memblokir penggunaan dasar.

| # | Fitur | Deskripsi Singkat |
|---|---|---|
| F13 | Analytics Dashboard | Chart tren, breakdown kategori, top merchant |
| F14 | OCR Screenshot | Scan struk e-wallet untuk quick entry |
| F15 | Budget System | Set limit per kategori, peringatan di 80% dan 100% |
| F16 | AI Insights | Ringkasan otomatis dalam Bahasa Indonesia: "pengeluaran makananmu naik 35% bulan ini" |
| F17 | Recurring Detection | Deteksi tagihan langganan otomatis |
| F18 | PWA Support | Bisa di-install di homescreen HP |

### Future — Belum Dikomit (Post-MVP)
Dipertimbangkan setelah produk stabil dan ada pengguna nyata.

| # | Fitur |
|---|---|
| F19 | Subscription Tracker |
| F20 | Export CSV/Excel |
| F21 | WhatsApp Quick Entry Bot |
| F22 | Split Bill |
| F23 | Predictive Forecast |
| F24 | Multi-language (Indonesia) |
| F25 | Family/Shared Wallet |
| F26 | Ad Integration (non-invasif, di halaman non-sensitif) |

---

## 7. OUT OF SCOPE

Hal-hal berikut **secara eksplisit tidak dibangun** di MVP, agar fokus tidak pecah:

| Yang Tidak Dibangun | Alasan |
|---|---|
| Koneksi langsung ke rekening bank (Open Banking) | API perbankan personal tidak tersedia di Indonesia |
| Sinkronisasi otomatis e-wallet | Tidak ada API publik dari GoPay, ShopeePay, dll |
| Fitur investasi (saham, reksa dana) | Beda domain, beda regulasi, beda kompleksitas |
| Fitur pinjaman/kredit | Membutuhkan lisensi fintech dari OJK |
| Laporan pajak | Terlalu kompleks untuk fase ini |
| Aplikasi mobile native (iOS/Android) | PWA cukup untuk MVP |
| Multi-user / akun bisnis | Scope berbeda dari personal finance |
| Facebook OAuth / Apple OAuth | Ditambahkan setelah Google OAuth stabil |
| SMS parsing | Butuh akses SMS yang tidak tersedia di web app |

---

## 8. SUCCESS METRICS

### Metrics untuk Developer (Dogfooding — Phase 1)
| Metric | Target |
|---|---|
| Transaksi tercatat per minggu | Semua transaksi tercatat, tidak ada yang terlewat |
| Waktu input manual | < 10 detik per transaksi |
| Frekuensi buka app | Minimal 1x per hari |
| Data accuracy | 0 transaksi salah nominal atau duplikat |

### Metrics untuk Phase 2 (Gmail Sync)
| Metric | Target |
|---|---|
| Auto-capture rate | ≥ 70% transaksi bank masuk otomatis |
| Parse accuracy | ≥ 95% nominal transaksi terbaca dengan benar |
| Categorization accuracy | ≥ 80% kategori benar tanpa koreksi manual |
| Sync reliability | ≤ 1 kegagalan sync per 100 job yang berjalan |

### Metrics untuk Public Release (Phase 4)
| Metric | Target |
|---|---|
| Day 7 retention | ≥ 40% user masih aktif setelah 7 hari |
| Day 30 retention | ≥ 20% user masih aktif setelah 30 hari |
| Onboarding completion | ≥ 70% user selesaikan onboarding |
| Gmail connection rate | ≥ 50% user koneksi Gmail saat onboarding |

---

## 9. COMPETITIVE LANDSCAPE

### Kompetitor Langsung
| Produk | Kelebihan | Kekurangan vs Monvora |
|---|---|---|
| Money Manager | Mature, banyak fitur | Tidak ada otomasi, UI kompleks, tidak lokal |
| Wallet by BudgetBakers | Desain bagus | Tidak support bank Indonesia, berbayar |
| Finansialku | Lokal, sudah established | Fokus investasi, bukan tracking harian |
| Spendee | UI modern | Tidak ada Gmail sync, tidak lokal |

### Kompetitor Tidak Langsung
| Produk | Kenapa Dipilih User | Kelemahan |
|---|---|---|
| Google Sheets / Excel | Fleksibel, familiar | Manual 100%, tidak ada insight otomatis |
| Notion template | Customizable | Butuh setup sendiri, tidak ada otomasi |
| Catatan HP bawaan | Mudah | Tidak ada analitik sama sekali |

### Keunggulan Kompetitif Monvora
1. **Gmail auto-sync** — satu-satunya yang otomatis baca notifikasi bank Indonesia
2. **QRIS & e-wallet aware** — didesain untuk kebiasaan pembayaran Indonesia
3. **Zero finance knowledge required** — UI untuk orang awam, bukan akuntan
4. **PWA** — tidak perlu install dari Play Store / App Store

---

## 10. MONETIZATION

### Keputusan Resmi
Monvora **gratis sepenuhnya** selama fase awal (dogfooding hingga public release). Tidak ada paywall, tidak ada trial period.

### Rencana Monetisasi (Post-Public Release)
Iklan sebagai jalur utama — **dengan syarat ketat:**

| Aturan | Detail |
|---|---|
| Lokasi iklan | Hanya di halaman non-sensitif: Settings, loading screen, halaman kosong |
| Dilarang keras | Dashboard, halaman transaksi, halaman analytics — terlalu invasif |
| Format iklan | Display ads, bukan interstitial atau pop-up |
| Provider | Google AdSense atau alternatif yang privacy-respecting |
| Transparansi | User diberitahu ada iklan sebelum public release |

### Kenapa Iklan, Bukan Subscription?
- Target user Indonesia lebih familiar dengan model gratis + iklan
- Subscription butuh value proposition yang sangat kuat sebelum user mau bayar
- Iklan bisa diimplementasi tanpa mengubah core experience jika ditempatkan dengan benar

### Catatan Risiko
Iklan di aplikasi finance bisa merusak kepercayaan user jika tidak dieksekusi dengan hati-hati. Ini harus menjadi keputusan yang dikomunikasikan dengan jelas ke user, bukan perubahan mendadak.

---

## 11. PRODUCT DECISIONS LOG

Keputusan produk yang sudah diambil dan tidak perlu didiskusikan ulang:

| # | Keputusan | Jawaban | Tanggal |
|---|---|---|---|
| Q1 | Model monetisasi | Gratis dulu. Iklan sebagai rencana post-public release, ditempatkan di halaman non-sensitif | May 24, 2026 |
| Q2 | Prioritas bank parser | Mulai dari Mandiri (bank utama developer). Parser dirancang universal — bisa deteksi semua bank yang push email ke Gmail, diperluas bertahap | May 24, 2026 |
| Q3 | Onboarding approach | Tidak perlu tutorial. Cukup empty states yang informatif dengan action button yang jelas | May 24, 2026 |
| Q4 | Format angka rupiah | Titik sebagai separator ribuan — **Rp 1.500.000** | May 24, 2026 |
| Q5 | Bahasa AI insights | Bahasa Indonesia — meski UI default English, insight tetap dalam Bahasa Indonesia agar lebih relatable ke target user | May 24, 2026 |

### Open Questions (Belum Dijawab)
| # | Pertanyaan | Prioritas | Kapan Harus Dijawab |
|---|---|---|---|
| Q6 | Bagaimana handle user yang ganti provider email (dari Gmail ke Outlook)? | Rendah | Post-MVP |
| Q7 | Apakah data user perlu bisa di-export atau di-delete sepenuhnya (GDPR-like)? | Rendah | Sebelum public release |

---

## 12. AGENT STRUCTURE

Agent yang digunakan dalam development Monvora menggunakan **Opsi B** — system prompt/persona untuk Claude Code. Setiap agent punya scope yang jelas dan tidak overlap.

### Main Core Agents
Agent yang **selalu aktif** dan dipakai di setiap sesi development.

| Agent | File | Tanggung Jawab |
|---|---|---|
| **Planner Agent** | `agents/planner.md` | Brainstorming, breakdown task, writing plans, memastikan tidak skip langkah |
| **Reviewer Agent** | `agents/reviewer.md` | Code review setiap sebelum merge, cek spec compliance dan code quality |

### Sub Core Agents
Agent yang dipanggil **sesuai konteks** — aktif saat mengerjakan domain tertentu.

| Agent | File | Kapan Dipanggil |
|---|---|---|
| **Frontend Agent** | `agents/frontend.md` | Saat build UI, komponen, dashboard, form, animasi |
| **Backend Agent** | `agents/backend.md` | Saat build API routes, database, Inngest jobs, parsing engine |
| **Security Agent** | `agents/security.md` | Saat implement auth, handle data sensitif, sebelum setiap deploy |

### Optional Agents
Agent yang dipanggil **situasional** — tidak setiap sesi, hanya saat dibutuhkan.

| Agent | File | Kapan Dipanggil |
|---|---|---|
| **QA/Test Agent** | `agents/qa.md` | Saat menulis test, debugging, verifikasi fix, sebelum Phase naik level |

### Yang Tidak Dipakai dan Kenapa
| Agent | Alasan Tidak Dipakai |
|---|---|
| Architect Agent | Overlap dengan Planner. Arsitektur sudah selesai di master.md |
| UI Critic Agent | Digabung ke Frontend Agent — terlalu granular untuk solo dev |
| Refactor Agent | Dijalankan manual saat dibutuhkan, bukan agent permanen |
| Performance Agent | Premature optimization — baru relevan di Phase 3+ |
| Product Agent | Developer sendiri yang jadi PM. Tidak perlu di-delegate |

---

*Document maintained by: Solo Developer*
*Referenced from: master.md v2*
*Next review: After Phase 1 completion*