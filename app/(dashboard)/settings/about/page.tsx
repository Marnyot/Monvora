import Link from 'next/link'
import { ChevronLeft, Shield, Mail, Heart, MessageSquare } from 'lucide-react'
import { MonvoraLogo } from '@/components/shared/monvora-logo'

export const metadata = {
  title: 'Tentang Monvora',
}

const APP_VERSION = '0.3.0'

export default function AboutPage() {
  return (
    <div className="max-w-lg lg:max-w-2xl mx-auto px-4 py-6 space-y-6">
      <Link
        href="/settings"
        prefetch
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
        Kembali
      </Link>

      {/* Hero */}
      <section className="rounded-2xl border border-border bg-card p-6 text-center space-y-3">
        <MonvoraLogo size={64} className="mx-auto rounded-2xl shadow-sm" />
        <div className="space-y-1">
          <h1 className="text-xl font-bold text-foreground">Monvora</h1>
          <p className="text-sm text-muted-foreground">
            Kelola keuangan pribadi dengan lebih cerdas.
          </p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
          v{APP_VERSION}
        </span>
      </section>

      {/* Tentang */}
      <section className="rounded-xl border border-border bg-card p-5 space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Apa itu Monvora?</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Personal finance operating system untuk pengguna Indonesia. Monvora otomatis membaca
          notifikasi transaksi bank dari Gmail, menyediakan input cepat untuk e-wallet dan tunai,
          serta menampilkan insight finansial yang mudah dimengerti — semua dalam satu tempat.
        </p>
      </section>

      {/* Tautan */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-foreground px-1">Kebijakan & Bantuan</h2>
        <div className="rounded-xl border border-border bg-card overflow-hidden divide-y divide-border">
          <Link
            href="/privacy"
            className="flex items-center gap-3 p-4 hover:bg-accent/50 transition-colors"
          >
            <div className="rounded-full p-2 bg-muted">
              <Shield className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground">Kebijakan Privasi</p>
              <p className="text-xs text-muted-foreground">Bagaimana data kamu disimpan dan digunakan</p>
            </div>
          </Link>
          <Link
            href="/gmail-permissions"
            className="flex items-center gap-3 p-4 hover:bg-accent/50 transition-colors"
          >
            <div className="rounded-full p-2 bg-muted">
              <Mail className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground">Akses Gmail</p>
              <p className="text-xs text-muted-foreground">Kenapa kami minta izin gmail.readonly</p>
            </div>
          </Link>
          <Link
            href="/settings/feedback"
            prefetch
            className="flex items-center gap-3 p-4 hover:bg-accent/50 transition-colors"
          >
            <div className="rounded-full p-2 bg-muted">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground">Kirim Feedback</p>
              <p className="text-xs text-muted-foreground">Laporkan bug atau usulkan fitur</p>
            </div>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <p className="text-center text-xs text-muted-foreground inline-flex items-center justify-center gap-1 w-full">
        Dibuat dengan
        <Heart className="h-3 w-3 text-red-500 fill-red-500" aria-hidden />
        di Indonesia
      </p>
    </div>
  )
}
