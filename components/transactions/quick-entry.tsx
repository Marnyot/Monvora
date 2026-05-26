'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Landmark, Banknote, Smartphone, Wallet } from 'lucide-react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PAYMENT_METHODS } from '@/lib/validations/transaction'
import { formatIDR } from '@/lib/utils/currency'
import { toDatetimeLocalInput } from '@/lib/utils/date'

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
  other: 'Lainnya',
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
      setServerError(null)
    }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

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

  const filteredCategories = categories.filter(c => c.type === type)
  const amount = parseInt(amountRaw.replace(/\D/g, ''), 10) || 0

  function handleAmountInput(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/\D/g, '')
    setAmountRaw(raw ? parseInt(raw, 10).toLocaleString('id-ID') : '')
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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[92dvh] rounded-t-2xl p-0 flex flex-col">
        <SheetHeader className="px-4 pt-4 pb-0">
          <SheetTitle className="sr-only">Tambah Transaksi</SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          {/* Type tabs */}
          <div className="px-4 pt-2 pb-3">
            <Tabs value={type} onValueChange={v => setType(v as TransactionType)}>
              <TabsList className="w-full">
                <TabsTrigger value="expense" className="flex-1">Pengeluaran</TabsTrigger>
                <TabsTrigger value="income" className="flex-1">Pemasukan</TabsTrigger>
                <TabsTrigger value="transfer" className="flex-1">Transfer</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Amount */}
          <div className="px-4 pb-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">Jumlah</p>
            <div className="flex items-center justify-center gap-1">
              <span className={`text-lg font-medium ${typeColor}`}>Rp</span>
              <input
                type="text"
                inputMode="numeric"
                placeholder="0"
                value={amountRaw}
                onChange={handleAmountInput}
                autoFocus
                className={`bg-transparent text-4xl font-bold tabular-nums outline-none w-full text-center placeholder:text-muted-foreground/40 ${typeColor}`}
              />
            </div>
            {amount > 0 && (
              <p className="text-xs text-muted-foreground mt-1">{formatIDR(amount)}</p>
            )}
          </div>

          <ScrollArea className="flex-1 px-4">
            <div className="space-y-3 pb-4">
              {/* Merchant / Nama */}
              <div className="space-y-1.5">
                <Label htmlFor="qe-merchant">Nama</Label>
                <Input
                  id="qe-merchant"
                  placeholder={merchantPlaceholder}
                  value={merchantName}
                  onChange={e => setMerchantName(e.target.value)}
                />
              </div>

              {/* Category — hidden for transfer (auto-assigned) */}
              {type !== 'transfer' && (
                <div className="space-y-1.5">
                  <Label>Kategori</Label>
                  <ScrollArea className="h-28">
                    <div className="flex flex-wrap gap-2 pb-1">
                      {filteredCategories.map(cat => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setCategoryId(cat.id === categoryId ? '' : cat.id)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                            categoryId === cat.id
                              ? 'text-white border-transparent'
                              : 'text-foreground border-border bg-background hover:bg-accent'
                          }`}
                          style={categoryId === cat.id ? { backgroundColor: cat.color, borderColor: cat.color } : {}}
                        >
                          {cat.name}
                        </button>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}

              {/* Wallet */}
              <div className="space-y-1.5">
                <Label>{type === 'transfer' ? 'Dompet Asal' : 'Dompet'}</Label>
                <Select value={walletId} onValueChange={v => { setWalletId(v); if (toWalletId === v) setToWalletId('') }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih dompet" />
                  </SelectTrigger>
                  <SelectContent>
                    {wallets.map(w => (
                      <SelectItem key={w.id} value={w.id}>
                        <span className="flex items-center gap-2">
                          <WalletIcon type={w.type} className="h-3.5 w-3.5 text-muted-foreground" />
                          {w.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Destination wallet — transfer only */}
              {type === 'transfer' && (
                <div className="space-y-1.5">
                  <Label>Dompet Tujuan</Label>
                  <Select value={toWalletId} onValueChange={setToWalletId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih dompet tujuan" />
                    </SelectTrigger>
                    <SelectContent>
                      {wallets.filter(w => w.id !== walletId).map(w => (
                        <SelectItem key={w.id} value={w.id}>
                          <span className="flex items-center gap-2">
                            <WalletIcon type={w.type} className="h-3.5 w-3.5 text-muted-foreground" />
                            {w.name}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Payment method — hidden for transfer */}
              {type !== 'transfer' && (
                <div className="space-y-1.5">
                  <Label>Metode Bayar <span className="text-muted-foreground">(opsional)</span></Label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih metode" />
                    </SelectTrigger>
                    <SelectContent>
                      {PAYMENT_METHODS.map(m => (
                        <SelectItem key={m} value={m}>{PAYMENT_METHOD_LABELS[m] ?? m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Date */}
              <div className="space-y-1.5">
                <Label htmlFor="qe-date">Tanggal & Waktu</Label>
                <Input
                  id="qe-date"
                  type="datetime-local"
                  value={transactedAt}
                  onChange={e => setTransactedAt(e.target.value)}
                />
              </div>

              {/* Note */}
              <div className="space-y-1.5">
                <Label htmlFor="qe-note">Catatan <span className="text-muted-foreground">(opsional)</span></Label>
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
          <div className="px-4 py-4 border-t bg-background">
            <Button
              type="submit"
              className="w-full"
              disabled={isPending || !amount || !walletId || (type === 'transfer' && !toWalletId)}
            >
              {isPending ? 'Menyimpan...' : 'Simpan Transaksi'}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
