import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { PlausibleScript } from '@/components/analytics/plausible-script'

describe('PlausibleScript', () => {
  let originalEnv: string | undefined

  beforeEach(() => {
    originalEnv = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN
  })

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN
    } else {
      process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN = originalEnv
    }
  })

  it('renders nothing when domain env var is unset', () => {
    delete process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN
    const { container } = render(<PlausibleScript />)
    expect(container.querySelector('script')).toBeNull()
  })

  it('renders Plausible script when domain env var is set', () => {
    process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN = 'monvora.app'
    const { container } = render(<PlausibleScript />)
    const script = container.querySelector('script')
    expect(script).not.toBeNull()
    expect(script?.getAttribute('data-domain')).toBe('monvora.app')
    expect(script?.getAttribute('src')).toMatch(/plausible\.io/)
  })

  it('does not set any cookies / identifying attributes', () => {
    process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN = 'monvora.app'
    const { container } = render(<PlausibleScript />)
    const script = container.querySelector('script')
    // No user-identifying attrs
    expect(script?.getAttribute('data-user-id')).toBeNull()
    expect(script?.getAttribute('data-uid')).toBeNull()
  })
})

describe('CSP allows Plausible', () => {
  const nextConfig = readFileSync(
    resolve(__dirname, '../../../next.config.mjs'),
    'utf-8'
  )

  it('includes plausible.io in script-src', () => {
    const scriptSrc = nextConfig
      .split('\n')
      .find((l) => l.includes('script-src'))
    expect(scriptSrc).toBeDefined()
    expect(scriptSrc).toContain('plausible.io')
  })

  it('includes plausible.io in connect-src', () => {
    const connectSrc = nextConfig
      .split('\n')
      .find((l) => l.includes('connect-src'))
    expect(connectSrc).toBeDefined()
    expect(connectSrc).toContain('plausible.io')
  })
})
