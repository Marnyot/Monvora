import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,

  // Sampling minimal — hanya error, bukan performance traces
  tracesSampleRate: 0,

  // Aktif hanya jika DSN tersedia
  enabled: !!process.env.SENTRY_DSN,

  // Strip semua data sensitif sebelum dikirim ke Sentry
  beforeSend(event) {
    // Hapus seluruh request payload (bisa mengandung data transaksi)
    delete event.request?.data
    delete event.request?.cookies
    delete event.request?.headers

    // Strip user info — hanya kirim ID
    if (event.user) {
      event.user = { id: event.user.id }
    }

    return event
  },
})
