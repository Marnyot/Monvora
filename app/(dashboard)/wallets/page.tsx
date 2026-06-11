'use client'

import { useWallets } from '@/lib/hooks/use-wallets'
import { WalletListClient } from '@/components/dashboard/wallet-list-client'
import { SkeletonList } from '@/components/shared/skeleton-card'
import { Skeleton } from '@/components/ui/skeleton'

export default function WalletsPage() {
  const { data: wallets, isLoading, sessionLoading } = useWallets()

  if (isLoading || sessionLoading) {
    return (
      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        <Skeleton className="h-9 w-24" />
        <SkeletonList count={4} />
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <WalletListClient wallets={wallets ?? []} />
    </div>
  )
}
