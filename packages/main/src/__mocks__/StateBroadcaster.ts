// Mock StateBroadcaster for testing
import type { VeilState } from '@veil/shared'

class MockStateBroadcaster {
  private win: any = null
  public patch = vi.fn()
  public emit = vi.fn()
  public init = vi.fn()

  reset() {
    this.patch.mockClear()
    this.emit.mockClear()
    this.win = null
  }
}

export const StateBroadcaster = new MockStateBroadcaster()
