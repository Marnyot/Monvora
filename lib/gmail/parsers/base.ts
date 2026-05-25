import type { GmailMessage } from '@/types/parser'

/**
 * Ekstrak angka dari string rupiah.
 * Contoh: "Rp. 150.000" → 150000, "Rp 1.500.000,00" → 1500000, "IDR 250000" → 250000
 * Mengembalikan null jika tidak ditemukan angka valid.
 */
export function parseIDRAmount(text: string): number | null {
  if (!text) return null

  // Match pola: (Rp|IDR) diikuti angka dengan pemisah titik/koma
  // Support: "Rp. 150.000", "Rp 1.500.000,00", "IDR 250000", "Rp50.000"
  // Urutan alternasi penting: coba format dengan separator dulu, lalu plain digits
  const pattern = /(?:Rp\.?\s*|IDR\s*)(\d{1,3}(?:[.,]\d{3})+(?:[.,]\d{1,2})?|\d+)/i
  const match = text.match(pattern)
  if (!match) return null

  const raw = match[1]

  // Deteksi apakah menggunakan format Indonesia (titik=ribuan, koma=desimal)
  // vs format lain (koma=ribuan, titik=desimal)
  // Heuristik: jika ada koma di akhir diikuti 1-2 digit → koma adalah desimal
  // Contoh: "1.500.000,00" → ribuan=titik, desimal=koma
  let normalized: string

  // Format: 1.500.000,00 atau 150.000,50 (titik ribuan, koma desimal)
  if (/\d{1,3}(\.\d{3})+,\d{1,2}$/.test(raw)) {
    // Hapus titik (ribuan) dan koma beserta desimal
    normalized = raw.replace(/\./g, '').replace(/,\d{1,2}$/, '')
  }
  // Format: 1.500.000 atau 150.000 (titik sebagai ribuan, tanpa desimal)
  else if (/\d{1,3}(\.\d{3})+$/.test(raw)) {
    normalized = raw.replace(/\./g, '')
  }
  // Format: 250000 (angka polos tanpa pemisah)
  else {
    // Hapus titik dan koma yang mungkin tersisa
    normalized = raw.replace(/[.,]/g, '')
  }

  const amount = parseInt(normalized, 10)
  return isNaN(amount) || amount <= 0 ? null : amount
}

/**
 * Normalize teks email: lowercase, hapus whitespace berlebih (trim + collapse).
 */
export function normalizeText(text: string): string {
  return text.toLowerCase().trim().replace(/\s+/g, ' ')
}

/**
 * Cek apakah email dari domain/sender tertentu (case-insensitive).
 * Membandingkan senderPattern terhadap field `from` pada GmailMessage.
 */
export function isFromSender(email: GmailMessage, senderPattern: string): boolean {
  if (!email.from) return false
  return email.from.toLowerCase().includes(senderPattern.toLowerCase())
}

/**
 * Format date string ke Date object.
 * Menangani berbagai format tanggal yang umum di email bank Indonesia:
 * - ISO 8601: "2024-01-15T10:30:00+07:00"
 * - RFC 2822: "Mon, 15 Jan 2024 10:30:00 +0700"
 * - Date only: "2024-06-20"
 *
 * Mengembalikan Date object. Jika tidak dapat diparsing, mengembalikan
 * Date dari string asli (mungkin Invalid Date).
 */
export function parseEmailDate(dateStr: string): Date {
  if (!dateStr) return new Date()

  // Coba langsung parse dengan Date constructor (handles ISO 8601 dan RFC 2822)
  const direct = new Date(dateStr)
  if (!isNaN(direct.getTime())) {
    return direct
  }

  // Fallback: kembalikan Invalid Date (biarkan caller handle)
  return new Date(dateStr)
}
