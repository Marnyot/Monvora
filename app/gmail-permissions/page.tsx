import Link from 'next/link'
import type { Metadata } from 'next'
import {
  Check,
  X,
  ShieldCheck,
  Mail,
  Lock,
  Eye,
} from 'lucide-react'

export const metadata: Metadata = {
  title: 'Akses Gmail — Monvora',
  description:
    'Penjelasan transparan tentang akses Gmail yang diminta Monvora: scope, data yang dibaca, dan kontrol Anda.',
}

const SUPPORTED_BANKS = [
  { name: 'Bank Mandiri', senders: 'no-reply@bankmandiri.co.id, notifikasi@bankmandiri.co.id' },
  { name: 'BCA', senders: 'klikbca@bca.co.id, notify@bca.co.id' },
  { name: 'BNI', senders: 'bni@bni.co.id, notifikasi@bni.co.id' },
  { name: 'BRI', senders: 'bri@bri.co.id, notif@bri.co.id' },
  { name: 'CIMB Niaga', senders: 'no-reply@cimbniaga.co.id' },
]

const EXTRACTED_FIELDS = [
  { label: 'Nominal transaksi', example: 'Rp 45.000' },
  { label: 'Nama merchant / penerima', example: 'Indomaret, GoFood, Transfer ke Andi' },
  { label: 'Waktu transaksi', example: '13 Jun 2026, 14:32 WIB' },
  { label: 'Metode pembayaran', example: 'QRIS, Transfer, Debit, Top up' },
  { label: 'Nomor referensi', example: 'untuk dedup, tidak ditampilkan ke Anda' },
]

const WE_DONT_DO = [
  'Membaca email di luar pengirim bank yang terdaftar di atas',
  'Mengubah, menulis, mengirim, atau menghapus email Anda',
  'Mem-forward atau menyalin isi email ke pihak ketiga',
  'Menyimpan OAuth token Anda di browser (localStorage / cookies non-httpOnly)',
  'Menjual atau membagikan data Anda untuk iklan',
]

export default function GmailPermissionsPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10 sm:py-16">
      <nav className="mb-8 text-sm text-muted-foreground">
        <Link
          href="/login"
          className="hover:text-foreground hover:underline"
        >
          ← Kembali
        </Link>
      </nav>

      <article className="space-y-10">
        {/* Header */}
        <header className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/40 px-3 py-1 text-xs text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
            Penjelasan akses Gmail
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Kenapa Monvora minta akses Gmail?
          </h1>
          <p className="text-foreground/90">
            Halaman ini menjelaskan dengan rinci akses Gmail yang Monvora minta,
            apa saja yang kami baca, dan apa saja yang <strong>tidak</strong>{' '}
            pernah kami lakukan. Kami ingin Anda setuju karena yakin, bukan
            karena terburu-buru.
          </p>
        </header>

        {/* Quick summary card */}
        <section className="rounded-xl border border-border bg-card p-5 space-y-4">
          <h2 className="text-base font-semibold text-foreground">
            Ringkasan singkat
          </h2>
          <ul className="space-y-3 text-sm">
            <li className="flex gap-3">
              <Eye className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" aria-hidden="true" />
              <span className="text-foreground/90">
                Monvora hanya <strong>membaca</strong> email — scope OAuth
                Google yang kami minta adalah{' '}
                <code className="rounded bg-muted px-1.5 py-0.5 text-[11px]">gmail.readonly</code>.
                Secara teknis, Monvora tidak punya kemampuan untuk mengubah
                inbox Anda.
              </span>
            </li>
            <li className="flex gap-3">
              <Mail className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" aria-hidden="true" />
              <span className="text-foreground/90">
                Dari semua email Anda, Monvora hanya mengambil yang berasal dari
                pengirim bank Indonesia yang sudah kami daftarkan (5 bank
                besar). Email lain tidak pernah dilihat.
              </span>
            </li>
            <li className="flex gap-3">
              <Lock className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" aria-hidden="true" />
              <span className="text-foreground/90">
                OAuth token Anda disimpan di server kami (enkripsi at-rest oleh
                Supabase). Browser/peramban Anda <strong>tidak pernah</strong>{' '}
                menyentuh token mentah ini.
              </span>
            </li>
          </ul>
        </section>

        {/* Scope detail */}
        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-foreground">
            1. Scope yang kami minta
          </h2>
          <p className="text-foreground/90">
            Saat Anda klik &quot;Hubungkan Gmail&quot;, Google akan menampilkan
            consent screen dengan scope berikut:
          </p>
          <div className="rounded-lg border border-border bg-muted/30 p-4 font-mono text-xs">
            https://www.googleapis.com/auth/gmail.readonly
          </div>
          <p className="text-sm text-foreground/90">
            Scope ini bersifat <strong>read-only</strong> — artinya Monvora
            hanya bisa melihat email, tidak bisa mengubahnya. Kami tidak meminta{' '}
            <code className="rounded bg-muted px-1.5 py-0.5 text-[11px]">gmail.modify</code>,{' '}
            <code className="rounded bg-muted px-1.5 py-0.5 text-[11px]">gmail.compose</code>,
            atau scope{' '}
            <code className="rounded bg-muted px-1.5 py-0.5 text-[11px]">mail.google.com/</code>{' '}
            (akses penuh).
          </p>
        </section>

        {/* Bank senders */}
        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-foreground">
            2. Email mana yang kami baca?
          </h2>
          <p className="text-foreground/90">
            Walau scope memberi izin teknis untuk membaca semua email, Monvora
            secara aktif memfilter hanya email dari pengirim bank yang kami
            kenali:
          </p>
          <div className="space-y-2">
            {SUPPORTED_BANKS.map((bank) => (
              <div
                key={bank.name}
                className="rounded-lg border border-border p-3 text-sm"
              >
                <div className="font-medium text-foreground">{bank.name}</div>
                <div className="mt-1 break-all font-mono text-xs text-muted-foreground">
                  {bank.senders}
                </div>
              </div>
            ))}
          </div>
          <p className="text-sm text-foreground/90">
            Email dari pengirim lain — promosi, pribadi, kerja, marketplace —
            tidak masuk ke filter kami dan tidak pernah diproses.
          </p>
        </section>

        {/* What we extract */}
        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-foreground">
            3. Data apa yang kami ekstrak?
          </h2>
          <p className="text-foreground/90">
            Dari email yang lolos filter, kami hanya mengekstrak field-field
            berikut. Sisanya (HTML, footer, signature, gambar, link) dibuang:
          </p>
          <ul className="space-y-2">
            {EXTRACTED_FIELDS.map((f) => (
              <li
                key={f.label}
                className="flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-lg border border-border p-3 text-sm"
              >
                <span className="font-medium text-foreground">{f.label}</span>
                <span className="text-xs text-muted-foreground">
                  Contoh: {f.example}
                </span>
              </li>
            ))}
          </ul>
          <p className="text-sm text-foreground/90">
            Kami juga menyimpan ID email Gmail (untuk mencegah duplikat) dan
            cuplikan teks pendek (untuk debugging parser kami sendiri jika ada
            data yang gagal di-parse).
          </p>
        </section>

        {/* What we DON'T do */}
        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-foreground">
            4. Yang kami tidak lakukan
          </h2>
          <ul className="space-y-2">
            {WE_DONT_DO.map((item) => (
              <li
                key={item}
                className="flex gap-3 rounded-lg border border-border p-3"
              >
                <X
                  className="h-4 w-4 mt-0.5 text-destructive shrink-0"
                  aria-hidden="true"
                />
                <span className="text-sm text-foreground/90">{item}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Technical safeguards */}
        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-foreground">
            5. Pengamanan teknis
          </h2>
          <div className="space-y-3 text-sm text-foreground/90">
            <div className="flex gap-3">
              <Check
                className="h-4 w-4 mt-0.5 text-primary shrink-0"
                aria-hidden="true"
              />
              <span>
                OAuth token disimpan di server kami saja (Supabase, region
                Singapura). Browser tidak pernah memegang token mentah.
              </span>
            </div>
            <div className="flex gap-3">
              <Check
                className="h-4 w-4 mt-0.5 text-primary shrink-0"
                aria-hidden="true"
              />
              <span>
                Cookie sesi bersifat{' '}
                <code className="rounded bg-muted px-1.5 py-0.5 text-[11px]">httpOnly</code>
                {' '}— tidak bisa diakses JavaScript di peramban (anti-XSS).
              </span>
            </div>
            <div className="flex gap-3">
              <Check
                className="h-4 w-4 mt-0.5 text-primary shrink-0"
                aria-hidden="true"
              />
              <span>
                Row Level Security (RLS) di database memastikan data Anda
                terisolasi total dari user lain di level database.
              </span>
            </div>
            <div className="flex gap-3">
              <Check
                className="h-4 w-4 mt-0.5 text-primary shrink-0"
                aria-hidden="true"
              />
              <span>
                Semua trafik dilindungi TLS/HTTPS. Header keamanan (CSP,
                HSTS, X-Frame-Options) diaktifkan.
              </span>
            </div>
          </div>
        </section>

        {/* Revoke */}
        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-foreground">
            6. Cara mencabut akses
          </h2>
          <p className="text-foreground/90">
            Anda bisa mencabut akses Gmail kapan saja melalui dua cara:
          </p>
          <ol className="list-decimal space-y-2 pl-6 text-foreground/90">
            <li>
              Dari aplikasi: <Link href="/settings/gmail" className="text-primary underline-offset-2 hover:underline">Settings → Sinkronisasi Gmail → Putuskan</Link>.
              Setelah dicabut, Monvora berhenti membaca email — data yang
              sudah masuk tetap tersimpan kecuali Anda hapus manual.
            </li>
            <li>
              Dari Google langsung:{' '}
              <a
                href="https://myaccount.google.com/permissions"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline-offset-2 hover:underline"
              >
                myaccount.google.com/permissions
              </a>
              {' '}→ pilih Monvora → Remove access.
            </li>
          </ol>
        </section>

        {/* Footer */}
        <section className="space-y-2 border-t border-border pt-6 text-sm text-foreground/90">
          <p>
            Selengkapnya tentang bagaimana kami menangani data finansial
            secara umum, baca{' '}
            <Link
              href="/privacy"
              className="text-primary underline-offset-2 hover:underline"
            >
              Kebijakan Privasi
            </Link>
            .
          </p>
          <p>
            Pertanyaan?{' '}
            <a
              href="mailto:privasi@monvora.app"
              className="text-primary underline-offset-2 hover:underline"
            >
              privasi@monvora.app
            </a>
          </p>
        </section>
      </article>
    </main>
  )
}
