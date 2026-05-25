import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { TransactionFilters } from '@/components/transactions/transaction-filters'

const mockReplace = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/transactions',
}))

describe('TransactionFilters', () => {
  beforeEach(() => mockReplace.mockReset())

  it('renders search input', () => {
    render(<TransactionFilters />)
    expect(screen.getByPlaceholderText(/cari/i)).toBeInTheDocument()
  })

  it('renders type filter buttons', () => {
    render(<TransactionFilters />)
    expect(screen.getByRole('button', { name: /semua/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /pengeluaran/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /pemasukan/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /transfer/i })).toBeInTheDocument()
  })

  it('updates URL when type filter is clicked', async () => {
    render(<TransactionFilters />)
    fireEvent.click(screen.getByRole('button', { name: /pengeluaran/i }))
    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith(
        expect.stringContaining('type=expense'),
        expect.anything()
      )
    })
  })

  it('updates URL when search is typed (debounced)', async () => {
    render(<TransactionFilters />)
    const searchInput = screen.getByPlaceholderText(/cari/i)
    fireEvent.change(searchInput, { target: { value: 'indomaret' } })
    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith(
        expect.stringContaining('q=indomaret'),
        expect.anything()
      )
    }, { timeout: 500 })
  })

  it('renders all type buttons regardless of active state', () => {
    render(<TransactionFilters />)
    // All type buttons should always be present
    expect(screen.getByRole('button', { name: /pengeluaran/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /pemasukan/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /transfer/i })).toBeInTheDocument()
  })
})
