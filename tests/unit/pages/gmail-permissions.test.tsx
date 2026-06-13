import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import GmailPermissionsPage from '@/app/gmail-permissions/page'

describe('GmailPermissionsPage', () => {
  it('uses Bahasa Indonesia heading', () => {
    render(<GmailPermissionsPage />)
    expect(
      screen.getByRole('heading', { name: /akses gmail|izin gmail|kenapa.*gmail/i, level: 1 })
    ).toBeInTheDocument()
  })

  it('discloses gmail.readonly scope explicitly', () => {
    render(<GmailPermissionsPage />)
    const body = document.body.textContent ?? ''
    expect(body).toMatch(/gmail\.readonly/)
  })

  it('lists supported bank sender patterns (Mandiri, BCA, BNI, BRI, CIMB)', () => {
    render(<GmailPermissionsPage />)
    const body = document.body.textContent ?? ''
    expect(body).toMatch(/mandiri/i)
    expect(body).toMatch(/bca/i)
    expect(body).toMatch(/bni/i)
    expect(body).toMatch(/bri/i)
    expect(body).toMatch(/cimb/i)
  })

  it('lists fields extracted from emails', () => {
    render(<GmailPermissionsPage />)
    const body = document.body.textContent ?? ''
    expect(body).toMatch(/nominal|jumlah|amount/i)
    expect(body).toMatch(/merchant|toko|penerima/i)
    expect(body).toMatch(/waktu|tanggal/i)
  })

  it('lists what we DO NOT do (write/modify/send/delete)', () => {
    render(<GmailPermissionsPage />)
    const body = document.body.textContent ?? ''
    expect(body).toMatch(/tidak.{0,30}(mengubah|menulis|mengirim|menghapus|membaca email lain)/i)
  })

  it('explains how to revoke access', () => {
    render(<GmailPermissionsPage />)
    const body = document.body.textContent ?? ''
    expect(body).toMatch(/cabut|putus|revoke|mencabut/i)
    expect(body).toMatch(/myaccount\.google\.com|account\.google\.com/i)
  })

  it('links to privacy policy', () => {
    render(<GmailPermissionsPage />)
    const links = screen.getAllByRole('link')
    const privacyLink = links.find((a) => a.getAttribute('href') === '/privacy')
    expect(privacyLink).toBeDefined()
  })

  it('explains token handling (server-side only, not in browser)', () => {
    render(<GmailPermissionsPage />)
    const body = document.body.textContent ?? ''
    expect(body).toMatch(/server|backend/i)
    expect(body).toMatch(/(localStorage|browser|peramban)/i)
  })
})
