import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { checkRateLimit } from '@/lib/utils/rate-limit'

export async function POST(request: Request) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json(
      { data: null, error: { code: 'UNAUTHORIZED', message: 'Belum login' } },
      { status: 401 }
    )
  }

  const rl = checkRateLimit(user.id, '/api/auth')
  if (!rl.allowed) {
    return NextResponse.json(
      { data: null, error: { code: 'RATE_LIMITED', message: 'Terlalu banyak permintaan' } },
      { status: 429 }
    )
  }

  await supabase.auth.signOut()
  return NextResponse.json({ data: null, error: null })
}
