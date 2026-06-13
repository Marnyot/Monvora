'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, List, BarChart3, Wallet, Settings } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

const NAV_ITEMS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: '/dashboard', label: 'Beranda', icon: LayoutDashboard },
  { href: '/transactions', label: 'Transaksi', icon: List },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/wallets', label: 'Dompet', icon: Wallet },
  { href: '/settings', label: 'Pengaturan', icon: Settings },
]

export function BottomNav() {
  const pathname = usePathname()
  const innerRef = useRef<HTMLDivElement>(null)
  const [pill, setPill] = useState({ x: 0, w: 0 })
  const [mounted, setMounted] = useState(false)

  const activeIdx = NAV_ITEMS.findIndex(
    ({ href }) => pathname === href || pathname.startsWith(href + '/'),
  )

  // Use offsetLeft/offsetWidth relative to the inner container (which is the
  // pill's positioned ancestor via `position: relative`). This avoids drift
  // from <nav> border + the inner <div>'s horizontal padding.
  const measure = useCallback(() => {
    const inner = innerRef.current
    if (!inner) return
    if (activeIdx < 0) {
      setPill({ x: 0, w: 0 })
      return
    }
    const tabs = inner.querySelectorAll<HTMLAnchorElement>('a')
    const tab = tabs[activeIdx]
    if (!tab) return
    setPill({ x: tab.offsetLeft, w: tab.offsetWidth })
  }, [activeIdx])

  useEffect(() => {
    measure()
    if (!mounted) {
      requestAnimationFrame(() => setMounted(true))
    }
  }, [measure, mounted])

  useEffect(() => {
    const onResize = () => measure()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [measure])

  return (
    <nav
      className="fixed bottom-4 left-4 right-4 z-30 bg-background/80 backdrop-blur-xl border border-border/50 shadow-[0_4px_24px_rgba(0,0,0,0.06)] rounded-[28px] md:hidden"
    >
      <div ref={innerRef} className="relative flex items-center justify-around px-2 h-16 pb-safe">
        <span
          className="absolute left-0 top-1/2 h-12 rounded-[28px] bg-primary/10 pointer-events-none z-0"
          style={{
            width: pill.w || 0,
            opacity: pill.w ? 1 : 0,
            transform: `translateX(${pill.x}px) translateY(-50%)`,
            transition: mounted
              ? 'transform 300ms cubic-bezier(0.22, 1, 0.36, 1), width 300ms cubic-bezier(0.22, 1, 0.36, 1), opacity 200ms ease-out'
              : 'none',
            willChange: 'transform, width',
          }}
          aria-hidden
        />
        {NAV_ITEMS.map(({ href, label, icon: Icon }, i) => {
          const active = activeIdx === i
          return (
            <Link
              key={href}
              href={href}
              prefetch
              className="relative flex flex-col items-center justify-center gap-1 flex-1 min-h-12 py-1 z-10 active:scale-95 transition-transform"
            >
              <Icon
                className={`h-5 w-5 ${active ? 'text-primary stroke-[2.5px] scale-110' : 'text-muted-foreground'} transition-all ${mounted ? 'duration-300' : ''}`}
              />
              <span
                className={`text-[11px] font-medium ${active ? 'text-primary' : 'text-muted-foreground'} transition-colors ${mounted ? 'duration-300' : ''}`}
              >
                {label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}