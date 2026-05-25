# MONVORA — UI Rules
> Defines UI/UX standards, component rules, design tokens, and accessibility requirements
> Referenced from: master.md, CLAUDE.md
> ⚠️ Semua komponen baru wajib mengikuti rules ini sebelum di-commit

---

## DOCUMENT VERSION HISTORY

| Version | Date | Updated By | Changes |
|---|---|---|---|
| v2 | May 25, 2026 | opencode | Sync with ADR-023: semua copy Bahasa Indonesia |
| v1 | May 24, 2026 | Claude | Initial creation |

**Current Version:** v2
**Last Updated:** May 25, 2026

---

## TABLE OF CONTENTS

1. [Design Philosophy](#1-design-philosophy)
2. [Design Tokens](#2-design-tokens)
3. [Typography](#3-typography)
4. [Color System](#4-color-system)
5. [Spacing & Layout](#5-spacing--layout)
6. [Component Rules](#6-component-rules)
7. [Theme System](#7-theme-system)
8. [Responsive Rules](#8-responsive-rules)
9. [Motion & Animation](#9-motion--animation)
10. [Accessibility](#10-accessibility)
11. [Language & Copy](#11-language--copy)
12. [State Rules](#12-state-rules)
13. [Anti-Patterns](#13-anti-patterns)

---

## 1. DESIGN PHILOSOPHY

### Prinsip Utama

Monvora dipakai oleh orang yang **tidak paham finance**. Setiap keputusan desain harus melewati satu filter:

> "Apakah orang tua saya yang tidak pernah pakai app finance bisa mengerti ini dalam 3 detik?"

Jika tidak — redesign.

### Tiga Pilar Desain

**1. Clarity over Cleverness**
Desain yang pintar tapi membingungkan lebih buruk dari desain yang sederhana tapi jelas. Tidak ada fitur tersembunyi, tidak ada gesture yang tidak jelas, tidak ada ikon tanpa label.

**2. Numbers First**
Monvora adalah aplikasi angka. Nominal transaksi, total balance, persentase — ini yang paling penting. Mereka harus jadi elemen visual yang paling dominan di setiap screen.

**3. Calm, Not Alarming**
Keuangan sudah cukup bikin stress. Monvora harus terasa tenang, bersih, dan in control — bukan seperti dashboard stock trading yang penuh angka bergerak dan warna mencolok.

### Referensi Visual
- **Wise** — bersih, numbers prominent, trustworthy
- **Revolut** — modern, card-based, mobile-first
- **Bukan** Tokopedia, Shopee, atau app dengan warna ramai dan banyak notifikasi

---

## 2. DESIGN TOKENS

### Cara Penggunaan Token

Selalu gunakan Tailwind CSS classes yang map ke design tokens. **Tidak pernah hardcode warna atau spacing** dalam bentuk inline style atau arbitrary values kecuali ada alasan yang sangat kuat.

```tsx
// ✅ BENAR — pakai semantic token
<div className="bg-background text-foreground border border-border">

// ❌ SALAH — hardcode nilai
<div style={{ backgroundColor: '#ffffff', color: '#0f172a' }}>

// ❌ SALAH — arbitrary Tailwind value
<div className="bg-[#ffffff] text-[#0f172a]">
```

### Token Map (shadcn/ui + Tailwind)

```
BACKGROUNDS
bg-background          → halaman utama
bg-card                → card, panel
bg-popover             → dropdown, tooltip
bg-muted               → section muted, disabled area

TEXT
text-foreground        → teks utama
text-muted-foreground  → teks sekunder, label, hint
text-card-foreground   → teks di dalam card

BORDER
border-border          → border umum
border-input           → border input field

INTERACTIVE
bg-primary             → tombol utama, CTA
text-primary-foreground→ teks di atas primary
bg-secondary           → tombol sekunder
bg-accent              → hover state, highlight
bg-destructive         → tombol delete, error state
```

---

## 3. TYPOGRAPHY

### Font Stack

```css
/* Heading — angka dan judul besar */
font-family: 'Geist', system-ui, sans-serif;

/* Body — teks paragraf dan label */
font-family: 'Geist', system-ui, sans-serif;

/* Monospace — kode, reference number */
font-family: 'Geist Mono', monospace;
```

Geist sudah include di Next.js 14 — tidak perlu install tambahan.

### Hierarchy

```
Display (nominal besar di dashboard)
  size    : text-4xl (36px) atau text-3xl (30px)
  weight  : font-bold
  usage   : total balance, nominal transaksi di detail

Heading 1 (judul halaman)
  size    : text-2xl (24px)
  weight  : font-semibold
  usage   : "Transactions", "Analytics", "Settings"

Heading 2 (judul section)
  size    : text-lg (18px)
  weight  : font-semibold
  usage   : "This Month", "Recent Transactions"

Body (teks utama)
  size    : text-base (16px)
  weight  : font-normal
  usage   : deskripsi, label form, konten card

Small (teks sekunder)
  size    : text-sm (14px)
  weight  : font-normal
  color   : text-muted-foreground
  usage   : tanggal, hint, metadata

Tiny (label kecil)
  size    : text-xs (12px)
  weight  : font-medium
  usage   : badge, tag, kategori chip
```

### Aturan Typography

```
✅ Gunakan font-tabular-nums untuk angka yang berubah (balance, amount)
   className="font-mono tabular-nums"

✅ Format IDR selalu pakai titik: Rp 1.500.000
   Tidak pernah: Rp1500000 atau Rp 1,500,000

✅ Teks panjang boleh truncate dengan ellipsis
   className="truncate"

❌ Tidak pernah pakai font-size di bawah text-xs (12px)
❌ Tidak pernah pakai text lebih dari text-4xl untuk konten reguler
❌ Tidak pernah mix font weight yang tidak konsisten dalam satu card
```

---

## 4. COLOR SYSTEM

### Semantic Colors (Wajib Dipakai)

```
FINANCIAL COLORS — tidak pernah berubah artinya

Hijau (Money In / Positive)
  Light: text-emerald-600    bg-emerald-50
  Dark:  text-emerald-400    bg-emerald-950
  Usage: income, positive balance, budget aman

Merah (Money Out / Negative)
  Light: text-red-500        bg-red-50
  Dark:  text-red-400        bg-red-950
  Usage: expense, negative delta, over budget

Kuning / Amber (Warning)
  Light: text-amber-600      bg-amber-50
  Dark:  text-amber-400      bg-amber-950
  Usage: mendekati batas budget (80-99%), perlu review

Abu-abu (Neutral / Transfer)
  Light: text-slate-500      bg-slate-100
  Dark:  text-slate-400      bg-slate-800
  Usage: transfer antar wallet, data netral
```

### Aturan Warna

```
✅ Hijau = uang masuk. Selalu. Tidak ada pengecualian.
✅ Merah = uang keluar. Selalu. Tidak ada pengecualian.
✅ Warna finansial tidak pernah dipakai untuk dekorasi

❌ Tidak pernah pakai merah untuk elemen UI non-finansial (border, divider, ikon dekoratif)
❌ Tidak pernah pakai hijau sebagai warna primary brand
❌ Tidak pernah pakai warna finansial untuk loading state atau empty state
```

### Amount Display Component

```tsx
// components/shared/amount-display.tsx
interface AmountDisplayProps {
  amount: number
  type: 'income' | 'expense' | 'transfer'
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

export function AmountDisplay({ amount, type, size = 'md' }: AmountDisplayProps) {
  const prefix = type === 'income' ? '+' : type === 'expense' ? '-' : ''

  const colorClass = {
    income:   'text-emerald-600 dark:text-emerald-400',
    expense:  'text-red-500 dark:text-red-400',
    transfer: 'text-slate-500 dark:text-slate-400',
  }[type]

  const sizeClass = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-xl',
    xl: 'text-3xl font-bold',
  }[size]

  return (
    <span className={`${colorClass} ${sizeClass} font-mono tabular-nums font-semibold`}>
      {prefix}{formatIDR(amount)}
    </span>
  )
}
```

---

## 5. SPACING & LAYOUT

### Spacing Scale

Gunakan Tailwind spacing scale secara konsisten:

```
p-2  (8px)   → padding dalam badge, chip kecil
p-3  (12px)  → padding dalam tombol kecil
p-4  (16px)  → padding standar card, section
p-6  (24px)  → padding halaman mobile
p-8  (32px)  → padding halaman desktop
p-12 (48px)  → section spacing besar

gap-2 (8px)  → gap antar elemen kecil (ikon + teks)
gap-3 (12px) → gap antar item dalam list
gap-4 (16px) → gap antar card
gap-6 (24px) → gap antar section
```

### Layout Grid

```tsx
// Mobile layout (default)
<main className="px-4 py-6 space-y-6">

// Desktop layout
<main className="px-8 py-8 max-w-5xl mx-auto space-y-8">

// Card grid
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

// Dashboard summary cards (selalu 2 kolom di mobile)
<div className="grid grid-cols-2 gap-3">
```

### Container Rules

```
Max width halaman  : max-w-5xl (1024px) — cukup untuk finance dashboard
Max width form     : max-w-md (448px) — form tidak boleh terlalu lebar
Sidebar lebar      : w-64 (256px) — fixed di desktop
Bottom nav tinggi  : h-16 (64px) — safe area mobile
```

---

## 6. COMPONENT RULES

### Card

```tsx
// Standard card
<div className="rounded-xl border border-border bg-card p-4 shadow-sm">
  {children}
</div>

// Card dengan hover (clickable)
<div className="rounded-xl border border-border bg-card p-4 shadow-sm
                hover:shadow-md hover:border-primary/20
                transition-all duration-200 cursor-pointer">
  {children}
</div>

// Aturan card:
// ✅ Selalu rounded-xl (bukan rounded-lg atau rounded-md)
// ✅ Selalu ada border border-border
// ✅ Selalu ada shadow-sm
// ❌ Tidak pernah card tanpa border di atas bg-background
```

### Button

```tsx
// Primary — aksi utama (1 per screen, sesedikit mungkin)
<Button>Save Transaction</Button>

// Secondary — aksi alternatif
<Button variant="outline">Cancel</Button>

// Destructive — hapus, disconnect
<Button variant="destructive">Delete</Button>

// Ghost — aksi minor, nav item
<Button variant="ghost">View All</Button>

// Aturan button:
// ✅ Label button harus action verb: "Save", "Add", "Connect", "Delete"
// ❌ Tidak pernah: "OK", "Yes", "Submit", "Click Here"
// ✅ Loading state selalu ada di tombol yang trigger API call
// ✅ Disabled state saat form tidak valid atau sedang loading
// ❌ Tidak pernah 2 primary button dalam satu view
```

### Transaction Card

```tsx
// components/transactions/transaction-card.tsx
export function TransactionCard({ transaction }: { transaction: Transaction }) {
  return (
    <div className="flex items-center gap-3 p-4 rounded-xl border border-border
                    bg-card hover:shadow-md transition-all duration-200 cursor-pointer">
      {/* Category icon */}
      <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
           style={{ backgroundColor: transaction.category.color + '20' }}>
        <Icon name={transaction.category.icon} className="w-5 h-5"
              style={{ color: transaction.category.color }} />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">
          {transaction.merchant_name ?? transaction.description ?? 'Transaction'}
        </p>
        <p className="text-xs text-muted-foreground">
          {transaction.category.name} · {formatDate(transaction.transacted_at)}
        </p>
      </div>

      {/* Amount */}
      <AmountDisplay
        amount={transaction.amount}
        type={transaction.type}
        size="md"
      />
    </div>
  )
}
```

### Form Fields

```tsx
// Label selalu ada, tidak pernah placeholder-only
<div className="space-y-2">
  <Label htmlFor="amount">Amount</Label>
  <Input
    id="amount"
    type="number"
    placeholder="0"
    inputMode="numeric"   // ← mobile number keyboard
  />
  {error && (
    <p className="text-xs text-destructive">{error}</p>
  )}
</div>

// Aturan form:
// ✅ Label selalu di atas input (bukan floating label)
// ✅ Error message di bawah input, warna destructive
// ✅ inputMode="numeric" untuk field angka di mobile
// ✅ autoFocus pada field pertama di modal/sheet
// ❌ Tidak pernah required tanpa indikator visual
// ❌ Tidak pernah placeholder sebagai satu-satunya label
```

### Empty State

```tsx
// components/shared/empty-state.tsx
interface EmptyStateProps {
  icon: string
  title: string
  description: string
  action?: {
    label: string
    onClick: () => void
  }
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
        <Icon name={icon} className="w-8 h-8 text-muted-foreground" />
      </div>
      <h3 className="font-semibold text-lg mb-2">{title}</h3>
      <p className="text-muted-foreground text-sm max-w-xs mb-6">{description}</p>
      {action && (
        <Button onClick={action.onClick}>{action.label}</Button>
      )}
    </div>
  )
}

// Setiap list wajib punya empty state:
// Transactions: "No transactions yet" + "Add your first transaction"
// Budgets: "No budgets set" + "Create a budget"
// Wallets: "No wallets added" + "Add a wallet"
```

### Skeleton Loader

```tsx
// components/shared/skeleton-card.tsx
export function TransactionSkeleton() {
  return (
    <div className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card">
      <Skeleton className="w-10 h-10 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-24" />
      </div>
      <Skeleton className="h-4 w-20" />
    </div>
  )
}

// Aturan skeleton:
// ✅ Selalu tampilkan 3-5 skeleton saat loading list
// ✅ Shape skeleton harus mirip dengan konten aslinya
// ❌ Tidak pernah loading spinner di tengah halaman untuk list
// ❌ Tidak pernah blank white screen saat loading
```

---

## 7. THEME SYSTEM

### Setup (Sudah Didefinisikan di master.md)

```tsx
// app/layout.tsx
<ThemeProvider
  attribute="class"
  defaultTheme="system"
  enableSystem={true}
  disableTransitionOnChange
>
```

### Theme Toggle Component

```tsx
// components/shared/theme-toggle.tsx
'use client'
import { useTheme } from 'next-themes'
import { Monitor, Moon, Sun } from 'lucide-react'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  const options = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark',  label: 'Dark',  icon: Moon },
    { value: 'system',label: 'System', icon: Monitor },
  ]

  return (
    <div className="flex rounded-lg border border-border p-1 gap-1">
      {options.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          onClick={() => setTheme(value)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm
                      transition-colors duration-150 ${
            theme === value
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Icon className="w-3.5 h-3.5" />
          {label}
        </button>
      ))}
    </div>
  )
}
```

### Aturan Theme

```
✅ Setiap komponen baru harus dicek di light DAN dark mode sebelum commit
✅ Gunakan Tailwind dark: prefix untuk overrides spesifik dark mode
✅ Gambar dan ikon harus terlihat di kedua theme

❌ Tidak pernah hardcode warna yang hanya cocok di satu theme
❌ Tidak pernah pakai white atau black langsung — pakai bg-background / text-foreground

// Contoh dark mode override
<div className="bg-slate-50 dark:bg-slate-900">
<span className="text-slate-700 dark:text-slate-300">
```

---

## 8. RESPONSIVE RULES

### Breakpoints

```
Mobile   : default (< 768px) — desain utama
Tablet   : md: (768px+)      — layout mulai berubah
Desktop  : lg: (1024px+)     — layout penuh dengan sidebar
```

### Mobile-First Approach

```tsx
// Selalu mulai dari mobile, tambah modifier untuk layar besar
<div className="
  flex flex-col gap-4          // mobile: stack vertikal
  md:flex-row md:gap-6         // tablet: horizontal
  lg:gap-8                     // desktop: lebih lebar
">
```

### Navigation

```tsx
// Mobile: Bottom Navigation
// Tampil hanya di mobile (hidden md:hidden)
<nav className="fixed bottom-0 left-0 right-0 h-16 bg-background
                border-t border-border flex md:hidden
                safe-area-inset-bottom">
  {NAV_ITEMS.map(item => <NavItem key={item.href} {...item} />)}
</nav>

// Desktop: Sidebar
// Tampil hanya di desktop (hidden md:flex)
<aside className="hidden md:flex flex-col w-64 h-screen
                  border-r border-border bg-card fixed left-0 top-0">
  {NAV_ITEMS.map(item => <SidebarItem key={item.href} {...item} />)}
</aside>
```

### Quick Entry Button

```tsx
// Floating Action Button — selalu visible di mobile
<button className="fixed bottom-20 right-4 z-50
                   w-14 h-14 rounded-full bg-primary shadow-lg
                   flex items-center justify-center
                   md:bottom-6 md:right-6
                   hover:scale-105 active:scale-95
                   transition-transform duration-150">
  <Plus className="w-6 h-6 text-primary-foreground" />
</button>
```

### Safe Areas (iPhone Notch & Home Indicator)

```tsx
// Bottom navigation harus account for safe area
<nav className="pb-safe">  // Tailwind plugin: tailwindcss-safe-area
// atau
<nav style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
```

---

## 9. MOTION & ANIMATION

### Prinsip

Animasi di Monvora harus **purposeful** — setiap animasi harus punya alasan. Tidak ada animasi untuk show-off.

```
Tujuan animasi yang valid:
1. Feedback — konfirmasi bahwa aksi berhasil
2. Orientation — bantu user memahami perubahan state
3. Continuity — transisi antar halaman terasa natural

Bukan untuk:
- Dekorasi
- Membuat tampilan "keren"
- Menutupi loading time yang panjang
```

### Duration Standards

```
Fast  (100-150ms) : hover state, active state, toggle
Normal (200-300ms) : card expand, modal open, sheet slide
Slow  (300-500ms) : page transition, skeleton to content
```

### Animasi yang Dipakai

```tsx
// Hover card
transition-all duration-200

// Button press
active:scale-95 transition-transform duration-150

// Sheet dari bawah (Quick Entry)
// Gunakan shadcn Sheet component — sudah ada animasi bawaan

// Fade in saat data loaded
// Gunakan Tailwind animate-in
<div className="animate-in fade-in duration-300">
  {data.map(item => <TransactionCard key={item.id} {...item} />)}
</div>

// Number counter (balance berubah)
// Hanya jika ada library — jangan implement manual
```

### Aturan Animasi

```
✅ Semua animasi hormat prefers-reduced-motion
✅ Durasi tidak lebih dari 500ms untuk interaksi user
✅ Gunakan CSS transition, bukan JavaScript animation untuk UI sederhana

❌ Tidak pernah animasi yang block interaksi user
❌ Tidak pernah loop animation di halaman utama
❌ Tidak pernah animasi pada data finansial yang sedang berubah (bisa confusing)
```

### Reduced Motion

```tsx
// Tambahkan di globals.css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 10. ACCESSIBILITY

### Standar Minimum

Monvora harus memenuhi **WCAG 2.1 Level AA** sebagai standar minimum.

### Aturan Wajib

```
COLOR CONTRAST
✅ Text normal: rasio kontras minimum 4.5:1
✅ Text besar (18px+): rasio kontras minimum 3:1
✅ Jangan andalkan warna sebagai satu-satunya indikator
   (contoh: transaksi expense harus ada ikon ATAU label SELAIN warna merah)

KEYBOARD NAVIGATION
✅ Semua interaksi bisa dilakukan dengan keyboard
✅ Focus indicator terlihat jelas (ring focus dari shadcn)
✅ Tab order logis mengikuti visual layout

SCREEN READER
✅ Semua gambar dan ikon punya alt text atau aria-label
✅ Amount display punya aria-label yang readable
   <span aria-label="Rp 45.000 pengeluaran">-Rp 45.000</span>
✅ Form error dikomunikasikan via aria-describedby

TOUCH TARGET
✅ Minimum touch target: 44x44px (tombol, link, nav item)
✅ Jarak antar touch target minimum 8px
```

### Ikon Rules

```tsx
// Ikon dekoratif — sembunyikan dari screen reader
<Icon name="arrow-right" aria-hidden="true" />

// Ikon fungsional — beri label
<button aria-label="Delete transaction">
  <Icon name="trash" aria-hidden="true" />
</button>

// Ikon dengan teks — ikon tetap hidden
<button>
  <Icon name="plus" aria-hidden="true" />
  Add Transaction
</button>
```

### Amount Accessibility

```tsx
// Amount yang hanya pakai warna harus ada konteks tambahan
function AmountDisplay({ amount, type }: AmountDisplayProps) {
  const label = `${formatIDR(amount)} ${
    type === 'income' ? 'pemasukan' :
    type === 'expense' ? 'pengeluaran' : 'transfer'
  }`

  return (
    <span
      aria-label={label}
      className={colorClass}
    >
      {type === 'income' ? '+' : type === 'expense' ? '-' : ''}
      {formatIDR(amount)}
    </span>
  )
}
```

---

## 11. LANGUAGE & COPY

### Prinsip Copy

Target user tidak paham finance. Semua copy harus dalam bahasa sehari-hari.

### Kamus Istilah

| Istilah Teknis | Ganti Dengan |
|---|---|
| Debit | Pengeluaran |
| Credit | Pemasukan |
| Transaction | Transaksi |
| Balance | Saldo |
| Category | Kategori |
| Wallet | Dompet |
| Sync | Sinkronisasi |
| Expense | Pengeluaran |
| Income | Pemasukan |
| Parse | — (tidak pernah ke user) |
| OAuth | "Masuk dengan Google" |
| Confidence score | — (tidak pernah ke user) |

### Tone of Voice

```
✅ Santai tapi profesional
✅ Actionable — selalu jelaskan apa yang bisa dilakukan user
✅ Positif — fokus pada solusi, bukan masalah

❌ Tidak pernah menghakimi pengeluaran user
   SALAH: "Kamu kebanyakan jajan bulan ini"
   BENAR: "Pengeluaran makanan naik 35% bulan ini"

❌ Tidak pernah panik atau alarm berlebihan
   SALAH: "AWAS: Budget jebol!"
   BENAR: "Budget Makanan sudah mencapai batas bulan ini"

❌ Tidak pernah jargon teknis ke user
```

### Error Messages (User-Facing)

```
✅ Jelaskan apa yang terjadi
✅ Jelaskan apa yang bisa dilakukan user

SALAH: "500 Internal Server Error"
BENAR: "Terjadi kesalahan. Silakan coba lagi."

SALAH: "Validation failed: amount must be positive integer"
BENAR: "Masukkan nominal yang valid"

SALAH: "Gmail OAuth token refresh failed"
BENAR: "Gagal terhubung ke Gmail. Silakan hubungkan ulang di Pengaturan."

SALAH: "Duplicate key constraint violation"
BENAR: "Transaksi ini sudah pernah tercatat"
```

### Button Labels

```
✅ Action verb + object dalam Bahasa Indonesia
   "Tambah Transaksi"
   "Simpan"
   "Hubungkan Gmail"
   "Hapus Dompet"
   "Aktifkan Sinkronisasi"

❌ Ambigu atau pasif
   "OK"
   "Submit"
   "Ya"
   "Klik di sini"
   "Lanjut"  (boleh hanya untuk multi-step flow)
```

### Empty State Copy

```
Transaksi kosong:
  Title       : "Belum ada transaksi"
  Description : "Catat transaksi pertama kamu untuk mulai melacak pengeluaran"
  Action      : "Tambah Transaksi"

Budget kosong:
  Title       : "Belum ada budget"
  Description : "Atur batas pengeluaran biar keuangan lebih terkontrol"
  Action      : "Buat Budget"

Dompet kosong:
  Title       : "Belum ada dompet"
  Description : "Tambah rekening bank dan e-wallet untuk memulai"
  Action      : "Tambah Dompet"

Gmail belum terhubung:
  Title       : "Sinkronisasi otomatis belum aktif"
  Description : "Hubungkan Gmail untuk mencatat transaksi bank secara otomatis"
  Action      : "Hubungkan Gmail"
```

---

## 12. STATE RULES

### Empat State yang Wajib Ada

Setiap komponen yang fetch data **wajib** handle keempat state ini:

```tsx
function TransactionList() {
  const { data, isLoading, isError, refetch } = useTransactions()

  // 1. LOADING STATE
  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <TransactionSkeleton key={i} />
        ))}
      </div>
    )
  }

  // 2. ERROR STATE
  if (isError) {
    return (
      <div className="flex flex-col items-center py-12 gap-3">
        <p className="text-muted-foreground text-sm">
          Couldn't load your transactions
        </p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          Try again
        </Button>
      </div>
    )
  }

  // 3. EMPTY STATE
  if (data.length === 0) {
    return (
      <EmptyState
        icon="receipt"
        title="No transactions yet"
        description="Add your first transaction to start tracking"
        action={{ label: 'Add Transaction', onClick: openQuickEntry }}
      />
    )
  }

  // 4. DATA STATE
  return (
    <div className="space-y-3">
      {data.map(tx => <TransactionCard key={tx.id} transaction={tx} />)}
    </div>
  )
}
```

### Optimistic Update Pattern

```tsx
// Quick entry: tampilkan langsung sebelum server konfirmasi
const mutation = useMutation({
  mutationFn: createTransaction,
  onMutate: async (newTransaction) => {
    // Cancel outgoing refetches
    await queryClient.cancelQueries({ queryKey: ['transactions'] })

    // Snapshot sebelum update
    const previousData = queryClient.getQueryData(['transactions'])

    // Optimistic update
    queryClient.setQueryData(['transactions'], (old: Transaction[]) => [
      { ...newTransaction, id: 'temp-' + Date.now(), is_pending: true },
      ...old,
    ])

    return { previousData }
  },
  onError: (err, newTransaction, context) => {
    // Rollback jika gagal
    queryClient.setQueryData(['transactions'], context?.previousData)
    toast.error("Couldn't save transaction. Please try again.")
  },
  onSettled: () => {
    // Refetch untuk sinkronisasi dengan server
    queryClient.invalidateQueries({ queryKey: ['transactions'] })
  },
})
```

### Toast Notifications

```tsx
// Gunakan shadcn Sonner untuk toast
import { toast } from 'sonner'

// ✅ Success
toast.success('Transaction saved')
toast.success('Gmail connected successfully')

// ✅ Error
toast.error("Couldn't save transaction. Please try again.")
toast.error("Gmail sync failed. Check your connection.")

// ✅ Info
toast.info('Syncing your transactions...')

// ✅ Loading (dengan promise)
toast.promise(syncGmail(), {
  loading: 'Syncing transactions...',
  success: '3 new transactions found',
  error: 'Sync failed. Please try again.',
})

// Aturan toast:
// ✅ Selalu ada di pojok kanan bawah
// ✅ Auto-dismiss dalam 4 detik untuk success/info
// ✅ Tidak auto-dismiss untuk error (user harus acknowledge)
// ❌ Tidak pernah lebih dari 1 toast aktif bersamaan
```

---

## 13. ANTI-PATTERNS

### Yang Tidak Boleh Dilakukan

```
UI ANTI-PATTERNS

❌ Modal di atas modal
   → Gunakan Sheet (bottom sheet) atau navigasi ke halaman baru

❌ Tabel dengan scroll horizontal di mobile
   → Gunakan card list sebagai gantinya

❌ Dropdown dengan lebih dari 7 pilihan
   → Gunakan halaman pilihan tersendiri atau search

❌ Form dengan lebih dari 5 field dalam satu view
   → Pecah menjadi multi-step

❌ Pesan error yang menghilang sebelum user baca
   → Error di form harus persistent, bukan toast

❌ Loading spinner di tengah halaman untuk konten utama
   → Gunakan skeleton loader

❌ Warna sebagai satu-satunya indikator state
   → Selalu tambahkan ikon atau teks

❌ Placeholder sebagai label
   → Label wajib ada di atas input

❌ Button tanpa feedback saat ditekan
   → Selalu ada loading state atau active state

❌ Angka tanpa satuan atau konteks
   → "150.000" ambigu → "Rp 150.000"

PERFORMANCE ANTI-PATTERNS

❌ Fetch data di setiap render
   → Gunakan TanStack Query dengan caching

❌ Import seluruh library untuk satu fungsi
   → Import hanya yang dibutuhkan

❌ Gambar tanpa dimensi
   → Selalu tentukan width dan height untuk Next.js Image

❌ useEffect untuk data fetching
   → Gunakan TanStack Query

ACCESSIBILITY ANTI-PATTERNS

❌ div yang berfungsi sebagai tombol tanpa role="button"
❌ Ikon tanpa aria-label jika tidak ada teks pendamping
❌ Form tanpa label (placeholder bukan label)
❌ Warna contrast ratio di bawah 4.5:1
❌ Focus trap yang tidak bisa keluar
```

---

*Document maintained by: Solo Developer*
*Referenced from: master.md v2, architecture.md v1*
*⚠️ Setiap komponen baru wajib dicek terhadap checklist di section 6 dan 12*
*Next review: After Phase 1 UI complete*
