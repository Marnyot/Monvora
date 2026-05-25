import '@testing-library/jest-dom'
import { afterEach, beforeAll, afterAll } from 'vitest'
import { cleanup } from '@testing-library/react'

// Placeholder — MSW server will be wired in once first API routes exist
afterEach(() => {
  cleanup()
})
