import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    return NextResponse.json(
      { data: null, error: { code: 'UNAUTHORIZED', message: 'Belum login' } },
      { status: 401 }
    )
  }

  await supabase.auth.signOut()

  return NextResponse.json({ data: null, error: null })
}
