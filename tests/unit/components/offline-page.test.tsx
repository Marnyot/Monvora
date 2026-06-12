import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import OfflinePage from '@/app/~offline/page'

describe('Offline fallback page', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('shows Bahasa Indonesia offline heading', () => {
    render(<OfflinePage />)
    expect(screen.getByText(/tidak ada koneksi/i)).toBeInTheDocument()
  })

  it('explains that financial data needs an internet connection', () => {
    render(<OfflinePage />)
    expect(screen.getByText(/butuh internet/i)).toBeInTheDocument()
  })

  it('reloads when the retry button is pressed', async () => {
    const reload = vi.fn()
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, reload },
    })

    const user = userEvent.setup()
    render(<OfflinePage />)
    await user.click(screen.getByRole('button', { name: /coba lagi/i }))
    expect(reload).toHaveBeenCalled()
  })
})
