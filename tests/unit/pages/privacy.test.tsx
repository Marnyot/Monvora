import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import PrivacyPage from '@/app/privacy/page'

describe('PrivacyPage', () => {
  it('uses Bahasa Indonesia (heading + intro)', () => {
    render(<PrivacyPage />)
    expect(
      screen.getByRole('heading', { name: /kebijakan privasi/i, level: 1 })
    ).toBeInTheDocument()
  })

  it('discloses Gmail readonly scope (no write/modify)', () => {
    render(<PrivacyPage />)
    const body = document.body.textContent ?? ''
    expect(body).toMatch(/gmail\.readonly/i)
    // Should explicitly say we do NOT modify/send/delete email
    expect(body).toMatch(/tidak.{0,20}(mengubah|menulis|mengirim|menghapus)/i)
  })

  it('discloses Gemini for Gmail parser fallback with body length cap', () => {
    render(<PrivacyPage />)
    const body = document.body.textContent ?? ''
    expect(body).toMatch(/gemini/i)
    // 4000-char cap per security.md §16
    expect(body).toMatch(/4000/i)
  })

  it('discloses Gemini for OCR screenshot processing', () => {
    render(<PrivacyPage />)
    const body = document.body.textContent ?? ''
    expect(body).toMatch(/struk|ocr|foto/i)
    // Image is not persisted
    expect(body).toMatch(/(tidak.{0,40}(disimpan|menyimpan)|dihapus|sementara)/i)
  })

  it('discloses where data is stored (Supabase + Singapore region)', () => {
    render(<PrivacyPage />)
    const body = document.body.textContent ?? ''
    expect(body).toMatch(/supabase/i)
    expect(body).toMatch(/singapura|singapore/i)
  })

  it('describes user rights (access, delete, export)', () => {
    render(<PrivacyPage />)
    const body = document.body.textContent ?? ''
    expect(body).toMatch(/hak/i)
    expect(body).toMatch(/hapus|menghapus/i)
  })

  it('shows last updated / effective date', () => {
    render(<PrivacyPage />)
    const body = document.body.textContent ?? ''
    expect(body).toMatch(/2026|terakhir diperbarui|berlaku/i)
  })

  it('has contact info for privacy questions', () => {
    render(<PrivacyPage />)
    const body = document.body.textContent ?? ''
    expect(body).toMatch(/kontak|email|hubungi/i)
  })
})
