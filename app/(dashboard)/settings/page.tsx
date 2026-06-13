'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useTheme } from 'next-themes'
import {
  Mail,
  ChevronRight,
  Tag,
  MessageSquare,
  Pencil,
  Sun,
  Moon,
  Monitor,
  Eye,
  EyeOff,
  Info,
  Sparkles,
  Settings2,
} from 'lucide-react'
import { LogoutButton } from './logout-button'
import { EditNameSheet } from '@/components/dashboard/edit-name-sheet'
import { useSession } from '@/lib/hooks/use-session'
import { useProfile } from '@/lib/hooks/use-profile'
import { useBalanceVisibility } from '@/lib/hooks/use-balance-visibility'
import { DecorativeBlobs } from '@/components/shared/decorative-blobs'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

const THEMES = [
  { value: 'light', label: 'Terang', icon: Sun },
  { value: 'dark', label: 'Gelap', icon: Moon },
  { value: 'system', label: 'Sistem', icon: Monitor },
] as const

export default function SettingsPage() {
  const { user, loading } = useSession()
  const { data: profile, isLoading: profileLoading } = useProfile()
  const { theme, setTheme } = useTheme()
  const [balanceVisible, setBalanceVisible] = useBalanceVisibility()
  const [editNameOpen, setEditNameOpen] = useState(false)

  if (loading || profileLoading) {
    return (
      <div className="max-w-lg lg:max-w-2xl mx-auto px-4 py-6 space-y-6 relative">
        <DecorativeBlobs />
        <div className="rounded-2xl bg-gradient-to-br from-primary via-primary/90 to-emerald-600/80 p-5 text-primary-foreground">
          <div className="h-5 w-28 bg-white/20 rounded animate-pulse mb-2" />
          <div className="h-3 w-44 bg-white/20 rounded animate-pulse" />
        </div>
        <div className="rounded-xl border border-border/50 bg-card p-6 space-y-4 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
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

  const displayName =
    profile?.full_name ??
    (user?.user_metadata?.full_name as string | undefined) ??
    user?.email ??
    ''

  return (
    <div className="max-w-lg lg:max-w-2xl mx-auto px-4 py-6 space-y-6 relative">
      <DecorativeBlobs />

      {/* Gradient header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary/90 to-emerald-600/80 p-5 text-primary-foreground shadow-lg">
        <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/5 rounded-full blur-2xl animate-blob pointer-events-none" />
        <div className="absolute -bottom-6 -left-6 w-24 h-24 bg-white/5 rounded-full blur-2xl animate-blob-delayed pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1">
            <Settings2 className="h-4 w-4" />
            <h1 className="text-lg font-bold">Pengaturan</h1>
          </div>
          <p className="text-sm opacity-80">Kelola akun dan preferensi kamu</p>
        </div>
      </div>

      {/* Akun */}
      <section className="rounded-xl border border-border/50 bg-card p-6 space-y-4 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
        <h2 className="text-sm font-semibold text-foreground">Akun</h2>
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-muted flex items-center justify-center h-10 w-10 text-sm font-semibold text-foreground shrink-0">
            {displayName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground truncate">{displayName}</p>
            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
          </div>
          <button
            type="button"
            onClick={() => setEditNameOpen(true)}
            className="shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-accent transition-colors"
            aria-label="Ubah nama tampilan"
          >
            <Pencil className="h-3.5 w-3.5" />
            Ubah nama
          </button>
        </div>
        <LogoutButton />
      </section>

      {/* Tampilan */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-foreground px-1">Tampilan</h2>
        <div className="rounded-xl border border-border/50 bg-card overflow-hidden divide-y divide-border/50 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
          <div className="p-4 space-y-3">
            <div>
              <p className="text-sm font-medium text-foreground">Tema</p>
              <p className="text-xs text-muted-foreground">Pilih mode terang, gelap, atau ikuti sistem</p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {THEMES.map((t) => {
                const Icon = t.icon
                const active = theme === t.value
                return (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setTheme(t.value)}
                    aria-pressed={active}
                    className={cn(
                      'flex flex-col items-center justify-center gap-1.5 rounded-lg border px-3 py-3 text-xs font-medium transition-colors',
                      active
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-background text-foreground hover:bg-accent',
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {t.label}
                  </button>
                )
              })}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setBalanceVisible(!balanceVisible)}
            className="w-full flex items-center justify-between p-4 hover:bg-accent/50 transition-colors text-left"
            aria-pressed={!balanceVisible}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="rounded-full p-2 bg-muted shrink-0">
                {balanceVisible ? (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">Sembunyikan saldo</p>
                <p className="text-xs text-muted-foreground">
                  {balanceVisible ? 'Saldo total tampil di dashboard' : 'Saldo disamarkan jadi Rp •••••••'}
                </p>
              </div>
            </div>
            <span
              role="presentation"
              className={cn(
                'shrink-0 inline-flex h-6 w-11 items-center rounded-full transition-colors',
                !balanceVisible ? 'bg-primary' : 'bg-muted',
              )}
            >
              <span
                className={cn(
                  'inline-block h-5 w-5 transform rounded-full bg-background shadow transition-transform',
                  !balanceVisible ? 'translate-x-5' : 'translate-x-0.5',
                )}
              />
            </span>
          </button>
        </div>
      </section>

      {/* Kelola */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-foreground px-1">Kelola</h2>
        <div className="rounded-xl border border-border/50 bg-card overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
          <Link
            href="/settings/categories"
            prefetch
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
        <div className="rounded-xl border border-border/50 bg-card overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
          <Link
            href="/settings/gmail"
            prefetch
            className="flex items-center justify-between p-4 hover:bg-accent/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div
                className={`rounded-full p-2 ${
                  profile?.gmail_sync_enabled
                    ? 'bg-emerald-100 dark:bg-emerald-950/50'
                    : 'bg-muted'
                }`}
              >
                <Mail
                  className={`h-4 w-4 ${
                    profile?.gmail_sync_enabled
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-muted-foreground'
                  }`}
                />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Sinkronisasi Gmail</p>
                <p className="text-xs text-muted-foreground">
                  {profile?.gmail_sync_enabled
                    ? 'Terhubung — klik untuk kelola'
                    : 'Belum terhubung — klik untuk setup'}
                </p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
          </Link>
        </div>
      </section>

      {/* Bantuan */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-foreground px-1">Bantuan</h2>
        <div className="rounded-xl border border-border/50 bg-card overflow-hidden divide-y divide-border/50 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
          <Link
            href="/settings/feedback"
            prefetch
            className="flex items-center justify-between p-4 hover:bg-accent/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="rounded-full p-2 bg-muted">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Kirim feedback</p>
                <p className="text-xs text-muted-foreground">Bug, ide fitur, atau masukan</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
          </Link>
          <Link
            href="/settings/about"
            prefetch
            className="flex items-center justify-between p-4 hover:bg-accent/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="rounded-full p-2 bg-muted">
                <Info className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Tentang Monvora</p>
                <p className="text-xs text-muted-foreground">Versi, kebijakan, dan informasi lain</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
          </Link>
        </div>
      </section>

      <EditNameSheet
        open={editNameOpen}
        onOpenChange={setEditNameOpen}
        currentName={profile?.full_name ?? ''}
      />
    </div>
  )
}
