import type { ViewManager } from '../tabs/ViewManager'
import type { AudioData } from '@veil/shared'
import { IPC_AUDIO } from '@veil/shared'
import { StateBroadcaster } from '../ipc/StateBroadcaster'

const POLL_INTERVAL_MS = 500

export class AudioController {
  private viewManager: ViewManager
  private timer: ReturnType<typeof setInterval> | null = null

  constructor(viewManager: ViewManager) {
    this.viewManager = viewManager
  }

  startPolling() {
    this.timer = setInterval(() => {
      const data: AudioData[] = this.viewManager.getAll().map(({ id, view }) => ({
        tabId: id,
        isAudible: view.webContents.isCurrentlyAudible(),
        isMuted: view.webContents.isAudioMuted(),
      }))
      StateBroadcaster.emit(IPC_AUDIO, data)
    }, POLL_INTERVAL_MS)
  }

  stopPolling() {
    if (this.timer) clearInterval(this.timer)
  }
}
