import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AmountDisplay } from '@/components/shared/amount-display'
import { CurrencyDisplay } from '@/components/shared/currency-display'
import { EmptyState } from '@/components/shared/empty-state'

describe('AmountDisplay', () => {
  it('shows positive amount in green for income', () => {
    const { container } = render(<AmountDisplay amount={150000} type="income" />)
    const el = container.firstChild as HTMLElement
    expect(el.className).toMatch(/text-emerald/)
    expect(screen.getByText(/150\.000/)).toBeInTheDocument()
  })

  it('shows amount in red for expense', () => {
    const { container } = render(<AmountDisplay amount={75000} type="expense" />)
    const el = container.firstChild as HTMLElement
    expect(el.className).toMatch(/text-red/)
    expect(screen.getByText(/75\.000/)).toBeInTheDocument()
  })

  it('shows neutral color for transfer', () => {
    const { container } = render(<AmountDisplay amount={500000} type="transfer" />)
    const el = container.firstChild as HTMLElement
    expect(el.className).toMatch(/text-foreground|text-muted/)
  })

  it('prefixes expense with minus sign', () => {
    render(<AmountDisplay amount={50000} type="expense" />)
    expect(screen.getByText(/−|–|-/)).toBeInTheDocument()
  })

  it('prefixes income with plus sign', () => {
    render(<AmountDisplay amount={50000} type="income" />)
    expect(screen.getByText(/\+/)).toBeInTheDocument()
  })
})

describe('CurrencyDisplay', () => {
  it('formats amount as IDR', () => {
    render(<CurrencyDisplay amount={1500000} />)
    expect(screen.getByText(/Rp/)).toBeInTheDocument()
    expect(screen.getByText(/1\.500\.000/)).toBeInTheDocument()
  })

  it('formats zero correctly', () => {
    render(<CurrencyDisplay amount={0} />)
    expect(screen.getByText(/Rp/)).toBeInTheDocument()
    expect(screen.getByText(/0/)).toBeInTheDocument()
  })
})

describe('EmptyState', () => {
  it('renders title and description', () => {
    render(<EmptyState title="Belum ada transaksi" description="Tambah transaksi pertama kamu" />)
    expect(screen.getByText('Belum ada transaksi')).toBeInTheDocument()
    expect(screen.getByText('Tambah transaksi pertama kamu')).toBeInTheDocument()
  })

  it('renders action button when provided', () => {
    render(
      <EmptyState
        title="Belum ada wallet"
        description="Tambah wallet dulu"
        action={{ label: 'Tambah Wallet', onClick: () => {} }}
      />
    )
    expect(screen.getByRole('button', { name: 'Tambah Wallet' })).toBeInTheDocument()
  })

  it('renders without action button when not provided', () => {
    render(<EmptyState title="Kosong" description="Tidak ada data" />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
