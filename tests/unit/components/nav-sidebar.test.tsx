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
    const berandaLink = screen.getByRole('link', { name: /beranda/i })
    expect(berandaLink.className).toMatch(/text-primary|font-semibold|bg-accent/)
  })

  it('renders correct href for each item', () => {
    render(<NavSidebar />)
    expect(screen.getByRole('link', { name: /beranda/i })).toHaveAttribute('href', '/dashboard')
    expect(screen.getByRole('link', { name: /transaksi/i })).toHaveAttribute('href', '/transactions')
    expect(screen.getByRole('link', { name: /dompet/i })).toHaveAttribute('href', '/wallets')
  })
})
