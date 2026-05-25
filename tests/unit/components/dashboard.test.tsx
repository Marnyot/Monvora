import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TransactionCard } from '@/components/transactions/transaction-card'
import { SkeletonList } from '@/components/shared/skeleton-card'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() }),
  usePathname: () => '/dashboard',
}))

const mockTx = {
  id: 'tx-1',
  amount: 50000,
  type: 'expense',
  description: null,
  merchant_name: 'Indomaret',
  payment_method: 'qris',
  transacted_at: '2026-05-25T09:00:00.000Z',
  category: { id: 'cat-1', name: 'Belanja', icon: '🛒', color: '#f59e0b' },
  wallet: { id: 'w-1', name: 'BCA', color: '#3b82f6' },
}

describe('TransactionCard', () => {
  it('renders merchant name as label', () => {
    render(<TransactionCard transaction={mockTx} />)
    expect(screen.getByText('Indomaret')).toBeInTheDocument()
  })

  it('uses description as label when no merchant', () => {
    render(<TransactionCard transaction={{ ...mockTx, merchant_name: null, description: 'Beli snack' }} />)
    expect(screen.getByText('Beli snack')).toBeInTheDocument()
  })

  it('falls back to category name when no merchant or description', () => {
    render(<TransactionCard transaction={{ ...mockTx, merchant_name: null, description: null }} />)
    expect(screen.getByText('Belanja')).toBeInTheDocument()
  })

  it('shows wallet name in subtitle', () => {
    render(<TransactionCard transaction={mockTx} />)
    expect(screen.getByText(/BCA/)).toBeInTheDocument()
  })

  it('links to transaction detail page', () => {
    render(<TransactionCard transaction={mockTx} />)
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', '/transactions/tx-1')
  })

  it('renders income transaction without crashing', () => {
    render(<TransactionCard transaction={{ ...mockTx, type: 'income', amount: 5000000 }} />)
    expect(screen.getByText('Indomaret')).toBeInTheDocument()
  })
})

describe('SkeletonList', () => {
  it('renders correct number of skeleton items', () => {
    const { container } = render(<SkeletonList count={3} />)
    // Each SkeletonCard is a div with rounded-xl border
    const cards = container.querySelectorAll('.rounded-xl')
    expect(cards).toHaveLength(3)
  })

  it('renders 5 items by default', () => {
    const { container } = render(<SkeletonList />)
    const cards = container.querySelectorAll('.rounded-xl')
    expect(cards).toHaveLength(5)
  })
})
