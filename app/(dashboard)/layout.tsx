import { BottomNav } from '@/components/dashboard/bottom-nav'
import { NavSidebar } from '@/components/shared/nav-sidebar'
import { QuickEntryFab } from '@/components/transactions/quick-entry-fab'
import { RealtimeProvider } from '@/components/shared/realtime-provider'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
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
