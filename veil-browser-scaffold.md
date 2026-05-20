# Veil Browser — Scaffold & Build Reference

## Overview

Electron 42 + React 19 приватный браузер. Монорепо с npm workspaces и Clean Architecture (4 слоя). 123 файла.

## Tech Stack

| Компонент | Технология |
|---|---|
| Framework | Electron 42 (BrowserWindow + WebContentsView) |
| UI | React 19 + Vite 8 |
| State | Zustand 5 (9 slices) |
| Styling | Vanilla CSS (Liquid Glass design system, light/dark themes) |
| Testing | Vitest (78 tests) |
| Linting | ESLint 10 (flat config) |
| TypeScript | 5.9, strict mode |

## File Structure

```
VeilBrowserAi/
├── packages/
│   ├── shared/                    # Типы, константы, доменные модели
│   │   ├── index.ts               # Все типы, VeilAction (33), VeilAPI (42), DEFAULT_SETTINGS
│   │   ├── domain/                # Доменные классы
│   │   │   ├── Tab.ts             # Tab.create(), navigate(), setAudioState(), setGroupId()
│   │   │   ├── Bookmark.ts        # Bookmark.create(), matchesUrl()
│   │   │   ├── Download.ts        # Download.create(), updateProgress(), complete(), cancel()
│   │   │   ├── HistoryEntry.ts    # HistoryEntryModel.create(), refresh()
│   │   │   └── index.ts
│   │   └── __tests__/
│   │       ├── domain.test.ts
│   │       └── shared.test.ts
│   │
│   ├── main/                      # Electron main process
│   │   ├── index.ts               # Bootstrap: DI, 37 IPC handlers, 25 shortcuts, lifecycle
│   │   ├── preload.ts             # Full window.veil API (42 метода)
│   │   ├── preload-incognito.ts   # Minimal preload for incognito
│   │   │
│   │   ├── core/                  # Фреймворк и абстракции
│   │   │   ├── interfaces.ts      # IEventBus, IErrorHandler, IStateBroadcaster, ILogger, IPersistenceService
│   │   │   ├── BaseService.ts     # Abstract: eventBus + errorHandler + logger + stateBroadcaster + destroy()
│   │   │   ├── EventBus.ts        # Pub/sub с историей 1000 событий
│   │   │   ├── ErrorHandler.ts    # До 1000 ошибок, severity logging
│   │   │   ├── StateBroadcaster.ts# Канонический state → renderer
│   │   │   ├── Logger.ts          # Структурированный логгер с child()
│   │   │   ├── AppConfig.ts       # ConfigManager singleton
│   │   │   ├── VeilWindow.ts      # BrowserWindow (frameless) + ViewManager
│   │   │   ├── ViewManager.ts     # Tab views: lazy loading, LRU eviction (5), audio events
│   │   │   ├── DebugWindow.ts     # Debug-консоль
│   │   │   ├── ServiceRegistry.ts # Compose: ActionValidator + RateLimiter + ActionDispatcher
│   │   │   ├── ActionValidator.ts # Валидация 33 типов действий
│   │   │   ├── RateLimiter.ts     # Circular buffer, 50 actions/sec
│   │   │   ├── ActionDispatcher.ts# Dispatch to services
│   │   │   │
│   │   │   ├── ports/
│   │   │   │   ├── ISession.ts    # session abstraction (download, extensions, cookies, permissions)
│   │   │   │   ├── ITabViewProvider.ts # ViewManager abstraction
│   │   │   │   └── index.ts
│   │   │   │
│   │   │   ├── repositories/
│   │   │   │   ├── ITabRepository.ts
│   │   │   │   ├── IBookmarkRepository.ts  # +reorder
│   │   │   │   ├── IHistoryRepository.ts   # +remove
│   │   │   │   ├── IDownloadRepository.ts
│   │   │   │   ├── ISettingsRepository.ts
│   │   │   │   └── index.ts
│   │   │   │
│   │   │   └── __tests__/         # 78 tests
│   │   │
│   │   ├── application/
│   │   │   ├── services/
│   │   │   │   ├── TabService.ts          # 17 action types, groups, audio, pin, mute
│   │   │   │   ├── BookmarkService.ts     # BOOKMARK_ADD/REMOVE/REORDER/UPDATE
│   │   │   │   ├── HistoryService.ts      # HISTORY_CLEAR/CLEAR_SINCE
│   │   │   │   ├── DownloadService.ts     # DOWNLOAD_CANCEL/OPEN/SHOW_IN_FOLDER/CLEAR_HISTORY
│   │   │   │   ├── SettingsService.ts     # SETTINGS_UPDATE
│   │   │   │   ├── PersistenceService.ts  # JSON I/O, debounce 500ms
│   │   │   │   └── index.ts
│   │   │   │
│   │   │   └── usecases/          # 7 use cases
│   │   │       ├── CreateTabUseCase.ts
│   │   │       ├── CloseTabUseCase.ts
│   │   │       ├── FocusTabUseCase.ts
│   │   │       ├── NavigateTabUseCase.ts
│   │   │       ├── AddBookmarkUseCase.ts
│   │   │       ├── RemoveBookmarkUseCase.ts
│   │   │       ├── UpdateSettingsUseCase.ts
│   │   │       └── index.ts
│   │   │
│   │   ├── infrastructure/
│   │   │   ├── adapters/
│   │   │   │   ├── ElectronSession.ts     # ISession → session.defaultSession
│   │   │   │   ├── ViewManagerAdapter.ts  # ITabViewProvider → ViewManager
│   │   │   │   └── index.ts
│   │   │   │
│   │   │   └── repositories/
│   │   │       ├── TabRepository.ts       # In-memory + persistence
│   │   │       ├── BookmarkRepository.ts  # +reorder
│   │   │       ├── HistoryRepository.ts   # 5000 entries, LRU, +remove
│   │   │       ├── DownloadRepository.ts  # In-memory, 100 limit
│   │   │       ├── SettingsRepository.ts  # +proxy
│   │   │       └── index.ts
│   │   │
│   │   └── services/              # 13 feature services
│   │       ├── AdblockService.ts          # Ads + trackers + custom EasyList
│   │       ├── CertificateExceptionService.ts # SSL exceptions
│   │       ├── ContextMenuService.ts      # Tab + page context menu
│   │       ├── CookieService.ts           # Third-party cookie blocking
│   │       ├── ExtensionService.ts        # Chrome extensions
│   │       ├── FingerprintProtectionService.ts # Canvas/WebRTC/WebGL/Audio/navigator/battery/font
│   │       ├── HttpsUpgradeService.ts     # HTTP → HTTPS
│   │       ├── IncognitoService.ts        # Ephemeral session
│   │       ├── PasswordService.ts         # AES-256-GCM vault
│   │       ├── ProfileService.ts          # Multi-profile
│   │       ├── ProxyService.ts            # SOCKS5/HTTP proxy
│   │       ├── ScriptBlockService.ts      # Per-site JS blocking
│   │       └── TrayService.ts             # System tray
│   │
│   └── renderer/                  # React UI
│       ├── index.html
│       ├── src/
│       │   ├── main.tsx
│       │   ├── components/        # 29 компонентов
│       │   │   ├── VeilShell.tsx          # Root shell: routing, shortcuts, themes
│       │   │   ├── TabBar.tsx             # Табы + groups + audio + drag + profile
│       │   │   ├── AddressBar.tsx         # Omnibox + bookmark + reader mode
│       │   │   ├── BookmarkBar.tsx        # Закладки с drag-and-drop
│       │   │   ├── StatusBar.tsx          # Loading + URL + blocked + zoom
│       │   │   ├── DownloadPanel.tsx      # Dropdown загрузок
│       │   │   ├── HomePage.tsx           # Домашняя страница
│       │   │   ├── SettingsPage.tsx       # General/Privacy/Appearance/Proxy
│       │   │   ├── HistoryPage.tsx        # veil://history
│       │   │   ├── VersionPage.tsx        # veil://version
│       │   │   ├── BookmarksPage.tsx      # veil://bookmarks
│       │   │   ├── DownloadsPage.tsx      # veil://downloads
│       │   │   ├── PrivacyDashboard.tsx   # veil://privacy
│       │   │   ├── ShortcutsPage.tsx      # veil://shortcuts
│       │   │   ├── PasswordManager.tsx    # veil://passwords
│       │   │   ├── FindBar.tsx            # Поиск по странице
│       │   │   ├── DebugPanel.tsx         # Debug-консоль
│       │   │   ├── ToastContainer.tsx     # Toast notifications
│       │   │   ├── TabSearchOverlay.tsx   # Поиск по табам
│       │   │   ├── ConfirmDialog.tsx      # Модальный диалог
│       │   │   ├── EmptyState.tsx         # Пустое состояние
│       │   │   ├── Skeleton.tsx           # Loading placeholder
│       │   │   ├── RecentlyClosedPanel.tsx# Недавно закрытые табы
│       │   │   ├── ProfileSwitcher.tsx    # Переключение профилей
│       │   │   ├── CookieManagerPage.tsx  # Управление cookies
│       │   │   ├── PermissionsPage.tsx    # Управление разрешениями
│       │   │   ├── CertificateErrorPage.tsx # Ошибка сертификата
│       │   │   ├── ScriptBlockPanel.tsx   # Блокировка скриптов
│       │   │   └── ErrorBoundary.tsx      # React ErrorBoundary
│       │   │
│       │   ├── store/
│       │   │   ├── useVeilStore.ts        # 9 slices combined
│       │   │   └── slices/
│       │   │       ├── tabSlice.ts        # tabs, activeTabId, recentlyClosed, tabGroups
│       │   │       ├── bookmarkSlice.ts   # bookmarks
│       │   │       ├── downloadSlice.ts   # downloads
│       │   │       ├── settingsSlice.ts   # settings
│       │   │       ├── debugSlice.ts      # logs
│       │   │       ├── actionSlice.ts     # dispatch()
│       │   │       ├── viewSlice.ts       # currentView, panels
│       │   │       ├── toastSlice.ts      # toasts
│       │   │       └── index.ts
│       │   │
│       │   └── styles/
│       │       ├── tokens.css     # Design tokens: dark/light themes, font sizes, compact mode
│       │       └── glass.css      # Component styles
│       │
│       ├── tsconfig.json
│       └── vite.config.ts
│
├── scripts/
│   └── fix-shared-paths.js        # Post-build: @veil/shared → relative paths
│
├── package.json
├── tsconfig.base.json
├── tsconfig.json
├── vitest.config.ts
├── eslint.config.js
└── .prettierrc
```

---

## Build & Packaging Rules

### Rule 1: @veil/shared Path Resolution in Packaged App

**Problem:** `import { X } from '@veil/shared'` → `require("@veil/shared")`. В packaged asar npm workspace symlinks не существуют.

**Solution:** `scripts/fix-shared-paths.js` заменяет `@veil/shared` на relative paths после tsc, до electron-builder.

### Rule 2: Preload Path in Packaged App

**Solution:** `ConfigManager.getPreloadPath()` с `app.isPackaged` guard.

### Rule 3: Renderer URL in Packaged App

**Solution:** `ConfigManager.getRendererUrl()` с `app.getAppPath()`.

---

## npm Scripts

```bash
npm run build       # tsc -b + fix-shared-paths
npm run dev         # npm run dev --workspaces --if-present
npm run test        # vitest run (78 tests)
npm run test:watch  # vitest (watch mode)
npm run lint        # eslint
npm run format      # prettier
npm run package     # npm run build && electron-builder --win --x64 → dist-release/
```

## Design System

### Themes
- **Dark** (default): `color-scheme: dark`, dark backgrounds, light text
- **Light**: `@media (prefers-color-scheme: light)` or `[data-theme="light"]`
- **System**: автоматическое переключение по OS preference

### Font Sizes
- **Small**: `--font-size-xs: 10px` через `--font-size-lg: 14px`
- **Medium** (default): `--font-size-xs: 11px` через `--font-size-lg: 16px`
- **Large**: `--font-size-xs: 12px` через `--font-size-lg: 18px`

### Compact Mode
`[data-compact="true"]` — уменьшает `--tab-height`, `--omnibox-height`, `--toolbar-height`

### Accent Color
Динамический через `--accent` CSS переменную, настраивается в Settings → Appearance

---

## Internal Pages

| URL | Компонент | Описание |
|---|---|---|
| `veil://home` | `HomePage` | Домашняя страница с quick links |
| `veil://history` | `HistoryPage` | История с поиском и группировкой по дате |
| `veil://version` | `VersionPage` | Информация о версии |
| `veil://bookmarks` | `BookmarksPage` | Менеджер закладок |
| `veil://downloads` | `DownloadsPage` | Полная страница загрузок |
| `veil://privacy` | `PrivacyDashboard` | Статистика блокировок |
| `veil://shortcuts` | `ShortcutsPage` | Все горячие клавиши |
| `veil://passwords` | `PasswordManager` | Password manager |

---

## Privacy Features

| Фича | Сервис | Описание |
|---|---|---|
| Adblock | `AdblockService` | Блокировка рекламы + трекеров + custom EasyList |
| Fingerprint Protection | `FingerprintProtectionService` | Canvas, WebRTC, WebGL, AudioContext, navigator, battery, fonts |
| Cookie Blocking | `CookieService` | Блокировка сторонних cookies |
| HTTPS Upgrade | `HttpsUpgradeService` | HTTP → HTTPS для 100+ доменов |
| Incognito | `IncognitoService` | Ephemeral session |
| Certificate Exceptions | `CertificateExceptionService` | SSL exception management |
| Script Blocking | `ScriptBlockService` | Per-site JS blocking |
| Password Vault | `PasswordService` | AES-256-GCM encrypted storage |
| Proxy | `ProxyService` | SOCKS5/HTTP proxy |
| Security Headers | `index.ts` | X-Content-Type-Options, Referrer-Policy, Permissions-Policy |
| Permission Handler | `ElectronSession` | Block all permissions except clipboard |
