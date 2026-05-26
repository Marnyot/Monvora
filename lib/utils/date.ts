const JAKARTA_OFFSET_MS = 7 * 60 * 60 * 1000

const INDONESIAN_MONTHS_MAP: Record<string, number> = {
  januari: 1, februari: 2, maret: 3, april: 4, mei: 5, juni: 6,
  juli: 7, agustus: 8, september: 9, oktober: 10, november: 11, desember: 12,
}

const ENGLISH_MONTHS_MAP: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
}

export function parseTransactionDate(dateStr: string, timeStr?: string): Date | null {
  if (!dateStr) return null
  try {
    const indoMatch = dateStr.match(/(\d{1,2})\s+(\w+)\s+(\d{4})/)
    if (indoMatch) {
      const [, day, monthName, year] = indoMatch
      const monthNum = INDONESIAN_MONTHS_MAP[monthName.toLowerCase()]
      if (!monthNum) return null

      const time = timeStr ? timeStr.replace(/\s*WIB\s*/i, '').trim() : '00:00:00'
      const timeParts = time.split(':').map(Number)
      const hh = timeParts[0] ?? 0
      const mm = timeParts[1] ?? 0
      const ss = timeParts[2] ?? 0

      const utcMs = Date.UTC(Number(year), monthNum - 1, Number(day), hh, mm, ss) - JAKARTA_OFFSET_MS
      const result = new Date(utcMs)
      return isNaN(result.getTime()) ? null : result
    }

    const englishMatch = dateStr.match(
      /(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{4})\s+(\d{2}):(\d{2}):(\d{2})/i,
    )
    if (englishMatch) {
      const [, day, month, year, hh, mm, ss] = englishMatch
      const monthNum = ENGLISH_MONTHS_MAP[month.toLowerCase()]
      if (!monthNum) return null
      const utcMs = Date.UTC(Number(year), monthNum - 1, Number(day), Number(hh), Number(mm), Number(ss)) - JAKARTA_OFFSET_MS
      const result = new Date(utcMs)
      return isNaN(result.getTime()) ? null : result
    }

    return null
  } catch {
    return null
  }
}

const ID_MONTHS_SHORT: Record<number, string> = {
  0: 'Jan', 1: 'Feb', 2: 'Mar', 3: 'Apr', 4: 'Mei', 5: 'Jun',
  6: 'Jul', 7: 'Agu', 8: 'Sep', 9: 'Okt', 10: 'Nov', 11: 'Des',
}

const ID_MONTHS_LONG: Record<number, string> = {
  0: 'Januari', 1: 'Februari', 2: 'Maret', 3: 'April', 4: 'Mei', 5: 'Juni',
  6: 'Juli', 7: 'Agustus', 8: 'September', 9: 'Oktober', 10: 'November', 11: 'Desember',
}

function toJakartaDate(input: string | Date): Date {
  const utc = typeof input === 'string' ? new Date(input) : input
  return new Date(utc.getTime() + JAKARTA_OFFSET_MS)
}

export function formatDate(input: string | Date): string {
  const d = toJakartaDate(input)
  const day = d.getUTCDate()
  const month = ID_MONTHS_SHORT[d.getUTCMonth()] ?? ''
  const year = d.getUTCFullYear()
  const hh = String(d.getUTCHours()).padStart(2, '0')
  const mm = String(d.getUTCMinutes()).padStart(2, '0')
  return `${day} ${month} ${year}, ${hh}.${mm}`
}

export function formatDateShort(input: string | Date): string {
  const d = toJakartaDate(input)
  const day = d.getUTCDate()
  const month = ID_MONTHS_LONG[d.getUTCMonth()] ?? ''
  return `${day} ${month}`
}

export function toDatetimeLocalInput(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 16)
}

export function toJakartaISO(date: Date): string {
  const local = new Date(date.getTime() + JAKARTA_OFFSET_MS)
  const yyyy = local.getUTCFullYear()
  const MM = String(local.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(local.getUTCDate()).padStart(2, '0')
  const hh = String(local.getUTCHours()).padStart(2, '0')
  const mm = String(local.getUTCMinutes()).padStart(2, '0')
  const ss = String(local.getUTCSeconds()).padStart(2, '0')
  return `${yyyy}-${MM}-${dd}T${hh}:${mm}:${ss}+07:00`
}
