'use client'

import { useState } from 'react'
import { LogOut, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'

export function LogoutButton() {
  const [open, setOpen] = useState(false)
  const [isPending, setIsPending] = useState(false)

  async function handleLogout() {
    setIsPending(true)
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } finally {
      window.location.href = '/login'
    }
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="w-full sm:w-auto text-destructive border-destructive/30 hover:text-destructive hover:border-destructive/60"
        onClick={() => setOpen(true)}
        disabled={isPending}
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <LogOut className="h-4 w-4 mr-2" />
        )}
        Keluar
      </Button>

      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Keluar dari Monvora?"
        description="Kamu akan keluar dari akun ini. Data kamu tetap aman dan tersimpan."
        confirmLabel="Keluar"
        cancelLabel="Batal"
        variant="destructive"
        onConfirm={handleLogout}
        isPending={isPending}
      />
    </>
  )
}
