const JAKARTA_OFFSET_MS = 7 * 60 * 60 * 1000

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
