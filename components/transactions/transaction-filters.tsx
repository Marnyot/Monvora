'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

const TYPE_OPTIONS = [
  { value: '', label: 'Semua' },
  { value: 'expense', label: 'Pengeluaran' },
  { value: 'income', label: 'Pemasukan' },
  { value: 'transfer', label: 'Transfer' },
] as const

export function TransactionFilters() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const currentType = searchParams.get('type') ?? ''
  const currentQ = searchParams.get('q') ?? ''

  const [searchValue, setSearchValue] = useState(currentQ)

  // Sync search input when URL changes (e.g. browser back)
  useEffect(() => {
    setSearchValue(currentQ)
  }, [currentQ])

  const updateParams = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString())
      for (const [key, val] of Object.entries(updates)) {
        if (val) {
          params.set(key, val)
        } else {
          params.delete(key)
        }
      }
      // Reset to page 1 whenever filters change
      params.delete('page')
      router.replace(`${pathname}?${params.toString()}`, { scroll: false })
    },
    [router, pathname, searchParams]
  )

  // Debounce search input
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (searchValue !== currentQ) {
        updateParams({ q: searchValue })
      }
    }, 300)
    return () => clearTimeout(timeout)
  }, [searchValue, currentQ, updateParams])

  function handleTypeClick(value: string) {
    updateParams({ type: value })
  }

  function handleClearSearch() {
    setSearchValue('')
    updateParams({ q: '' })
  }

  return (
    <div className="space-y-3 px-4 py-3 border-b">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Cari merchant atau catatan..."
          value={searchValue}
          onChange={e => setSearchValue(e.target.value)}
          className="pl-9 pr-9"
        />
        {searchValue && (
          <button
            onClick={handleClearSearch}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label="Hapus pencarian"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Type filter */}
      <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-none">
        {TYPE_OPTIONS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => handleTypeClick(value)}
            className={cn(
              'shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
              currentType === value
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-background text-muted-foreground border-border hover:bg-accent hover:text-foreground'
            )}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}
