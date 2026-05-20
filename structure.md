# Veil Browser — Архитектура проекта

## Обзор

Electron 42 + React 19 приватный браузер. Монорепо с 3 пакетами и Clean Architecture (4 слоя). 123 файла, 78 тестов.

```
VeilBrowserAi/
├── packages/shared/      # Доменные модели, типы, константы (16 .ts)
├── packages/main/        # Electron main process (66 .ts)
└── packages/renderer/    # React UI (31 .tsx + 11 .ts)
```

---

## Архитектурные слои

```
┌─────────────────────────────────────────────────────┐
│                    Renderer (React)                  │
│  9 Zustand slices → dispatch(action) → window.veil  │
│  29 компонентов, 9 internal pages (veil://)          │
└──────────────────────┬──────────────────────────────┘
                       │ IPC (veil:action + 37 каналов)
┌──────────────────────▼──────────────────────────────┐
│              Application Services                    │
│  TabService, BookmarkService, HistoryService, etc.   │
│  ┌─────────────────────────────────────────────┐    │
│  │              7 Use Cases                     │    │
│  │  CreateTab, CloseTab, NavigateTab, etc.      │    │
│  └─────────────────────────────────────────────┘    │
└──────────────────────┬──────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────┐
│                    Core (Ports & Interfaces)          │
│  ISession, ITabViewProvider                          │
│  5 Repository interfaces                             │
│  EventBus, ErrorHandler, StateBroadcaster, Logger    │
└──────────────────────┬──────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────┐
│              Infrastructure (Adapters & Services)     │
│  ElectronSession, ViewManagerAdapter                 │
│  5 Repository implementations                        │
│  13 Feature Services                                 │
└─────────────────────────────────────────────────────┘
```

### Dependency Rule

Зависимости направлены внутрь:
- `infrastructure/` → зависит от `core/ports/` и `core/repositories/`
- `application/services/` → зависит от `core/` и `application/usecases/`
- `core/ports/` → НЕ зависит ни от чего внешнего
- `shared/domain/` → НЕ зависит от `main/`

---

## Пакеты

### `@veil/shared` — Доменные модели и типы (16 файлов)

#### Типы (index.ts)

| Экспорт | Описание |
|---|---|
| `VeilState` | Полный shape состояния: tabs, activeTabId, recentlyClosed, tabGroups, privacyStats, logs, bookmarks, downloads, settings, certExceptions, scriptBlockList, zoomLevel |
| `VeilAction` | Discriminated union из 33 типов действий |
| `VeilAPI` | Интерфейс `window.veil` (42 метода) |
| `TabInfo` | { id, url, title, isLoading, canGoBack, canGoForward, favicon, loadProgress, pinned, muted, isPlayingAudio, groupId } |
| `TabGroup` | { id, name, color, collapsed } |
| `ToastItem` | { id, message, type, timestamp } |
| `BookmarkItem` | { id, url, title, favicon, dateAdded, folder } |
| `DownloadItem` | { id, filename, url, path, totalBytes, receivedBytes, state, startTime } |
| `VeilSettings` | { general, privacy, appearance, proxy } |
| `ProxySettings` | { mode, host, port, protocol } |
| `Credential` | { id, url, username, password, title, createdAt, updatedAt } |
| `CredentialMeta` | { id, url, username, title, createdAt, updatedAt } |
| `Profile` | { id, name, dataDir, isDefault } |
| `ClearDataOptions` | { timeRange, clearHistory, clearCookies, clearCache } |
| `SuggestionItem` | { url, title, source } |
| `LogLevel`, `LogEntry`, `IPCResult` | Сервисные типы |
| `DEFAULT_SETTINGS` | Дефолтные настройки |
| `getSearchUrl()` | Утилита формирования URL поисковой системы |

#### Доменные классы (domain/)

| Класс | Методы | Назначение |
|---|---|---|
| `Tab` | `create(url)`, `navigate(url)`, `startLoading()`, `stopLoading()`, `updateTitle()`, `updateFavicon()`, `updateProgress()`, `updateNavigationState()`, `setAudioState()`, `setMuted()`, `setGroupId()`, `toJSON()`, `fromJSON()` | Таб с инкапсулированной логикой |
| `Bookmark` | `create(url, title)`, `matchesUrl(url)`, `updateTitle()`, `updateFavicon()`, `toJSON()` | Закладка |
| `Download` | `create(...)`, `updateProgress()`, `complete()`, `cancel()`, `interrupt()`, `isActive()`, `getProgress()`, `toJSON()` | Загрузка |
| `HistoryEntryModel` | `create(url, title)`, `updateTitle()`, `refresh()`, `toJSON()` | Запись истории |

---

### `@veil/main` — Main process (66 файлов)

#### Core — Фреймворк и абстракции (14 файлов)

| Файл | Назначение |
|---|---|
| `interfaces.ts` | `IEventBus`, `IErrorHandler`, `IStateBroadcaster`, `IPersistenceService`, `ILogger` |
| `BaseService.ts` | Abstract: `eventBus` + `errorHandler` + `logger` + optional `stateBroadcaster`, `broadcast()` хелпер, `destroy()` |
| `EventBus` | Pub/sub: `on<T>`, `off`, `emit<T>`, `once<T>`. История 1000 событий. `EventTypes` константы |
| `ErrorHandler` | До 1000 ошибок, severity logging, emit `DEBUG_ERROR` |
| `StateBroadcaster` | Канонический state → renderer через `veil:state-patch` |
| `Logger` | Структурированный логгер (DEBUG/INFO/WARN/ERROR), source-tagging, `child()` |
| `AppConfig` | `ConfigManager` singleton: dev port, paths, features, `getRendererUrl()`, `getPreloadPath()` |
| `VeilWindow` | `BrowserWindow` (frameless) + `ViewManager` |
| `ViewManager` | Tab views: create, focus, hide, close, resize. Lazy loading: deferred views, MAX_MATERIALIZED=5 |
| `DebugWindow` | Второе окно `BrowserWindow` для debug-консоли |
| `ServiceRegistry` | Compose: `ActionValidator` + `RateLimiter` + `ActionDispatcher`. `VeilService` interface |
| `ActionValidator` | Валидация типов и payload действий (33 типа) |
| `RateLimiter` | Circular buffer, 50 actions/second limit |
| `ActionDispatcher` | Dispatch actions to registered services |

#### Core — Порты (2 интерфейса)

| Порт | Абстрагирует | Методы |
|---|---|---|
| `ISession` | `session.defaultSession` | `onWillDownload()`, `loadExtension()`, `onBeforeRequest()`, `onBeforeSendHeaders()`, `onCookiesChanged()`, `removeCookie()`, `clearAllCookies()`, `clearCache()`, `getCookies()`, `setPermissionRequestHandler()` |
| `ITabViewProvider` | `ViewManager` | `createView()`, `materializeView()`, `focusView()`, `closeView()`, `hideAllViews()`, `showAllViews()`, `setShellOffset()`, `cleanup()`, `navigateView()`, `goBack()`, `goForward()`, `reloadView()`, `canGoBack()`, `canGoForward()`, `setAudioMuted()`, `registerViewListeners()` |

#### Core — Репозитории (5 интерфейсов)

| Репозиторий | Методы |
|---|---|
| `ITabRepository` | `getAll()`, `getById()`, `add()`, `remove()`, `reorder()`, `getActiveTabId()`, `setActiveTabId()`, `restoreTabs()`, `saveTabs()` |
| `IBookmarkRepository` | `getAll()`, `getById()`, `getByUrl()`, `add()`, `remove()`, `reorder()`, `isBookmarked()`, `search()` |
| `IHistoryRepository` | `getAll()`, `getById()`, `getByUrl()`, `add()`, `updateTitle()`, `remove()`, `clear()`, `search()` |
| `IDownloadRepository` | `getAll()`, `getById()`, `add()`, `update()`, `remove()` |
| `ISettingsRepository` | `get()`, `update()` |

#### Application — Use Cases (7 файлов)

| Use Case | execute() | Бизнес-логика |
|---|---|---|
| `CreateTabUseCase` | `(url): Tab` | Создаёт Tab, добавляет в repo, создаёт view |
| `CloseTabUseCase` | `(tabId): string\|null` | Закрывает tab + view, передаёт фокус |
| `FocusTabUseCase` | `(tabId): boolean` | Фокусирует tab, скрывает остальные |
| `NavigateTabUseCase` | `(tabId, url): boolean` | Навигирует tab на URL |
| `AddBookmarkUseCase` | `(url, title, folder?): Bookmark` | Добавляет закладку (idempotent) |
| `RemoveBookmarkUseCase` | `(bookmarkId): boolean` | Удаляет закладку |
| `UpdateSettingsUseCase` | `(partial): VeilSettings` | Обновляет настройки |

#### Application — Services (6 файлов)

| Сервис | Действия | Делегирует |
|---|---|---|
| `TabService` | TAB_NEW, TAB_CLOSE, TAB_FOCUS, TAB_NAVIGATE, TAB_RESTORE, TAB_REORDER, TAB_PIN, TAB_MUTE, TAB_CLOSE_OTHERS, TAB_CLOSE_TO_RIGHT, GO_BACK/FORWARD, RELOAD, HOME, TAB_GROUP_CREATE/DELETE/RENAME/TOGGLE, TAB_MOVE_TO_GROUP | `CreateTabUseCase`, `CloseTabUseCase`, `FocusTabUseCase`, `NavigateTabUseCase` |
| `BookmarkService` | BOOKMARK_ADD, BOOKMARK_REMOVE, BOOKMARK_REORDER, BOOKMARK_UPDATE | `AddBookmarkUseCase`, `RemoveBookmarkUseCase` |
| `HistoryService` | HISTORY_CLEAR, HISTORY_CLEAR_SINCE | Слушает `TAB_NAVIGATED`, `TAB_TITLE_CHANGED`, `TAB_CLOSED` |
| `DownloadService` | DOWNLOAD_CANCEL, OPEN, SHOW_IN_FOLDER, DOWNLOAD_CLEAR_HISTORY | — |
| `SettingsService` | SETTINGS_UPDATE | `UpdateSettingsUseCase` |
| `PersistenceService` | — | Файловый JSON I/O, debounce 500ms, `flushAll()` on quit |

#### Infrastructure — Adapters (2 файла)

| Адаптер | Реализует | Оборачивает |
|---|---|---|
| `ElectronSession` | `ISession` | `session.defaultSession` |
| `ViewManagerAdapter` | `ITabViewProvider` | `ViewManager` |

#### Infrastructure — Repositories (5 файлов)

| Репозиторий | Хранение | Зависимость |
|---|---|---|
| `TabRepository` | In-memory + PersistenceService (restoreTabs/saveTabs) | `IPersistenceService` |
| `BookmarkRepository` | `bookmarks.json` + reorder | `IPersistenceService` |
| `HistoryRepository` | `history.json`, 5000 записей, LRU pruning | `IPersistenceService` |
| `DownloadRepository` | In-memory, 100 загрузок | — |
| `SettingsRepository` | `settings.json` | `IPersistenceService` |

#### Services (Electron-специфичные, 13 файлов)

| Файл | Назначение |
|---|---|
| `AdblockService` | Блокировка рекламы + трекеров по доменному списку (160+ доменов). Custom EasyList фильтры. Per-site статистика |
| `CertificateExceptionService` | Управление exceptions для self-signed сертификатов |
| `ContextMenuService` | Нативное контекстное меню (tab + page level). URL валидация |
| `CookieService` | Блокировка сторонних cookies, очистка при запуске, мониторинг изменений |
| `ExtensionService` | Chrome расширения через `electron-chrome-extensions` |
| `FingerprintProtectionService` | Canvas, WebRTC, WebGL, AudioContext, navigator, battery, fonts protection |
| `HttpsUpgradeService` | Авто-апгрейд HTTP → HTTPS для 100+ доменов |
| `IncognitoService` | Отдельное окно с ephemeral session |
| `PasswordService` | AES-256-GCM encrypted vault с scrypt master key |
| `ProfileService` | Multi-profile: create/delete/switch profiles |
| `ProxyService` | SOCKS5/HTTP proxy через `session.setProxy()` |
| `ScriptBlockService` | Per-site JavaScript blocking (NoScript-like) |
| `TrayService` | System tray icon с контекстным меню |

---

### `@veil/renderer` — React UI (42 файла)

#### Store (Zustand, 9 slices)

```typescript
useVeilStore = create<VeilStore>()(
  tabSlice        // tabs, activeTabId, recentlyClosed, tabGroups, selectActiveTab
  + bookmarkSlice // bookmarks
  + downloadSlice // downloads
  + settingsSlice // settings
  + debugSlice    // logs, addLog(), clearLogs(), toggleDebugPanel()
  + actionSlice   // dispatch()
  + viewSlice     // currentView, setView(), toggleDownloadPanel()
  + toastSlice    // toasts, addToast(), removeToast()
)
```

- `dispatch(action)` → `window.veil.dispatch(action)` → IPC → main process
- `applyPatch(fullState)` → merge, preserving `currentView`, `logs`, `zoomLevel`
- `initVeilStore()` → fetch initial state + subscribe `onStatePatch`

#### Components (29 файла)

```
<VeilShell>
├── <TabBar />                  # Табы + window controls + groups + profile switcher
├── <AddressBar />              # Навигация + omnibox + bookmark + reader mode + settings
│   └── <DownloadPanel />       # Выпадающая панель загрузок
├── <BookmarkBar />             # Панель закладок с drag-and-drop
├── <div#browser-view-container>
│   ├── IF settings: <SettingsPage />
│   ├── ELSE IF history: <HistoryPage />
│   ├── ELSE IF version: <VersionPage />
│   ├── ELSE IF bookmarks: <BookmarksPage />
│   ├── ELSE IF downloads: <DownloadsPage />
│   ├── ELSE IF privacy: <PrivacyDashboard />
│   ├── ELSE IF shortcuts: <ShortcutsPage />
│   ├── ELSE IF passwords: <PasswordManager />
│   ├── ELSE IF no tabs/internal: <HomePage />
│   ├── IF findBar: <FindBar />
│   └── ELSE: (WebContentsViews из main process)
├── <StatusBar />               # Loading + URL + blocked count + zoom + security
├── <DebugPanel />              # Оверлей debug-консоли
├── <ToastContainer />          # Toast notifications
├── <TabSearchOverlay />        # Поиск по табам (Ctrl+Shift+A)
└── <ErrorBoundary />           # React ErrorBoundary
```

**Утилитарные компоненты (не роутятся в VeilShell):**
- `ConfirmDialog` — модальный диалог подтверждения
- `EmptyState` — пустое состояние с SVG иконкой
- `Skeleton` — loading placeholder с pulse animation
- `RecentlyClosedPanel` — dropdown недавно закрытых табов
- `ProfileSwitcher` — dropdown переключения профилей
- `CookieManagerPage` — управление cookies
- `PermissionsPage` — управление разрешениями
- `CertificateErrorPage` — страница ошибки сертификата
- `ScriptBlockPanel` — панель блокировки скриптов

---

## IPC Каналы (37 + 2 системных)

| Канал | Направление | Назначение |
|---|---|---|
| `veil:action` | Renderer → Main | Все действия (33 типа) |
| `veil:get-state` | Renderer → Main | Получить полный VeilState |
| `veil:state-patch` | Main → Renderer | Полное состояние после каждого изменения |
| `veil:window-minimize/maximize/close` | Renderer → Main | Управление окном |
| `veil:open-debug/close-debug` | Renderer → Main | Debug окно |
| `veil:add-log` | Renderer → Main | Логи в debug window |
| `veil:set-shell-offset` | Renderer → Main | ViewManager позиционирование |
| `veil:set-view-mode` | Renderer → Main | Переключение browser/settings view |
| `veil:set-overlay-visible` | Renderer → Main | Скрыть/показать WebContentsViews |
| `veil:find-in-page/stop-find` | Renderer → Main | Поиск по странице |
| `veil:clear-cookies` | Renderer → Main | Очистить все cookies |
| `veil:search-suggestions` | Renderer → Main | Поисковые подсказки |
| `veil:history-list/history-clear` | Renderer → Main | Управление историей |
| `veil:incognito-open/close` | Renderer → Main | Инкогнито режим |
| `veil:version` | Renderer → Main | Информация о версии |
| `veil:set-zoom-level` | Renderer → Main | Установить зум |
| `veil:privacy-stats` | Renderer → Main | Статистика блокировок |
| `veil:clear-browsing-data` | Renderer → Main | Очистка данных по времени |
| `veil:cookie-list/cookie-delete` | Renderer → Main | Управление cookies |
| `veil:set-default-browser` | Renderer → Main | Стандартный браузер |
| `veil:save-page` | Renderer → Main | Сохранить страницу |
| `veil:toggle-reader-mode` | Renderer → Main | Режим чтения |
| `veil:profile-*` | Renderer → Main | Управление профилями |
| `veil:adblock-*` | Renderer → Main | Custom adblock lists |
| `veil:password-*` | Renderer → Main | Password manager |
| `veil:proxy-set-config` | Renderer → Main | Настройки прокси |
| `veil:shortcut` | Main → Renderer | Горячие клавиши |
| `veil:zoom-change` | Main → Renderer | Изменение зума |
| `veil:fullscreen-change` | Main → Renderer | Изменение fullscreen |
| `veil:link-hover` | Main → Renderer | Hover ссылки |

---

## Горячие клавиши (25)

| Комбинация | Действие |
|---|---|
| `Ctrl+T` | Новый таб |
| `Ctrl+W` | Закрыть таб |
| `Ctrl+Shift+T` | Восстановить закрытый таб |
| `Ctrl+R` / `F5` | Перезагрузить |
| `Ctrl+F` | Поиск по странице |
| `Ctrl+D` | Добавить закладку |
| `Ctrl+L` | Фокус на адресную строку |
| `Ctrl+H` | История |
| `Ctrl+J` | Загрузки |
| `Ctrl+P` | Печать |
| `Ctrl+S` | Сохранить страницу |
| `Ctrl+B` | Закладки |
| `Ctrl+/` | Горячие клавиши |
| `Ctrl+=` / `Ctrl+-` / `Ctrl+0` | Зум +/- / сброс |
| `Ctrl+Tab` / `Ctrl+Shift+Tab` | Следующий / предыдущий таб |
| `Ctrl+Shift+I` | DevTools |
| `Ctrl+Shift+D` | Debug окно |
| `Ctrl+Shift+N` | Инкогнито |
| `Ctrl+Shift+A` | Поиск по табам |
| `F11` | Полноэкранный режим |
| `Escape` | Остановить загрузку |

---

## Хранение данных

Все файлы в `{app.getPath('userData')}/VeilBrowser/`:

| Файл | Репозиторий | Содержимое |
|---|---|---|
| `settings.json` | SettingsRepository | VeilSettings |
| `bookmarks.json` | BookmarkRepository | BookmarkItem[] |
| `history.json` | HistoryRepository | HistoryEntry[] |
| `tabs.json` | TabRepository | TabInfo[] (restore) |
| `passwords.enc` | PasswordService | Зашифрованные credentials |

---

## Безопасность

- `contextIsolation: true` + `sandbox: true` на всех окнах и табах
- `nodeIntegration: false`
- Preload exposes only `window.veil` через contextBridge
- URL фильтрация: block `file://`, `data:`, `javascript:`, `chrome://`
- `setWindowOpenHandler` deny на всех табах
- `will-navigate` handler на renderer и tab webContents
- IPC валидация: `ActionValidator` проверяет 33 типа, строковые лимиты
- Rate limiting: circular buffer, 50 actions/second
- CSP meta tag в index.html
- Security headers: X-Content-Type-Options, Referrer-Policy, Permissions-Policy, X-Frame-Options
- Certificate error page — блокировка ошибок SSL, exception UI
- Permission handler — блокировка всех разрешений кроме clipboard
- Fingerprint protection — canvas, WebRTC, WebGL, AudioContext, navigator, battery, fonts, OffscreenCanvas
- Cookie blocking — блокировка сторонних cookies, очистка при запуске
- HTTPS upgrade — авто-апгрейд HTTP → HTTPS для 100+ доменов
- Incognito mode — ephemeral session, очистка данных при закрытии
- Password vault — AES-256-GCM шифрование, scrypt key derivation
- Script blocking — per-site JavaScript блокировка

---

## Тестирование

- **Framework:** Vitest
- **Tests:** 78 passing, 1 skipped
- **Coverage:** ErrorHandler, EventBus, StateBroadcaster, ActionValidator, RateLimiter, Logger, shared domain models, use cases
- **Run:** `npm run test` → `vitest run`
