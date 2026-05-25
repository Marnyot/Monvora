import { z } from 'zod'
import { NextResponse } from 'next/server'

const uuidSchema = z.string().uuid()

export function validateUUID(id: string): NextResponse | null {
  if (!uuidSchema.safeParse(id).success) {
    return NextResponse.json(
      { data: null, error: { code: 'VALIDATION_ERROR', message: 'ID tidak valid' } },
      { status: 422 }
    )
  }
  return null
}
