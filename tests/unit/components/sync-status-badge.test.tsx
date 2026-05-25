import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SyncStatusBadge } from '@/components/dashboard/sync-status-badge'

describe('SyncStatusBadge', () => {
  it('menampilkan "Tersinkron" saat gmail aktif dan lastSyncedAt tersedia', () => {
    // Gunakan waktu yang sangat baru agar relative time = "baru saja"
    const recentTime = new Date(Date.now() - 30 * 1000).toISOString()
    render(<SyncStatusBadge gmailSyncEnabled={true} lastSyncedAt={recentTime} />)
    expect(screen.getByText(/Tersinkron/)).toBeInTheDocument()
  })

  it('menampilkan waktu relatif saat gmail aktif dan lastSyncedAt tersedia', () => {
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString()
    render(<SyncStatusBadge gmailSyncEnabled={true} lastSyncedAt={twoMinutesAgo} />)
    expect(screen.getByText(/2 menit lalu/)).toBeInTheDocument()
  })

  it('menampilkan "Menunggu sync" saat gmail aktif tapi belum pernah sync', () => {
    render(<SyncStatusBadge gmailSyncEnabled={true} lastSyncedAt={null} />)
    expect(screen.getByText('Menunggu sync')).toBeInTheDocument()
  })

  it('menampilkan "Gmail tidak terhubung" saat gmail tidak aktif', () => {
    render(<SyncStatusBadge gmailSyncEnabled={false} lastSyncedAt={null} />)
    expect(screen.getByText('Gmail tidak terhubung')).toBeInTheDocument()
  })

  it('tidak menampilkan "Tersinkron" saat gmail tidak aktif', () => {
    render(<SyncStatusBadge gmailSyncEnabled={false} lastSyncedAt="2026-01-01T00:00:00Z" />)
    expect(screen.queryByText(/Tersinkron/)).not.toBeInTheDocument()
    expect(screen.getByText('Gmail tidak terhubung')).toBeInTheDocument()
  })
})
