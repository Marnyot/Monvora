'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Clock, Pencil, Landmark, Banknote, Smartphone, Wallet as WalletIconBase } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { PAYMENT_METHODS } from '@/lib/validations/transaction'
import { formatIDR } from '@/lib/utils/currency'
import { toDatetimeLocalInput } from '@/lib/utils/date'
import { useCategories } from '@/lib/hooks/use-categories'
import { CategoryIconBubble } from '@/components/shared/category-icon'
import { cn } from '@/lib/utils'

const WALLET_TYPE_ICON: Record<string, React.ElementType> = {
  bank: Landmark,
  cash: Banknote,
  ewallet: Smartphone,
  other: WalletIconBase,
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  qris: 'QRIS',
  transfer: 'Transfer',
  cash: 'Tunai',
  debit: 'Debit',
  credit: 'Kartu Kredit',
  ewallet: 'E-Wallet',
  topup: 'Top Up',
  other: 'Lainnya',
}

const WALLET_TYPE_PAYMENT_METHODS: Record<string, string[]> = {
  bank: ['qris', 'transfer', 'debit', 'credit', 'topup'],
  ewallet: ['qris', 'transfer', 'ewallet', 'topup'],
  cash: ['cash'],
  other: ['qris', 'transfer', 'cash', 'debit', 'credit', 'ewallet', 'topup', 'other'],
}

const QUICK_AMOUNTS = [10_000, 25_000, 50_000, 100_000, 200_000, 500_000]

function shortAmount(n: number): string {
  if (n >= 1_000_000) return `${n / 1_000_000}jt`
  if (n >= 1_000) return `${n / 1_000}rb`
  return String(n)
}

interface Category {
  id: string
  name: string
  icon: string
  color: string
  type: string
  is_system: boolean | null
}

interface Wallet {
  id: string
  name: string
  color: string | null
  type?: string
}

interface Transaction {
  id: string
  amount: number
  type: string
  description: string | null
  merchant_name: string | null
  payment_method: string | null
  transacted_at: string
  wallet: Wallet | null
  category: Category | null
}

interface TransactionEditSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  transaction: Transaction
}

export function TransactionEditSheet({
  open,
  onOpenChange,
  transaction,
}: TransactionEditSheetProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [isPending, startTransition] = useTransition()
  const { data: categories = [] } = useCategories()

  const [amountRaw, setAmountRaw] = useState(transaction.amount.toLocaleString('id-ID'))
  const [merchantName, setMerchantName] = useState(transaction.merchant_name ?? '')
  const [description, setDescription] = useState(transaction.description ?? '')
  const [categoryId, setCategoryId] = useState(transaction.category?.id ?? '')
  const [paymentMethod, setPaymentMethod] = useState(transaction.payment_method ?? '')
  const [transactedAt, setTransactedAt] = useState(toDatetimeLocalInput(transaction.transacted_at))
  const [customDate, setCustomDate] = useState(true)
  const [serverError, setServerError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setAmountRaw(transaction.amount.toLocaleString('id-ID'))
      setMerchantName(transaction.merchant_name ?? '')
      setDescription(transaction.description ?? '')
      setCategoryId(transaction.category?.id ?? '')
      setPaymentMethod(transaction.payment_method ?? '')
      setTransactedAt(toDatetimeLocalInput(transaction.transacted_at))
      setCustomDate(true)
      setServerError(null)
    }
  }, [open, transaction])

  const amount = parseInt(amountRaw.replace(/\D/g, ''), 10) || 0
  const filteredCategories = categories.filter(c => c.type === transaction.type)
  const filteredPaymentMethods = (
    transaction.wallet?.type
      ? WALLET_TYPE_PAYMENT_METHODS[transaction.wallet.type] ?? PAYMENT_METHODS
      : PAYMENT_METHODS
  ).filter(m => m !== 'topup' || transaction.type === 'expense')

  const typeColor =
    transaction.type === 'expense'
      ? 'text-red-600 dark:text-red-400'
      : transaction.type === 'income'
      ? 'text-emerald-600 dark:text-emerald-400'
      : 'text-foreground'

  const WalletTypeIcon = transaction.wallet?.type
    ? WALLET_TYPE_ICON[transaction.wallet.type] ?? WalletIconBase
    : WalletIconBase

  function handleAmountInput(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/\D/g, '')
    setAmountRaw(raw ? parseInt(raw, 10).toLocaleString('id-ID') : '')
  }

  function applyQuickAmount(n: number) {
    setAmountRaw(n.toLocaleString('id-ID'))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setServerError(null)

    if (!amount || amount <= 0) {
      setServerError('Jumlah harus lebih dari 0')
      return
    }

    startTransition(async () => {
      const res = await fetch(`/api/transactions/${transaction.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          merchant_name: merchantName.trim() || undefined,
          description: description.trim() || undefined,
          category_id: categoryId || undefined,
          payment_method: paymentMethod || undefined,
          transacted_at: new Date(transactedAt).toISOString(),
        }),
      })

      const json = await res.json().catch(() => null)
      if (!res.ok || json?.error) {
        const msg = json?.error?.message ?? 'Terjadi kesalahan'
        setServerError(msg)
        toast.error(msg)
        return
      }

      toast.success('Transaksi diperbarui')
      onOpenChange(false)
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['transaction'] })
      queryClient.invalidateQueries({ queryKey: ['wallets'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      router.refresh()
    })
  }

  const dateLabel = (() => {
    try {
      const d = new Date(transactedAt)
      return d.toLocaleString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return '—'
    }
  })()

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="h-[92svh] rounded-t-2xl p-0 flex flex-col"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <SheetHeader className="px-5 pt-5 pb-0 text-left">
          <div className="mx-auto -mt-2 h-1 w-10 rounded-full bg-muted-foreground/30 mb-3" aria-hidden />
          <SheetTitle className="text-base">Ubah transaksi</SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          {/* Hero amount */}
          <div className="px-5 pt-4 pb-3 text-center">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">Jumlah</p>
            <div className="flex items-baseline justify-center gap-1.5">
              <span className={`text-xl font-medium ${typeColor}`}>Rp</span>
              <input
                type="text"
                inputMode="numeric"
                placeholder="0"
                value={amountRaw}
                onChange={handleAmountInput}
                aria-label="Jumlah"
                className={`bg-transparent text-5xl font-bold tabular-nums outline-none w-full text-center placeholder:text-muted-foreground/30 ${typeColor}`}
              />
            </div>
            {amount > 0 && (
              <p className="text-xs text-muted-foreground mt-1">{formatIDR(amount)}</p>
            )}
          </div>

          {/* Quick amount chips */}
          <div className="px-5 pb-4">
            <div className="flex gap-1.5 overflow-x-auto -mx-1 px-1 [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
              {QUICK_AMOUNTS.map(n => (
                <button
                  key={n}
                  type="button"
                  onClick={() => applyQuickAmount(n)}
                  className={cn(
                    'shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                    amount === n
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-background text-muted-foreground hover:bg-accent hover:text-foreground',
                  )}
                >
                  {shortAmount(n)}
                </button>
              ))}
            </div>
          </div>

          <ScrollArea className="flex-1 px-5">
            <div className="space-y-5 pb-4">
              {/* Wallet — read-only display (ubah wallet butuh reconciliation balance, belum didukung) */}
              {transaction.wallet && (
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Dompet
                  </Label>
                  <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/30 px-3 py-2.5">
                    <span
                      className="flex h-7 w-7 items-center justify-center rounded-lg shrink-0"
                      style={{ backgroundColor: `${transaction.wallet.color ?? '#6366f1'}20` }}
                    >
                      <WalletTypeIcon className="h-3.5 w-3.5" />
                    </span>
                    <span className="text-sm font-medium text-foreground truncate">{transaction.wallet.name}</span>
                  </div>
                </div>
              )}

              {/* Merchant / Nama */}
              <div className="space-y-1.5">
                <Label
                  htmlFor="edit-merchant"
                  className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                >
                  Nama
                </Label>
                <Input
                  id="edit-merchant"
                  value={merchantName}
                  onChange={e => setMerchantName(e.target.value)}
                  placeholder={
                    transaction.type === 'transfer' ? 'cth: Budi Santoso' :
                    transaction.type === 'income' ? 'cth: PT Maju Jaya, Freelance' :
                    'cth: Indomaret, Grab'
                  }
                />
              </div>

              {/* Category grid — hidden for transfer */}
              {transaction.type !== 'transfer' && (
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Kategori
                  </Label>
                  {filteredCategories.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Belum ada kategori untuk tipe ini.</p>
                  ) : (
                    <div className="grid grid-cols-4 gap-2">
                      {filteredCategories.map(cat => {
                        const selected = categoryId === cat.id
                        return (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => setCategoryId(selected ? '' : cat.id)}
                            className={cn(
                              'flex flex-col items-center gap-1.5 rounded-xl border p-2 transition-all',
                              selected
                                ? 'border-primary bg-primary/5 ring-2 ring-primary/40'
                                : 'border-border bg-background hover:bg-accent',
                            )}
                            aria-pressed={selected}
                          >
                            <CategoryIconBubble icon={cat.icon} color={cat.color} size={18} bubbleSize={36} />
                            <span className="text-[10.5px] font-medium text-foreground text-center leading-tight line-clamp-2">
                              {cat.name}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Payment method chips — hidden for transfer */}
              {transaction.type !== 'transfer' && (
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Metode bayar{' '}
                    <span className="font-normal normal-case tracking-normal">(opsional)</span>
                  </Label>
                  <div className="flex flex-wrap gap-1.5">
                    {filteredPaymentMethods.map(m => {
                      const selected = paymentMethod === m
                      return (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setPaymentMethod(selected ? '' : m)}
                          className={cn(
                            'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                            selected
                              ? 'border-primary bg-primary text-primary-foreground'
                              : 'border-border bg-background text-foreground hover:bg-accent',
                          )}
                          aria-pressed={selected}
                        >
                          {PAYMENT_METHOD_LABELS[m] ?? m}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Date */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Waktu
                </Label>
                {!customDate ? (
                  <button
                    type="button"
                    onClick={() => setCustomDate(true)}
                    className="w-full flex items-center justify-between rounded-xl border border-border bg-background px-3 py-2.5 text-left hover:bg-accent transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted">
                        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                      </span>
                      <span className="text-sm font-medium text-foreground">{dateLabel}</span>
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <Pencil className="h-3 w-3" />
                      Ubah
                    </span>
                  </button>
                ) : (
                  <Input
                    id="edit-date"
                    type="datetime-local"
                    value={transactedAt}
                    onChange={e => setTransactedAt(e.target.value)}
                  />
                )}
              </div>

              {/* Note */}
              <div className="space-y-1.5">
                <Label
                  htmlFor="edit-note"
                  className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                >
                  Catatan{' '}
                  <span className="font-normal normal-case tracking-normal">(opsional)</span>
                </Label>
                <Input
                  id="edit-note"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Catatan tambahan"
                />
              </div>

              {serverError && (
                <p className="text-sm text-destructive">{serverError}</p>
              )}
            </div>
          </ScrollArea>

          <div className="px-5 py-4 border-t bg-background pb-safe">
            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={isPending || !amount}
            >
              {isPending
                ? 'Menyimpan...'
                : amount > 0
                ? `Simpan ${formatIDR(amount)}`
                : 'Simpan Perubahan'}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
