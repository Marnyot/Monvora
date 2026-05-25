import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/shared/empty-state'
import { GmailSettingsClient, type SyncLog } from './gmail-settings-client'
import { Suspense } from 'react'
import { Mail, ChevronLeft } from 'lucide-react'

export const metadata = { title: 'Sinkronisasi Gmail — Monvora' }

function GmailSettingsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-9 rounded-full" />
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-48" />
          </div>
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-8 w-28" />
          <Skeleton className="h-8 w-32" />
        </div>
      </div>
      <div className="rounded-xl border border-border bg-card p-6 space-y-3">
        <Skeleton className="h-4 w-28" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex gap-3 py-2">
            <Skeleton className="h-4 w-4 rounded-full shrink-0" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-3/4" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

async function GmailSettingsContent() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: profile, error: profileError }, { data: syncLogs }] = await Promise.all([
    supabase
      .from('profiles')
      .select('gmail_sync_enabled, gmail_last_synced_at')
      .eq('id', user.id)
      .single(),
    supabase
      .from('gmail_sync_logs')
      .select('id, status, emails_scanned, transactions_found, transactions_created, error_message, started_at, completed_at')
      .eq('user_id', user.id)
      .order('started_at', { ascending: false })
      .limit(5)
      .returns<SyncLog[]>(),
  ])

  if (profileError) {
    return (
      <EmptyState
        title="Gagal memuat pengaturan"
        description="Tidak bisa membaca data profil. Coba muat ulang halaman."
        icon={<Mail className="h-10 w-10" />}
      />
    )
  }

  return (
    <GmailSettingsClient
      isConnected={profile?.gmail_sync_enabled ?? false}
      lastSyncedAt={profile?.gmail_last_synced_at ?? null}
      syncLogs={syncLogs ?? []}
    />
  )
}

export default function GmailSettingsPage() {
  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
      {/* Back link + Header */}
      <div>
        <Link
          href="/settings"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mb-3"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Pengaturan
        </Link>
        <h1 className="text-xl font-semibold text-foreground">Sinkronisasi Gmail</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Hubungkan Gmail untuk mendeteksi transaksi bank secara otomatis dari email notifikasi.
        </p>
      </div>

      <Suspense fallback={<GmailSettingsSkeleton />}>
        <GmailSettingsContent />
      </Suspense>
    </div>
  )
}
