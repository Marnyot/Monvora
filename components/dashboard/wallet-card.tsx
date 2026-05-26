'use client'

import { Pencil, Trash2, MoreVertical, Banknote, SlidersHorizontal } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { CurrencyDisplay } from '@/components/shared/currency-display'
import { cn } from '@/lib/utils'

const TYPE_LABELS: Record<string, string> = {
  bank: 'Bank',
  ewallet: 'E-Wallet',
  cash: 'Tunai',
  other: 'Lainnya',
}

interface Wallet {
  id: string
  name: string
  type: string
  provider: string | null
  balance: number | null
  color: string | null
  icon: string | null
  is_active: boolean | null
  created_at: string | null
  updated_at: string | null
}

interface WalletCardProps {
  wallet: Wallet
  onEdit: (wallet: Wallet) => void
  onDelete: (wallet: Wallet) => void
  onAdjustBalance: (wallet: Wallet) => void
}

export function WalletCard({ wallet, onEdit, onDelete, onAdjustBalance }: WalletCardProps) {
  const balance = wallet.balance ?? 0
  const color = wallet.color ?? '#6366f1'

  return (
    <div className="flex items-center gap-4 rounded-xl border bg-card p-4">
      {/* Color indicator */}
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
        style={{ backgroundColor: `${color}20` }}
      >
        <Banknote className="h-5 w-5" style={{ color }} aria-hidden />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium text-foreground truncate">{wallet.name}</p>
          {!wallet.is_active && (
            <Badge variant="secondary" className="text-xs shrink-0">Arsip</Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {TYPE_LABELS[wallet.type] ?? wallet.type}
          {wallet.provider && ` · ${wallet.provider}`}
        </p>
      </div>

      {/* Balance */}
      <div className="text-right shrink-0">
        <CurrencyDisplay
          amount={balance}
          className={cn('text-sm font-semibold', balance < 0 ? 'text-red-600 dark:text-red-400' : 'text-foreground')}
        />
      </div>

      {/* Actions */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8" aria-label="Menu wallet">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onEdit(wallet)}>
            <Pencil className="mr-2 h-4 w-4" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onAdjustBalance(wallet)}>
            <SlidersHorizontal className="mr-2 h-4 w-4" />
            Sesuaikan Saldo
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => onDelete(wallet)}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Hapus
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
