'use client'

import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string }
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html lang="id">
      <body
        style={{
          fontFamily: 'system-ui, -apple-system, sans-serif',
          background: '#ffffff',
          color: '#0f172a',
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.5rem',
        }}
      >
        <div style={{ maxWidth: 360, textAlign: 'center' }}>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>
            Ada yang salah
          </h1>
          <p style={{ fontSize: '0.95rem', color: '#64748b', marginBottom: '1.25rem' }}>
            Sistem mengalami masalah. Tim Monvora sudah mendapat notifikasi.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              background: '#0f172a',
              color: '#ffffff',
              border: 'none',
              padding: '0.625rem 1.25rem',
              borderRadius: '0.5rem',
              fontSize: '0.875rem',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Coba lagi
          </button>
        </div>
      </body>
    </html>
  )
}
