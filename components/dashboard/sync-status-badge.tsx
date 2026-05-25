'use client'

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface SyncStatusBadgeProps {
  gmailSyncEnabled: boolean
  lastSyncedAt: string | null
}

function getRelativeTime(isoString: string): string {
  const now = Date.now()
  const then = new Date(isoString).getTime()
  const diffSeconds = Math.floor((now - then) / 1000)

  if (diffSeconds < 60) return 'baru saja'
  const diffMinutes = Math.floor(diffSeconds / 60)
  if (diffMinutes < 60) return `${diffMinutes} menit lalu`
  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours} jam lalu`
  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays} hari lalu`
}

export function SyncStatusBadge({ gmailSyncEnabled, lastSyncedAt }: SyncStatusBadgeProps) {
  if (!gmailSyncEnabled) {
    return (
      <Badge
        variant="outline"
        className={cn(
          'text-muted-foreground border-muted-foreground/30',
          'bg-muted/40'
        )}
      >
        Gmail tidak terhubung
      </Badge>
    )
  }

  if (!lastSyncedAt) {
    return (
      <Badge
        variant="outline"
        className={cn(
          'text-yellow-600 dark:text-yellow-400',
          'border-yellow-500/40 bg-yellow-50 dark:bg-yellow-950/30'
        )}
      >
        Menunggu sync
      </Badge>
    )
  }

  return (
    <Badge
      variant="outline"
      className={cn(
        'text-emerald-600 dark:text-emerald-400',
        'border-emerald-500/40 bg-emerald-50 dark:bg-emerald-950/30'
      )}
    >
      Tersinkron · {getRelativeTime(lastSyncedAt)}
    </Badge>
  )
}
