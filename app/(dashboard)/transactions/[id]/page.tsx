import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { TransactionDetailClient } from '@/components/transactions/transaction-detail-client'

export const metadata = { title: 'Detail Transaksi — Monvora' }

interface Props {
  params: Promise<{ id: string }>
}

export default async function TransactionDetailPage({ params }: Props) {
  const supabase = await createClient()
  const { id } = await params

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  const [{ data: transaction }, { data: wallets }, { data: categories }] = await Promise.all([
    supabase
      .from('transactions')
      .select(`
        id, amount, type, description, merchant_name, payment_method,
        source, is_verified, transacted_at, created_at,
        wallet:wallets!wallet_id(id, name, color),
        category:categories(id, name, icon, color)
      `)
      .eq('id', id)
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .single(),
    supabase
      .from('wallets')
      .select('id, name, color')
      .eq('user_id', user.id)
      .is('deleted_at', null),
    supabase
      .from('categories')
      .select('id, name, icon, color, type, is_system')
      .is('deleted_at', null)
      .or(`user_id.eq.${user.id},user_id.is.null`),
  ])

  if (!transaction) notFound()

  return (
    <TransactionDetailClient
      transaction={transaction as any}
      wallets={wallets ?? []}
      categories={categories ?? []}
    />
  )
}
