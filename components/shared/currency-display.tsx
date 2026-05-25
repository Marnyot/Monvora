import { formatIDR } from '@/lib/utils/currency'
import { cn } from '@/lib/utils'

interface CurrencyDisplayProps {
  amount: number
  className?: string
}

export function CurrencyDisplay({ amount, className }: CurrencyDisplayProps) {
  return (
    <span className={cn('tabular-nums', className)}>
      {formatIDR(amount)}
    </span>
  )
}
