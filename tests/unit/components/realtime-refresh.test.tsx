import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest'
import { render } from '@testing-library/react'
import { RealtimeRefresh } from '@/components/dashboard/realtime-refresh'

const mockRefresh = vi.fn()
const mockRemoveChannel = vi.fn()
const mockChannel = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}))

vi.mock('@/lib/hooks/use-session', () => ({
  useSession: vi.fn(),
}))

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(),
}))

import { useSession } from '@/lib/hooks/use-session'
import { createClient } from '@/lib/supabase/client'

function buildChannelObj() {
  const obj: { on: Mock; subscribe: Mock } = {
    on: vi.fn(),
    subscribe: vi.fn(),
  }
  obj.on.mockReturnValue(obj)
  obj.subscribe.mockReturnValue(obj)
  return obj
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('RealtimeRefresh', () => {
  it('renders nothing visible', () => {
    ;(useSession as Mock).mockReturnValue({ user: null, loading: false })
    ;(createClient as Mock).mockReturnValue({ channel: mockChannel, removeChannel: mockRemoveChannel })

    const { container } = render(<RealtimeRefresh />)
    expect(container.firstChild).toBeNull()
  })

  it('does not subscribe when userId is empty', () => {
    ;(useSession as Mock).mockReturnValue({ user: null, loading: false })
    ;(createClient as Mock).mockReturnValue({ channel: mockChannel, removeChannel: mockRemoveChannel })

    render(<RealtimeRefresh />)

    expect(mockChannel).not.toHaveBeenCalled()
  })

  it('does not subscribe while session is loading', () => {
    ;(useSession as Mock).mockReturnValue({ user: null, loading: true })
    ;(createClient as Mock).mockReturnValue({ channel: mockChannel, removeChannel: mockRemoveChannel })

    render(<RealtimeRefresh />)

    expect(mockChannel).not.toHaveBeenCalled()
  })

  it('subscribes to channel with correct user_id filter when userId is available', () => {
    ;(useSession as Mock).mockReturnValue({ user: { id: 'user-123' }, loading: false })

    const channelObj = buildChannelObj()
    mockChannel.mockReturnValue(channelObj)
    ;(createClient as Mock).mockReturnValue({ channel: mockChannel, removeChannel: mockRemoveChannel })

    render(<RealtimeRefresh />)

    expect(mockChannel).toHaveBeenCalledWith('realtime-refresh-user-123')
    expect(channelObj.on).toHaveBeenCalledTimes(2)

    const [, insertFilter] = channelObj.on.mock.calls[0]
    expect(insertFilter).toMatchObject({
      event: 'INSERT',
      table: 'transactions',
      filter: 'user_id=eq.user-123',
    })

    const [, updateFilter] = channelObj.on.mock.calls[1]
    expect(updateFilter).toMatchObject({
      event: 'UPDATE',
      table: 'transactions',
      filter: 'user_id=eq.user-123',
    })
  })

  it('calls router.refresh() on INSERT event', () => {
    ;(useSession as Mock).mockReturnValue({ user: { id: 'user-abc' }, loading: false })

    const channelObj = buildChannelObj()
    mockChannel.mockReturnValue(channelObj)
    ;(createClient as Mock).mockReturnValue({ channel: mockChannel, removeChannel: mockRemoveChannel })

    render(<RealtimeRefresh />)

    const insertCallback = channelObj.on.mock.calls[0][2] as () => void
    insertCallback()

    expect(mockRefresh).toHaveBeenCalledTimes(1)
  })

  it('calls router.refresh() on UPDATE event', () => {
    ;(useSession as Mock).mockReturnValue({ user: { id: 'user-abc' }, loading: false })

    const channelObj = buildChannelObj()
    mockChannel.mockReturnValue(channelObj)
    ;(createClient as Mock).mockReturnValue({ channel: mockChannel, removeChannel: mockRemoveChannel })

    render(<RealtimeRefresh />)

    const updateCallback = channelObj.on.mock.calls[1][2] as () => void
    updateCallback()

    expect(mockRefresh).toHaveBeenCalledTimes(1)
  })

  it('unsubscribes channel on unmount', () => {
    ;(useSession as Mock).mockReturnValue({ user: { id: 'user-xyz' }, loading: false })

    const channelObj = buildChannelObj()
    mockChannel.mockReturnValue(channelObj)
    ;(createClient as Mock).mockReturnValue({ channel: mockChannel, removeChannel: mockRemoveChannel })

    const { unmount } = render(<RealtimeRefresh />)
    unmount()

    expect(mockRemoveChannel).toHaveBeenCalledWith(channelObj)
  })
})
