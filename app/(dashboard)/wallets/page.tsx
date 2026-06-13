'use client'

import { useWallets } from '@/lib/hooks/use-wallets'
import { WalletListClient } from '@/components/dashboard/wallet-list-client'
import { SkeletonList } from '@/components/shared/skeleton-card'
import { DecorativeBlobs } from '@/components/shared/decorative-blobs'

export default function WalletsPage() {
  const { data: wallets, isLoading, sessionLoading } = useWallets()

  if (isLoading || sessionLoading) {
    return (
      <div className="max-w-lg lg:max-w-2xl mx-auto px-4 py-6 space-y-4 relative">
        <DecorativeBlobs />
        <div className="rounded-2xl bg-gradient-to-br from-primary via-primary/90 to-emerald-600/80 p-5 text-primary-foreground">
          <div className="h-5 w-24 bg-white/20 rounded animate-pulse mb-2" />
          <div className="h-3 w-40 bg-white/20 rounded animate-pulse" />
        </div>
        <SkeletonList count={4} />
      </div>
    )
  }

  return (
    <div className="max-w-lg lg:max-w-2xl mx-auto px-4 py-6 relative">
      <DecorativeBlobs />
      <WalletListClient wallets={wallets ?? []} />
    </div>
  )
}
