import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { NavSidebar } from '@/components/shared/nav-sidebar'

vi.mock('next/navigation', () => ({
  usePathname: () => '/dashboard',
}))

describe('NavSidebar', () => {
  it('renders all nav items', () => {
    render(<NavSidebar />)
    expect(screen.getByText('Beranda')).toBeInTheDocument()
    expect(screen.getByText('Transaksi')).toBeInTheDocument()
    expect(screen.getByText('Dompet')).toBeInTheDocument()
  })

  it('marks active item based on pathname', () => {
    render(<NavSidebar />)
    // Active styling now lives on the inner SidebarItemContent span (Link is
    // a transparent passthrough so useLinkStatus can read pending state).
    const berandaLink = screen.getByRole('link', { name: /beranda/i })
    const inner = berandaLink.firstElementChild as HTMLElement | null
    expect(inner?.className).toMatch(/text-primary|font-semibold|bg-accent/)
  })

  it('renders correct href for each item', () => {
    render(<NavSidebar />)
    expect(screen.getByRole('link', { name: /beranda/i })).toHaveAttribute('href', '/dashboard')
    expect(screen.getByRole('link', { name: /transaksi/i })).toHaveAttribute('href', '/transactions')
    expect(screen.getByRole('link', { name: /dompet/i })).toHaveAttribute('href', '/wallets')
  })
})
