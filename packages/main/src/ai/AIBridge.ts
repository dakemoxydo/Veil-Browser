import { workerManager } from "../workers/WorkerManager"

/** AI Bridge — uses worker thread for local model inference when available */
export class AIBridge {
  private connected = false

  async connect() {
    console.log("[AIBridge] Connecting to local model...")
    
    const aiWorker = workerManager.get("ai-bridge")
    if (aiWorker) {
      this.connected = true
      console.log("[AIBridge] Connected to AI worker")
    } else {
      console.log("[AIBridge] AI worker not available, using stub")
      this.connected = false
    }
  }

  async query(prompt: string): Promise<string> {
    const aiWorker = workerManager.get("ai-bridge")
    
    if (!aiWorker) {
      return "[Veil AI: worker not available. Using stub response.]"
    }

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        resolve("[Veil AI: Request timed out]")
      }, 30000)

      aiWorker.once("message", (msg) => {
        clearTimeout(timeout)
        if (msg.type === "RESPONSE") {
          resolve(msg.payload.text)
        } else {
          resolve("[Veil AI: Unexpected response]")
        }
      })

      aiWorker.postMessage({ type: "QUERY", payload: { prompt } })
    })
  }

  isConnected(): boolean { 
    return this.connected || !!workerManager.get("ai-bridge")
  }
}
