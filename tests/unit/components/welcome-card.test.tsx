import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { WelcomeCard } from '@/components/dashboard/welcome-card'

describe('WelcomeCard', () => {
  it('renders for brand-new user (no wallets, no Gmail, no transactions)', () => {
    render(
      <WelcomeCard
        hasWallets={false}
        gmailEnabled={false}
        hasTransactions={false}
      />
    )
    expect(screen.getByText(/selamat datang/i)).toBeInTheDocument()
  })

  it('returns null once user has at least one transaction', () => {
    const { container } = render(
      <WelcomeCard
        hasWallets={true}
        gmailEnabled={true}
        hasTransactions={true}
      />
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders step "Tambah wallet" as pending when no wallets', () => {
    render(
      <WelcomeCard
        hasWallets={false}
        gmailEnabled={false}
        hasTransactions={false}
      />
    )
    const walletStep = screen.getByText(/tambah.*wallet|tambah.*dompet/i)
    expect(walletStep).toBeInTheDocument()
    // CTA link to /wallets
    const links = screen.getAllByRole('link')
    expect(links.some((a) => a.getAttribute('href') === '/wallets')).toBe(true)
  })

  it('marks wallet step as done when hasWallets', () => {
    render(
      <WelcomeCard
        hasWallets={true}
        gmailEnabled={false}
        hasTransactions={false}
      />
    )
    // Should not link to /wallets when already done
    const links = screen.getAllByRole('link')
    expect(links.every((a) => a.getAttribute('href') !== '/wallets')).toBe(true)
  })

  it('renders step "Hubungkan Gmail" linking to /settings/gmail', () => {
    render(
      <WelcomeCard
        hasWallets={true}
        gmailEnabled={false}
        hasTransactions={false}
      />
    )
    const links = screen.getAllByRole('link')
    expect(
      links.some((a) => a.getAttribute('href') === '/settings/gmail')
    ).toBe(true)
  })

  it('marks Gmail step as done when gmailEnabled', () => {
    render(
      <WelcomeCard
        hasWallets={false}
        gmailEnabled={true}
        hasTransactions={false}
      />
    )
    const links = screen.getAllByRole('link')
    expect(
      links.every((a) => a.getAttribute('href') !== '/settings/gmail')
    ).toBe(true)
  })
})
