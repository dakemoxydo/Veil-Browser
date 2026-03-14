import { session } from 'electron'
import { StateBroadcaster } from '../ipc/StateBroadcaster'

/**
 * ExtensionHost — loads / unloads Chrome extensions via Electron's native
 * Chromium extension subsystem. Supports per-workspace enable/disable.
 */
export class ExtensionHost {
  private loadedExtensions = new Map<string, Electron.Extension>()

  async load(extensionPath: string): Promise<Electron.Extension | null> {
    try {
      const ext = await session.defaultSession.loadExtension(extensionPath, {
        allowFileAccess: true,
      })
      this.loadedExtensions.set(ext.id, ext)
      this._broadcastExtensions()
      console.log(`[ExtensionHost] Loaded: ${ext.name} (${ext.id})`)
      return ext
    } catch (err) {
      console.error('[ExtensionHost] Failed to load extension:', err)
      return null
    }
  }

  async remove(extensionId: string) {
    try {
      await session.defaultSession.removeExtension(extensionId)
      this.loadedExtensions.delete(extensionId)
      this._broadcastExtensions()
      console.log(`[ExtensionHost] Removed extension: ${extensionId}`)
    } catch (err) {
      console.error('[ExtensionHost] Failed to remove extension:', err)
    }
  }

  getAll() {
    return [...this.loadedExtensions.values()]
  }

  private _broadcastExtensions() {
    const extensions = this.getAll().map(ext => ({
      id: ext.id,
      name: ext.name,
      version: ext.version,
      enabled: true,
    }))
    StateBroadcaster.patch({ extensions })
  }
}
