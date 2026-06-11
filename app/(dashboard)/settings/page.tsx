'use client'

import Link from 'next/link'
import { Mail, ChevronRight, Tag } from 'lucide-react'
import { LogoutButton } from './logout-button'
import { useSession } from '@/lib/hooks/use-session'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { Skeleton } from '@/components/ui/skeleton'

function useGmailStatus() {
  const { user } = useSession()
  return useQuery({
    queryKey: ['profile-gmail-status', user?.id],
    enabled: !!user?.id,
    staleTime: 30 * 1000,
    queryFn: async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('profiles')
        .select('gmail_sync_enabled')
        .eq('id', user!.id)
        .single()
      return data?.gmail_sync_enabled ?? false
    },
  })
}

export default function SettingsPage() {
  const { user, loading } = useSession()
  const { data: gmailConnected, isLoading: gmailLoading } = useGmailStatus()

  const displayName = (user?.user_metadata?.full_name as string | undefined) ?? user?.email ?? ''

  if (loading) {
    return (
      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        <Skeleton className="h-7 w-32" />
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <Skeleton className="h-4 w-16" />
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
          </div>
          <Skeleton className="h-9 w-24" />
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
      <h1 className="text-xl font-semibold text-foreground">Pengaturan</h1>

      {/* Akun */}
      <section className="rounded-xl border border-border bg-card p-6 space-y-4">
        <h2 className="text-sm font-semibold text-foreground">Akun</h2>
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-muted flex items-center justify-center h-10 w-10 text-sm font-semibold text-foreground shrink-0">
            {displayName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{displayName}</p>
            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
          </div>
        </div>
        <LogoutButton />
      </section>

      {/* Kelola */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-foreground px-1">Kelola</h2>
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <Link
            href="/settings/categories"
            prefetch={false}
            className="flex items-center justify-between p-4 hover:bg-accent/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="rounded-full p-2 bg-muted">
                <Tag className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Kategori</p>
                <p className="text-xs text-muted-foreground">Tambah dan kelola kategori transaksi</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
          </Link>
        </div>
      </section>

      {/* Integrasi */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-foreground px-1">Integrasi</h2>
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <Link
            href="/settings/gmail"
            prefetch={false}
            className="flex items-center justify-between p-4 hover:bg-accent/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              {gmailLoading ? (
                <Skeleton className="h-9 w-9 rounded-full" />
              ) : (
                <div className={`rounded-full p-2 ${gmailConnected ? 'bg-emerald-100 dark:bg-emerald-950/50' : 'bg-muted'}`}>
                  <Mail className={`h-4 w-4 ${gmailConnected ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`} />
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-foreground">Sinkronisasi Gmail</p>
                <p className="text-xs text-muted-foreground">
                  {gmailConnected ? 'Terhubung — klik untuk kelola' : 'Belum terhubung — klik untuk setup'}
                </p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
          </Link>
        </div>
      </section>
    </div>
  )
}
