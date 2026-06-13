import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import * as instrumentation from '@/instrumentation'

describe('Sentry instrumentation', () => {
  it('exports register as a function', () => {
    expect(typeof instrumentation.register).toBe('function')
  })

  it('exports onRequestError for App Router error capture', () => {
    expect(typeof instrumentation.onRequestError).toBe('function')
  })
})

describe('CSP allows Sentry ingest', () => {
  const nextConfig = readFileSync(
    resolve(__dirname, '../../../next.config.mjs'),
    'utf-8'
  )

  it('includes sentry.io in connect-src', () => {
    const cspLine = nextConfig
      .split('\n')
      .find((l) => l.includes('connect-src'))
    expect(cspLine).toBeDefined()
    expect(cspLine).toContain('sentry.io')
  })
})
