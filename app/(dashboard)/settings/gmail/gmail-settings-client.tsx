'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { formatDate } from '@/lib/utils/date'
import { useSession } from '@/lib/hooks/use-session'
import {
  Mail,
  RefreshCw,
  Unlink,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  ShieldCheck,
  Receipt,
  Check,
} from 'lucide-react'
import { cn } from '@/lib/utils'

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
  if (status === 'completed') return <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
  if (status === 'failed') return <XCircle className="h-4 w-4 text-destructive shrink-0" />
  if (status === 'partial') return <AlertCircle className="h-4 w-4 text-yellow-500 shrink-0" />
  return <Loader2 className="h-4 w-4 text-muted-foreground shrink-0 animate-spin" />
}

function statusLabel(status: SyncLog['status']): string {
  return { completed: 'Selesai', failed: 'Gagal', partial: 'Sebagian', started: 'Berjalan' }[status]
}

function formatLastSync(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  const time = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false })
  if (sameDay) return `Hari ini, ${time} WIB`
  const date = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
  return `${date}, ${time} WIB`
}

export function GmailSettingsClient({ isConnected, lastSyncedAt, syncLogs }: GmailSettingsClientProps) {
  const router = useRouter()
  const { user } = useSession()
  const [disconnectOpen, setDisconnectOpen] = useState(false)
  const [isSyncing, startSyncTransition] = useTransition()
  const [isDisconnecting, startDisconnectTransition] = useTransition()

  function triggerOAuth() {
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

  async function handleReconnect() {
    try {
      const res = await fetch('/api/sync/gmail/reconnect', { method: 'POST' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error?.message ?? 'Gagal menyambungkan')
      }
      const { data } = await res.json()
      if (data?.needsOAuth) triggerOAuth()
      else {
        toast.success('Gmail tersambung kembali', { description: 'Sync otomatis aktif.' })
        window.location.reload()
      }
    } catch (err) {
      toast.error('Gagal menyambungkan Gmail', {
        description: err instanceof Error ? err.message : 'Coba lagi nanti.',
      })
    }
  }

  function handleSyncNow() {
    startSyncTransition(async () => {
      try {
        const res = await fetch('/api/sync/gmail', { method: 'POST' })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data?.error?.message ?? 'Sync gagal')
        }
        const { data } = await res.json()
        const count = data?.transactionsCreated ?? 0
        toast.success('Sync selesai', {
          description: count > 0
            ? `${count} transaksi baru ditambahkan`
            : 'Tidak ada transaksi baru ditemukan',
        })
        router.refresh()
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

  const email = user?.email ?? ''
  const syncing = isSyncing

  return (
    <div className="space-y-5">
      {/* Hero card */}
      <section className="rounded-2xl border border-border/60 bg-card p-7 shadow-[0_2px_16px_rgba(0,0,0,0.04)] text-center">
        <div className="flex flex-col items-center">
          <div className="relative">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
              <Mail className="h-7 w-7 text-muted-foreground" />
            </div>
            {isConnected && (
              <span className="absolute -bottom-0.5 -right-0.5 h-6 w-6 rounded-full bg-emerald-500 border-[3px] border-card flex items-center justify-center">
                <Check className="h-3 w-3 text-white" strokeWidth={3} />
              </span>
            )}
          </div>

          {email ? (
            <p className="mt-4 text-base font-semibold text-foreground truncate max-w-full px-2">{email}</p>
          ) : (
            <p className="mt-4 text-base font-semibold text-muted-foreground">Belum ada akun</p>
          )}

          <div className="mt-2 inline-flex items-center gap-1.5">
            <span
              className={cn(
                'h-1.5 w-1.5 rounded-full',
                isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-muted-foreground/40',
              )}
              aria-hidden
            />
            <span
              className={cn(
                'text-[11px] font-semibold uppercase tracking-[0.18em]',
                isConnected ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground',
              )}
            >
              {isConnected ? 'Disinkronkan' : 'Belum terhubung'}
            </span>
          </div>

          {isConnected && (
            <>
              <div className="mt-5 w-full max-w-[14rem] h-px bg-border" aria-hidden />
              <p className="mt-4 text-[11px] uppercase tracking-wider text-muted-foreground">
                Terakhir disinkronkan
              </p>
              <p className="mt-1 font-mono text-sm text-foreground tabular-nums">
                {lastSyncedAt ? formatLastSync(lastSyncedAt) : 'Belum pernah'}
              </p>
            </>
          )}
        </div>
      </section>

      {/* Primary CTA */}
      {isConnected ? (
        <Button
          type="button"
          size="lg"
          onClick={handleSyncNow}
          disabled={syncing}
          className="w-full h-12 rounded-xl uppercase tracking-[0.14em] text-xs font-bold bg-foreground text-background hover:bg-foreground/90"
        >
          {syncing ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          {syncing ? 'Menyinkronkan...' : 'Sync Sekarang'}
        </Button>
      ) : (
        <Button
          type="button"
          size="lg"
          onClick={handleReconnect}
          className="w-full h-12 rounded-xl uppercase tracking-[0.14em] text-xs font-bold"
        >
          <Mail className="h-4 w-4 mr-2" />
          Aktifkan Sync
        </Button>
      )}

      {/* Info cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-muted/60 p-4">
          <Receipt className="h-4 w-4 text-foreground mb-2" />
          <p className="text-xs text-foreground leading-snug">
            Auto-deteksi e-receipt &amp; tagihan.
          </p>
        </div>
        <div className="rounded-xl bg-muted/60 p-4">
          <ShieldCheck className="h-4 w-4 text-foreground mb-2" />
          <p className="text-xs text-foreground leading-snug">
            Data terenkripsi. Hanya baca akses.
          </p>
        </div>
      </div>

      {/* Disconnect */}
      {isConnected && (
        <Button
          type="button"
          variant="outline"
          size="lg"
          onClick={() => setDisconnectOpen(true)}
          disabled={isDisconnecting}
          className="w-full h-12 rounded-xl uppercase tracking-[0.14em] text-xs font-bold text-destructive border-destructive/40 hover:bg-destructive/5 hover:text-destructive hover:border-destructive/60"
        >
          <Unlink className="h-4 w-4 mr-2" />
          Putuskan Koneksi
        </Button>
      )}

      {/* Sync history — collapsed visually below hero */}
      {isConnected && syncLogs.length > 0 && (
        <section className="rounded-xl border border-border/50 bg-card p-5 shadow-[0_2px_12px_rgba(0,0,0,0.04)] space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Riwayat sync
          </h2>
          <ul className="space-y-2">
            {syncLogs.slice(0, 5).map((log) => (
              <li
                key={log.id}
                className="flex items-start gap-3 py-1.5 border-b border-border/40 last:border-0"
              >
                <StatusIcon status={log.status} />
                <div className="flex-1 min-w-0 space-y-0.5">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-xs font-medium text-foreground">{statusLabel(log.status)}</span>
                    <span className="text-[11px] text-muted-foreground shrink-0">
                      {formatDate(log.started_at)}
                    </span>
                  </div>
                  {log.status !== 'failed' && (
                    <p className="text-[11px] text-muted-foreground">
                      {log.emails_scanned} email diperiksa · {log.transactions_created} transaksi ditambahkan
                    </p>
                  )}
                  {log.error_message && (
                    <p className="text-[11px] text-destructive truncate">{log.error_message}</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

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
