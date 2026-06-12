import Link from 'next/link'
import { RotateCw } from 'lucide-react'
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
    is_recurring?: boolean | null
    category: Category | null
    wallet: Wallet | null
  }
}

export function TransactionCard({ transaction }: TransactionCardProps) {
  const { amount, type, merchant_name, description, transacted_at, is_recurring, category, wallet } = transaction

  const label = merchant_name || description || category?.name || 'Transaksi'

  return (
    <Link href={`/transactions/${transaction.id}`} className="flex items-center gap-3 py-3 px-4 hover:bg-accent/40 transition-colors rounded-lg block">
      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate flex items-center gap-1.5">
          <span className="truncate">{label}</span>
          {is_recurring && (
            <span
              className="inline-flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-primary/10 text-primary shrink-0"
              title="Pengeluaran berulang tiap bulan"
            >
              <RotateCw className="h-2.5 w-2.5" aria-hidden />
              Berulang
            </span>
          )}
        </p>
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
