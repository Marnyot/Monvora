'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useSession } from '@/lib/hooks/use-session'
import { QuickEntry } from '@/components/transactions/quick-entry'

export function QuickEntryFab() {
  const [open, setOpen] = useState(false)
  const { user } = useSession()

  const { data: wallets } = useQuery({
    queryKey: ['fab-wallets', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('wallets')
        .select('id, name, color, type')
        .eq('user_id', user!.id)
        .is('deleted_at', null)
        .eq('is_active', true)
        .order('created_at', { ascending: true })
      return data ?? []
    },
    staleTime: 300_000,
  })

  const { data: categories } = useQuery({
    queryKey: ['fab-categories', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('categories')
        .select('id, name, icon, color, type, is_system')
        .is('deleted_at', null)
        .or(`user_id.eq.${user!.id},user_id.is.null`)
      return data ?? []
    },
    staleTime: 300_000,
  })

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Tambah transaksi"
        className="fixed bottom-24 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-amber-600 text-white shadow-lg shadow-amber-500/30 transition-transform active:scale-90 hover:scale-105 hover:shadow-xl hover:shadow-amber-500/40 md:bottom-6 md:right-6"
      >
        <Plus className="h-7 w-7" strokeWidth={3} />
      </button>

      <QuickEntry
        open={open}
        onOpenChange={setOpen}
        wallets={wallets ?? []}
        categories={categories ?? []}
      />
    </>
  )
}
