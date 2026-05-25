'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { SyncStatusBadge } from '@/components/dashboard/sync-status-badge'
import { formatDate } from '@/lib/utils/date'
import { Mail, RefreshCw, Unlink, CheckCircle2, XCircle, AlertCircle, Loader2 } from 'lucide-react'

export interface SyncLog {
  id: string
  status: 'started' | 'completed' | 'failed' | 'partial'
  emails_scanned: number
  transactions_found: number
  transactions_created: number
  error_message: string | null
  started_at: string
  completed_at: string | null
}

interface GmailSettingsClientProps {
  isConnected: boolean
  lastSyncedAt: string | null
  syncLogs: SyncLog[]
}

function StatusIcon({ status }: { status: SyncLog['status'] }) {
  if (status === 'completed') {
    return <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
  }
  if (status === 'failed') {
    return <XCircle className="h-4 w-4 text-destructive shrink-0" />
  }
  if (status === 'partial') {
    return <AlertCircle className="h-4 w-4 text-yellow-500 shrink-0" />
  }
  return <Loader2 className="h-4 w-4 text-muted-foreground shrink-0 animate-spin" />
}

function statusLabel(status: SyncLog['status']): string {
  const labels: Record<SyncLog['status'], string> = {
    completed: 'Selesai',
    failed: 'Gagal',
    partial: 'Sebagian',
    started: 'Berjalan',
  }
  return labels[status]
}

export function GmailSettingsClient({ isConnected, lastSyncedAt, syncLogs }: GmailSettingsClientProps) {
  const router = useRouter()
  const [disconnectOpen, setDisconnectOpen] = useState(false)
  const [isSyncing, startSyncTransition] = useTransition()
  const [isDisconnecting, startDisconnectTransition] = useTransition()

  function handleConnectGmail() {
    const supabase = createClient()
    supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        scopes: 'openid email profile https://www.googleapis.com/auth/gmail.readonly',
        redirectTo: `${window.location.origin}/auth/callback?redirect=/settings/gmail`,
        queryParams: { access_type: 'offline', prompt: 'consent' },
      },
    })
  }

  function handleSyncNow() {
    startSyncTransition(async () => {
      try {
        const res = await fetch('/api/sync/gmail', { method: 'POST' })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data?.error?.message ?? 'Sync gagal')
        }
        toast.success('Sync dimulai', { description: 'Transaksi baru akan muncul dalam beberapa detik.' })
        // Refresh setelah sync selesai di background (~5 detik)
        setTimeout(() => router.refresh(), 5000)
      } catch (err) {
        toast.error('Sync gagal', {
          description: err instanceof Error ? err.message : 'Coba lagi nanti.',
        })
      }
    })
  }

  function handleDisconnect() {
    startDisconnectTransition(async () => {
      try {
        const res = await fetch('/api/sync/gmail/disconnect', { method: 'POST' })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data?.error?.message ?? 'Gagal memutuskan Gmail')
        }
        setDisconnectOpen(false)
        toast.success('Gmail berhasil diputuskan')
        window.location.reload()
      } catch (err) {
        toast.error('Gagal memutuskan Gmail', {
          description: err instanceof Error ? err.message : 'Coba lagi nanti.',
        })
      }
    })
  }

  if (!isConnected) {
    return (
      <div className="space-y-6">
        {/* Disconnected state */}
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-muted p-2">
              <Mail className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">Gmail belum terhubung</p>
              <p className="text-xs text-muted-foreground">
                Hubungkan Gmail kamu agar Monvora bisa membaca notifikasi transaksi bank secara otomatis.
                Kami hanya meminta akses baca-saja (gmail.readonly).
              </p>
            </div>
          </div>

          <div className="space-y-2 text-xs text-muted-foreground">
            <p className="font-medium text-foreground text-sm">Manfaat menghubungkan Gmail:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Transaksi bank terdeteksi otomatis dari email notifikasi</li>
              <li>Tidak perlu input manual untuk transaksi bank</li>
              <li>Mendukung Mandiri, BCA, BNI, BRI, dan CIMB Niaga</li>
              <li>Akses hanya baca — Monvora tidak bisa kirim email</li>
            </ul>
          </div>

          <Button onClick={handleConnectGmail} className="w-full sm:w-auto">
            <Mail className="h-4 w-4 mr-2" />
            Hubungkan Gmail
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Connected status card */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-emerald-100 dark:bg-emerald-950/50 p-2">
              <Mail className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Gmail terhubung</p>
              {lastSyncedAt && (
                <p className="text-xs text-muted-foreground">
                  Terakhir sync: {formatDate(lastSyncedAt)}
                </p>
              )}
            </div>
          </div>
          <SyncStatusBadge gmailSyncEnabled={true} lastSyncedAt={lastSyncedAt} />
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          <Button
            size="sm"
            onClick={handleSyncNow}
            disabled={isSyncing}
          >
            {isSyncing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            {isSyncing ? 'Menyinkronkan...' : 'Sync Sekarang'}
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => setDisconnectOpen(true)}
            disabled={isDisconnecting}
            className="text-destructive hover:text-destructive border-destructive/30 hover:border-destructive/60"
          >
            <Unlink className="h-4 w-4 mr-2" />
            Putuskan Gmail
          </Button>
        </div>
      </div>

      {/* Sync logs */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Riwayat Sync</h2>

        {syncLogs.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4 text-center">
            Belum ada aktivitas sync
          </p>
        ) : (
          <div className="space-y-2">
            {syncLogs.map((log) => (
              <div
                key={log.id}
                className="flex items-start gap-3 py-2 border-b border-border/50 last:border-0"
              >
                <StatusIcon status={log.status} />
                <div className="flex-1 min-w-0 space-y-0.5">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-xs font-medium text-foreground">
                      {statusLabel(log.status)}
                    </span>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {formatDate(log.started_at)}
                    </span>
                  </div>
                  {log.status !== 'failed' && (
                    <p className="text-xs text-muted-foreground">
                      {log.emails_scanned} email diperiksa · {log.transactions_created} transaksi ditambahkan
                    </p>
                  )}
                  {log.error_message && (
                    <p className="text-xs text-destructive truncate">
                      {log.error_message}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={disconnectOpen}
        onOpenChange={setDisconnectOpen}
        title="Putuskan Gmail?"
        description="Monvora tidak akan lagi membaca notifikasi transaksi dari Gmail kamu. Transaksi yang sudah tersimpan tidak akan terhapus."
        confirmLabel="Putuskan"
        cancelLabel="Batal"
        variant="destructive"
        onConfirm={handleDisconnect}
        isPending={isDisconnecting}
      />
    </div>
  )
}
