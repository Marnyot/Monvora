import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { BottomNav } from '@/components/dashboard/bottom-nav'
import { NavSidebar } from '@/components/shared/nav-sidebar'
import { QuickEntryFab } from '@/components/transactions/quick-entry-fab'
import { RealtimeProvider } from '@/components/shared/realtime-provider'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="min-h-screen bg-background flex">
      <RealtimeProvider />
      <NavSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1 pb-16 md:pb-0">
          {children}
        </main>
        <BottomNav />
      </div>
      <QuickEntryFab />
    </div>
  )
}
