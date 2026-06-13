import { Target } from 'lucide-react'
import { BudgetListClient } from '@/components/budgets/budget-list-client'

export const metadata = {
  title: 'Budget — Monvora',
}

export default function BudgetsPage() {
  return (
    <div className="max-w-lg lg:max-w-2xl mx-auto px-4 py-6 space-y-4">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500 via-amber-500/90 to-orange-600/80 p-5 text-white shadow-lg">
        <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/5 rounded-full blur-2xl animate-blob pointer-events-none" />
        <div className="absolute -bottom-6 -left-6 w-24 h-24 bg-white/5 rounded-full blur-2xl animate-blob-delayed pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1">
            <Target className="h-5 w-5" />
            <h1 className="text-lg font-bold">Budget</h1>
          </div>
          <p className="text-sm opacity-80">
            Tetapkan batas pengeluaran, biar lebih sadar ke mana uangmu pergi.
          </p>
        </div>
      </div>

      <BudgetListClient />
    </div>
  )
}
