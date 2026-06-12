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
  payment_method: 'qris' | 'transfer' | 'cash' | 'debit' | 'credit' | 'ewallet' | 'topup' | 'other'
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
| CIMB / OCBC | `Rp X.XXX,XX` | `Rp 250.000,00` | `250000` |

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

> ✅ Tervalidasi dengan email myBCA asli (Internet Transaction Journal) — QRIS Payment & Transfer antar bank. Lihat fixtures di `tests/unit/parsers/bca.test.ts`.

### Email yang Dikenal

| Tipe Transaksi | Subject | Sender |
|---|---|---|
| QRIS Payment | "Internet Transaction Journal" | noreply@bca.co.id / klikbca.com |
| Transfer ke bank lain | "Internet Transaction Journal" | noreply@bca.co.id / klikbca.com |
| Transfer sesama BCA | "Internet Transaction Journal" | noreply@bca.co.id / klikbca.com |
| Top Up / Pulsa / Paket Data | "Internet Transaction Journal" | noreply@bca.co.id / klikbca.com |

Semua email outgoing diawali `Status : Successful` — parser **return null** kalau status bukan success.

### Format Email — Bervariasi per `Transaction Type` / `Transfer Type`

**QRIS Payment** (dari screenshot myBCA):
```
Status              : Successful
Transaction Date    : 09 Jun 2026 12:31:22
Transaction Type    : QRIS Payment
Payment to          : SEKUTU KOPI          ← merchant
Total Payment       : IDR 35,000.00        ← amount
RRN                 : 345244767
Reference No.       : 9527120260609...QRS0698496183
```

**Transfer ke bank lain** (BI FAST, dari screenshot myBCA):
```
Status              : Successful
Transaction Date    : 23 May 2026 14:47:40
Transfer Type       : Transfer to SEABANK  ← bank tujuan
Beneficiary Name    : RISQUINA ANGELICA ARVINTYANI  ← nama penerima
Amount              : IDR 240,000.00       ← amount + fee dijumlahkan
Fee                 : IDR 2,500.00
Reference No.       : 20260523CENAIDJA51095741152
```

### Aturan Ekstraksi — BCA

| Transaction/Transfer Type | type | payment_method | Nominal yang diambil | merchant_name (display) |
|---|---|---|---|---|
| `QRIS Payment` | expense | qris | **Total Payment** | `QRIS ke <Payment to>` |
| `Transfer to <BANK lain>` | transfer | transfer | **Amount + Fee** (dijumlahkan) | `Transfer kepada <nama tengah penerima>` |
| `Transfer to BCA` | transfer | transfer | **Total Payment** (tanpa fee terpisah) | `Transfer kepada <nama tengah penerima>` |
| `<X> Top Up` | expense | topup | **Top Up Amount** | `Top up ke <X>` |
| `Mobile Data` / Pulsa / Paket | expense | topup | **Total Payment** | `Top up <produk>` |

**Aturan khusus:**
- **Nama penerima transfer:** nama lengkap disimpan di `description`, tapi yang ditampilkan (`merchant_name`) **hanya nama tengah** (BCA), berbeda dari Mandiri yang pakai nama depan. Contoh: `RISQUINA ANGELICA ARVINTYANI` → "Transfer kepada Angelica".
- **Field `Details`** (pada pulsa/top up) masuk ke `description` **tapi link/URL/`www.…` dibuang** — lihat `stripLinks()`.
- **Reference No.** BCA bersifat **alfanumerik** (bukan hex/UUID), bisa terpisah spasi karena line-wrap → spasi di-strip.
- **Tanggal+jam** dalam satu baris (`09 Jun 2026 12:31:22`) → pisahkan tanggal & jam sebelum `parseTransactionDate(date, time)` agar komponen waktu tidak hilang.

### Regex Patterns — BCA

```typescript
const TRANSFER_TYPE_REGEX = /Transfer Type\s*:\s*([^\n]+)/i
const TRANSACTION_TYPE_REGEX = /Transaction Type\s*:\s*([^\n]+)/i
const TOTAL_PAYMENT_REGEX = /Total Payment\s*:\s*IDR\s*([\d,. ]+)/i
const AMOUNT_REGEX = /(?:^|[^pP]\s)Amount\s*:\s*IDR\s*([\d,. ]+)/i  // hindari "Top Up Amount"
const FEE_REGEX = /Fee\s*:\s*IDR\s*([\d,. ]+)/i
const TOPUP_AMOUNT_REGEX = /Top\s*Up\s*Amount\s*:\s*IDR\s*([\d,. ]+)/i
const PAYMENT_TO_REGEX = /Payment to\s*:\s*([^\n]+)/i
const BENEFICIARY_REGEX = /Beneficiary Name\s*:\s*([^\n]+)/i
const DETAILS_REGEX = /Details\s*:\s*([^\n]+)/i
const REF_REGEX = /Reference No\.?\s*:\s*([A-Za-z0-9 ]+)/i  // alfanumerik, spasi di-strip
const DATE_REGEX = /Transaction Date\s*:\s*(\d{1,2}\s+\w+\s+\d{4})(?:\s+(\d{2}:\d{2}:\d{2}))?/i
const STATUS_REGEX = /Status\s*:\s*([A-Za-z]+)/i  // hanya proses kalau Successful
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
3. Daftarkan ke registry via side effect — di akhir file parser panggil `registerParser(...)`:
   ```typescript
   // lib/gmail/parsers/[nama-bank].ts (di paling bawah file)
   import { registerParser } from './index'
   // ...definisi parser di atas...
   registerParser(namaBankParser)
   ```
4. Tambahkan import side-effect di `lib/gmail/sync.ts` (urutan menentukan prioritas matching — generic SELALU terakhir):
   ```typescript
   import '@/lib/gmail/parsers/mandiri'
   import '@/lib/gmail/parsers/bca'
   import '@/lib/gmail/parsers/bni'
   import '@/lib/gmail/parsers/bri'
   import '@/lib/gmail/parsers/cimb'
   import '@/lib/gmail/parsers/nama-bank'  // ← tambahkan sebelum generic
   import '@/lib/gmail/parsers/generic'    // generic SELALU paling terakhir
   ```
5. Tulis test dengan fixture email asli di `tests/unit/parsers/nama-bank.test.ts`
6. Jalankan test suite sebelum commit

> ⚠️ `PARSER_REGISTRY` di `index.ts` dimulai kosong — diisi runtime via `registerParser()`. Jangan push manual ke array literal di sana.

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
