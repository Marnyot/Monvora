import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Mail, ChevronRight } from 'lucide-react'
import { LogoutButton } from './logout-button'

export const metadata = { title: 'Pengaturan — Monvora' }

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('gmail_sync_enabled')
    .eq('id', user.id)
    .single()

  const displayName = (user.user_metadata?.full_name as string | undefined) ?? user.email ?? ''
  const gmailConnected = profile?.gmail_sync_enabled ?? false

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
            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
          </div>
        </div>
        <LogoutButton />
      </section>

      {/* Integrasi */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-foreground px-1">Integrasi</h2>
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <Link
            href="/settings/gmail"
            className="flex items-center justify-between p-4 hover:bg-accent/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className={`rounded-full p-2 ${gmailConnected ? 'bg-emerald-100 dark:bg-emerald-950/50' : 'bg-muted'}`}>
                <Mail className={`h-4 w-4 ${gmailConnected ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`} />
              </div>
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
