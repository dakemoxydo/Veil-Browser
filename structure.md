# Veil Browser — Архитектура проекта

## Обзор

Electron 42 + React 19 браузер с акцентом на приватность. Монолитный npm-workspace монорепо с 3 пакетами: `@veil/shared`, `@veil/main`, `@veil/renderer`.

```
VeilBrowserAi/
├── packages/shared/      # Чистые типы, константы, утилиты (без зависимостей)
├── packages/main/        # Electron main process
└── packages/renderer/    # React UI (Vite + Zustand)
```

---

## Пакеты

### `@veil/shared` — Общие типы

| Экспорт | Описание |
|---|---|
| `VeilState` | Полный shape состояния: tabs, activeTabId, privacyStats, logs, bookmarks, downloads, settings |
| `VeilAction` | Discriminated union из 17 типов действий |
| `VeilAPI` | Интерфейс `window.veil` (11 методов) |
| `TabInfo`, `BookmarkItem`, `HistoryEntry`, `DownloadItem`, `VeilSettings` | Модели данных |
| `LogLevel`, `LogEntry`, `IPCResult` | Сервисные типы |
| `SearchEngine` | `'duckduckgo' | 'google' | 'brave' | 'custom'` |
| `DEFAULT_SETTINGS` | Дефолтные настройки |
| `getSearchUrl()` | Утилита формирования URL поисковой системы |

### `@veil/main` — Main process

#### Core (8 файлов)

| Файл | Назначение |
|---|---|
| `ServiceRegistry` | Контейнер сервисов. Регистрирует `VeilService`, dispatch IPC `veil:action` во все сервисы, обрабатывает `veil:get-state` |
| `EventBus` | Синглтон pub/sub. `on<T>`, `off`, `emit<T>`, `once<T>`. История 1000 событий |
| `StateBroadcaster` | Синглтон. Хранит канонический `VeilState`, отправляет полное состояние в renderer через `veil:state-patch` |
| `VeilWindow` | Основное окно `BaseWindow` (frameless, 1200x800) + `WebContentsView` для renderer UI + `ViewManager` для табов |
| `ViewManager` | Управляет `WebContentsView` для табов: create, focus, hide, close, resize с dynamic shell offset |
| `DebugWindow` | Синглтон. Второе окно `BaseWindow` загружает renderer по `/#/debug` |
| `ErrorHandler` | Синглтон. До 1000 ошибок, логирование по severity, emit `DEBUG_ERROR` |
| `Logger` | Структурированный логгер (DEBUG/INFO/WARN/ERROR), source-tagging, emit `DEBUG_LOG` в EventBus |
| `AppConfig` | Синглтон конфигурации: dev (port 3000), пути (userData, extensions, downloads), фичи (adblock, extensions, debug) |

#### Application Services (6 файлов)

| Файл | Действия | События | Хранение |
|---|---|---|---|
| `NewTabService` | TAB_NEW, TAB_CLOSE, TAB_FOCUS, TAB_NAVIGATE, TAB_GO_BACK/FORWARD, RELOAD, HOME | emit TAB_NAVIGATED, TAB_TITLE_CHANGED | in-memory |
| `NewBookmarkService` | BOOKMARK_ADD, BOOKMARK_REMOVE | emit BOOKMARK_ADDED/REMOVED | `bookmarks.json` |
| `NewHistoryService` | HISTORY_CLEAR | слушает TAB_NAVIGATED, TAB_TITLE_CHANGED | `history.json` |
| `NewDownloadService` | DOWNLOAD_CANCEL, OPEN, SHOW_IN_FOLDER | emit DOWNLOAD_STARTED/PROGRESS/COMPLETED | in-memory |
| `NewSettingsService` | SETTINGS_UPDATE | emit SETTINGS_CHANGED | `settings.json` |
| `PersistenceService` | — | — | Файловый JSON I/O, debounce 500ms, flushAll on quit |

#### Services (3 файла)

| Файл | Назначение |
|---|---|
| `AdblockService` | Перехватывает запросы через `session.webRequest.onBeforeRequest`, блокирует по доменному списку, считает blocked stats |
| `ContextMenuService` | Нативное контекстное меню. Авто-регистрация на все webContents через `app.on('web-contents-created')` |
| `ExtensionService` | Поддержка Chrome расширений через `electron-chrome-extensions` |

#### Entry Points (2 файла)

| Файл | Назначение |
|---|---|
| `index.ts` | Bootstrap: создаёт окна, регистрирует IPC handlers, инстанцирует сервисы, регистрирует горячие клавиши, lifecycle |
| `preload.ts` | Context bridge: expose `window.veil` API (dispatch, getState, onStatePatch, addLog, minimize/maximize/close, setShellOffset, onShortcut) |

### `@veil/renderer` — React UI

#### Store (`useVeilStore.ts`)

Zustand store, mirror `VeilState` + локальные поля `currentView` и `logs`:

```typescript
{
  // Синхронизируется с main process:
  tabs: TabInfo[]
  activeTabId: string | null
  privacyStats: { blockedTotal, blockedCurrent }
  bookmarks: BookmarkItem[]
  downloads: DownloadItem[]
  settings: VeilSettings

  // Локально:
  currentView: 'browser' | 'settings'
  logs: LogEntry[]  // max 500
}
```

- `dispatch(action)` → `window.veil.dispatch(action)` → IPC → main process
- `applyPatch(fullState)` → merge входящего состояния, сохраняя local-only поля
- `initVeilStore()` → fetch initial state + subscribe onStatePatch

#### Components (10 файлов)

```
<VeilShell>
├── <Sidebar />                     # Вертикальный список табов (conditional)
├── <div.main-content>
│   ├── <TitleBar />                # Frameless window controls (min/max/close)
│   ├── <TabBar />                  # Горизонтальная полоса табов + "+"
│   ├── <AddressBar />              # Навигация + omnibox + bookmark + DownloadPanel + settings
│   │   └── <DownloadPanel />       # Выпадающая панель загрузок
│   ├── <BookmarkBar />             # Панель закладок (conditional)
│   ├── <div#browser-view-container>
│   │   ├── IF settings: <SettingsPage />
│   │   ├── ELSE IF no tabs: <HomePage />
│   │   └── ELSE: (WebContentsViews из main process)
│   └── <StatusBar />               # Индикатор загрузки + URL
└── <DebugPanel />                  # Оверлей debug-консоли
```

**Важно:** Табы — это НЕ React компоненты. Это `WebContentsView` из main process, позиционируемые поверх `#browser-view-container`. React UI — это "оболочка" вокруг них.

#### Styles (2 файла)

| Файл | Содержимое |
|---|---|
| `tokens.css` | CSS custom properties: цвета (light + dark), типографика, spacing, radii, transitions, component heights. Принудительно `color-scheme: dark` |
| `glass.css` | Стили компонентов: `.tab-item`, `.nav-btn`, `.omnibox`, `.toolbar-btn`, `.dropdown-menu`, `.bookmark-item`, `.status-bar` |

---

## IPC Каналы

| Канал | Направление | Назначение |
|---|---|---|
| `veil:action` | Renderer → Main | Все пользовательские действия (17 типов). Broadcast во все сервисы |
| `veil:get-state` | Renderer → Main | Получить полный VeilState (один раз при init) |
| `veil:state-patch` | Main → Renderer | Отправка полного состояния после каждого изменения |
| `veil:window-minimize/maximize/close` | Renderer → Main | Управление окном |
| `veil:open-debug/close-debug` | Renderer → Main | Управление debug окном |
| `veil:add-log` | Renderer → Main | Пересылка логов в debug window |
| `veil:set-shell-offset` | Renderer → Main | ViewManager позиционирование табов |
| `veil:shortcut` | Main → Renderer | Уведомления о горячих клавишах (close-tab, reload, find) |
| `veil:log` | Main → Debug Window | Логи для debug окна |

### Поток данных

```
RENDERER                              MAIN PROCESS
─────────                             ────────────
User action
  → store.dispatch(action)
    → window.veil.dispatch(action)
      → IPC veil:action ───────────→ ServiceRegistry.handleAction
                                       → broadcast ALL services
                                       → StateBroadcaster.patch()
                                         → IPC veil:state-patch ──→ store.applyPatch()
                                                                      → React re-render

Init:
  initVeilStore()
    → getState() ─────────────────→ StateBroadcaster.getState()
    ← full state ←────────────────┘
    → onStatePatch(cb) ───────────→ подписка на veil:state-patch
```

---

## Сервисная архитектура

### VeilService interface

```typescript
interface VeilService {
  name: string;
  init(): void | Promise<void>;
  handleAction?(action: VeilAction): void | Promise<void>;
}
```

### Регистрация в bootstrap (`index.ts`)

```
ServiceRegistry
  ├── NewSettingsService        → SettingsService
  ├── NewTabService(ViewManager)→ TabService
  ├── NewHistoryService         → HistoryService
  ├── NewBookmarkService        → BookmarkService
  ├── NewDownloadService        → DownloadService
  ├── ContextMenuService(win,Tab,Settings) → ContextMenuService
  ├── ExtensionService(win)     → ExtensionService
  └── AdblockService(Settings)  → AdblockService
```

### Паттерн dispatch

Каждое действие `VeilAction` broadcastится ВСЕМ зарегистрированным сервисам. Каждый сервис проверяет `action.type` и обрабатывает только релевантные. Остальные игнорирует.

---

## События (EventBus)

| Событие | Emitter | Listener |
|---|---|---|
| `tab:navigated` | NewTabService | NewHistoryService (запись в историю) |
| `tab:title-changed` | NewTabService | NewHistoryService (обновление заголовка) |
| `bookmark:added/removed` | NewBookmarkService | — (debug log only) |
| `download:started/completed` | NewDownloadService | — (debug log only) |
| `settings:changed` | NewSettingsService | — (debug log only) |
| `debug:log` | Logger | DebugWindow |
| `debug:error` | ErrorHandler | DebugWindow |

---

## Горячие клавиши

| Комбинация | Действие |
|---|---|
| `Ctrl+T` | Новый таб |
| `Ctrl+W` | Закрыть таб (через veil:shortcut) |
| `Ctrl+R` | Перезагрузить (через veil:shortcut) |
| `Ctrl+F` | Поиск (через veil:shortcut) |
| `Ctrl+Shift+D` | Открыть/закрыть debug окно |
| `Ctrl+Shift+I` | DevTools |
| `F11` | Полноэкранный режим |

---

## Хранение данных

Все файлы в `{app.getPath('userData')}/VeilBrowser/`:

| Файл | Сервис | Содержимое |
|---|---|---|
| `settings.json` | NewSettingsService | VeilSettings |
| `bookmarks.json` | NewBookmarkService | BookmarkItem[] |
| `history.json` | NewHistoryService | HistoryEntry[] |

Загрузки хранятся только в памяти (теряются при перезапуске).

---

## Сборка

### npm workspaces монорепо

```bash
npm run build       # tsc -b (shared → main → renderer)
npm run dev         # tsc -w (main) + vite dev server (renderer, port 3000)
npm run package     # electron-builder --win --x64 → release/
```

### TypeScript

- Base: ESNext target, strict, `@veil/shared` path alias
- Main: CommonJS module, Node moduleResolution
- Renderer: ESNext module, Bundler moduleResolution, JSX react-jsx

### Vite

- React plugin, `base: './'` (для file:// в production)
- Target: chrome134 (Electron 42 Chromium)
- Alias: `@veil/shared` → source .ts (не dist)

### Electron Builder

- App ID: `com.veil.browser`
- Windows: portable .exe
- Включает: main/dist, renderer/dist, shared/dist, package.json

---

## Безопасность

- `contextIsolation: true` + `sandbox: true` на всех окнах и табах
- `nodeIntegration: false` (по умолчанию)
- Preload exposes only `window.veil` API через contextBridge
- URL фильтрация в AddressBar: block `file://`, `data:`, `javascript:`, `chrome://`
- `setWindowOpenHandler` deny на всех табах

---

## Типы данных (shared)

```typescript
TabInfo       { id, url, title, isLoading, canGoBack, canGoForward, favicon?, loadProgress }
BookmarkItem  { id, url, title, favicon?, dateAdded, folder? }
HistoryEntry  { id, url, title, favicon?, timestamp }
DownloadItem  { id, filename, url, path, totalBytes, receivedBytes, state, startTime }
VeilSettings  { general: { homepage, searchEngine, customSearchUrl, downloadPath, restoreTabsOnLaunch }, privacy: { adblockEnabled, blockTrackers, doNotTrack }, appearance: { showBookmarksBar, showSidebar } }
VeilState     { tabs, activeTabId, privacyStats, logs, bookmarks, downloads, settings }
VeilAction    // Discriminated union: TAB_NEW | TAB_CLOSE | TAB_NAVIGATE | ... (17 типов)
```
