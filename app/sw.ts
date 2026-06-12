/// <reference no-default-lib="true" />
/// <reference lib="esnext" />
/// <reference lib="webworker" />
import type { PrecacheEntry, RuntimeCaching, SerwistGlobalConfig } from 'serwist'
import { CacheFirst, NetworkFirst, NetworkOnly, Serwist } from 'serwist'

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined
  }
}

declare const self: ServiceWorkerGlobalScope

// Monvora is a finance app. Sensitive endpoints MUST never be cached.
// HTML uses network-first with an offline fallback page; static assets
// are cache-first. Everything else falls back to network-only.
const runtimeCaching: RuntimeCaching[] = [
  // Sensitive: never cache, never fallback
  {
    matcher: ({ url }) => url.pathname.startsWith('/api/') || url.pathname.startsWith('/auth/'),
    handler: new NetworkOnly(),
  },
  // Immutable hashed Next.js assets
  {
    matcher: ({ url }) => url.pathname.startsWith('/_next/static/'),
    handler: new CacheFirst({ cacheName: 'next-static' }),
  },
  // Static icons + manifest assets
  {
    matcher: ({ url }) => url.pathname.startsWith('/icons/') || url.pathname === '/favicon.ico',
    handler: new CacheFirst({ cacheName: 'static-assets' }),
  },
  // Same-origin images (Next.js image optimization served at /_next/image)
  {
    matcher: ({ request, url, sameOrigin }) =>
      sameOrigin && (request.destination === 'image' || url.pathname.startsWith('/_next/image')),
    handler: new CacheFirst({ cacheName: 'images' }),
  },
  // Page navigations: try network first, fall back to /~offline if offline
  {
    matcher: ({ request }) => request.mode === 'navigate',
    handler: new NetworkFirst({
      cacheName: 'pages',
      networkTimeoutSeconds: 4,
    }),
  },
]

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  precacheOptions: {
    cleanupOutdatedCaches: true,
  },
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching,
  fallbacks: {
    entries: [
      {
        url: '/~offline',
        matcher: ({ request }) => request.destination === 'document',
      },
    ],
  },
})

serwist.addEventListeners()
