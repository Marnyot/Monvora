import Link from 'next/link'
import { Check, Wallet, Mail, Plus, Sparkles } from 'lucide-react'

interface WelcomeCardProps {
  hasWallets: boolean
  gmailEnabled: boolean
  hasTransactions: boolean
  isGuest?: boolean
}

interface Step {
  done: boolean
  icon: typeof Wallet
  title: string
  body: string
  href: string | null
}

export function WelcomeCard({
  hasWallets,
  gmailEnabled,
  hasTransactions,
  isGuest = false,
}: WelcomeCardProps) {
  if (hasTransactions) return null

  const steps: Step[] = [
    {
      done: hasWallets,
      icon: Wallet,
      title: hasWallets ? 'Wallet siap' : 'Tambah wallet pertama',
      body: hasWallets
        ? 'Sumber dana sudah terdaftar'
        : 'Rekening bank, e-wallet, atau cash',
      href: hasWallets ? null : '/wallets',
    },
    // Gmail sync requires a Google identity — hide it for guest sessions
    // until they sign up. The GuestBanner already prompts them.
    ...(isGuest
      ? []
      : [
          {
            done: gmailEnabled,
            icon: Mail,
            title: gmailEnabled ? 'Gmail terhubung' : 'Hubungkan Gmail',
            body: gmailEnabled
              ? 'Transaksi bank ditangkap otomatis'
              : 'Notifikasi bank ke transaksi otomatis',
            href: gmailEnabled ? null : '/settings/gmail',
          },
        ]),
    {
      done: false,
      icon: Plus,
      title: 'Catat transaksi pertama',
      body: 'Tap tombol + di pojok bawah untuk quick entry',
      href: null,
    },
  ]

  return (
    <section
      className="mx-4 mb-4 rounded-2xl border border-border bg-card p-5"
      aria-label="Panduan memulai"
    >
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Sparkles className="h-4 w-4" aria-hidden="true" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-foreground">
            Selamat datang di Monvora
          </h2>
          <p className="text-xs text-muted-foreground">
            {isGuest
              ? 'Mulai catat dulu — daftar nanti untuk simpan.'
              : `Selesaikan ${steps.length} langkah ini untuk mulai tracking`}
          </p>
        </div>
      </div>

      <ol className="space-y-2">
        {steps.map((step) => {
          const content = (
            <>
              <div
                className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                  step.done
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {step.done ? (
                  <Check className="h-3.5 w-3.5" aria-hidden="true" />
                ) : (
                  <step.icon className="h-3.5 w-3.5" aria-hidden="true" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p
                  className={`text-sm font-medium ${
                    step.done
                      ? 'text-muted-foreground line-through'
                      : 'text-foreground'
                  }`}
                >
                  {step.title}
                </p>
                <p className="text-xs text-muted-foreground">{step.body}</p>
              </div>
            </>
          )

          return (
            <li key={step.title}>
              {step.href ? (
                <Link
                  href={step.href}
                  className="flex gap-3 rounded-lg p-2 -m-2 transition hover:bg-muted/50"
                >
                  {content}
                </Link>
              ) : (
                <div className="flex gap-3 p-2 -m-2">{content}</div>
              )}
            </li>
          )
        })}
      </ol>
    </section>
  )
}
