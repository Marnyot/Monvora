# MONVORA — Test Driven Development
> Defines testing philosophy, standards, tools, and patterns for Monvora
> Referenced from: master.md, CLAUDE.md
> ⚠️ Tulis test dulu sebelum implementasi — tidak ada pengecualian

---

## DOCUMENT VERSION HISTORY

| Version | Date | Updated By | Changes |
|---|---|---|---|
| v1 | May 24, 2026 | Claude | Initial creation |

**Current Version:** v1
**Last Updated:** May 24, 2026

---

## TABLE OF CONTENTS

1. [Testing Philosophy](#1-testing-philosophy)
2. [Tools & Setup](#2-tools--setup)
3. [RED-GREEN-REFACTOR Cycle](#3-red-green-refactor-cycle)
4. [Test Structure](#4-test-structure)
5. [Unit Tests](#5-unit-tests)
6. [Integration Tests](#6-integration-tests)
7. [Component Tests](#7-component-tests)
8. [E2E Tests](#8-e2e-tests)
9. [Testing Patterns](#9-testing-patterns)
10. [What NOT to Test](#10-what-not-to-test)
11. [Coverage Requirements](#11-coverage-requirements)
12. [CI Integration](#12-ci-integration)

---

## 1. TESTING PHILOSOPHY

### Kenapa TDD di Monvora

Monvora menyimpan data keuangan. Bug di sini bukan sekadar UX buruk — bug bisa berarti:
- Transaksi tercatat dengan nominal salah
- Data user hilang
- Transaksi duplikat
- User lain bisa akses data seseorang

Test bukan pilihan. Test adalah satu-satunya cara kita tahu kode berjalan benar.

### Piramida Test Monvora

```
         /\
        /E2E\          → Sedikit, hanya happy path kritikal
       /──────\
      /  Integ  \      → Sedang, fokus API routes + parsing
     /────────────\
    /  Unit Tests  \   → Banyak, semua logic murni
   /────────────────\
```

**Unit** : Fungsi parsing, kategorisasi, format angka, validasi
**Integration** : API routes, database operations, Inngest jobs
**E2E** : Login → tambah transaksi → lihat di dashboard

### Aturan Absolut

```
1. Test ditulis SEBELUM implementasi (RED dulu)
2. Tidak ada kode baru tanpa test
3. Tidak boleh commit jika ada test yang gagal
4. Test harus independen — tidak bergantung urutan eksekusi
5. Test harus deterministik — hasil sama setiap kali dijalankan
6. Jangan mock apa yang tidak perlu di-mock
```

---

## 2. TOOLS & SETUP

### Stack Testing

| Tool | Kegunaan | Scope |
|---|---|---|
| **Vitest** | Test runner utama | Unit + Integration |
| **Testing Library** | Test komponen React | Component |
| **Playwright** | End-to-end testing | E2E |
| **MSW (Mock Service Worker)** | Mock API calls di test | Component + E2E |
| **@supabase/supabase-js** (test client) | Test database operations | Integration |

### Instalasi

```bash
pnpm add -D vitest @vitejs/plugin-react
pnpm add -D @testing-library/react @testing-library/user-event @testing-library/jest-dom
pnpm add -D msw
pnpm add -D playwright @playwright/test
```

### Konfigurasi Vitest

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.config.*',
        '**/types/**',
        'app/api/auth/**',  // OAuth callback — test E2E saja
      ],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 65,
        statements: 70,
      }
    }
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') }
  }
})
```

### Setup File

```typescript
// tests/setup.ts
import '@testing-library/jest-dom'
import { afterEach, beforeAll, afterAll } from 'vitest'
import { cleanup } from '@testing-library/react'
import { server } from './mocks/server'

// Start MSW server sebelum semua test
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))

// Reset handlers setelah setiap test
afterEach(() => {
  server.resetHandlers()
  cleanup()
})

// Stop server setelah semua test
afterAll(() => server.close())
```

### Folder Structure Tests

```
tests/
├── setup.ts                      # Global test setup
├── helpers/
│   ├── factories.ts              # Factory functions untuk test data
│   ├── render.tsx                # Custom render dengan providers
│   └── supabase.ts               # Supabase test client helper
├── mocks/
│   ├── server.ts                 # MSW server setup
│   ├── handlers/
│   │   ├── transactions.ts       # Mock API handlers
│   │   ├── wallets.ts
│   │   └── analytics.ts
│   └── data/
│       ├── transactions.ts       # Mock data fixtures
│       └── wallets.ts
├── unit/
│   ├── parsers/
│   │   ├── mandiri.test.ts
│   │   ├── bca.test.ts
│   │   └── generic.test.ts
│   ├── ai/
│   │   ├── rules.test.ts
│   │   └── categorize.test.ts
│   └── utils/
│       ├── currency.test.ts
│       └── date.test.ts
├── integration/
│   ├── api/
│   │   ├── transactions.test.ts
│   │   ├── wallets.test.ts
│   │   └── sync.test.ts
│   └── inngest/
│       └── gmail-sync.test.ts
├── components/
│   ├── transaction-card.test.tsx
│   ├── quick-entry-form.test.tsx
│   ├── amount-display.test.tsx
│   └── empty-state.test.tsx
└── e2e/
    ├── auth.spec.ts
    ├── quick-entry.spec.ts
    └── dashboard.spec.ts
```

---

## 3. RED-GREEN-REFACTOR CYCLE

### Wajib Diikuti untuk Setiap Fitur

```
RED ──────────────────────────────────────────────────
│
│  1. Tulis test yang mendeskripsikan perilaku yang diinginkan
│  2. Jalankan test → HARUS MERAH (gagal)
│  3. Jika test langsung hijau tanpa implementasi → test salah, ulangi
│
GREEN ────────────────────────────────────────────────
│
│  4. Tulis implementasi MINIMAL untuk membuat test hijau
│  5. Tidak perlu sempurna — cukup buat test lulus
│  6. Jalankan test → HARUS HIJAU
│
REFACTOR ─────────────────────────────────────────────
│
│  7. Bersihkan kode tanpa mengubah perilaku
│  8. Jalankan test setelah setiap perubahan refactor
│  9. Test tetap harus hijau setelah refactor
│
COMMIT ───────────────────────────────────────────────
│
│  10. Semua test hijau → commit
│      Format: "test: add parser tests for Mandiri QRIS"
│              "feat: implement Mandiri QRIS parser"
│              "refactor: simplify amount extraction logic"
```

### Contoh Lengkap: Membuat `formatIDR`

```typescript
// LANGKAH 1: Tulis test dulu (RED)
// tests/unit/utils/currency.test.ts

import { describe, it, expect } from 'vitest'
import { formatIDR } from '@/lib/utils/currency'

describe('formatIDR', () => {
  it('formats whole number correctly', () => {
    expect(formatIDR(150000)).toBe('Rp 150.000')
  })

  it('formats millions correctly', () => {
    expect(formatIDR(1500000)).toBe('Rp 1.500.000')
  })

  it('formats zero correctly', () => {
    expect(formatIDR(0)).toBe('Rp 0')
  })

  it('formats single digit correctly', () => {
    expect(formatIDR(5000)).toBe('Rp 5.000')
  })

  it('throws or returns empty for negative amount', () => {
    expect(() => formatIDR(-1000)).toThrow()
    // atau: expect(formatIDR(-1000)).toBe('')
  })
})

// LANGKAH 2: Jalankan → SEMUA MERAH (formatIDR belum ada)
// pnpm vitest run tests/unit/utils/currency.test.ts

// LANGKAH 3: Implementasi minimal (GREEN)
// lib/utils/currency.ts

export function formatIDR(amount: number): string {
  if (amount < 0) throw new Error('Amount cannot be negative')

  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

// LANGKAH 4: Jalankan → SEMUA HIJAU
// LANGKAH 5: Refactor jika perlu → test tetap hijau
// LANGKAH 6: Commit
```

---

## 4. TEST STRUCTURE

### Naming Convention

```typescript
// File: nama-file.test.ts atau nama-file.test.tsx
// Sama persis dengan file yang di-test

// lib/utils/currency.ts         → tests/unit/utils/currency.test.ts
// lib/gmail/parsers/mandiri.ts  → tests/unit/parsers/mandiri.test.ts
// components/transaction-card   → tests/components/transaction-card.test.tsx
// app/api/transactions/route.ts → tests/integration/api/transactions.test.ts
```

### Struktur Test yang Benar

```typescript
// Pola: describe → context → it
describe('[nama unit yang di-test]', () => {

  // Setup yang dipakai semua test dalam describe
  beforeEach(() => { ... })
  afterEach(() => { ... })

  describe('ketika [kondisi spesifik]', () => {

    it('[harus melakukan apa]', () => {
      // Arrange — siapkan data
      // Act — jalankan fungsi
      // Assert — cek hasilnya
    })

  })
})
```

### Contoh Nyata

```typescript
describe('mandiriParser', () => {

  describe('ketika email adalah notifikasi QRIS', () => {

    it('harus mengekstrak nominal dengan benar', () => {
      // Arrange
      const email = createMockEmail({
        from: 'no-reply@bankmandiri.co.id',
        subject: 'Notifikasi Transaksi QRIS',
        body: 'Pembayaran QRIS sebesar Rp150.000 ke Mixue berhasil',
      })

      // Act
      const result = mandiriParser.parse(email)

      // Assert
      expect(result).not.toBeNull()
      expect(result?.amount).toBe(150000)
      expect(result?.merchant_name).toBe('Mixue')
      expect(result?.type).toBe('expense')
      expect(result?.payment_method).toBe('qris')
    })

    it('harus assign confidence tinggi jika semua field berhasil di-extract', () => {
      const email = createMockEmail({ ... })
      const result = mandiriParser.parse(email)
      expect(result?.confidence).toBeGreaterThanOrEqual(0.9)
    })

  })

  describe('ketika email bukan dari Mandiri', () => {

    it('harus return false dari canParse', () => {
      const email = createMockEmail({
        from: 'noreply@bca.co.id',
        subject: 'Notifikasi BCA',
      })
      expect(mandiriParser.canParse(email)).toBe(false)
    })

  })

  describe('ketika format email tidak dikenal', () => {

    it('harus return null dari parse', () => {
      const email = createMockEmail({
        from: 'no-reply@bankmandiri.co.id',
        body: 'Email dengan format yang tidak dikenal sama sekali',
      })
      expect(mandiriParser.parse(email)).toBeNull()
    })

  })
})
```

---

## 5. UNIT TESTS

### Yang Harus Di-unit-test

```
✅ Semua fungsi di lib/utils/         (currency, date, errors)
✅ Semua parser di lib/gmail/parsers/  (extract logic)
✅ Rule-based categorization           (lib/ai/rules.ts)
✅ Zod schema validation               (lib/validations/)
✅ Business logic murni                (kalkulasi balance, aggregasi)
```

### Factory Helpers

```typescript
// tests/helpers/factories.ts

export function createMockEmail(overrides: Partial<GmailMessage> = {}): GmailMessage {
  return {
    id: 'msg-' + Math.random().toString(36).slice(2),
    threadId: 'thread-123',
    payload: {
      headers: [
        { name: 'From', value: 'no-reply@bankmandiri.co.id' },
        { name: 'Subject', value: 'Notifikasi Transaksi' },
        { name: 'Date', value: new Date().toUTCString() },
      ],
      body: { data: btoa('Email body content') },
    },
    ...overrides,
  }
}

export function createMockTransaction(
  overrides: Partial<Transaction> = {}
): Transaction {
  return {
    id: crypto.randomUUID(),
    user_id: crypto.randomUUID(),
    wallet_id: crypto.randomUUID(),
    amount: 50000,
    type: 'expense',
    payment_method: 'qris',
    source: 'manual',
    is_verified: true,
    transacted_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
    ...overrides,
  }
}
```

### Unit Test: Parser

```typescript
// tests/unit/parsers/mandiri.test.ts

import { describe, it, expect } from 'vitest'
import { mandiriParser } from '@/lib/gmail/parsers/mandiri'
import { createMockEmail } from '@/tests/helpers/factories'

// Email fixtures — copy dari email nyata (anonimized)
const MANDIRI_QRIS_EMAIL = `
  Yth. Nasabah Bank Mandiri,
  Transaksi QRIS Anda berhasil dilakukan.
  Nominal    : Rp150.000
  Merchant   : MIXUE ICE CREAM
  Tanggal    : 24 Mei 2026 15:30 WIB
  No. Ref    : 20260524153012345
`

const MANDIRI_TRANSFER_EMAIL = `
  Transfer berhasil dilakukan.
  Nominal Transfer : Rp 500.000
  Ke               : BCA 1234567890
  Tanggal          : 24/05/2026 10:00
`

describe('mandiriParser', () => {

  describe('canParse', () => {
    it('returns true for Mandiri QRIS email', () => {
      const email = createMockEmail({
        from: 'no-reply@bankmandiri.co.id',
        subject: 'Notifikasi Transaksi QRIS',
      })
      expect(mandiriParser.canParse(email)).toBe(true)
    })

    it('returns false for non-Mandiri email', () => {
      const email = createMockEmail({ from: 'noreply@bca.co.id' })
      expect(mandiriParser.canParse(email)).toBe(false)
    })
  })

  describe('parse — QRIS', () => {
    const email = createMockEmail({ body: MANDIRI_QRIS_EMAIL })

    it('extracts amount correctly', () => {
      expect(mandiriParser.parse(email)?.amount).toBe(150000)
    })

    it('extracts merchant name', () => {
      expect(mandiriParser.parse(email)?.merchant_name).toBe('MIXUE ICE CREAM')
    })

    it('sets type as expense', () => {
      expect(mandiriParser.parse(email)?.type).toBe('expense')
    })

    it('sets payment_method as qris', () => {
      expect(mandiriParser.parse(email)?.payment_method).toBe('qris')
    })

    it('extracts reference number', () => {
      expect(mandiriParser.parse(email)?.reference_number).toBe('20260524153012345')
    })

    it('has high confidence when all fields extracted', () => {
      expect(mandiriParser.parse(email)?.confidence).toBeGreaterThanOrEqual(0.9)
    })
  })

  describe('parse — edge cases', () => {
    it('returns null for unrecognized email format', () => {
      const email = createMockEmail({ body: 'Random email content' })
      expect(mandiriParser.parse(email)).toBeNull()
    })

    it('handles amount with dots correctly (Rp1.500.000)', () => {
      const email = createMockEmail({
        body: 'Nominal: Rp1.500.000'
      })
      expect(mandiriParser.parse(email)?.amount).toBe(1500000)
    })
  })
})
```

### Unit Test: Currency Utils

```typescript
// tests/unit/utils/currency.test.ts

import { describe, it, expect } from 'vitest'
import { formatIDR, parseIDR } from '@/lib/utils/currency'

describe('formatIDR', () => {
  it('formats thousands with dot separator', () => {
    expect(formatIDR(50000)).toBe('Rp 50.000')
  })

  it('formats millions correctly', () => {
    expect(formatIDR(1500000)).toBe('Rp 1.500.000')
  })

  it('formats zero', () => {
    expect(formatIDR(0)).toBe('Rp 0')
  })

  it('throws for negative amount', () => {
    expect(() => formatIDR(-1)).toThrow()
  })

  it('throws for float amount', () => {
    expect(() => formatIDR(1500.50)).toThrow()
  })
})

describe('parseIDR', () => {
  it('parses "Rp 50.000" to 50000', () => {
    expect(parseIDR('Rp 50.000')).toBe(50000)
  })

  it('parses "Rp1.500.000" to 1500000', () => {
    expect(parseIDR('Rp1.500.000')).toBe(1500000)
  })

  it('parses "150000" to 150000', () => {
    expect(parseIDR('150000')).toBe(150000)
  })

  it('returns null for invalid string', () => {
    expect(parseIDR('bukan angka')).toBeNull()
  })
})
```

### Unit Test: Categorization Rules

```typescript
// tests/unit/ai/rules.test.ts

import { describe, it, expect } from 'vitest'
import { applyRules } from '@/lib/ai/rules'

describe('applyRules', () => {

  describe('Food & Beverage', () => {
    const foodMerchants = ['Mixue', 'MIXUE ICE CREAM', 'KFC', 'McDonald\'s',
                           'GoFood', 'GrabFood', 'Shopee Food', 'Kopi Kenangan']

    foodMerchants.forEach(merchant => {
      it(`categorizes "${merchant}" as Food & Beverage`, () => {
        const result = applyRules({ merchant_name: merchant, description: null })
        expect(result.category).toBe('Food & Beverage')
        expect(result.confidence).toBeGreaterThanOrEqual(0.9)
      })
    })
  })

  describe('Transportation', () => {
    it('categorizes GoJek as Transportation', () => {
      const result = applyRules({ merchant_name: 'GoJek', description: null })
      expect(result.category).toBe('Transportation')
    })
  })

  describe('Unknown merchant', () => {
    it('returns low confidence for unknown merchant', () => {
      const result = applyRules({
        merchant_name: 'Toko XYZ Tidak Dikenal',
        description: null
      })
      expect(result.confidence).toBeLessThan(0.5)
    })
  })
})
```

---

## 6. INTEGRATION TESTS

### Setup Supabase Test Client

```typescript
// tests/helpers/supabase.ts

import { createClient } from '@supabase/supabase-js'

// Gunakan Supabase project terpisah khusus testing
// Atau gunakan Supabase local development
export const testSupabase = createClient(
  process.env.SUPABASE_TEST_URL!,
  process.env.SUPABASE_TEST_SERVICE_ROLE_KEY!  // service role untuk test
)

export async function cleanupTestData(userId: string) {
  // Hapus semua data test setelah setiap test
  await testSupabase.from('transactions').delete().eq('user_id', userId)
  await testSupabase.from('wallets').delete().eq('user_id', userId)
  await testSupabase.from('budgets').delete().eq('user_id', userId)
}
```

### Integration Test: API Route

```typescript
// tests/integration/api/transactions.test.ts

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { POST, GET } from '@/app/api/transactions/route'
import { createMockRequest, createMockSession } from '@/tests/helpers'
import { cleanupTestData } from '@/tests/helpers/supabase'

describe('POST /api/transactions', () => {
  const testUserId = crypto.randomUUID()

  afterEach(async () => {
    await cleanupTestData(testUserId)
  })

  it('creates transaction and returns 201', async () => {
    const request = createMockRequest({
      method: 'POST',
      session: createMockSession(testUserId),
      body: {
        amount: 50000,
        type: 'expense',
        wallet_id: 'valid-wallet-uuid',
        payment_method: 'cash',
        transacted_at: new Date().toISOString(),
      }
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.data.amount).toBe(50000)
    expect(data.data.user_id).toBe(testUserId)
  })

  it('returns 401 without session', async () => {
    const request = createMockRequest({
      method: 'POST',
      session: null,
      body: { amount: 50000 }
    })

    const response = await POST(request)
    expect(response.status).toBe(401)
  })

  it('returns 400 for invalid amount (float)', async () => {
    const request = createMockRequest({
      method: 'POST',
      session: createMockSession(testUserId),
      body: { amount: 50000.50, type: 'expense', ... }
    })

    const response = await POST(request)
    expect(response.status).toBe(400)
    expect((await response.json()).error.code).toBe('VALIDATION_ERROR')
  })

  it('cannot access another user transaction', async () => {
    const otherUserId = crypto.randomUUID()
    // Buat transaksi milik user lain
    const { data: otherTransaction } = await createTransactionForUser(otherUserId)

    // Coba akses dengan user yang berbeda
    const request = createMockRequest({
      session: createMockSession(testUserId),
    })

    const response = await GET(request, { params: { id: otherTransaction.id } })
    // Harus 404, bukan 403 atau 200
    expect(response.status).toBe(404)
  })
})
```

---

## 7. COMPONENT TESTS

### Custom Render

```typescript
// tests/helpers/render.tsx

import { render } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from 'next-themes'

export function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },  // jangan retry di test
    }
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light">
        {ui}
      </ThemeProvider>
    </QueryClientProvider>
  )
}
```

### Component Test: TransactionCard

```typescript
// tests/components/transaction-card.test.tsx

import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '@/tests/helpers/render'
import { TransactionCard } from '@/components/transactions/transaction-card'
import { createMockTransaction } from '@/tests/helpers/factories'

describe('TransactionCard', () => {

  it('displays merchant name', () => {
    const transaction = createMockTransaction({ merchant_name: 'Mixue' })
    renderWithProviders(<TransactionCard transaction={transaction} />)
    expect(screen.getByText('Mixue')).toBeInTheDocument()
  })

  it('displays formatted amount with minus for expense', () => {
    const transaction = createMockTransaction({
      amount: 45000,
      type: 'expense',
    })
    renderWithProviders(<TransactionCard transaction={transaction} />)
    expect(screen.getByText('-Rp 45.000')).toBeInTheDocument()
  })

  it('displays formatted amount with plus for income', () => {
    const transaction = createMockTransaction({
      amount: 8000000,
      type: 'income',
    })
    renderWithProviders(<TransactionCard transaction={transaction} />)
    expect(screen.getByText('+Rp 8.000.000')).toBeInTheDocument()
  })

  it('shows category name', () => {
    const transaction = createMockTransaction({
      category: { name: 'Food & Beverage', icon: 'utensils', color: '#f59e0b' }
    })
    renderWithProviders(<TransactionCard transaction={transaction} />)
    expect(screen.getByText('Food & Beverage')).toBeInTheDocument()
  })

  it('shows description when merchant name is null', () => {
    const transaction = createMockTransaction({
      merchant_name: null,
      description: 'Bayar parkir',
    })
    renderWithProviders(<TransactionCard transaction={transaction} />)
    expect(screen.getByText('Bayar parkir')).toBeInTheDocument()
  })
})
```

### Component Test: QuickEntryForm

```typescript
// tests/components/quick-entry-form.test.tsx

import { describe, it, expect, vi } from 'vitest'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/tests/helpers/render'
import { QuickEntryForm } from '@/components/transactions/quick-entry-form'

describe('QuickEntryForm', () => {
  const mockOnSubmit = vi.fn()

  beforeEach(() => { mockOnSubmit.mockClear() })

  it('renders amount input', () => {
    renderWithProviders(<QuickEntryForm onSubmit={mockOnSubmit} />)
    expect(screen.getByLabelText('Amount')).toBeInTheDocument()
  })

  it('calls onSubmit with correct data', async () => {
    const user = userEvent.setup()
    renderWithProviders(<QuickEntryForm onSubmit={mockOnSubmit} />)

    await user.type(screen.getByLabelText('Amount'), '45000')
    await user.click(screen.getByText('Food & Beverage'))
    await user.click(screen.getByText('Cash'))
    await user.click(screen.getByText('Save'))

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 45000,
          payment_method: 'cash',
        })
      )
    })
  })

  it('does not submit if amount is 0', async () => {
    const user = userEvent.setup()
    renderWithProviders(<QuickEntryForm onSubmit={mockOnSubmit} />)

    await user.click(screen.getByText('Save'))

    expect(mockOnSubmit).not.toHaveBeenCalled()
    expect(screen.getByText('Please enter a valid amount')).toBeInTheDocument()
  })
})
```

---

## 8. E2E TESTS

### Setup Playwright

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,  // finance app — jalankan sequential
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'Mobile Chrome', use: { ...devices['Pixel 5'] } },
    { name: 'Desktop Chrome', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
})
```

### E2E Test: Quick Entry Happy Path

```typescript
// tests/e2e/quick-entry.spec.ts

import { test, expect } from '@playwright/test'

test.describe('Quick Entry', () => {

  test.beforeEach(async ({ page }) => {
    // Login dengan test account
    await page.goto('/login')
    await page.click('[data-testid="google-login"]')
    // Mock OAuth untuk E2E — gunakan test account khusus
  })

  test('user can add manual transaction in under 10 seconds', async ({ page }) => {
    const startTime = Date.now()

    await page.goto('/dashboard')
    await page.click('[data-testid="fab-add"]')                    // buka quick entry
    await page.fill('[data-testid="amount-input"]', '45000')
    await page.click('[data-testid="category-food"]')              // pilih kategori
    await page.click('[data-testid="payment-gopay"]')              // pilih payment
    await page.click('[data-testid="save-button"]')

    // Tunggu transaksi muncul di dashboard
    await expect(page.locator('[data-testid="recent-transactions"]'))
      .toContainText('Rp 45.000')

    const duration = Date.now() - startTime
    expect(duration).toBeLessThan(10000)  // harus selesai < 10 detik
  })

  test('new transaction appears in transaction list', async ({ page }) => {
    await page.goto('/dashboard')
    await page.click('[data-testid="fab-add"]')
    await page.fill('[data-testid="amount-input"]', '75000')
    await page.fill('[data-testid="merchant-input"]', 'Test Merchant')
    await page.click('[data-testid="category-food"]')
    await page.click('[data-testid="payment-cash"]')
    await page.click('[data-testid="save-button"]')

    await page.goto('/transactions')
    await expect(page.locator('[data-testid="transaction-list"]'))
      .toContainText('Test Merchant')
  })

})
```

### E2E Test: Auth Flow

```typescript
// tests/e2e/auth.spec.ts

import { test, expect } from '@playwright/test'

test.describe('Authentication', () => {

  test('unauthenticated user redirected to login', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL('/login')
  })

  test('authenticated user cannot access login page', async ({ page }) => {
    // Setup: sudah login
    await loginAsTestUser(page)

    await page.goto('/login')
    await expect(page).toHaveURL('/dashboard')
  })

  test('logout clears session and redirects to login', async ({ page }) => {
    await loginAsTestUser(page)
    await page.click('[data-testid="logout-button"]')
    await expect(page).toHaveURL('/login')

    // Pastikan session benar-benar hilang
    await page.goto('/dashboard')
    await expect(page).toHaveURL('/login')
  })

})
```

---

## 9. TESTING PATTERNS

### Mock yang Boleh dan Tidak Boleh

```typescript
// ✅ BOLEH di-mock
// External APIs (Gmail, Gemini) — tidak mau hit real API di test
vi.mock('@/lib/ai/gemini', () => ({
  callGemini: vi.fn().mockResolvedValue({
    category: 'Food & Beverage',
    confidence: 0.95,
  })
}))

// ✅ BOLEH di-mock
// Inngest functions — tidak mau trigger real jobs
vi.mock('inngest', () => ({ ... }))

// ✅ BOLEH di-mock
// next/navigation (router, redirect)
vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
  useRouter: () => ({ push: vi.fn() }),
}))

// ❌ JANGAN di-mock
// Fungsi pure (formatIDR, parser logic) — test langsung
// Zod schemas — test langsung
// Business logic yang sedang di-test — itu yang mau kita test
```

### Testing Async Code

```typescript
// Selalu await async operations
it('creates transaction', async () => {
  const result = await createTransaction(userId, transactionData)
  expect(result.amount).toBe(50000)
})

// Gunakan waitFor untuk async UI updates
it('shows success message after save', async () => {
  await user.click(saveButton)
  await waitFor(() => {
    expect(screen.getByText('Transaction saved')).toBeInTheDocument()
  })
})
```

### Testing Error Cases

```typescript
// Selalu test happy path DAN error cases
describe('createTransaction', () => {
  it('succeeds with valid data', async () => { ... })

  it('fails with negative amount', async () => {
    await expect(createTransaction(userId, { amount: -1000 }))
      .rejects.toThrow('Amount cannot be negative')
  })

  it('fails without wallet_id', async () => { ... })
  it('fails for non-existent wallet', async () => { ... })
})
```

### Snapshot Testing

```typescript
// Gunakan snapshot HANYA untuk output yang stabil dan tidak sering berubah
// Jangan untuk komponen yang sering diupdate

it('renders amount display correctly', () => {
  const { container } = renderWithProviders(
    <AmountDisplay amount={150000} type="expense" />
  )
  expect(container).toMatchSnapshot()
})
```

---

## 10. WHAT NOT TO TEST

### Yang Tidak Perlu Di-test

```
❌ shadcn/ui components — sudah tested oleh library
❌ Tailwind CSS classes — bukan logic
❌ next-themes ThemeProvider — sudah tested oleh library
❌ Supabase client internals — sudah tested oleh Supabase
❌ TypeScript types — compile-time, bukan runtime
❌ console.log statements
❌ Kode yang akan segera dihapus

✅ Yang harus di-test:
   Logic yang kamu tulis sendiri
   Integrasi antar modul yang kamu buat
   Edge cases dan error handling
   Security-critical paths (auth, data ownership)
```

### Kapan Boleh Skip Test

Sangat jarang, dan harus ada justifikasi:

```typescript
// Boleh skip sementara dengan komentar yang jelas
it.skip('handles edge case X', () => {
  // TODO: implementasi setelah Phase 2
  // Issue: #123
})

// TIDAK BOLEH skip tanpa komentar
it.skip('some test', () => { ... })  // ❌
```

---

## 11. COVERAGE REQUIREMENTS

### Threshold per Layer

| Layer | Line Coverage | Branch Coverage |
|---|---|---|
| `lib/utils/` | 90% | 85% |
| `lib/gmail/parsers/` | 85% | 80% |
| `lib/ai/rules.ts` | 90% | 85% |
| `lib/validations/` | 80% | 75% |
| `app/api/` (routes) | 75% | 70% |
| `components/` | 70% | 65% |
| **Overall** | **70%** | **65%** |

### Menjalankan Coverage

```bash
# Run semua test dengan coverage report
pnpm vitest run --coverage

# Output di terminal + buka HTML report
pnpm vitest run --coverage && open coverage/index.html

# Watch mode saat development
pnpm vitest --coverage
```

### Aturan Coverage

```
✅ Coverage boleh naik, tidak boleh turun setelah setiap PR
✅ File baru harus minimal 70% covered sebelum merge ke develop
❌ Tidak boleh manipulasi coverage dengan test yang tidak bermakna
❌ Tidak boleh exclude file dari coverage tanpa alasan yang jelas
```

---

## 12. CI INTEGRATION

### Script di package.json

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:all": "pnpm test && pnpm test:e2e"
  }
}
```

### Pre-commit Hook

```bash
# .husky/pre-commit
#!/bin/sh
pnpm vitest run --reporter=verbose

# Jika ada test yang gagal, commit dibatalkan otomatis
```

### Urutan Test saat Development

```
1. Tulis test (RED)
   pnpm vitest run tests/unit/utils/currency.test.ts

2. Implementasi (GREEN)
   pnpm vitest run tests/unit/utils/currency.test.ts

3. Refactor
   pnpm vitest run tests/unit/utils/currency.test.ts

4. Sebelum commit — jalankan semua test
   pnpm test

5. Sebelum merge ke main
   pnpm test:all  (unit + integration + e2e)
```

### Test Environment Variables

```bash
# .env.test (khusus test environment)
SUPABASE_TEST_URL=http://localhost:54321        # Supabase local
SUPABASE_TEST_SERVICE_ROLE_KEY=test-key-here
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Jangan pakai production Supabase untuk test
# Buat project test terpisah atau pakai Supabase local
```

---

*Document maintained by: Solo Developer*
*Referenced from: master.md v2, architecture.md v1*
*⚠️ RED sebelum GREEN — selalu. Tidak ada pengecualian.*
*Next review: After Phase 1 completion*
