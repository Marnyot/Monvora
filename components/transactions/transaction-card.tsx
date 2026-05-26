import Link from 'next/link'
import { AmountDisplay } from '@/components/shared/amount-display'
import { formatDate } from '@/lib/utils/date'

interface Category {
  id: string
  name: string
  icon: string
  color: string
}

interface Wallet {
  id: string
  name: string
  color: string | null
}

interface TransactionCardProps {
  transaction: {
    id: string
    amount: number
    type: string
    description: string | null
    merchant_name: string | null
    payment_method: string | null
    transacted_at: string
    category: Category | null
    wallet: Wallet | null
  }
}

export function TransactionCard({ transaction }: TransactionCardProps) {
  const { amount, type, merchant_name, description, transacted_at, category, wallet } = transaction

  const label = merchant_name || description || category?.name || 'Transaksi'

  return (
    <Link href={`/transactions/${transaction.id}`} className="flex items-center gap-3 py-3 px-4 hover:bg-accent/40 transition-colors rounded-lg block">
      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{label}</p>
        <p className="text-xs text-muted-foreground">
          {formatDate(transacted_at)}
          {wallet && ` · ${wallet.name}`}
        </p>
      </div>

      {/* Amount */}
      <AmountDisplay
        amount={amount}
        type={type as 'expense' | 'income' | 'transfer'}
        className="text-sm"
      />
    </Link>
  )
}
