import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { inngest } from '@/lib/inngest/client'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const codeParam = searchParams.get('code')
  const redirectParam = searchParams.get('redirect')

  const codeResult = z.string().min(1).safeParse(codeParam)
  if (!codeResult.success) {
    return NextResponse.redirect(`${origin}/login?error=auth`)
  }

  const code = codeResult.data

  // Whitelist-based redirect
  const ALLOWED_REDIRECTS = ['/dashboard', '/settings/gmail']
  const next = ALLOWED_REDIRECTS.includes(redirectParam ?? '') ? redirectParam! : '/dashboard'

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    return NextResponse.redirect(`${origin}/login?error=auth`)
  }

  const [{ data: { user } }, { data: { session } }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.auth.getSession(),
  ])

  if (user) {
    // Gmail scope sekarang diminta saat login — enable sync otomatis
    await supabase
      .from('profiles')
      .update({ gmail_sync_enabled: true })
      .eq('id', user.id)

    // Trigger initial sync langsung setelah login agar gmail_sync_token langsung terinisialisasi
    const accessToken = session?.provider_token ?? null
    if (accessToken) {
      try {
        await inngest.send({
          name: 'gmail/sync.manual',
          data: { userId: user.id, accessToken },
        })
      } catch {
        // Non-blocking — user tetap redirect ke dashboard
      }
    }
  }

  return NextResponse.redirect(`${origin}${next}`)
}
