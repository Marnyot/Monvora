import { createClient } from '@/lib/supabase/server'

export const metadata = {
  title: 'Dashboard — Monvora',
}

export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <main className="flex flex-col items-center justify-center min-h-screen gap-4 p-8">
      <h1 className="text-2xl font-bold text-foreground">Monvora</h1>
      <p className="text-muted-foreground text-sm">
        Selamat datang{user?.user_metadata?.full_name ? `, ${user.user_metadata.full_name}` : ''}!
      </p>
      <p className="text-xs text-muted-foreground">Dashboard sedang dibangun — Phase 1 🚧</p>
    </main>
  )
}
