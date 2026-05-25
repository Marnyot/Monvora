import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { TransactionEditSheet } from '@/components/transactions/transaction-edit-sheet'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}))

// Mock sonner
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

const mockTransaction = {
  id: 'tx-123',
  amount: 150000,
  type: 'expense' as const,
  description: 'Makan siang',
  merchant_name: 'Warung Pak Budi',
  payment_method: 'cash',
  transacted_at: '2026-05-25T12:00:00.000Z',
  wallet: { id: 'w-1', name: 'BCA', color: '#3b82f6' },
  category: { id: 'cat-1', name: 'Food & Beverage', icon: 'utensils', color: '#f59e0b', type: 'expense', is_system: true },
}

const mockWallets = [{ id: 'w-1', name: 'BCA', color: '#3b82f6' }]
const mockCategories = [
  { id: 'cat-1', name: 'Food & Beverage', icon: 'utensils', color: '#f59e0b', type: 'expense', is_system: true },
]

describe('TransactionEditSheet', () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  it('renders with pre-filled transaction data when open', () => {
    render(
      <TransactionEditSheet
        open={true}
        onOpenChange={vi.fn()}
        transaction={mockTransaction}
        wallets={mockWallets}
        categories={mockCategories}
      />
    )

    expect(screen.getByDisplayValue('Warung Pak Budi')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Makan siang')).toBeInTheDocument()
  })

  it('does not render content when closed', () => {
    render(
      <TransactionEditSheet
        open={false}
        onOpenChange={vi.fn()}
        transaction={mockTransaction}
        wallets={mockWallets}
        categories={mockCategories}
      />
    )

    expect(screen.queryByDisplayValue('Warung Pak Budi')).not.toBeInTheDocument()
  })

  it('calls PATCH API on submit with changed data', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { ...mockTransaction, description: 'Updated' }, error: null }),
    })

    const onOpenChange = vi.fn()
    render(
      <TransactionEditSheet
        open={true}
        onOpenChange={onOpenChange}
        transaction={mockTransaction}
        wallets={mockWallets}
        categories={mockCategories}
      />
    )

    const noteInput = screen.getByDisplayValue('Makan siang')
    fireEvent.change(noteInput, { target: { value: 'Updated' } })

    fireEvent.submit(screen.getByRole('button', { name: /simpan/i }))

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/transactions/tx-123',
        expect.objectContaining({ method: 'PATCH' })
      )
    })
  })

  it('shows error toast when API returns error', async () => {
    const { toast } = await import('sonner')
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ data: null, error: { message: 'Tidak ditemukan' } }),
    })

    render(
      <TransactionEditSheet
        open={true}
        onOpenChange={vi.fn()}
        transaction={mockTransaction}
        wallets={mockWallets}
        categories={mockCategories}
      />
    )

    fireEvent.submit(screen.getByRole('button', { name: /simpan/i }))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Tidak ditemukan')
    })
  })
})
