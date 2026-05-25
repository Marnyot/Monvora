import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { WalletCard } from '@/components/dashboard/wallet-card'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}))

const mockWallet = {
  id: 'wallet-1',
  name: 'BCA Utama',
  type: 'bank' as const,
  provider: 'BCA',
  balance: 5000000,
  color: '#3b82f6',
  icon: null,
  is_active: true,
  created_at: '2026-05-25T00:00:00Z',
  updated_at: '2026-05-25T00:00:00Z',
}

describe('WalletCard', () => {
  it('renders wallet name', () => {
    render(<WalletCard wallet={mockWallet} onEdit={() => {}} onDelete={() => {}} />)
    expect(screen.getByText('BCA Utama')).toBeInTheDocument()
  })

  it('renders formatted balance', () => {
    render(<WalletCard wallet={mockWallet} onEdit={() => {}} onDelete={() => {}} />)
    expect(screen.getByText(/5\.000\.000/)).toBeInTheDocument()
  })

  it('renders wallet type label', () => {
    render(<WalletCard wallet={mockWallet} onEdit={() => {}} onDelete={() => {}} />)
    expect(screen.getByText(/bank|Bank/i)).toBeInTheDocument()
  })

  it('renders provider when available', () => {
    render(<WalletCard wallet={mockWallet} onEdit={() => {}} onDelete={() => {}} />)
    expect(screen.getByText(/Bank.*BCA/)).toBeInTheDocument()
  })
})
