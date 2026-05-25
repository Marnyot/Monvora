import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { WalletListClient } from '@/components/dashboard/wallet-list-client'

export const metadata = { title: 'Dompet — Monvora' }

export default async function WalletsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: wallets } = await supabase
    .from('wallets')
    .select('id, name, type, provider, balance, color, icon, is_active, created_at, updated_at')
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .order('created_at', { ascending: true })

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <WalletListClient wallets={wallets ?? []} />
    </div>
  )
}
