import { GoogleLoginButton } from '@/components/shared/google-login-button'

export const metadata = {
  title: 'Masuk — Monvora',
}

export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string }
}) {
  return (
    <div className="w-full max-w-sm space-y-8">
      {/* Logo & heading */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Monvora</h1>
        <p className="text-sm text-muted-foreground">
          Kelola keuangan pribadi dengan lebih cerdas
        </p>
      </div>

      {/* Login card */}
      <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
        <div className="space-y-1">
          <h2 className="text-base font-semibold text-card-foreground">Masuk ke akun</h2>
          <p className="text-xs text-muted-foreground">
            Gunakan akun Google untuk melanjutkan
          </p>
        </div>

        {/* Error state */}
        {searchParams.error && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">
            Terjadi kesalahan saat masuk. Silakan coba lagi.
          </div>
        )}

        <GoogleLoginButton />
      </div>

      {/* Footer note */}
      <p className="text-center text-xs text-muted-foreground px-4">
        Dengan masuk, kamu menyetujui bahwa kami hanya mengakses email notifikasi transaksi.
      </p>
    </div>
  )
}
