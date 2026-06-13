'use client'

import Link, { useLinkStatus } from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Wallet, List, Settings, BarChart3, Target } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Beranda', icon: LayoutDashboard },
  { href: '/transactions', label: 'Transaksi', icon: List },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/budgets', label: 'Budget', icon: Target },
  { href: '/settings', label: 'Pengaturan', icon: Settings },
]

function NavItemContent({
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
        'flex flex-col items-center gap-0.5 py-2 text-xs font-medium transition-all active:scale-95 active:opacity-70',
        active ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
        pending && 'opacity-70'
      )}
    >
      <Icon className={cn('h-5 w-5', (active || pending) && 'stroke-[2.5px]')} />
      {label}
    </span>
  )
}

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 border-t bg-background/95 backdrop-blur md:hidden">
      <ul className="flex items-center justify-around px-2 h-16">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <li key={href} className="flex-1">
              <Link href={href} prefetch className="block">
                <NavItemContent Icon={Icon} label={label} active={active} />
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
