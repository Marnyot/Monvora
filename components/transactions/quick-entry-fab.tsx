'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { QuickEntry } from '@/components/transactions/quick-entry'

interface QuickEntryFabProps {
  wallets: { id: string; name: string; color: string | null; type: string }[]
  categories: { id: string; name: string; icon: string; color: string; type: string; is_system: boolean | null }[]
}

export function QuickEntryFab({ wallets, categories }: QuickEntryFabProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Tambah transaksi"
        className="fixed bottom-20 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/25 transition-transform active:scale-95 hover:bg-primary/90 md:bottom-6 md:right-6"
      >
        <Plus className="h-6 w-6" strokeWidth={2.5} />
      </button>

      <QuickEntry
        open={open}
        onOpenChange={setOpen}
        wallets={wallets}
        categories={categories}
      />
    </>
  )
}
