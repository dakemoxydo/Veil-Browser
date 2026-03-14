/**
 * adblock.worker.ts — Worker thread stub for adblock filter loading.
 * Runs in a separate thread to avoid blocking the main process.
 * 
 * Future: Load and compile EasyList/uBlock filter lists here,
 * then expose a fast URL-matching interface via parentPort messaging.
 */
import { parentPort, workerData } from 'worker_threads'

parentPort?.on('message', async (msg: { type: string; url?: string }) => {
  switch (msg.type) {
    case 'CHECK_URL':
      // Stub: always allow for now
      parentPort?.postMessage({ type: 'URL_RESULT', blocked: false, url: msg.url })
      break

    case 'RELOAD_LISTS':
      // Stub: future — download and parse EasyList
      console.log('[adblock.worker] Reloading filter lists (stub)')
      parentPort?.postMessage({ type: 'LISTS_LOADED' })
      break
  }
})

console.log('[adblock.worker] Started with config:', workerData)
