import { describe, it, expect } from 'vitest'
import manifest from '@/app/manifest'

describe('PWA manifest', () => {
  const m = manifest()

  it('has Monvora brand identity', () => {
    expect(m.name).toBe('Monvora')
    expect(m.short_name).toBe('Monvora')
    expect(m.lang).toBe('id')
  })

  it('runs as standalone PWA starting at /dashboard', () => {
    expect(m.display).toBe('standalone')
    expect(m.start_url).toBe('/dashboard')
    expect(m.scope).toBe('/')
  })

  it('uses brand theme + white background', () => {
    expect(m.theme_color).toBe('#0f172a')
    expect(m.background_color).toBe('#ffffff')
  })

  it('declares 192, 512, and maskable icons', () => {
    const icons = m.icons ?? []
    const sizes = icons.map((i) => i.sizes)
    expect(sizes).toContain('192x192')
    expect(sizes).toContain('512x512')
    const maskable = icons.find((i) => i.purpose === 'maskable')
    expect(maskable).toBeDefined()
    expect(maskable?.sizes).toBe('512x512')
  })

  it('describes the app in Bahasa Indonesia', () => {
    expect(m.description).toBeDefined()
    expect(m.description!.length).toBeGreaterThan(10)
  })
})
