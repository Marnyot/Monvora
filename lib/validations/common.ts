import { z } from 'zod'
import { NextResponse } from 'next/server'

const uuidSchema = z.string().uuid()

export function validateUUID(id: string): NextResponse | null {
  if (!uuidSchema.safeParse(id).success) {
    return NextResponse.json(
      { data: null, error: { code: 'INVALID_ID', message: 'ID tidak valid' } },
      { status: 400 }
    )
  }
  return null
}
