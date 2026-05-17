# Veil Browser Initial Scaffold Plan

## Overview
This plan focuses on setting up a modular foundation for the Veil Browser, an Electron-based application with a high-fidelity Liquid Glass React UI.

**Project Type:** WEB (Electron Desktop)

## Success Criteria
1. Monorepo structure initialized with npm workspaces.
2. Main process services decoupled (Window from Tabs from IPC).
3. Liquid Glass design system tokens defined in CSS.
4. Hot-reloading development environment for both Main and Renderer.

## Tech Stack
- **Framework:** Electron + React (Vite)
- **Styling:** Vanilla CSS (Liquid Glass custom system)
- **State:** Zustand (Store) + Immer (Patches)
- **Engine:** Chromium (via Electron BrowserView)
- **Extensions:** `electron-chrome-extensions`

## File Structure
```
veil-browser/
├── packages/
│   ├── main/                  # Electron Main Process
│   │   ├── core/              # Window & View management
│   │   ├── services/          # Modular handlers (Adblock, Auth)
│   │   └── index.ts           # Service Registry
│   ├── renderer/              # React UI Shell
│   │   ├── src/
│   │   │   ├── components/    # Glass components
│   │   │   ├── store/         # Zustand store
│   │   │   └── styles/        # Liquid Glass tokens
│   └── shared/                # Types & IPC definitions
├── package.json               # Root build scripts
└── tsconfig.base.json         # Base TS config
```

## Task Breakdown

### Phase 1: Infrastructure
- **task_id:** `infra-001`
- **name:** Initialize Monorepo
- **agent:** `backend-specialist`
- **INPUT:** Project requirements
- **OUTPUT:** `package.json` with workspaces, `tsconfig.base.json`
- **VERIFY:** `npm install` runs successfully in root.

### Phase 2: Modular Main Process
- **task_id:** `main-001`
- **name:** Implement Window & View Managers
- **agent:** `backend-specialist`
- **INPUT:** `electron` API
- **OUTPUT:** `VeilWindow.ts`, `ViewManager.ts`
- **VERIFY:** Main process launches a transparent window and attaches a BrowserView.

### Phase 3: Renderer & Styling
- **task_id:** `ui-001`
- **name:** Liquid Glass Design System
- **agent:** `frontend-specialist`
- **skills:** `frontend-design`
- **INPUT:** Glassmorphism specs
- **OUTPUT:** `glass.css`, `tokens.css`
- **VERIFY:** UI elements exhibit deep blur and liquid micro-animations.

## Phase X: Verification
- [ ] Security scan (`security_scan.py`)
- [ ] UX Audit (`ux_audit.py`)
- [ ] Build test (`npm run build`)

---

## Build & Packaging Rules

### Rule 1: @veil/shared Path Resolution in Packaged App

**Problem:** TypeScript compiles `import { X } from '@veil/shared'` into `require("@veil/shared")`. In the packaged asar, npm workspace symlinks don't exist, so the module can't be resolved.

**Solution:** The build script must replace `@veil/shared` with relative paths after TypeScript compilation but before electron-builder packaging.

**Critical depth formula:**
```powershell
$depth = ($relPath).Split('\').Count - 1
$prefix = '../' * ($depth + 2)
```
- Files in `packages/main/dist/` (root) → depth=0 → `../../shared/dist`
- Files in `packages/main/dist/core/` → depth=1 → `../../../shared/dist`
- Files in `packages/main/dist/services/` → depth=1 → `../../../shared/dist`

**Why `+2`:** The base path is `packages/main/dist/`. To reach `packages/shared/dist/`, we need to go up to `packages/` (2 levels above `dist/`), plus the subdirectory depth.

**Verification:** After build, check compiled JS files:
```bash
grep -r "shared/dist" packages/main/dist/ --include="*.js"
```
All paths should resolve correctly relative to their location.

### Rule 2: Preload Path in Packaged App

**Problem:** `path.join(__dirname, '../preload.js')` works in dev but fails in packaged app where `__dirname` points inside the asar archive.

**Solution:** Always use `app.isPackaged` guard. The compiled preload.js is in `dist/`:
```typescript
const preloadPath = app.isPackaged
  ? path.join(process.resourcesPath, 'app.asar', 'packages', 'main', 'dist', 'preload.js')
  : path.join(__dirname, '../preload.js');
```

**Critical:** The path must include `dist/` because TypeScript compiles `preload.ts` → `dist/preload.js`. Without `dist/`, the preload script won't be found and `window.veil` will be undefined — the renderer will show an empty window with no UI.

**Applies to:** Every `BrowserWindow` with `contextIsolation: true` — both `VeilWindow` and `DebugWindow`.

### Rule 3: Build Log Paths

**Problem:** Relative log paths break when `cd` changes directory mid-script.

**Solution:** Use `%~dp0` for absolute paths:
```batch
set BUILD_DIR=%~dp0logs
set BUILD_LOG=%BUILD_DIR%\build_%SESSION_ID%.log
```
Use `pushd`/`popd` instead of `cd`/`cd ../..` for directory changes.

### Rule 4: Renderer URL in Packaged App

**Problem:** `file://${__dirname}/../renderer/dist/index.html` fails in packaged app because `__dirname` includes the asar archive path and `..` resolution may not work correctly.

**Solution:** Use `app.getAppPath()` for the renderer URL:
```typescript
const url = isDev
  ? 'http://localhost:3000'
  : `file://${path.join(app.getAppPath(), 'packages/renderer/dist/index.html')}`;
```

**Why:** `app.getAppPath()` returns the root of the application (inside asar), making path construction reliable.

### Rule 5: Pre-Implementation Checklist for Packaging

Before any change that affects module imports or file paths:
1. Does this file get compiled to JS? → Check the compiled output
2. Does it import from another package? → Verify the path works in asar
3. Does it reference `__dirname`? → Use `app.getAppPath()` or `app.isPackaged` guard instead
4. Does the build script change directories? → Use absolute paths for I/O
5. Does it load a file from the app? → Use `app.getAppPath()` for reliable path resolution
