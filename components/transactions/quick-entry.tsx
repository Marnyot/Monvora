'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Landmark, Banknote, Smartphone, Wallet, Check, Clock, Pencil } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { PAYMENT_METHODS } from '@/lib/validations/transaction'
import { formatIDR } from '@/lib/utils/currency'
import { toDatetimeLocalInput } from '@/lib/utils/date'
import { OcrUpload, type OcrResult } from '@/components/transactions/ocr-upload'
import { CategoryIconBubble } from '@/components/shared/category-icon'
import { cn } from '@/lib/utils'

const WALLET_TYPE_ICON: Record<string, React.ElementType> = {
  bank: Landmark,
  cash: Banknote,
  ewallet: Smartphone,
  other: Wallet,
}

function WalletIcon({ type, className }: { type: string; className?: string }) {
  const Icon = WALLET_TYPE_ICON[type] ?? Wallet
  return <Icon className={className} />
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

type TransactionType = 'expense' | 'income' | 'transfer'

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
  type: string
}

interface QuickEntryProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  wallets: Wallet[]
  categories: Category[]
}

export function QuickEntry({ open, onOpenChange, wallets, categories }: QuickEntryProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [isPending, setIsPending] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const [type, setType] = useState<TransactionType>('expense')
  const [amountRaw, setAmountRaw] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [walletId, setWalletId] = useState(wallets[0]?.id ?? '')
  const [toWalletId, setToWalletId] = useState('')
  const [description, setDescription] = useState('')
  const [merchantName, setMerchantName] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<string>('')
  const [transactedAt, setTransactedAt] = useState(() => toDatetimeLocalInput(new Date()))
  const [customDate, setCustomDate] = useState(false)
  const [usedOcr, setUsedOcr] = useState(false)

  // Reset all fields when sheet opens
  useEffect(() => {
    if (open) {
      setType('expense')
      setAmountRaw('')
      setCategoryId('')
      setWalletId(wallets[0]?.id ?? '')
      setToWalletId('')
      setDescription('')
      setMerchantName('')
      setPaymentMethod('')
      setTransactedAt(toDatetimeLocalInput(new Date()))
      setCustomDate(false)
      setUsedOcr(false)
      setServerError(null)
    }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleOcrResult(r: OcrResult) {
    setUsedOcr(true)
    setAmountRaw(r.amount.toLocaleString('id-ID'))
    if (r.merchantName) setMerchantName(r.merchantName)
    if (r.description) setDescription(r.description)
    if (r.transactedAt) {
      setTransactedAt(toDatetimeLocalInput(new Date(r.transactedAt)))
      setCustomDate(true)
    }
    if (r.paymentMethod) setPaymentMethod(r.paymentMethod)
    if (r.categoryId) setCategoryId(r.categoryId)
  }

  // When type changes: reset fields and auto-configure transfer mode
  useEffect(() => {
    setToWalletId('')
    if (type === 'transfer') {
      setPaymentMethod('transfer')
      const transferCat = categories.find(c => c.type === 'transfer')
      if (transferCat) setCategoryId(transferCat.id)
      else setCategoryId('')
    } else {
      setCategoryId('')
      setPaymentMethod('')
    }
  }, [type]) // eslint-disable-line react-hooks/exhaustive-deps

  const selectedWallet = wallets.find(w => w.id === walletId)
  const filteredPaymentMethods = (
    selectedWallet
      ? WALLET_TYPE_PAYMENT_METHODS[selectedWallet.type] ?? PAYMENT_METHODS
      : PAYMENT_METHODS
  ).filter(m => m !== 'topup' || type === 'expense') // Top Up hanya untuk pengeluaran
  const filteredCategories = categories.filter(c => c.type === type)
  const amount = parseInt(amountRaw.replace(/\D/g, ''), 10) || 0
  const transferWallets = wallets.filter(w => w.id !== walletId)

  function handleAmountInput(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/\D/g, '')
    setAmountRaw(raw ? parseInt(raw, 10).toLocaleString('id-ID') : '')
  }

  function applyQuickAmount(n: number) {
    setAmountRaw(n.toLocaleString('id-ID'))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setServerError(null)

    if (!amount || amount <= 0) return
    if (!walletId) return

    const transactedAtISO = new Date(transactedAt).toISOString()
    setIsPending(true)

    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet_id: walletId,
          to_wallet_id: type === 'transfer' ? toWalletId : undefined,
          category_id: categoryId || undefined,
          amount,
          type,
          description: description || undefined,
          merchant_name: merchantName || undefined,
          payment_method: paymentMethod || undefined,
          transacted_at: transactedAtISO,
          source: usedOcr ? 'ocr' : 'manual',
        }),
      })

      const json = await res.json()
      if (!res.ok || json.error) {
        toast.error(json.error?.message ?? 'Terjadi kesalahan')
        setServerError(json.error?.message ?? 'Terjadi kesalahan')
        return
      }

      toast.success('Transaksi berhasil disimpan')
      onOpenChange(false)
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      router.refresh()
    } finally {
      setIsPending(false)
    }
  }

  const typeColor = {
    expense: 'text-red-600 dark:text-red-400',
    income: 'text-emerald-600 dark:text-emerald-400',
    transfer: 'text-foreground',
  }[type]

  const merchantPlaceholder =
    type === 'transfer' ? 'cth: Budi Santoso' :
    type === 'income' ? 'cth: PT Maju Jaya, Freelance' :
    'cth: Indomaret, Grab'

  const dateLabel = (() => {
    try {
      const d = new Date(transactedAt)
      const now = new Date()
      const sameDay =
        d.getFullYear() === now.getFullYear() &&
        d.getMonth() === now.getMonth() &&
        d.getDate() === now.getDate()
      if (!customDate && sameDay) return 'Sekarang'
      return d.toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
    } catch {
      return 'Sekarang'
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
          {/* Drag handle */}
          <div className="mx-auto -mt-2 h-1 w-10 rounded-full bg-muted-foreground/30 mb-3" aria-hidden />
          <SheetTitle className="text-base">Catat transaksi</SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          {/* Type tabs */}
          <div className="px-5 pt-3 pb-2">
            <Tabs value={type} onValueChange={v => setType(v as TransactionType)}>
              <TabsList className="w-full">
                <TabsTrigger value="expense" className="flex-1">Pengeluaran</TabsTrigger>
                <TabsTrigger value="income" className="flex-1">Pemasukan</TabsTrigger>
                <TabsTrigger value="transfer" className="flex-1">Transfer</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

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
              {/* OCR — expense only */}
              {type === 'expense' && (
                <OcrUpload onApply={handleOcrResult} />
              )}

              {/* Merchant / Nama */}
              <div className="space-y-1.5">
                <Label htmlFor="qe-merchant" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Nama
                </Label>
                <Input
                  id="qe-merchant"
                  placeholder={merchantPlaceholder}
                  value={merchantName}
                  onChange={e => setMerchantName(e.target.value)}
                />
              </div>

              {/* Category grid — hidden for transfer */}
              {type !== 'transfer' && (
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

              {/* Wallet — horizontal cards */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {type === 'transfer' ? 'Dompet Asal' : 'Dompet'}
                </Label>
                {wallets.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Belum ada dompet. Tambah dulu di menu Dompet.</p>
                ) : (
                  <div className="flex gap-2 overflow-x-auto -mx-1 px-1 pb-1 [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
                    {wallets.map(w => {
                      const selected = walletId === w.id
                      return (
                        <button
                          key={w.id}
                          type="button"
                          onClick={() => {
                            setWalletId(w.id)
                            if (toWalletId === w.id) setToWalletId('')
                            const allowed = WALLET_TYPE_PAYMENT_METHODS[w.type] ?? PAYMENT_METHODS
                            if (paymentMethod && !allowed.includes(paymentMethod as typeof PAYMENT_METHODS[number])) {
                              setPaymentMethod('')
                            }
                          }}
                          className={cn(
                            'relative shrink-0 flex items-center gap-2 rounded-xl border px-3 py-2.5 transition-all min-w-[7.5rem]',
                            selected
                              ? 'border-primary bg-primary/5 ring-2 ring-primary/40'
                              : 'border-border bg-background hover:bg-accent',
                          )}
                          aria-pressed={selected}
                        >
                          <span
                            className="flex h-7 w-7 items-center justify-center rounded-lg shrink-0"
                            style={{ backgroundColor: `${w.color ?? '#6366f1'}20` }}
                          >
                            <WalletIcon type={w.type} className="h-3.5 w-3.5" />
                          </span>
                          <span className="text-xs font-medium text-foreground truncate text-left">{w.name}</span>
                          {selected && (
                            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
                              <Check className="h-2.5 w-2.5" strokeWidth={3} />
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Destination wallet — transfer only */}
              {type === 'transfer' && (
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Dompet Tujuan
                  </Label>
                  {transferWallets.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Tambah dompet lain dulu biar bisa transfer.</p>
                  ) : (
                    <div className="flex gap-2 overflow-x-auto -mx-1 px-1 pb-1 [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
                      {transferWallets.map(w => {
                        const selected = toWalletId === w.id
                        return (
                          <button
                            key={w.id}
                            type="button"
                            onClick={() => setToWalletId(w.id)}
                            className={cn(
                              'relative shrink-0 flex items-center gap-2 rounded-xl border px-3 py-2.5 transition-all min-w-[7.5rem]',
                              selected
                                ? 'border-primary bg-primary/5 ring-2 ring-primary/40'
                                : 'border-border bg-background hover:bg-accent',
                            )}
                            aria-pressed={selected}
                          >
                            <span
                              className="flex h-7 w-7 items-center justify-center rounded-lg shrink-0"
                              style={{ backgroundColor: `${w.color ?? '#6366f1'}20` }}
                            >
                              <WalletIcon type={w.type} className="h-3.5 w-3.5" />
                            </span>
                            <span className="text-xs font-medium text-foreground truncate text-left">{w.name}</span>
                            {selected && (
                              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
                                <Check className="h-2.5 w-2.5" strokeWidth={3} />
                              </span>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Payment method chips — hidden for transfer */}
              {type !== 'transfer' && (
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Metode bayar <span className="font-normal normal-case tracking-normal">(opsional)</span>
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

              {/* Date — default "Sekarang", reveal input on demand */}
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
                  <div className="space-y-1.5">
                    <Input
                      id="qe-date"
                      type="datetime-local"
                      value={transactedAt}
                      onChange={e => setTransactedAt(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setTransactedAt(toDatetimeLocalInput(new Date()))
                        setCustomDate(false)
                      }}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Pakai waktu sekarang
                    </button>
                  </div>
                )}
              </div>

              {/* Note */}
              <div className="space-y-1.5">
                <Label htmlFor="qe-note" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Catatan <span className="font-normal normal-case tracking-normal">(opsional)</span>
                </Label>
                <Input
                  id="qe-note"
                  placeholder="Catatan tambahan"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                />
              </div>

              {serverError && (
                <p className="text-sm text-destructive">{serverError}</p>
              )}
            </div>
          </ScrollArea>

          {/* Submit */}
          <div className="px-5 py-4 border-t bg-background pb-safe">
            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={isPending || !amount || !walletId || (type === 'transfer' && !toWalletId)}
            >
              {isPending
                ? 'Menyimpan...'
                : amount > 0
                ? `Simpan ${formatIDR(amount)}`
                : 'Simpan Transaksi'}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
