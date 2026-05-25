import { formatIDR } from '@/lib/utils/currency'
import { cn } from '@/lib/utils'

type TransactionType = 'income' | 'expense' | 'transfer'

interface AmountDisplayProps {
  amount: number
  type: TransactionType
  className?: string
}

const PREFIX: Record<TransactionType, string> = {
  income: '+',
  expense: '−',
  transfer: '',
}

const COLOR: Record<TransactionType, string> = {
  income: 'text-emerald-600 dark:text-emerald-400',
  expense: 'text-red-600 dark:text-red-400',
  transfer: 'text-foreground',
}

export function AmountDisplay({ amount, type, className }: AmountDisplayProps) {
  return (
    <span className={cn('font-medium tabular-nums', COLOR[type], className)}>
      {PREFIX[type]}{formatIDR(amount)}
    </span>
  )
}
