import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { BottomNav } from '@/components/dashboard/bottom-nav'
import { QuickEntryFab } from '@/components/transactions/quick-entry-fab'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch wallets + categories for the FAB (available on all dashboard pages)
  const [{ data: wallets }, { data: categories }] = await Promise.all([
    supabase
      .from('wallets')
      .select('id, name, color')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .eq('is_active', true)
      .order('created_at', { ascending: true }),
    supabase
      .from('categories')
      .select('id, name, icon, color, type, is_system')
      .is('deleted_at', null)
      .or(`user_id.eq.${user.id},user_id.is.null`),
  ])

  return (
    <div className="min-h-screen bg-background">
      <main className="pb-16 md:pb-0">
        {children}
      </main>

      <BottomNav />

      <QuickEntryFab
        wallets={wallets ?? []}
        categories={categories ?? []}
      />
    </div>
  )
}
