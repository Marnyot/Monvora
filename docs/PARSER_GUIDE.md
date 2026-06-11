# MONVORA — Bank Email Parser Guide
> Panduan referensi untuk AI dan developer dalam menulis parser email bank baru
> Berlaku untuk: Gmail sync (Phase 2) dan OCR flow (Phase 3)
> Last Updated: May 2026

---

## TUJUAN DOKUMEN INI

Dokumen ini adalah **sumber kebenaran tunggal** untuk semua parser bank di Monvora.
Ketika AI (Claude Code, Gemini, dll) diminta menulis atau memperbaiki parser,
baca dokumen ini terlebih dahulu sebelum menulis satu baris kode pun.

---

## ATURAN YANG TIDAK BOLEH DILANGGAR

```
❌ JANGAN simpan amount sebagai float — selalu INTEGER IDR (hapus desimal)
❌ JANGAN hardcode nama bank di level atas — gunakan Parser Registry
❌ JANGAN auto-save transaksi dengan confidence < 0.7 tanpa flag is_verified: false
❌ JANGAN log merchant_name atau amount di production
❌ JANGAN lempar exception tanpa catch — parser harus return null jika gagal
❌ JANGAN assume format email bank tidak berubah — selalu defensive parsing
```

---

## INTERFACE WAJIB

Setiap parser HARUS mengimplementasi interface berikut persis:

```typescript
// lib/gmail/parsers/types.ts

export interface GmailMessage {
  id: string                    // Gmail message ID — wajib untuk raw_email_id
  threadId: string
  subject: string               // Subject email
  from: string                  // Sender email address
  date: string                  // Email date header (RFC 2822)
  body: string                  // Plain text body (decoded dari base64)
  htmlBody?: string             // HTML body jika tersedia
  snippet: string               // Gmail snippet (preview teks)
}

export interface ParsedTransaction {
  amount: number                // IDR integer, SELALU positif
  type: 'expense' | 'income' | 'transfer'
  merchant_name: string | null  // Nama merchant / penerima / pengirim
  description: string | null    // Keterangan tambahan
  payment_method: 'qris' | 'transfer' | 'debit' | 'credit' | 'other'
  transacted_at: Date           // Waktu transaksi (bukan waktu email dikirim)
  reference_number: string | null
  raw_email_id: string          // = email.id (Gmail message ID)
  raw_snippet: string           // Teks asli untuk debugging
  confidence: number            // 0.0 – 1.0
  bank: string                  // Nama bank yang berhasil parse
}

export interface BankParser {
  name: string                  // Nama bank, lowercase (contoh: 'mandiri', 'bca')
  canParse: (email: GmailMessage) => boolean
  parse: (email: GmailMessage) => ParsedTransaction | null
}
```

---

## AMOUNT PARSING — ATURAN PENTING

Format amount di email bank Indonesia tidak konsisten antar bank:

| Bank | Format di Email | Contoh | Integer IDR |
|---|---|---|---|
| Mandiri | `Rp X.XXX,XX` | `Rp 76.600,00` | `76600` |
| BCA | `IDR X,XXX.XX` atau `IDR X.XXX,XX` | `IDR 500.00` / `IDR 1,500,000.00` | `500` / `1500000` |
| BNI | `Rp X.XXX` | `Rp 150.000` | `150000` |
| BRI | `Rp X.XXX,XX` | `Rp 50.000,00` | `50000` |

**Helper function untuk parsing amount — gunakan ini, jangan buat sendiri:**

```typescript
// lib/utils/currency.ts
export function parseAmountToInteger(raw: string): number | null {
  if (!raw) return null

  // Hapus semua karakter non-digit, koma, dan titik
  const cleaned = raw.replace(/[^\d.,]/g, '').trim()
  if (!cleaned) return null

  let normalized: string

  // Deteksi format: kalau ada koma sebagai desimal (X.XXX,XX — Indonesia)
  if (/\.\d{3},\d{2}$/.test(cleaned)) {
    // Format: 76.600,00 → hapus titik ribuan, hapus desimal
    normalized = cleaned.replace(/\./g, '').replace(/,\d+$/, '')
  }
  // Deteksi format: kalau ada titik sebagai desimal (X,XXX.XX — Western)
  else if (/,\d{3}\.\d{2}$/.test(cleaned)) {
    // Format: 1,500,000.00 → hapus koma ribuan, hapus desimal
    normalized = cleaned.replace(/,/g, '').replace(/\.\d+$/, '')
  }
  // Angka dengan koma desimal tanpa separator ribuan (500,00)
  else if (/^\d+,\d{2}$/.test(cleaned)) {
    normalized = cleaned.replace(/,\d+$/, '')
  }
  // Angka dengan titik desimal tanpa separator ribuan (500.00)
  else if (/^\d+\.\d{2}$/.test(cleaned)) {
    normalized = cleaned.replace(/\.\d+$/, '')
  }
  // Hanya digit (tidak ada desimal)
  else {
    normalized = cleaned.replace(/[.,]/g, '')
  }

  const result = parseInt(normalized, 10)
  return isNaN(result) || result <= 0 ? null : result
}
```

---

## DATE PARSING — ATURAN PENTING

Selalu gunakan timezone Asia/Jakarta (WIB, UTC+7) sebagai default.
Simpan sebagai ISO 8601 dengan timezone eksplisit.

```typescript
// lib/utils/date.ts
import { parseISO, parse, isValid } from 'date-fns'
import { zonedTimeToUtc } from 'date-fns-tz'

const WIB_TIMEZONE = 'Asia/Jakarta'

export function parseTransactionDate(
  dateStr: string,
  timeStr?: string
): Date | null {
  if (!dateStr) return null

  try {
    // Format Mandiri: "23 Mei 2026" + "22:00:33 WIB"
    const INDONESIAN_MONTHS: Record<string, string> = {
      'Januari': '01', 'Februari': '02', 'Maret': '03', 'April': '04',
      'Mei': '05', 'Juni': '06', 'Juli': '07', 'Agustus': '08',
      'September': '09', 'Oktober': '10', 'November': '11', 'Desember': '12',
    }

    // Coba parse format Indonesia (23 Mei 2026)
    const indoMatch = dateStr.match(/(\d{1,2})\s+(\w+)\s+(\d{4})/)
    if (indoMatch) {
      const [, day, monthName, year] = indoMatch
      const month = INDONESIAN_MONTHS[monthName]
      if (!month) return null

      const time = timeStr
        ? timeStr.replace(/\s*WIB\s*/i, '').trim()
        : '00:00:00'

      const isoString = `${year}-${month}-${day.padStart(2, '0')}T${time}`
      const localDate = new Date(isoString)
      if (!isValid(localDate)) return null

      // Konversi dari WIB ke UTC untuk storage
      return zonedTimeToUtc(localDate, WIB_TIMEZONE)
    }

    // Coba parse format BCA: "26 May 2026 02:19:20"
    const englishMatch = dateStr.match(
      /(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{4})\s+(\d{2}:\d{2}:\d{2})/i
    )
    if (englishMatch) {
      const [fullMatch] = englishMatch
      const parsed = new Date(`${fullMatch} +0700`)
      if (isValid(parsed)) return parsed
    }

    return null
  } catch {
    return null
  }
}
```

---

## CONFIDENCE SCORE LOGIC

Hitung confidence berdasarkan field yang berhasil di-extract:

```typescript
export function calculateConfidence(result: Partial<ParsedTransaction>): number {
  // Field critical (wajib ada)
  const criticalFields = [
    result.amount != null && result.amount > 0,
    result.transacted_at != null,
    result.type != null,
  ]

  // Field important (sangat diinginkan)
  const importantFields = [
    result.merchant_name != null && result.merchant_name.length > 0,
    result.payment_method != null && result.payment_method !== 'other',
    result.reference_number != null,
  ]

  const criticalScore = criticalFields.filter(Boolean).length / criticalFields.length
  const importantScore = importantFields.filter(Boolean).length / importantFields.length

  // Critical bobotnya 70%, important 30%
  const score = criticalScore * 0.7 + importantScore * 0.3

  return Math.round(score * 100) / 100
}
```

| Score | Status | Handling di DB |
|---|---|---|
| 0.9 – 1.0 | Excellent | `is_verified: true` |
| 0.7 – 0.89 | Good | `is_verified: true` |
| 0.5 – 0.69 | Partial | `is_verified: false` — user konfirmasi |
| < 0.5 | Poor | `is_verified: false` — tandai untuk review |

---

## SENDER DETECTION — CANPARSE()

Setiap `canParse()` harus cek **dua hal**: sender email DAN subject pattern.
Jangan hanya cek salah satu — sender bisa di-spoof, subject bisa generik.

```typescript
// Template canParse()
canParse: (email: GmailMessage): boolean => {
  const fromLower = email.from.toLowerCase()
  const subjectLower = email.subject.toLowerCase()

  const validSender = KNOWN_SENDERS.some(s => fromLower.includes(s))
  const validSubject = KNOWN_SUBJECTS.some(s => subjectLower.includes(s))

  return validSender && validSubject
}
```

---

## BANK-SPECIFIC: MANDIRI (Livin')

### Email yang Dikenal

| Tipe Transaksi | Subject | Sender |
|---|---|---|
| QRIS Payment | "Pembayaran Berhasil" | notifikasi@bankmandiri.co.id |
| Transfer Keluar | "Transfer Berhasil" | notifikasi@bankmandiri.co.id |
| Transfer Masuk | "Dana Masuk" | notifikasi@bankmandiri.co.id |
| Top-up e-wallet | "Pembayaran Berhasil" | notifikasi@bankmandiri.co.id |

### Format Email QRIS (dari screenshot)

```
Penerima
[MERCHANT NAME]          ← merchant_name, bisa multi-line
[KOTA]

Tanggal         [DD Bulan YYYY]
Jam             [HH:MM:SS WIB]
Nominal Transaksi  Rp [X.XXX,XX]
No. Referensi   [angka panjang]
No. Ref. QRIS   [angka]
Merchant PAN    [angka]
Customer PAN    [angka]
Pengakuisisi    [nama bank acquirer]
Terminal ID     [angka]

Sumber Dana
[NAMA AKUN]
****[4 digit terakhir]
```

### Regex Patterns — Mandiri

```typescript
// Merchant name (ambil dari section "Penerima")
const MERCHANT_REGEX = /Penerima\s*\n([^\n]+)/i

// Tanggal (23 Mei 2026)
const DATE_REGEX = /Tanggal\s+(\d{1,2}\s+\w+\s+\d{4})/i

// Jam (22:00:33 WIB)
const TIME_REGEX = /Jam\s+(\d{2}:\d{2}:\d{2}\s*WIB)/i

// Amount (Rp 76.600,00)
const AMOUNT_REGEX = /Nominal\s+Transaksi\s+Rp\s*([\d.,]+)/i

// Reference number
const REF_REGEX = /No\.\s*Referensi\s+(\d+)/i

// QRIS reference
const QRIS_REF_REGEX = /No\.\s*Ref\.\s*QRIS\s+(\d+)/i

// Source of fund (nama akun pengirim)
const SOURCE_REGEX = /Sumber Dana\s*\n([^\n]+)/i
```

### Type Detection — Mandiri

```typescript
function detectMandiriType(subject: string, body: string): ParsedTransaction['type'] {
  const subjectLower = subject.toLowerCase()
  const bodyLower = body.toLowerCase()

  if (subjectLower.includes('dana masuk') || bodyLower.includes('transfer masuk')) {
    return 'income'
  }
  if (bodyLower.includes('pembayaran berhasil') || bodyLower.includes('qris')) {
    return 'expense'
  }
  if (subjectLower.includes('transfer berhasil')) {
    return 'transfer'
  }
  return 'expense' // default untuk Mandiri
}
```

### Display Name Rules — Mandiri (merchant_name yang tampil di UI)

`merchant_name` di-format ulang sesuai jenis transaksi (mentahnya tetap di `description`):

| Pemicu | merchant_name | payment_method |
|---|---|---|
| Subject/body "Transfer Berhasil" atau "Transfer dengan BI Fast Berhasil" | `Transfer kepada <nama depan penerima>` | transfer |
| "Pembayaran Berhasil" **dan** body memuat "Berikut adalah detail transaksi Anda dengan QR" | `QRIS ke <penerima>` | qris |
| "Top Up Berhasil" (provider di field `Penyedia Jasa <NAMA>`) | `Top up ke <penyedia jasa>` | **topup** (selalu `expense`) |

- Nama di-title-case (`RISQUINA` → `Risquina`).
- `topup` adalah payment_method baru (lihat migration `010`), hanya untuk pengeluaran.

---

## BANK-SPECIFIC: BCA (myBCA)

### Email yang Dikenal

| Tipe Transaksi | Subject | Sender |
|---|---|---|
| Transfer ke BCA | "Internet Transaction Journal" | klikbca@bca.co.id |
| Transfer ke bank lain | "Internet Transaction Journal" | klikbca@bca.co.id |
| Transaksi kartu | "BCA Card Transaction" | klikbca@bca.co.id |

### Format Email Transfer (dari screenshot)

```
Hi [NAMA LENGKAP],

You just made a transaction through myBCA.
Here are the details of your transaction :

Status             : Successful
Transaction Date   : [DD Mon YYYY HH:MM:SS]
Transfer Type      : Transfer to BCA Account
Source of Fund     : [account number masked]
Source Currency    : IDR - Indonesian Rupiah
Beneficiary Account: [account number]
Transfer Currency  : IDR - Indonesian Rupiah
Beneficiary Name   : [NAMA PENERIMA]    ← merchant_name
Transfer Amount    : IDR [amount]
Remarks            : [catatan atau "-"]
Reference No.      : [UUID format]
```

### Regex Patterns — BCA

```typescript
// Beneficiary name (penerima transfer) → merchant_name
const MERCHANT_REGEX = /Beneficiary Name\s*:\s*([^\n]+)/i

// Transaction date (26 May 2026 02:19:20)
const DATE_REGEX = /Transaction Date\s*:\s*(\d{1,2}\s+\w+\s+\d{4}\s+\d{2}:\d{2}:\d{2})/i

// Amount (IDR 500.00 atau IDR 1,500,000.00)
const AMOUNT_REGEX = /Transfer Amount\s*:\s*IDR\s*([\d,. ]+)/i

// Reference number (UUID format)
const REF_REGEX = /Reference No\.\s*:\s*([A-F0-9-]+)/i

// Transfer type (untuk deteksi type transaksi)
const TRANSFER_TYPE_REGEX = /Transfer Type\s*:\s*([^\n]+)/i

// Remarks
const REMARKS_REGEX = /Remarks\s*:\s*([^\n]+)/i

// Status — hanya proses kalau Successful
const STATUS_REGEX = /Status\s*:\s*(\w+)/i
```

### Type Detection — BCA

```typescript
function detectBCAType(body: string): ParsedTransaction['type'] {
  const transferTypeMatch = body.match(/Transfer Type\s*:\s*([^\n]+)/i)
  if (!transferTypeMatch) return 'transfer'

  const transferType = transferTypeMatch[1].toLowerCase()

  // BCA transfer selalu expense dari perspektif pengirim
  // Tidak ada email "transfer masuk" dari BCA notifikasi standard
  if (transferType.includes('transfer')) return 'transfer'

  return 'expense'
}
```

### Payment Method Detection — BCA

```typescript
function detectBCAPaymentMethod(body: string): ParsedTransaction['payment_method'] {
  const transferTypeMatch = body.match(/Transfer Type\s*:\s*([^\n]+)/i)
  if (!transferTypeMatch) return 'transfer'

  const type = transferTypeMatch[1].toLowerCase()

  if (type.includes('qris')) return 'qris'
  if (type.includes('transfer')) return 'transfer'
  if (type.includes('debit') || type.includes('card')) return 'debit'
  if (type.includes('credit')) return 'credit'

  return 'other'
}
```

---

## TEMPLATE PARSER BARU

Gunakan template ini saat menambah bank baru:

```typescript
// lib/gmail/parsers/[nama-bank].ts

import { BankParser, GmailMessage, ParsedTransaction } from './types'
import { parseAmountToInteger } from '@/lib/utils/currency'
import { parseTransactionDate } from '@/lib/utils/date'
import { calculateConfidence } from './confidence'

const KNOWN_SENDERS = [
  'email@bankbaru.co.id',
  // tambahkan semua known sender addresses
]

const KNOWN_SUBJECTS = [
  'kata kunci subject 1',
  'kata kunci subject 2',
]

export const namaBankParser: BankParser = {
  name: 'namabank',

  canParse: (email: GmailMessage): boolean => {
    const fromLower = email.from.toLowerCase()
    const subjectLower = email.subject.toLowerCase()

    const validSender = KNOWN_SENDERS.some(s => fromLower.includes(s))
    const validSubject = KNOWN_SUBJECTS.some(s => subjectLower.includes(s))

    return validSender && validSubject
  },

  parse: (email: GmailMessage): ParsedTransaction | null => {
    try {
      const body = email.body || email.snippet || ''
      if (!body) return null

      // Extract fields
      const amountMatch = body.match(/AMOUNT_PATTERN/i)
      const dateMatch = body.match(/DATE_PATTERN/i)
      const merchantMatch = body.match(/MERCHANT_PATTERN/i)
      const refMatch = body.match(/REF_PATTERN/i)

      // Parse amount
      const amount = amountMatch ? parseAmountToInteger(amountMatch[1]) : null
      if (!amount) return null  // Amount adalah field critical

      // Parse date
      const transacted_at = dateMatch
        ? parseTransactionDate(dateMatch[1])
        : new Date(email.date)  // fallback ke date email

      const result: ParsedTransaction = {
        amount,
        type: 'expense', // detect dari context
        merchant_name: merchantMatch ? merchantMatch[1].trim() : null,
        description: null,
        payment_method: 'other', // detect dari context
        transacted_at: transacted_at ?? new Date(),
        reference_number: refMatch ? refMatch[1].trim() : null,
        raw_email_id: email.id,
        raw_snippet: body.substring(0, 500),
        confidence: 0,
        bank: 'namabank',
      }

      result.confidence = calculateConfidence(result)

      return result
    } catch (error) {
      // JANGAN throw — return null supaya parser registry lanjut ke parser berikutnya
      console.error(`[namabank-parser] Failed to parse email ${email.id}`)
      return null
    }
  },
}
```

---

## CARA MENAMBAH BANK BARU

1. Buat file: `lib/gmail/parsers/[nama-bank].ts`
2. Implementasi `BankParser` interface menggunakan template di atas
3. Daftarkan ke registry di `lib/gmail/parsers/index.ts`:
   ```typescript
   import { namaBankParser } from './nama-bank'
   
   const PARSER_REGISTRY: BankParser[] = [
     mandiriParser,
     bcaParser,
     namaBankParser,  // ← tambahkan di sini
     genericParser,   // genericParser SELALU paling terakhir
   ]
   ```
4. Tulis test dengan fixture email asli di `tests/unit/parsers/nama-bank.test.ts`
5. Jalankan test suite sebelum commit

---

## OCR COMPATIBILITY

Parser guide ini juga berlaku untuk OCR flow (Phase 3).
Perbedaan utama:

| Aspek | Gmail Parser | OCR Parser |
|---|---|---|
| Input | `GmailMessage` object | String hasil Tesseract.js |
| `raw_email_id` | Gmail message ID | `'ocr-' + timestamp` |
| `canParse()` | Cek sender + subject | Cek keyword di teks OCR |
| Confidence awal | Bisa 0.9+ | Maksimal 0.7 (OCR tidak sempurna) |
| `is_verified` | Otomatis jika ≥ 0.7 | Selalu false — user wajib konfirmasi |

Regex patterns untuk field extraction (amount, date, merchant) SAMA persis
antara Gmail parser dan OCR parser — inilah mengapa guide ini dibuat unified.

---

## TESTING CHECKLIST

Setiap parser baru wajib punya test untuk skenario berikut:

```
[ ] Email valid → semua field ter-extract dengan benar
[ ] Email dengan amount format berbeda (1jt, 500rb, dll)
[ ] Email tanpa merchant name → merchant_name: null, confidence turun
[ ] Email dengan tanggal format tidak dikenal → fallback ke email.date
[ ] Email dari sender yang mirip tapi bukan bank resmi → canParse() return false
[ ] Email dengan body kosong → return null tanpa throw
[ ] Duplicate email (raw_email_id sama) → ditangani di level service, bukan parser
```
