/**
 * ai-bridge.worker.ts — Worker thread stub for local AI model inference.
 *
 * Future:
 *  - Load a GGUF/ONNX model via WebGPU or native binding
 *  - Expose a streaming inference API via parentPort
 *  - Integrate with Ollama socket or similar local LLM server
 */
import { parentPort } from 'worker_threads'

export type AIMessage =
  | { type: 'QUERY'; payload: { prompt: string; sessionId?: string } }
  | { type: 'CANCEL'; payload: { sessionId: string } }

export type AIResponse =
  | { type: 'RESPONSE'; payload: { text: string; sessionId?: string } }

parentPort?.on('message', (msg: AIMessage) => {
  switch (msg.type) {
    case 'QUERY':
      // Stub: return a placeholder response immediately
      parentPort?.postMessage({
        type: 'RESPONSE',
        payload: { text: '[Veil AI: local model not yet connected. Coming soon.]' },
      } satisfies AIResponse)
      break

    case 'CANCEL':
      // Stub: future — interrupt inference
      break
  }
})

console.log('[ai-bridge.worker] Started. WebGPU inference not yet connected.')
