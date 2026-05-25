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
    <div className="flex items-center gap-3 py-3 px-4 hover:bg-accent/40 transition-colors rounded-lg">
      {/* Category color dot */}
      <div
        className="h-9 w-9 rounded-full flex items-center justify-center shrink-0 text-sm"
        style={{
          backgroundColor: category ? `${category.color}20` : '#94a3b820',
          color: category?.color ?? '#94a3b8',
        }}
      >
        {category?.icon ? (
          <span className="text-base">{category.icon.slice(0, 1)}</span>
        ) : (
          <span className="text-xs font-bold">{label.slice(0, 1).toUpperCase()}</span>
        )}
      </div>

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
    </div>
  )
}
