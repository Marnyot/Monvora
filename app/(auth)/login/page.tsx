import { GoogleLoginButton } from '@/components/shared/google-login-button'
import { GuestLoginButton } from '@/components/shared/guest-login-button'
import { MonvoraLogo } from '@/components/shared/monvora-logo'

export const metadata = {
  title: 'Masuk — Monvora',
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; reason?: string }>
}) {
  const { error, reason } = await searchParams
  const gmailExpired = reason === 'gmail_expired'

  return (
    <div className="w-full max-w-sm space-y-8">
      {/* Logo & heading */}
      <div className="text-center space-y-2">
        <MonvoraLogo
          size={64}
          priority
          className="mx-auto mb-3 rounded-2xl shadow-lg"
        />
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Monvora</h1>
        <p className="text-sm text-muted-foreground">
          Kelola keuangan pribadi dengan lebih cerdas
        </p>
      </div>

      {/* Login card */}
      <div className="rounded-2xl border border-border/50 bg-card p-6 shadow-[0_2px_20px_rgba(0,0,0,0.06)] space-y-4">
        <div className="space-y-1">
          <h2 className="text-base font-semibold text-card-foreground">Masuk ke akun</h2>
          <p className="text-xs text-muted-foreground">
            Gunakan akun Google untuk melanjutkan
          </p>
        </div>

        {/* Error state */}
        {error && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">
            Terjadi kesalahan saat masuk. Silakan coba lagi.
          </div>
        )}

        {gmailExpired && (
          <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
            Sesi Gmail kamu sudah habis. Silakan masuk kembali untuk menyambungkan otomatis sync.
          </div>
        )}

        <GoogleLoginButton />

        <div className="relative py-1">
          <div className="absolute inset-0 flex items-center" aria-hidden>
            <span className="w-full border-t border-border/50" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-card px-2 text-[10px] uppercase tracking-wide text-muted-foreground">
              atau
            </span>
          </div>
        </div>

        <GuestLoginButton />
        <p className="text-[11px] text-center text-muted-foreground leading-relaxed">
          Mode tamu langsung jalan tanpa akun. Datamu tetap aman saat nanti kamu daftar.
        </p>
      </div>

      {/* Footer note */}
      <div className="space-y-2 px-4 text-center">
        <p className="text-xs text-muted-foreground">
          Dengan masuk, kamu menyetujui bahwa kami hanya mengakses email notifikasi transaksi.
        </p>
        <p className="text-xs text-muted-foreground">
          <a
            href="/gmail-permissions"
            className="underline-offset-2 hover:underline"
          >
            Kenapa kami minta akses Gmail?
          </a>
          <span className="mx-1.5">·</span>
          <a
            href="/privacy"
            className="underline-offset-2 hover:underline"
          >
            Kebijakan Privasi
          </a>
        </p>
      </div>
    </div>
  )
}
