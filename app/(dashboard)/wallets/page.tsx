'use client'

import { useWallets } from '@/lib/hooks/use-wallets'
import { WalletListClient } from '@/components/dashboard/wallet-list-client'
import { SkeletonList } from '@/components/shared/skeleton-card'

export default function WalletsPage() {
  const { data: wallets, isLoading, sessionLoading } = useWallets()

  if (isLoading || sessionLoading) {
    return (
      <div className="max-w-lg lg:max-w-2xl mx-auto px-4 py-6 space-y-4">
        <div className="space-y-1.5">
          <div className="h-6 w-24 bg-muted rounded animate-pulse" />
          <div className="h-3 w-40 bg-muted rounded animate-pulse" />
        </div>
        <SkeletonList count={4} />
      </div>
    )
  }

  return (
    <div className="max-w-lg lg:max-w-2xl mx-auto px-4 py-6">
      <WalletListClient wallets={wallets ?? []} />
    </div>
  )
}
