'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface EditNameSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentName: string
}

export function EditNameSheet({ open, onOpenChange, currentName }: EditNameSheetProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [name, setName] = useState(currentName)
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setName(currentName)
      setError(null)
    }
  }, [open, currentName])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const trimmed = name.trim()
    if (!trimmed) {
      setError('Nama tidak boleh kosong')
      return
    }
    if (trimmed === currentName) {
      onOpenChange(false)
      return
    }

    setIsPending(true)
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name: trimmed }),
      })
      const json = await res.json()
      if (!res.ok || json.error) {
        setError(json.error?.message ?? 'Gagal menyimpan nama')
        return
      }
      toast.success('Nama tersimpan')
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      router.refresh()
      onOpenChange(false)
    } finally {
      setIsPending(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="h-auto max-h-[90svh] overflow-y-auto rounded-t-2xl"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <SheetHeader className="text-left pb-4">
          <SheetTitle>Ubah nama tampilan</SheetTitle>
          <SheetDescription>
            Nama ini muncul di sapaan dashboard dan halaman pengaturan. Tidak mengubah akun Google.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pb-2">
          <div className="space-y-1.5">
            <Label htmlFor="profile-name">Nama</Label>
            <Input
              id="profile-name"
              value={name}
              maxLength={80}
              onChange={(e) => setName(e.target.value)}
              placeholder="cth: Budi Santoso"
              autoFocus
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? 'Menyimpan...' : 'Simpan'}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  )
}
