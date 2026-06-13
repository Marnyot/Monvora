import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { LandingContent } from '@/components/landing/landing-content'

describe('LandingContent', () => {
  it('shows brand hero with Monvora name', () => {
    render(<LandingContent />)
    expect(
      screen.getAllByText(/monvora/i).length
    ).toBeGreaterThan(0)
  })

  it('has tagline-level h1 in Bahasa Indonesia', () => {
    render(<LandingContent />)
    const h1 = screen.getByRole('heading', { level: 1 })
    expect(h1.textContent).toMatch(/uang|keuangan|finansial/i)
  })

  it('explains Gmail auto-sync', () => {
    render(<LandingContent />)
    const body = document.body.textContent ?? ''
    expect(body).toMatch(/gmail/i)
    expect(body).toMatch(/otomatis|auto/i)
  })

  it('mentions OCR / struk scan', () => {
    render(<LandingContent />)
    const body = document.body.textContent ?? ''
    expect(body).toMatch(/struk|ocr|foto/i)
  })

  it('mentions AI insights or analytics', () => {
    render(<LandingContent />)
    const body = document.body.textContent ?? ''
    expect(body).toMatch(/insight|analitik|wawasan|analytics/i)
  })

  it('has primary CTA linking to /login', () => {
    render(<LandingContent />)
    const links = screen.getAllByRole('link')
    const loginLink = links.find((a) => a.getAttribute('href') === '/login')
    expect(loginLink).toBeDefined()
  })

  it('links to /privacy and /gmail-permissions for trust', () => {
    render(<LandingContent />)
    const links = screen.getAllByRole('link')
    const hrefs = links.map((a) => a.getAttribute('href'))
    expect(hrefs).toContain('/privacy')
    expect(hrefs).toContain('/gmail-permissions')
  })

  it('emphasises being free during MVP', () => {
    render(<LandingContent />)
    const body = document.body.textContent ?? ''
    expect(body).toMatch(/gratis|free|tanpa biaya/i)
  })
})
