'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ArrowLeft, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AmountDisplay } from '@/components/shared/amount-display'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { DecorativeBlobs } from '@/components/shared/decorative-blobs'
import { TransactionEditSheet } from '@/components/transactions/transaction-edit-sheet'
import { formatDate } from '@/lib/utils/date'

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

const TYPE_LABELS: Record<string, string> = {
  expense: 'Pengeluaran',
  income: 'Pemasukan',
  transfer: 'Transfer',
}

const SOURCE_LABELS: Record<string, string> = {
  manual: 'Input Manual',
  gmail: 'Gmail Auto-Sync',
  ocr: 'Scan Screenshot',
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
}

interface Transaction {
  id: string
  amount: number
  type: string
  description: string | null
  merchant_name: string | null
  payment_method: string | null
  source: string
  is_verified: boolean | null
  transacted_at: string
  created_at: string
  wallet: Wallet | null
  category: Category | null
}

interface Props {
  transaction: Transaction
}

export function TransactionDetailClient({ transaction }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const label = transaction.merchant_name || transaction.description || transaction.category?.name || 'Transaksi'

  function handleDelete() {
    startTransition(async () => {
      const res = await fetch(`/api/transactions/${transaction.id}`, { method: 'DELETE' })
      if (!res.ok) {
        toast.error('Gagal menghapus transaksi')
        return
      }
      toast.success('Transaksi dihapus')
      router.push('/transactions')
      router.refresh()
    })
  }

  return (
    <div className="max-w-lg mx-auto relative">
      <DecorativeBlobs />

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()} aria-label="Kembali">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-semibold flex-1">Detail Transaksi</h1>
        <Button variant="ghost" size="icon" onClick={() => setEditOpen(true)} aria-label="Ubah">
          <Pencil className="h-5 w-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setDeleteOpen(true)}
          className="text-destructive hover:text-destructive"
          aria-label="Hapus"
        >
          <Trash2 className="h-5 w-5" />
        </Button>
      </div>

      {/* Amount hero */}
      <div className="mx-4 rounded-2xl bg-gradient-to-br from-card to-card border border-border/50 shadow-[0_2px_12px_rgba(0,0,0,0.04)] flex flex-col items-center py-8 px-4 mb-4 relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/5 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-8 -left-8 w-28 h-28 bg-[hsl(var(--coral)/.05)] rounded-full blur-2xl pointer-events-none" />
        {transaction.category && (
          <div
            className="h-14 w-14 rounded-2xl flex items-center justify-center mb-3 text-xl shadow-sm"
            style={{
              backgroundColor: `${transaction.category.color}20`,
              color: transaction.category.color,
            }}
          >
            {transaction.category.icon.slice(0, 1)}
          </div>
        )}
        <p className="text-sm text-muted-foreground mb-1">{label}</p>
        <AmountDisplay
          amount={transaction.amount}
          type={transaction.type as 'expense' | 'income' | 'transfer'}
          className="text-3xl font-bold"
        />
      </div>

      {/* Details */}
      <div className="mx-4 rounded-xl border border-border/50 bg-card shadow-[0_2px_12px_rgba(0,0,0,0.04)] divide-y divide-border/50 overflow-hidden">
        <DetailRow label="Tipe" value={TYPE_LABELS[transaction.type] ?? transaction.type} />
        {transaction.category && (
          <DetailRow label="Kategori" value={transaction.category.name} />
        )}
        {transaction.wallet && (
          <DetailRow label="Dompet" value={transaction.wallet.name} />
        )}
        {transaction.payment_method && (
          <DetailRow
            label="Metode Bayar"
            value={PAYMENT_METHOD_LABELS[transaction.payment_method] ?? transaction.payment_method}
          />
        )}
        <DetailRow label="Tanggal" value={formatDate(transaction.transacted_at)} />
        {transaction.merchant_name && (
          <DetailRow label="Merchant / Toko" value={transaction.merchant_name} />
        )}
        {transaction.description && (
          <DetailRow label="Catatan" value={transaction.description} />
        )}
        <DetailRow label="Sumber" value={SOURCE_LABELS[transaction.source] ?? transaction.source} />
        <DetailRow label="Dicatat pada" value={formatDate(transaction.created_at)} />
      </div>

      {/* Edit sheet — wallets+categories load lazily on first open */}
      <TransactionEditSheet
        open={editOpen}
        onOpenChange={setEditOpen}
        transaction={transaction}
      />

      {/* Delete confirm */}
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Hapus Transaksi"
        description={`Hapus "${label}"? Tindakan ini tidak bisa dibatalkan.`}
        confirmLabel="Hapus"
        variant="destructive"
        onConfirm={handleDelete}
        isPending={isPending}
      />
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground text-right max-w-[60%]">{value}</span>
    </div>
  )
}
