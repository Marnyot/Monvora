import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TransactionEditSheet } from '@/components/transactions/transaction-edit-sheet'

function renderWithClient(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>)
}

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}))

// Mock sonner
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

const mockWallets = [{ id: 'w-1', name: 'BCA', color: '#3b82f6' }]
const mockCategories = [
  { id: 'cat-1', name: 'Food & Beverage', icon: 'utensils', color: '#f59e0b', type: 'expense', is_system: true },
]

// Mock data-fetching hooks the sheet pulls in
vi.mock('@/lib/hooks/use-wallets', () => ({
  useWallets: () => ({ data: mockWallets, isLoading: false, sessionLoading: false }),
}))
vi.mock('@/lib/hooks/use-categories', () => ({
  useCategories: () => ({ data: mockCategories, isLoading: false, sessionLoading: false }),
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

describe('TransactionEditSheet', () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  it('renders with pre-filled transaction data when open', () => {
    renderWithClient(
      <TransactionEditSheet
        open={true}
        onOpenChange={vi.fn()}
        transaction={mockTransaction}
      />
    )

    expect(screen.getByDisplayValue('Warung Pak Budi')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Makan siang')).toBeInTheDocument()
  })

  it('does not render content when closed', () => {
    renderWithClient(
      <TransactionEditSheet
        open={false}
        onOpenChange={vi.fn()}
        transaction={mockTransaction}
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
    renderWithClient(
      <TransactionEditSheet
        open={true}
        onOpenChange={onOpenChange}
        transaction={mockTransaction}
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

    renderWithClient(
      <TransactionEditSheet
        open={true}
        onOpenChange={vi.fn()}
        transaction={mockTransaction}
      />
    )

    fireEvent.submit(screen.getByRole('button', { name: /simpan/i }))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Tidak ditemukan')
    })
  })
})
