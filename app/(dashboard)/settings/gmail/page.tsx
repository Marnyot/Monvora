'use client'

import Link from 'next/link'
import { Skeleton } from '@/components/ui/skeleton'
import { GmailSettingsClient } from './gmail-settings-client'
import { useGmailSettings } from '@/lib/hooks/use-gmail-settings'
import { DecorativeBlobs } from '@/components/shared/decorative-blobs'
import { ChevronLeft, Mail } from 'lucide-react'

function GmailSettingsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border/50 bg-card p-6 space-y-4 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
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
      <div className="rounded-xl border border-border/50 bg-card p-6 space-y-3 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
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
    <div className="max-w-lg lg:max-w-2xl mx-auto px-4 py-6 space-y-6 relative">
      <DecorativeBlobs />

      {/* Gradient header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary/90 to-emerald-600/80 p-5 text-primary-foreground shadow-lg">
        <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/5 rounded-full blur-2xl animate-blob pointer-events-none" />
        <div className="absolute -bottom-6 -left-6 w-24 h-24 bg-white/5 rounded-full blur-2xl animate-blob-delayed pointer-events-none" />
        <div className="relative z-10">
          <Link
            href="/settings"
            className="inline-flex items-center gap-1 text-xs opacity-80 hover:opacity-100 transition-opacity mb-2"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Pengaturan
          </Link>
          <div className="flex items-center gap-2 mb-1">
            <Mail className="h-5 w-5" />
            <h1 className="text-lg font-bold">Sinkronisasi Gmail</h1>
          </div>
          <p className="text-sm opacity-80">
            Hubungkan Gmail untuk mendeteksi transaksi bank secara otomatis dari email notifikasi.
          </p>
          <Link
            href="/gmail-permissions"
            className="mt-2 inline-block text-xs opacity-80 hover:opacity-100 underline underline-offset-2 transition-opacity"
          >
            Lihat detail akses yang kami minta →
          </Link>
        </div>
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
