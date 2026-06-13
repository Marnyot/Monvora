'use client'

import Link from 'next/link'
import { Skeleton } from '@/components/ui/skeleton'
import { GmailSettingsClient } from './gmail-settings-client'
import { useGmailSettings } from '@/lib/hooks/use-gmail-settings'
import { ChevronLeft } from 'lucide-react'

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

export default function GmailSettingsPage() {
  const { data, isLoading, sessionLoading } = useGmailSettings()

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
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
        <Link
          href="/gmail-permissions"
          className="mt-2 inline-block text-xs text-primary underline-offset-2 hover:underline"
        >
          Lihat detail akses yang kami minta →
        </Link>
      </div>

      {isLoading || sessionLoading ? (
        <GmailSettingsSkeleton />
      ) : (
        <GmailSettingsClient
          isConnected={data?.isConnected ?? false}
          lastSyncedAt={data?.lastSyncedAt ?? null}
          syncLogs={data?.syncLogs ?? []}
        />
      )}
    </div>
  )
}
