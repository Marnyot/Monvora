import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Kebijakan Privasi — Monvora',
  description:
    'Cara Monvora mengumpulkan, memakai, dan melindungi data finansial Anda.',
}

const EFFECTIVE_DATE = '13 Juni 2026'
const CONTACT_EMAIL = 'privasi@monvora.app'

export default function PrivacyPage() {
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

      <article className="prose-content space-y-8">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Kebijakan Privasi
          </h1>
          <p className="text-sm text-muted-foreground">
            Berlaku sejak {EFFECTIVE_DATE} · Terakhir diperbarui {EFFECTIVE_DATE}
          </p>
        </header>

        <section className="space-y-3">
          <p className="text-foreground/90">
            Monvora adalah personal finance OS yang membantu Anda memahami ke mana
            uang Anda pergi. Halaman ini menjelaskan data apa yang kami kumpulkan,
            bagaimana kami menggunakannya, dan kontrol apa yang Anda miliki.
          </p>
          <p className="text-foreground/90">
            Ringkasan singkat: kami menyimpan transaksi keuangan Anda di server
            kami sendiri (dengan enkripsi), kami hanya membaca email notifikasi
            bank Anda, kami tidak pernah menjual data, dan Anda bisa menghapus
            akun kapan saja.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-foreground">
            1. Data yang kami kumpulkan
          </h2>
          <ul className="list-disc space-y-2 pl-6 text-foreground/90">
            <li>
              <strong>Akun Google:</strong> nama, email, dan foto profil dari akun
              Google yang Anda pakai untuk login.
            </li>
            <li>
              <strong>Transaksi manual:</strong> nominal, kategori, metode
              pembayaran, dan catatan yang Anda input sendiri.
            </li>
            <li>
              <strong>Email notifikasi bank:</strong> hanya email dari pengirim
              bank yang sudah kami kenali (Mandiri, BCA, BNI, BRI, CIMB). Kami
              mengekstrak nominal, merchant, waktu, dan metode pembayaran.
            </li>
            <li>
              <strong>Foto struk (OCR):</strong> opsional. Foto diproses untuk
              ekstraksi data lalu Anda konfirmasi sebelum disimpan.
            </li>
            <li>
              <strong>Pengaturan & preferensi:</strong> theme, default kategori,
              budget yang Anda buat.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-foreground">
            2. Akses Gmail — apa yang KAMI lakukan dan TIDAK lakukan
          </h2>
          <p className="text-foreground/90">
            Saat Anda mengaktifkan Gmail Sync, kami meminta scope OAuth Google
            sempit: <code className="rounded bg-muted px-1.5 py-0.5 text-sm">gmail.readonly</code>.
          </p>
          <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
            <div>
              <p className="text-sm font-medium text-foreground">
                Yang kami lakukan:
              </p>
              <ul className="mt-1 list-disc space-y-1 pl-6 text-sm text-foreground/90">
                <li>
                  Membaca email dari pengirim bank yang kami kenali, hanya untuk
                  mengekstrak data transaksi.
                </li>
                <li>
                  Menyimpan ID email (untuk dedup) dan ringkasan singkat (untuk
                  debugging) saja, bukan isi lengkap email.
                </li>
              </ul>
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                Yang tidak kami lakukan:
              </p>
              <ul className="mt-1 list-disc space-y-1 pl-6 text-sm text-foreground/90">
                <li>Kami tidak pernah mengubah, menulis, mengirim, atau menghapus email Anda.</li>
                <li>Kami tidak membaca email di luar pengirim bank.</li>
                <li>Kami tidak menyimpan OAuth token di browser (selalu di server, terenkripsi).</li>
                <li>Kami tidak menjual atau membagikan data Anda kepada pihak ketiga untuk iklan.</li>
              </ul>
            </div>
          </div>
          <p className="text-sm text-foreground/90">
            Anda bisa mencabut akses Gmail kapan saja melalui{' '}
            <a
              href="https://myaccount.google.com/permissions"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline-offset-2 hover:underline"
            >
              Pengaturan Akun Google
            </a>{' '}
            atau langsung dari halaman Settings di Monvora.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-foreground">
            3. Pemrosesan AI (Gemini)
          </h2>
          <p className="text-foreground/90">
            Untuk kasus tertentu, Monvora menggunakan model AI Gemini (Google)
            sebagai sistem otomatis. Kami transparan tentang ini:
          </p>
          <div className="space-y-3">
            <div className="rounded-lg border border-border p-4">
              <h3 className="text-sm font-medium text-foreground">
                Gmail parser fallback
              </h3>
              <p className="mt-2 text-sm text-foreground/90">
                Saat pengenalan otomatis kami tidak yakin pada sebuah email,
                kami mengirim ke Gemini: subject, sender, dan potongan body
                singkat (maksimum 4000 karakter). Konten ini berisi informasi
                transaksi Anda. Per user, panggilan AI dibatasi maksimum 30 kali
                per hari.
              </p>
            </div>
            <div className="rounded-lg border border-border p-4">
              <h3 className="text-sm font-medium text-foreground">
                OCR struk / screenshot
              </h3>
              <p className="mt-2 text-sm text-foreground/90">
                Foto struk yang Anda scan akan dianalisis oleh Gemini untuk
                ekstraksi data (nominal, merchant, tanggal). Gambar diproses
                per-panggilan dan <strong>tidak kami simpan</strong> di server
                kami.
              </p>
            </div>
          </div>
          <p className="text-sm text-foreground/90">
            Data yang kami kirim ke Gemini tunduk pada{' '}
            <a
              href="https://policies.google.com/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline-offset-2 hover:underline"
            >
              kebijakan privasi Google
            </a>
            . Kami tidak menyimpan respons AI sebagai cache permanen di server.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-foreground">
            4. Penyimpanan & lokasi data
          </h2>
          <ul className="list-disc space-y-2 pl-6 text-foreground/90">
            <li>
              <strong>Database:</strong> Supabase (PostgreSQL), region Singapura
              (Asia Tenggara). Enkripsi at-rest dilakukan oleh Supabase secara
              otomatis.
            </li>
            <li>
              <strong>Aplikasi & API:</strong> Vercel (region default global
              edge). Trafik dilindungi HTTPS/TLS.
            </li>
            <li>
              <strong>OAuth token Google:</strong> hanya disimpan di sisi
              server, di-isolasi oleh Row Level Security per user.
            </li>
            <li>
              <strong>Yang tidak kami simpan:</strong> isi lengkap email, foto
              struk asli, password apa pun (kami pakai OAuth, tidak ada
              password).
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-foreground">
            5. Hak Anda
          </h2>
          <ul className="list-disc space-y-2 pl-6 text-foreground/90">
            <li>
              <strong>Akses:</strong> semua data transaksi Anda bisa dilihat
              kapan saja di aplikasi.
            </li>
            <li>
              <strong>Koreksi:</strong> Anda bisa edit setiap transaksi, kategori,
              atau wallet langsung dari aplikasi.
            </li>
            <li>
              <strong>Hapus:</strong> Anda bisa menghapus akun beserta semua data
              terkait dengan menghubungi kami via email di bawah. Penghapusan
              akan dilakukan dalam 7 hari kerja.
            </li>
            <li>
              <strong>Cabut akses Gmail:</strong> kapan saja, dari Settings →
              Gmail Sync → Putuskan.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-foreground">
            6. Cookies & analitik
          </h2>
          <p className="text-foreground/90">
            Kami hanya memakai cookie sesi yang dibutuhkan untuk autentikasi
            (dikelola oleh Supabase Auth). Cookie ini bersifat{' '}
            <code className="rounded bg-muted px-1.5 py-0.5 text-sm">httpOnly</code>{' '}
            dan tidak bisa diakses JavaScript. Kami tidak memakai cookie iklan
            atau pihak ketiga.
          </p>
          <p className="text-foreground/90">
            Untuk memahami trafik halaman secara agregat, kami memakai{' '}
            <a
              href="https://plausible.io/privacy-focused-web-analytics"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline-offset-2 hover:underline"
            >
              Plausible Analytics
            </a>{' '}
            — analitik privacy-first yang <strong>tidak memakai cookie</strong>,{' '}
            <strong>tidak menyimpan IP</strong> pengunjung secara individual,
            dan tidak melacak Anda lintas situs. Yang kami lihat hanya
            jumlah pageview agregat per halaman.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-foreground">
            7. Anak-anak
          </h2>
          <p className="text-foreground/90">
            Monvora bukan layanan yang ditujukan untuk pengguna di bawah usia 17
            tahun. Kami tidak secara sengaja mengumpulkan data dari mereka.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-foreground">
            8. Perubahan kebijakan
          </h2>
          <p className="text-foreground/90">
            Kami akan memberi notifikasi di aplikasi setidaknya 14 hari sebelum
            perubahan material berlaku. Versi terbaru selalu tersedia di halaman
            ini.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-foreground">
            9. Kontak
          </h2>
          <p className="text-foreground/90">
            Pertanyaan tentang privasi atau permintaan penghapusan data: hubungi
            kami via email di{' '}
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
