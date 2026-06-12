'use client'

import { WifiOff } from 'lucide-react'
import { EmptyState } from '@/components/shared/empty-state'

export default function OfflinePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background">
      <EmptyState
        icon={<WifiOff className="h-12 w-12" aria-hidden="true" />}
        title="Tidak ada koneksi internet"
        description="Monvora butuh internet untuk menampilkan data keuanganmu. Cek koneksi lalu coba lagi."
        action={{
          label: 'Coba lagi',
          onClick: () => window.location.reload(),
        }}
      />
    </main>
  )
}
