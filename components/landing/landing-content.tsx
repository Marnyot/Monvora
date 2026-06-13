import Link from 'next/link'
import {
  Mail,
  Camera,
  Sparkles,
  PiggyBank,
  Wallet,
  BarChart3,
  ShieldCheck,
  ArrowRight,
  Target,
} from 'lucide-react'

const STEPS = [
  {
    icon: Mail,
    title: 'Hubungkan Gmail',
    body: 'Monvora membaca email notifikasi bank Anda dan mengubah setiap transaksi jadi data terstruktur — otomatis, tanpa input manual.',
  },
  {
    icon: Camera,
    title: 'Scan struk e-wallet',
    body: 'GoPay, ShopeePay, OVO, DANA, QRIS — foto struknya, AI mengekstrak nominal dan merchant. Anda tinggal konfirmasi.',
  },
  {
    icon: Sparkles,
    title: 'Lihat insight harian',
    body: 'Pola pengeluaran, kategori dominan, langganan berulang, dan saran spesifik dalam Bahasa Indonesia.',
  },
]

const FEATURES = [
  { icon: Wallet, label: 'Multi-wallet (bank + e-wallet + cash)' },
  { icon: BarChart3, label: 'Analitik bulanan dengan tren 6 bulan' },
  { icon: PiggyBank, label: 'Budget per kategori dengan alert' },
  { icon: Sparkles, label: 'Insight AI harian dalam Bahasa Indonesia' },
]

export function LandingContent() {
  return (
    <main className="min-h-screen bg-background text-foreground relative overflow-hidden">
      {/* Decorative blobs for landing */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10" aria-hidden>
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-primary/8 rounded-full blur-3xl animate-blob" />
        <div className="absolute -bottom-40 -left-40 w-[400px] h-[400px] bg-[hsl(var(--coral)/.06)] rounded-full blur-3xl animate-blob-delayed" />
        <div className="absolute top-1/2 left-1/2 w-80 h-80 bg-[hsl(var(--amber)/.05)] rounded-full blur-3xl animate-blob" />
      </div>

      {/* Top nav */}
      <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-5 relative">
        <span className="text-base font-bold tracking-tight">
          <span className="bg-gradient-to-r from-primary to-emerald-600 bg-clip-text text-transparent">Monvora</span>
        </span>
        <Link
          href="/login"
          className="text-sm font-medium text-foreground/80 hover:text-foreground transition-colors"
        >
          Masuk
        </Link>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-3xl px-4 pt-10 pb-16 text-center sm:pt-16 sm:pb-24 relative">
        <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-medium text-primary">
          <Sparkles className="h-3 w-3" />
          <span>Personal finance OS untuk Indonesia</span>
        </div>
        <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-5xl">
          Pahami ke mana uangmu pergi{' '}
          <span className="bg-gradient-to-r from-primary to-emerald-600 bg-clip-text text-transparent">tanpa jadi ahli keuangan.</span>
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-balance text-foreground/80 sm:text-lg">
          Monvora membaca notifikasi bank dari Gmail dan struk e-wallet kamu,
          lalu menyatukan semuanya dalam satu dashboard yang mudah dibaca.
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-emerald-600 px-6 py-3.5 text-sm font-medium text-white shadow-lg shadow-primary/25 transition-all hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5"
          >
            Mulai gratis dengan Google
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <Link
            href="/gmail-permissions"
            className="text-sm text-foreground/80 underline-offset-4 hover:underline"
          >
            Apa yang dibaca dari Gmail?
          </Link>
        </div>

        <p className="mt-6 text-xs text-muted-foreground">
          Gratis selama MVP. Scope OAuth: <code className="rounded bg-muted px-1 py-0.5">gmail.readonly</code>.
        </p>
      </section>

      {/* 3-step how it works */}
      <section className="mx-auto max-w-5xl px-4 py-16 relative">
        <h2 className="mx-auto max-w-2xl text-center text-2xl font-semibold tracking-tight sm:text-3xl">
          Tiga langkah, dan Monvora yang kerja
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-center text-foreground/80">
          Tidak ada lagi catat manual di notes, Excel, atau spreadsheet.
        </p>
        <ol className="mt-10 grid gap-5 md:grid-cols-3">
          {STEPS.map((step, i) => (
            <li
              key={step.title}
              className="rounded-2xl border border-border/50 bg-card p-6 shadow-[0_2px_12px_rgba(0,0,0,0.04)] hover:shadow-md transition-shadow"
            >
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-emerald-600 text-white shadow-sm">
                <step.icon className="h-5 w-5" aria-hidden="true" />
              </div>
              <div className="mb-1 text-xs font-medium text-muted-foreground">
                Langkah {i + 1}
              </div>
              <h3 className="text-base font-semibold">{step.title}</h3>
              <p className="mt-2 text-sm text-foreground/80">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-5xl px-4 py-16 relative">
        <div className="rounded-2xl border border-border/50 bg-card p-8 sm:p-10 shadow-[0_2px_20px_rgba(0,0,0,0.04)]">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Yang sudah berjalan di v0.3
          </h2>
          <p className="mt-3 max-w-xl text-foreground/80">
            Phase 3 selesai: PWA, analitik, AI insights, budget, OCR, deteksi
            langganan berulang.
          </p>
          <ul className="mt-8 grid gap-4 sm:grid-cols-2">
            {FEATURES.map((f) => (
              <li key={f.label} className="flex items-start gap-3 text-sm">
                <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-emerald-600 text-white shrink-0 shadow-sm">
                  <f.icon className="h-4 w-4" aria-hidden="true" />
                </div>
                <span className="text-foreground/90">{f.label}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Trust section */}
      <section className="mx-auto max-w-3xl px-4 py-16 relative">
        <div className="rounded-2xl border border-border/50 bg-card p-8 sm:p-10 shadow-[0_2px_20px_rgba(0,0,0,0.04)]">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
            Privasi & keamanan
          </div>
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Hanya membaca. Tidak pernah mengubah.
          </h2>
          <ul className="mt-6 space-y-3 text-sm text-foreground/90">
            <li className="flex gap-3">
              <span className="text-primary">→</span>
              Scope OAuth Google sempit:{' '}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">gmail.readonly</code>
              -- Monvora tidak bisa mengubah, mengirim, atau menghapus email Anda.
            </li>
            <li className="flex gap-3">
              <span className="text-primary">→</span>
              OAuth token disimpan di server (Supabase, region Singapura) --
              browser Anda tidak pernah menyentuh token mentah.
            </li>
            <li className="flex gap-3">
              <span className="text-primary">→</span>
              Tidak ada iklan, tidak menjual data, tidak melacak Anda di luar
              aplikasi.
            </li>
          </ul>
          <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm">
            <Link
              href="/gmail-permissions"
              className="text-primary underline-offset-4 hover:underline"
            >
              Detail akses Gmail →
            </Link>
            <Link
              href="/privacy"
              className="text-primary underline-offset-4 hover:underline"
            >
              Kebijakan Privasi →
            </Link>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-3xl px-4 py-20 text-center relative">
        <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Siap berhenti tracking manual?
        </h2>
        <p className="mx-auto mt-3 max-w-md text-foreground/80">
          Setup kurang dari 2 menit. Cukup masuk dengan Google.
        </p>
        <div className="mt-7">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-emerald-600 px-6 py-3.5 text-sm font-medium text-white shadow-lg shadow-primary/25 transition-all hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5"
          >
            Mulai gratis sekarang
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 px-4 py-6 text-xs text-muted-foreground sm:flex-row">
          <span className="font-medium">© 2026 Monvora</span>
          <div className="flex gap-5">
            <Link href="/privacy" className="hover:text-foreground transition-colors">
              Privasi
            </Link>
            <Link href="/gmail-permissions" className="hover:text-foreground transition-colors">
              Akses Gmail
            </Link>
          </div>
        </div>
      </footer>
    </main>
  )
}
