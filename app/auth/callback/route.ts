import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { z } from 'zod'

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
    // provider_token hanya tersedia tepat setelah exchangeCodeForSession, sebelum session di-refresh.
    // Simpan ke profiles sekarang agar sync tetap bisa berjalan setelah middleware me-refresh session.
    const accessToken = session?.provider_token ?? null
    const refreshToken = session?.provider_refresh_token ?? null
    const expiresAt = accessToken
      ? new Date(Date.now() + 3500 * 1000).toISOString() // 3500 detik (konservatif dari 3600)
      : null

    await supabase
      .from('profiles')
      .update({
        gmail_sync_enabled: true,
        google_access_token: accessToken,
        google_refresh_token: refreshToken ?? undefined,
        google_token_expires_at: expiresAt,
      })
      .eq('id', user.id)
  }

  return NextResponse.redirect(`${origin}${next}`)
}
