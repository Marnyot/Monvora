/**
 * Google OAuth token management.
 *
 * provider_token dari Supabase session hilang saat middleware me-refresh session JWT.
 * Solusi: simpan token di profiles table dan refresh via Google OAuth2 endpoint jika expired.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

type TokenProfile = {
  google_access_token: string | null
  google_refresh_token: string | null
  google_token_expires_at: string | null
}

/**
 * Ambil access token yang valid untuk user.
 * - Jika token di DB masih valid: return langsung
 * - Jika expired dan ada refresh token + env vars: refresh otomatis
 * - Jika tidak bisa refresh: return null (user perlu login ulang)
 */
export async function getValidGoogleToken(
  profile: TokenProfile,
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<string | null> {
  // Cek apakah token masih valid
  if (profile.google_access_token && profile.google_token_expires_at) {
    const expiresAt = new Date(profile.google_token_expires_at)
    if (expiresAt > new Date()) {
      return profile.google_access_token
    }
  }

  // Token expired atau tidak ada — coba refresh
  if (!profile.google_refresh_token) return null

  const clientId = process.env.GOOGLE_CLIENT_ID ?? process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  if (!clientId || !clientSecret) return null

  const refreshed = await refreshGoogleAccessToken(
    profile.google_refresh_token,
    clientId,
    clientSecret
  )
  if (!refreshed) return null

  // Simpan token baru di DB
  const expiresAt = new Date(Date.now() + refreshed.expires_in * 1000).toISOString()
  await supabase
    .from('profiles')
    .update({
      google_access_token: refreshed.access_token,
      google_token_expires_at: expiresAt,
    })
    .eq('id', userId)

  return refreshed.access_token
}

async function refreshGoogleAccessToken(
  refreshToken: string,
  clientId: string,
  clientSecret: string
): Promise<{ access_token: string; expires_in: number } | null> {
  try {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    })
    if (!res.ok) return null
    const data = await res.json() as { access_token?: string; expires_in?: number }
    if (!data.access_token || !data.expires_in) return null
    return { access_token: data.access_token, expires_in: data.expires_in }
  } catch {
    return null
  }
}
