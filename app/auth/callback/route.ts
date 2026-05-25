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

  // Whitelist-based redirect — only allow known internal paths
  const ALLOWED_REDIRECTS = ['/settings/gmail', '/dashboard']
  const next = ALLOWED_REDIRECTS.includes(redirectParam ?? '') ? redirectParam! : '/dashboard'

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (!error) {
    // When redirected from Gmail connect flow, enable sync
    if (next === '/settings/gmail') {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase
          .from('profiles')
          .update({ gmail_sync_enabled: true })
          .eq('id', user.id)
      }
    }
    return NextResponse.redirect(`${origin}${next}`)
  }

  return NextResponse.redirect(`${origin}/login?error=auth`)
}
