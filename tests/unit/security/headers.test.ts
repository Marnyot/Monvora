import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const nextConfig = readFileSync(
  resolve(__dirname, '../../../next.config.mjs'),
  'utf-8'
)

function csp(): string {
  const cspLines: string[] = []
  let inCspBlock = false
  for (const line of nextConfig.split('\n')) {
    if (line.includes("'Content-Security-Policy'")) {
      inCspBlock = true
      continue
    }
    if (inCspBlock) {
      if (line.includes(']')) break
      cspLines.push(line.trim().replace(/[",]/g, ''))
    }
  }
  return cspLines.join(' ')
}

describe('CSP hardening', () => {
  const policy = csp()

  it('blocks framing via frame-ancestors none (clickjacking)', () => {
    expect(policy).toMatch(/frame-ancestors\s+'none'/)
  })

  it('blocks plugins via object-src none', () => {
    expect(policy).toMatch(/object-src\s+'none'/)
  })

  it('locks base-uri to self (prevents <base> hijack)', () => {
    expect(policy).toMatch(/base-uri\s+'self'/)
  })

  it('locks form-action to self', () => {
    expect(policy).toMatch(/form-action\s+'self'/)
  })

  it('upgrades insecure (http) requests to https', () => {
    expect(policy).toContain('upgrade-insecure-requests')
  })
})

describe('Cross-origin isolation headers', () => {
  it('sets Cross-Origin-Opener-Policy to same-origin-allow-popups (Google OAuth compat)', () => {
    expect(nextConfig).toContain('Cross-Origin-Opener-Policy')
    // same-origin-allow-popups required because Google OAuth opens popup window
    expect(nextConfig).toMatch(/Cross-Origin-Opener-Policy[\s\S]{0,80}same-origin-allow-popups/)
  })

  it('sets Cross-Origin-Resource-Policy to same-site', () => {
    expect(nextConfig).toContain('Cross-Origin-Resource-Policy')
    expect(nextConfig).toMatch(/Cross-Origin-Resource-Policy[\s\S]{0,80}same-site/)
  })
})
