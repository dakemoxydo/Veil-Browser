import { Worker } from 'worker_threads'
import path from 'path'
import { app } from 'electron'
import fs from 'fs'

export class WorkerManager {
  private workers = new Map<string, Worker>()

  spawn(id: string, workerFileName: string): Worker | null {
    // In production, workers are in asarUnpack: "packages/main/dist/workers/**"
    // __dirname = <app>/resources/app.asar.unpacked/packages/main/dist/workers
    // In development, __dirname = <project>/packages/main/dist/workers
    const isDev = !app.isPackaged
    
    let workerPath: string
    if (isDev) {
      workerPath = path.resolve(__dirname, workerFileName)
    } else {
      // Production: try multiple possible paths
      const basePath = path.dirname(process.execPath)
      const possiblePaths = [
        path.join(basePath, 'resources', 'app.asar.unpacked', 'packages', 'main', 'dist', 'workers', workerFileName),
        path.join(basePath, '..', 'Resources', 'app.asar.unpacked', 'packages', 'main', 'dist', 'workers', workerFileName), // macOS
        path.join(process.resourcesPath, 'app.asar.unpacked', 'packages', 'main', 'dist', 'workers', workerFileName),
      ]
      
      // Find the first existing path
      workerPath = possiblePaths.find(p => {
        try {
          return fs.existsSync(p)
        } catch {
          return false
        }
      }) || possiblePaths[0] // Fallback to first path if none exist (will fail gracefully)
    }

    // Verify worker file exists before spawning
    if (!fs.existsSync(workerPath)) {
      console.error(`[WorkerManager] Worker file not found: ${workerPath}`)
      return null
    }

    try {
      const worker = new Worker(workerPath)
      this.workers.set(id, worker)
      console.log(`[WorkerManager] Spawned worker: ${id} at ${workerPath}`)
      return worker
    } catch (error) {
      console.error(`[WorkerManager] Failed to spawn worker ${id}:`, error)
      return null
    }
  }

  get(id: string): Worker | undefined {
    return this.workers.get(id)
  }

  terminate(id: string) {
    const worker = this.workers.get(id)
    if (worker) {
      worker.terminate()
      this.workers.delete(id)
      console.log(`[WorkerManager] Terminated worker: ${id}`)
    }
  }

  terminateAll() {
    for (const id of this.workers.keys()) {
      this.terminate(id)
    }
  }
}

export const workerManager = new WorkerManager()
