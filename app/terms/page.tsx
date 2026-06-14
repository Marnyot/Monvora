import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Ketentuan Layanan — Monvora',
  description:
    'Ketentuan penggunaan Monvora — personal finance OS untuk pengguna Indonesia.',
}

const EFFECTIVE_DATE = '14 Juni 2026'
const CONTACT_EMAIL = 'mario.valenardhana@gmail.com'

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10 sm:py-16">
      <nav className="mb-8 text-sm text-muted-foreground">
        <Link href="/login" className="hover:text-foreground hover:underline">
          ← Kembali
        </Link>
      </nav>

      <article className="prose-content space-y-8">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Ketentuan Layanan
          </h1>
          <p className="text-sm text-muted-foreground">
            Berlaku sejak {EFFECTIVE_DATE} · Terakhir diperbarui {EFFECTIVE_DATE}
          </p>
        </header>

        <section className="space-y-3">
          <p className="text-foreground/90">
            Selamat datang di Monvora. Dengan membuat akun atau menggunakan
            layanan ini, Anda setuju pada ketentuan di halaman ini. Mohon dibaca.
            Jika Anda tidak setuju, jangan gunakan layanan ini.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-foreground">
            1. Tentang layanan
          </h2>
          <p className="text-foreground/90">
            Monvora adalah personal finance operating system yang membantu Anda
            mencatat dan memahami transaksi keuangan: input manual, sinkronisasi
            notifikasi transaksi dari email bank (read-only), pemindaian struk
            (OCR), kategorisasi otomatis, dan insight finansial.
          </p>
          <p className="text-foreground/90">
            Monvora adalah alat bantu pencatatan dan analisis pribadi. Monvora
            <strong> bukan</strong> bank, bukan lembaga keuangan, bukan penasihat
            keuangan, investasi, atau pajak, dan tidak memindahkan atau menyimpan
            dana Anda.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-foreground">
            2. Akun & kelayakan
          </h2>
          <ul className="list-disc space-y-2 pl-6 text-foreground/90">
            <li>
              Anda harus berusia minimal 17 tahun untuk menggunakan Monvora.
            </li>
            <li>
              Login menggunakan akun Google Anda. Anda bertanggung jawab menjaga
              keamanan akun Google tersebut.
            </li>
            <li>
              Anda bertanggung jawab atas semua aktivitas yang terjadi di akun
              Anda.
            </li>
            <li>
              Satu akun ditujukan untuk satu individu. Jangan membagikan akses
              akun Anda kepada orang lain.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-foreground">
            3. Akses Gmail Anda
          </h2>
          <p className="text-foreground/90">
            Jika Anda mengaktifkan Gmail Sync, Anda memberi izin Monvora membaca
            email notifikasi bank Anda melalui scope OAuth Google{' '}
            <code className="rounded bg-muted px-1.5 py-0.5 text-sm">
              gmail.readonly
            </code>
            , semata-mata untuk mengekstrak data transaksi. Detail lengkapnya ada
            di{' '}
            <Link
              href="/privacy"
              className="text-primary underline-offset-2 hover:underline"
            >
              Kebijakan Privasi
            </Link>
            . Anda bisa mencabut izin ini kapan saja dari Settings atau dari{' '}
            <a
              href="https://myaccount.google.com/permissions"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline-offset-2 hover:underline"
            >
              Pengaturan Akun Google
            </a>
            .
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-foreground">
            4. Penggunaan yang dapat diterima
          </h2>
          <p className="text-foreground/90">Anda setuju untuk tidak:</p>
          <ul className="list-disc space-y-2 pl-6 text-foreground/90">
            <li>
              Menggunakan layanan untuk tujuan melanggar hukum, penipuan, atau
              pencucian uang.
            </li>
            <li>
              Mencoba mengakses data pengguna lain, atau membobol, merusak, dan
              membebani sistem kami (scraping, brute-force, reverse engineering
              di luar yang diizinkan hukum).
            </li>
            <li>
              Mengunggah konten yang melanggar hak pihak lain atau mengandung
              malware.
            </li>
            <li>
              Menyalahgunakan akses API atau melewati batas pemakaian wajar (rate
              limit).
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-foreground">
            5. Akurasi data & keputusan finansial
          </h2>
          <p className="text-foreground/90">
            Monvora memakai sistem otomatis (parser dan AI Gemini) untuk membaca
            email dan struk. Proses ini bisa keliru: nominal, merchant, kategori,
            atau tanggal mungkin salah baca. Anda bertanggung jawab memverifikasi
            dan mengoreksi data Anda.
          </p>
          <p className="text-foreground/90">
            Insight, ringkasan, dan kategorisasi yang ditampilkan bersifat
            informatif, <strong>bukan nasihat finansial</strong>. Keputusan
            keuangan yang Anda ambil sepenuhnya menjadi tanggung jawab Anda.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-foreground">
            6. Layanan pihak ketiga
          </h2>
          <p className="text-foreground/90">
            Monvora bergantung pada layanan pihak ketiga seperti Google (OAuth,
            Gmail API, Gemini), Supabase, dan Vercel. Ketersediaan dan ketentuan
            mereka berada di luar kendali kami, dan penggunaan Anda atas layanan
            tersebut tunduk pada ketentuan masing-masing.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-foreground">
            7. Ketersediaan layanan
          </h2>
          <p className="text-foreground/90">
            Kami berupaya menjaga Monvora tetap berjalan, namun layanan diberikan
            “sebagaimana adanya” (as is) tanpa jaminan ketersediaan tanpa henti.
            Kami dapat mengubah, menangguhkan, atau menghentikan fitur sewaktu-
            waktu, dan akan berusaha memberi tahu Anda untuk perubahan material.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-foreground">
            8. Batasan tanggung jawab
          </h2>
          <p className="text-foreground/90">
            Sepanjang diizinkan hukum yang berlaku, Monvora tidak bertanggung
            jawab atas kerugian tidak langsung, insidental, atau konsekuensial
            yang timbul dari penggunaan layanan — termasuk kerugian finansial
            akibat data yang tidak akurat. Tanggung jawab kami, jika ada, dibatasi
            sebatas yang diwajibkan hukum.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-foreground">
            9. Penghentian akun
          </h2>
          <p className="text-foreground/90">
            Anda bisa berhenti menggunakan Monvora dan menghapus akun kapan saja
            (lihat Kebijakan Privasi untuk prosedur penghapusan data). Kami dapat
            menangguhkan atau menghentikan akses Anda jika Anda melanggar
            ketentuan ini atau menyalahgunakan layanan.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-foreground">
            10. Perubahan ketentuan
          </h2>
          <p className="text-foreground/90">
            Kami dapat memperbarui ketentuan ini dari waktu ke waktu. Untuk
            perubahan material, kami akan memberi notifikasi di aplikasi.
            Penggunaan berkelanjutan setelah perubahan berlaku berarti Anda
            menyetujui versi terbaru. Versi terkini selalu tersedia di halaman
            ini.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-foreground">11. Kontak</h2>
          <p className="text-foreground/90">
            Pertanyaan tentang ketentuan ini? Hubungi kami di{' '}
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="text-primary underline-offset-2 hover:underline"
            >
              {CONTACT_EMAIL}
            </a>
            .
          </p>
        </section>
      </article>
    </main>
  )
}
