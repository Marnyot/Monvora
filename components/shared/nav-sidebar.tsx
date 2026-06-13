'use client'

import Link, { useLinkStatus } from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, List, BarChart3, Wallet, Settings, LogOut, Loader2 } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Beranda', icon: LayoutDashboard },
  { href: '/transactions', label: 'Transaksi', icon: List },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/wallets', label: 'Dompet', icon: Wallet },
  { href: '/settings', label: 'Pengaturan', icon: Settings },
]

function SidebarItemContent({
  Icon,
  label,
  active,
}: {
  Icon: LucideIcon
  label: string
  active: boolean
}) {
  const { pending } = useLinkStatus()
  return (
    <span
      className={cn(
        'relative flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
        active
          ? 'bg-accent text-primary font-semibold'
          : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground',
        pending && !active && 'bg-accent/40'
      )}
    >
      {active && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-full bg-primary" />
      )}
      {pending ? (
        <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
      ) : (
        <Icon className={cn('h-4 w-4 shrink-0', active && 'stroke-[2.5px]')} />
      )}
      {label}
    </span>
  )
}

function LogoutButtonSidebar() {
  const [open, setOpen] = useState(false)
  const [isPending, setIsPending] = useState(false)

  async function handleLogout() {
    setIsPending(true)
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } finally {
      window.location.href = '/login'
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        disabled={isPending}
        className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
        ) : (
          <LogOut className="h-4 w-4 shrink-0" />
        )}
        Keluar
      </button>

      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Keluar dari Monvora?"
        description="Kamu akan keluar dari akun ini. Data kamu tetap aman dan tersimpan."
        confirmLabel="Keluar"
        cancelLabel="Batal"
        variant="destructive"
        onConfirm={handleLogout}
        isPending={isPending}
      />
    </>
  )
}

export function NavSidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden md:flex flex-col w-56 shrink-0 border-r border-border/50 bg-background h-screen sticky top-0 overflow-hidden">
      <div className="px-4 py-5 border-b border-border/50">
        <span className="text-lg font-bold tracking-tight">
          <span className="bg-gradient-to-r from-primary to-emerald-600 bg-clip-text text-transparent">Monvora</span>
        </span>
      </div>

      <nav className="flex-1 px-2 py-4">
        <ul className="space-y-1">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + '/')
            return (
              <li key={href}>
                <Link href={href} prefetch className="block">
                  <SidebarItemContent Icon={Icon} label={label} active={active} />
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="px-2 py-4 border-t">
        <LogoutButtonSidebar />
      </div>
    </aside>
  )
}
