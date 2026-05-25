export function formatIDR(amount: number): string {
  if (amount < 0) throw new Error('Amount cannot be negative')
  if (!Number.isInteger(amount)) throw new Error('Amount must be an integer')

  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
    .format(amount)
    .replace(/ /g, ' ') // normalize non-breaking space from Intl
}

export function parseIDR(value: string): number | null {
  if (!value.trim()) return null

  // Strip "Rp" prefix and all dots (thousand separators), then parse
  const cleaned = value.replace(/Rp\s*/i, '').replace(/\./g, '').trim()
  const num = Number(cleaned)

  if (isNaN(num) || !Number.isInteger(num)) return null
  return num
}
