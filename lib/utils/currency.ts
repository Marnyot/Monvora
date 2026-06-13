export function formatIDR(amount: number): string {
  if (!Number.isInteger(amount)) throw new Error('Amount must be an integer')
  if (amount < 0) throw new Error('Amount cannot be negative')

  const abs = Math.abs(amount)
  const formatted = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
    .format(abs)
    .replace(/ /g, ' ') // Intl emits NBSP between Rp and digits; tests + UI expect regular space

  return amount < 0 ? `-${formatted}` : formatted
}

export function parseIDR(value: string): number | null {
  if (!value.trim()) return null

  // Strip "Rp" prefix and all dots (thousand separators), then parse
  const cleaned = value.replace(/Rp\s*/i, '').replace(/\./g, '').trim()
  const num = Number(cleaned)

  if (isNaN(num) || !Number.isInteger(num)) return null
  return num
}

export function parseAmountToInteger(raw: string): number | null {
  if (!raw) return null

  const cleaned = raw.replace(/[^\d.,]/g, '').trim()
  if (!cleaned) return null

  let normalized: string

  if (/\.\d{3},\d{2}$/.test(cleaned)) {
    normalized = cleaned.replace(/\./g, '').replace(/,\d+$/, '')
  } else if (/,\d{3}\.\d{2}$/.test(cleaned)) {
    normalized = cleaned.replace(/,/g, '').replace(/\.\d+$/, '')
  } else if (/^\d+,\d{2}$/.test(cleaned)) {
    normalized = cleaned.replace(/,\d+$/, '')
  } else if (/^\d+\.\d{2}$/.test(cleaned)) {
    normalized = cleaned.replace(/\.\d+$/, '')
  } else {
    normalized = cleaned.replace(/[.,]/g, '')
  }

  const result = parseInt(normalized, 10)
  return isNaN(result) || result <= 0 ? null : result
}
