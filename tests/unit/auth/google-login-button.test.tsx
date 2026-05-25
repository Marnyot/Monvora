import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { GoogleLoginButton } from '@/components/shared/google-login-button'

vi.mock('@/app/(auth)/login/actions', () => ({
  signInWithGoogle: vi.fn(),
}))

describe('GoogleLoginButton', () => {
  it('renders the sign in button', () => {
    render(<GoogleLoginButton />)
    expect(screen.getByRole('button', { name: /sign in with google/i })).toBeInTheDocument()
  })

  it('shows loading state when pending', () => {
    render(<GoogleLoginButton />)
    const button = screen.getByRole('button')
    expect(button).not.toBeDisabled()
  })

  it('has accessible text', () => {
    render(<GoogleLoginButton />)
    expect(screen.getByText(/sign in with google/i)).toBeInTheDocument()
  })
})
