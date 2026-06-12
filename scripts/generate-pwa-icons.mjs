// One-shot icon generator for PWA. Run with: node scripts/generate-pwa-icons.mjs
// Source: app/favicon.ico (1024x1024 PNG)
// Outputs: public/icons/icon-192.png, icon-512.png, icon-maskable-512.png, apple-touch-icon.png
import { createRequire } from 'node:module'
import { mkdirSync } from 'node:fs'
import path from 'node:path'

const require = createRequire(import.meta.url)
const sharp = require('sharp')

const ROOT = path.resolve(import.meta.dirname, '..')
const SRC = path.join(ROOT, 'app/favicon.ico')
const OUT = path.join(ROOT, 'public/icons')
mkdirSync(OUT, { recursive: true })

// Brand bg for maskable safe area (matches manifest background_color when light, theme_color base on dark surfaces)
const BG = { r: 15, g: 23, b: 42, alpha: 1 } // #0f172a

async function plain(size, name) {
  await sharp(SRC).resize(size, size, { fit: 'contain' }).png().toFile(path.join(OUT, name))
}

async function maskable(size, name) {
  // Maskable safe zone: 80% inner circle. We pad the icon to ~70% of canvas on solid brand bg.
  const inner = Math.round(size * 0.7)
  const icon = await sharp(SRC).resize(inner, inner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer()
  await sharp({ create: { width: size, height: size, channels: 4, background: BG } })
    .composite([{ input: icon, gravity: 'center' }])
    .png()
    .toFile(path.join(OUT, name))
}

await plain(192, 'icon-192.png')
await plain(512, 'icon-512.png')
await plain(180, 'apple-touch-icon.png')
await maskable(512, 'icon-maskable-512.png')

console.log('Generated:', ['icon-192.png', 'icon-512.png', 'apple-touch-icon.png', 'icon-maskable-512.png'].join(', '))
