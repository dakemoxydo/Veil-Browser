/**
 * storage.worker.ts — Worker thread for non-blocking SQLite writes.
 * Handles: history, bookmarks, settings persistence.
 *
 * Future: Use better-sqlite3 in synchronous mode within this Worker
 * so DB writes never block the main/renderer event loops.
 */
import { parentPort } from 'worker_threads'

export type StorageMessage =
  | { type: 'HISTORY_ADD';    payload: { url: string; title: string; visitedAt: number } }
  | { type: 'BOOKMARK_ADD';   payload: { url: string; title: string; favicon?: string } }
  | { type: 'BOOKMARK_REMOVE'; payload: { url: string } }
  | { type: 'HISTORY_QUERY';  payload: { q: string } }

export type StorageResponse =
  | { type: 'HISTORY_RESULTS'; results: unknown[] }

parentPort?.on('message', (msg: StorageMessage) => {
  switch (msg.type) {
    case 'HISTORY_ADD':
      // Stub: future — INSERT INTO history VALUES(...)
      console.log('[storage.worker] History add:', msg.payload.url)
      break

    case 'BOOKMARK_ADD':
      // Stub: future — INSERT INTO bookmarks VALUES(...)
      console.log('[storage.worker] Bookmark add:', msg.payload.url)
      break

    case 'BOOKMARK_REMOVE':
      // Stub: future — DELETE FROM bookmarks WHERE url = ?
      console.log('[storage.worker] Bookmark remove:', msg.payload.url)
      break

    case 'HISTORY_QUERY':
      // Stub: return empty results
      parentPort?.postMessage({ type: 'HISTORY_RESULTS', results: [] } satisfies StorageResponse)
      break
  }
})

console.log('[storage.worker] Started')
