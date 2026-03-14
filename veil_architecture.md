# Veil Browser — Architecture Blueprint

## 1. Mental Model: Three Isolated Layers

```
┌─────────────────────────────────────────────────────────────┐
│  RENDERER PROCESS  (React UI — "The Veil Shell")            │
│  Pure visuals. Zero browser logic. Speaks IPC only.         │
├─────────────────────────────────────────────────────────────┤
│  MAIN PROCESS  (Electron host — "The Engine Room")          │
│  Window mgmt, IPC routing, session, extension host          │
├─────────────────────────────────────────────────────────────┤
│  BROWSER VIEWS  (BrowserView / WebContentsView per tab)     │
│  Each tab = isolated Chromium renderer. Content only.       │
└─────────────────────────────────────────────────────────────┘
```

**Design rule**: the React shell NEVER directly touches a `BrowserView`. It sends events over IPC → Main Process acts → replies with state snapshots.

---

## 2. Process Architecture

### 2.1 Main Process (Node.js + Electron APIs)
Responsibilities:
- Create/destroy/arrange `BrowserWindow` and `BrowserView` instances (one per tab).
- Own the **Tab Registry** (id → BrowserView mapping) inside `ViewManager.ts`.
- Handle all network-level interception via `session.defaultSession.webRequest`.
- Load and sandbox Chrome Extensions via the Chromium extension subsystem.
- Manage **Workspaces** (groups of tab IDs + active extensions per group).
- Run the **Adblock Engine** (`@cliqz/adblocker-electron`) in a Worker Thread.
- Route **IPC** between Renderer and BrowserViews.
- Expose the **AI Bridge** stub (WebGPU or native module socket).
- Persist and manage user **Settings** (general, privacy, appearance, downloads).

### 2.2 Renderer Process — Veil Shell (React)
Responsibilities:
- Render the Liquid Glass chrome: tab bar, address bar, sidebar, overlays.
- Maintain local **UI State** (Zustand store) — tabs metadata, workspace, privacy stats.
- ALL data arrives via `ipcRenderer.on('veil:state-patch', ...)` — unidirectional flow.
- ALL actions are dispatched via `ipcRenderer.invoke('veil:action', { type, payload })`.
- NEVER import `electron` or any Node module. Uses only the preload-exposed `window.veil` API.

### 2.3 Preload Script (sandboxed bridge)
```ts
// preload.ts — the ONLY crossing point
contextBridge.exposeInMainWorld('veil', {
  dispatch: (action) => ipcRenderer.invoke('veil:action', action),
  onStatePatch: (cb) => ipcRenderer.on('veil:state-patch', (_, patch) => cb(patch)),
  onAudioUpdate: (cb) => ipcRenderer.on('veil:audio', (_, data) => cb(data)),
})
```

### 2.4 Worker Threads (Main Process side)
| Thread | Responsibility |
|--------|----------------|
| `adblock.worker.ts` | Filter list loading, URL matching (CPU-heavy) |
| `ai-bridge.worker.ts` | WebGPU model session stub, future local LLM |
| `storage.worker.ts` | SQLite writes for history/bookmarks (non-blocking) |

---

## 3. IPC Contract (Action → Reducer Pattern)

All UI → Main communication follows one channel: `veil:action`.

```ts
// Types shared between main and renderer (packages/shared/actions.ts)
type VeilAction =
  | { type: 'TAB_NEW';       payload: { url?: string; workspaceId: string } }
  | { type: 'TAB_CLOSE';     payload: { tabId: string } }
  | { type: 'TAB_FOCUS';     payload: { tabId: string } }
  | { type: 'TAB_NAVIGATE';  payload: { tabId: string; url: string } }
  | { type: 'TAB_MOVE';      payload: { tabId: string; toWorkspace: string } }
  | { type: 'WORKSPACE_SWITCH'; payload: { id: string } }
  | { type: 'AUDIO_MUTE';    payload: { tabId: string; muted: boolean } }
  | { type: 'SEARCH_QUERY';  payload: { q: string } }   // Command Palette
  | { type: 'ADBLOCK_TOGGLE'; payload: { tabId: string; enabled: boolean } }
```

State is pushed from Main as **patches** (Immer-style) — never full snapshots.

---

## 4. Folder Structure

```
veil-browser/
├── packages/
│   ├── main/                     # Electron Main Process (TypeScript)
│   │   ├── index.ts              # Entry — creates BrowserWindow, initializes all services
│   │   ├── preload.ts            # Sandbox bridge (contextBridge API)
│   │   ├── tabs/
│   │   │   └── ViewManager.ts    # BrowserView lifecycle + TabRegistry + tab events
│   │   ├── workspaces/
│   │   │   └── WorkspaceManager.ts
│   │   ├── network/
│   │   │   ├── AdblockEngine.ts  # Wraps worker, intercepts webRequest
│   │   │   ├── PrivacyStats.ts   # Counts blocked per tab/session
│   │   │   └── ExtensionHost.ts  # Chrome extension loading + messaging
│   │   ├── audio/
│   │   │   └── AudioController.ts # Reads WebContents.audioMuted, WC events
│   │   ├── ipc/
│   │   │   ├── ActionHandler.ts  # switch(action.type) dispatcher
│   │   │   └── StateBroadcaster.ts # Pushes patches to renderer
│   │   ├── settings/
│   │   │   └── SettingsManager.ts # Persist/load user settings (general, privacy, appearance)
│   │   ├── ai/
│   │   │   └── AIBridge.ts       # Stub: exposes WebSocket / native module
│   │   └── workers/
│   │       ├── WorkerManager.ts  # Spawns/manages worker threads
│   │       ├── adblock.worker.ts
│   │       ├── storage.worker.ts
│   │       └── ai-bridge.worker.ts
│   │
│   ├── renderer/                 # React App (Vite + React + TypeScript)
│   │   ├── index.html
│   │   ├── src/
│   │   │   ├── main.tsx          # React root, mounts <VeilShell />
│   │   │   ├── store/
│   │   │   │   ├── useVeilStore.ts     # Zustand global store
│   │   │   │   └── patcher.ts          # Applies immer patches from IPC
│   │   │   ├── components/
│   │   │   │   ├── shell/
│   │   │   │   │   ├── VeilShell.tsx         # Root layout
│   │   │   │   │   ├── TitleBar.tsx           # Draggable, frameless
│   │   │   │   │   └── GlassLayer.tsx         # backdrop-filter host div
│   │   │   │   ├── tabs/
│   │   │   │   │   ├── TabBar.tsx             # Horizontal floating islands
│   │   │   │   │   └── VerticalTabPanel.tsx   # Sidebar variant
│   │   │   │   ├── addressbar/
│   │   │   │   │   └── AddressBar.tsx         # Omnibox + command palette trigger
│   │   │   │   ├── commandpalette/
│   │   │   │   │   └── CommandPalette.tsx      # Ctrl+K overlay
│   │   │   │   ├── privacy/
│   │   │   │   │   └── PrivacyDashboard.tsx    # New tab page stats
│   │   │   │   ├── audio/
│   │   │   │   │   └── AudioController.tsx     # Per-tab audio mixer
│   │   │   │   ├── workspaces/
│   │   │   │   │   └── WorkspaceSwitcher.tsx
│   │   │   │   ├── newTab/
│   │   │   │   │   └── NewTabPage.tsx           # Privacy stats + quick links
│   │   │   │   └── settings/
│   │   │   │       └── SettingsPanel.tsx        # Settings UI panel
│   │   │   ├── hooks/
│   │   │   │   ├── useIPC.ts          # window.veil.dispatch wrapper
│   │   │   │   ├── useTabAudio.ts
│   │   │   │   ├── useCommandPalette.ts
│   │   │   │   └── useSettings.ts     # Settings state & persistence
│   │   │   ├── styles/
│   │   │   │   ├── tokens.css         # CSS custom properties (glass vars)
│   │   │   │   ├── animations.css     # Liquid spring keyframes
│   │   │   │   └── glass.css          # .glass-panel utility class
│   │   │   └── types/
│   │   │       └── veil.d.ts          # window.veil typings
│   │
│   └── shared/                   # Zero-dependency shared types
│       ├── actions.ts             # VeilAction union type
│       ├── state.ts               # VeilState shape
│       └── constants.ts           # IPC channel names, etc.
│
├── assets/
│   └── icons/                    # App icon variants

├── electron-builder.yml          # Build & packaging config
├── package.json                  # Monorepo root (npm workspaces)
├── tsconfig.base.json
└── build.bat                     # Build script

# Note: vite.config.ts is located in packages/renderer/
```

---

## 5. Window Transparency & Glass Effect

```ts
// index.ts (Main Process entry)
new BrowserWindow({
  transparent: true,
  frame: false,
  backgroundMaterial: 'acrylic', // Windows 11 acrylic (also works on macOS with vibrancy)
  backgroundColor: '#00000000',
  titleBarStyle: 'hidden',
  webPreferences: {
    preload: PRELOAD_PATH,
    contextIsolation: true,
    sandbox: true,
    nodeIntegration: false,
  }
})
```

On Windows 11, `backgroundMaterial: 'acrylic'` or `'mica'` gives native OS blur.
On Windows 10 / older, fallback to CSS `backdrop-filter: blur(32px)` over a semi-transparent bg.

---

## 6. CSS Design System — "The Veil Look"

```css
/* tokens.css */
:root {
  --veil-glass-bg:      rgba(10, 10, 15, 0.45);
  --veil-glass-border:  rgba(255, 255, 255, 0.08);
  --veil-blur:          32px;
  --veil-text-primary:  rgba(255, 255, 255, 0.92);
  --veil-text-muted:    rgba(255, 255, 255, 0.45);
  --veil-accent:        rgba(120, 180, 255, 0.85); /* cold blue */
  --veil-danger:        rgba(255, 90, 90, 0.85);
  --veil-spring:        cubic-bezier(0.34, 1.56, 0.64, 1); /* springy */
  --veil-ease:          cubic-bezier(0.4, 0, 0.2, 1);
  --radius-tab:         14px;
  --radius-panel:       20px;
}

.glass-panel {
  background: var(--veil-glass-bg);
  backdrop-filter: blur(var(--veil-blur)) saturate(180%);
  -webkit-backdrop-filter: blur(var(--veil-blur)) saturate(180%);
  border: 1px solid var(--veil-glass-border);
  border-radius: var(--radius-panel);
}
```

Tab "island" animation:
```css
.tab-island {
  transition: opacity 200ms var(--veil-ease),
              transform 300ms var(--veil-spring),
              width 350ms var(--veil-spring);
}
.tab-island:hover { opacity: 1; transform: translateY(-1px); }
.tab-island:not(:hover) { opacity: 0.72; }
```

---

## 7. Adblock Engine Integration

```ts
// AdblockEngine.ts (Main Process)
import { workerData, parentPort } from 'worker_threads'
// Uses @cliqz/adblocker-electron — has native webRequest integration
import { ElectronBlocker } from '@cliqz/adblocker-electron'

class AdblockEngine {
  private blocker: ElectronBlocker

  async init(session: Electron.Session) {
    this.blocker = await ElectronBlocker.fromPrebuiltAdsAndTracking(fetch)
    this.blocker.enableBlockingInSession(session)
    // Fire stats events on each block
    this.blocker.on('request-blocked', (request) => {
      StateBroadcaster.patch({ privacyStats: { blocked: (prev) => prev + 1 } })
    })
  }
}
```

This yields uBlock-level blocking with zero renderer overhead.

---

## 8. Chrome Extension Support

Electron's Chromium engine supports loading unpacked extensions natively:

```ts
// ExtensionHost.ts
async function loadExtension(extensionPath: string) {
  const ext = await session.defaultSession.loadExtension(extensionPath, {
    allowFileAccess: true
  })
  return ext
}
```

**CWS install flow**: intercept `https://chromewebstore.google.com/detail/*/` navigation,
download the `.crx`, extract, call `loadExtension`. A dedicated "Extension Manager" panel
in the React UI shows state.

---

## 9. Command Palette (Ctrl+K)

Sources queried in parallel:
1. Open tabs (from Zustand store — instant)
2. Browser history (IPC call → SQLite FTS5 query → results)
3. Bookmarks (same)
4. Settings (static manifest queried client-side)
5. Web suggestion (debounced IPC → search engine API)

```tsx
// CommandPalette.tsx
const { query, results } = useCommandPalette()
// useCommandPalette debounces input, dispatches SEARCH_QUERY,
// listens to veil:search-results patch
```

---

## 10. Audio Controller

```ts
// AudioController.ts (Main Process)
// Scan all WebContents for audio activity every 500ms
setInterval(() => {
  const audioData = TabRegistry.getAll().map(({ id, view }) => ({
    tabId: id,
    isPlaying: view.webContents.isCurrentlyAudible(),
    muted: view.webContents.isAudioMuted(),
  }))
  StateBroadcaster.emit('veil:audio', audioData)
}, 500)
```

The React `AudioController` component renders a floating glass pill with per-tab sliders.

---

## 11. Workspace Groups

```ts
// WorkspaceManager.ts
interface Workspace {
  id: string
  name: string           // "Work", "Gaming", "Study"
  tabIds: string[]
  activeExtensions: string[]
  icon: string
  accentColor: string    // Per-workspace tint
}
```

On workspace switch:
1. Hide current workspace's BrowserViews.
2. Show new workspace's BrowserViews.
3. Enable/disable extensions per workspace (via `session.loadExtension` / `session.removeExtension`).
4. Broadcast state patch → React re-renders switcher.

---

## 12. AI Bridge Stub

```ts
// AIBridge.ts
// Phase 1: Stub — ready for local model attachment
export class AIBridge {
  // Future: spawn a WebGPU worker or connect to a native module via IPC socket
  async query(prompt: string): Promise<string> {
    return '[AI Bridge: not yet connected]'
  }
}
```

The renderer has an `AIPanel` component that calls `window.veil.dispatch({ type: 'AI_QUERY', payload: { prompt } })` — surfaced when the user presses a dedicated key or clicks the AI button in the shell.

---

## 13. Build & Packaging

```yaml
# electron-builder.yml
appId: dev.veil.browser
productName: Veil Browser
directories:
  output: dist
win:
  target: nsis
  icon: assets/icons/veil.ico
  artifactName: VeilSetup.exe
mac:
  target: dmg
  icon: assets/icons/veil.icns
  hardenedRuntime: true
linux:
  target: AppImage
```

---

## 14. Build Phases (Roadmap)

| Phase | Deliverable |
|-------|-------------|
| **P0 — Scaffold** | Monorepo, Electron window, React shell, IPC plumbing |
| **P1 — Core Browsing** | BrowserView per tab, address bar, back/fwd, basic tabs |
| **P2 — Veil Look** | Liquid Glass CSS, tab islands, animations, transparency |
| **P3 — Adblock** | @cliqz/adblocker-electron, Privacy Dashboard |
| **P4 — Features** | Command Palette, Audio Controller, Workspaces |
| **P5 — Extensions** | CWS install flow, extension manager panel |
| **P6 — AI Bridge** | Worker stub, panel, WebGPU model integration |
| **P7 — Polish** | Intro animation, logo swap, performance profiling |
