# Veil Browser — Полный аудит проекта

## Status (after refactor)

Addressed issues in this pass:

- **SEC-01** fixed: `will-navigate` now blocks `file:` protocol, `setWindowOpenHandler` denies popups
- **SEC-02** fixed: `veil://passwords` added to ALLOWED_VEIL_PATHS allowlist
- **SEC-03** fixed: ContextMenuService validates `srcURL` and `linkURL` with `isSafeUrl` before actions
- **SEC-04** already fixed (path.basename used)
- **SEC-08** fixed: RateLimiter off-by-one corrected (N+1 buffer allocation)
- **PERF-01** fixed: AdblockService topDomains capped at 200 entries with eviction
- **PERF-02** fixed: HistoryRepository dirty flag prevents redundant serialization
- **PERF-03** fixed: EventBus already filters debug:log from history (verified)
- **UI-01** fixed: Tab close button uses real `<button>` element (a11y)
- **UI-02** fixed: Address bar lock icon has aria-label and `<title>` element
- **UI-03** fixed: Bookmark icon reflects bookmarked state (filled SVG, aria-pressed)
- **UI-04** fixed: FindBar has prev/next buttons with forward/backward search
- **UI-05** fixed: ConfirmDialog traps Tab focus, Escape closes, Enter confirms
- **UI-06** fixed: Skip link visible on focus
- **UI-07** fixed: ErrorBoundary has role="alert", aria-live="assertive", Copy error button
- **UI-08** fixed: Progress bar uses indeterminate animation when loadProgress is 0
- **UI-09** fixed: Light theme auto-applies via prefers-color-scheme media query
- **UI-10** fixed: Tab items use flex layout (min-width: 80px, max-width: 220px)
- **UI-11** fixed: HistoryPage clear has confirmation dialog
- **UI-12** fixed: SettingsPage has Reset to defaults button with confirmation
- **SEC-09** fixed: PersistenceService uses atomic writes (.tmp + rename)
- **SEC-10** fixed: DownloadService real cancel (activeItems Map + item.cancel())
- **SEC-11** fixed: DOWNLOAD_CLEAR_HISTORY handler implemented
- **SEC-12** fixed: Download open checks file existence
- **SEC-13** fixed: setPermissionCheckHandler added for synchronous permission checks
- **SEC-14** fixed: FingerprintProtection uses session.setPreloads instead of per-webContents injection
- **SEC-15** fixed: Incognito session has security headers, permission handlers, DNT
- **SEC-16** fixed: ScriptBlockService and CertificateExceptionService wired up
- **SEC-17** fixed: TrayService removed (dead code)
- **SEC-18** fixed: AdblockService tracker matching uses eTLD+1 and path-based rules
- **SEC-19** fixed: CookieService isThirdParty uses eTLD+1
- **SEC-20** fixed: clearCookies removed from preload API surface
- **SEC-21** fixed: AdblockService broadcastStats no longer overwrites httpsUpgrades/cookiesBlocked
- **PERF-04** fixed: ViewManager removes fake progress animation, uses real loading events
- **PERF-05** fixed: ViewManager evicts on immediate create (not just deferred)
- **ARCH-01** fixed: Tab.setUrl() preserves encapsulation
- **ARCH-02** fixed: TabRepository persists pinnedIds, mutedIds, tabGroups
- **ARCH-03** fixed: ConfigManager.getIncognitoPreloadPath() replaces string replacement
- **ARCH-04** fixed: removeCustomList uses per-list domain sets (no re-fetch)
- **BUILD-01** fixed: Cross-platform build scripts (package:win/mac/linux, dev, clean)
- **BUILD-02** fixed: ESLint glob matches all packages
- **BUILD-03** fixed: fix-shared-paths handles subpath imports
- **BUILD-04** fixed: preload-incognito.ts added to tsconfig include
- **BUILD-05** fixed: README updated with cross-platform instructions
- **QUAL-01** fixed: ProxyService unused parameter prefixed with underscore
- **QUAL-02** fixed: All ESLint warnings resolved (0 warnings)

Skipped / out of scope:
- Encrypting bookmarks/history at rest (explicitly out of scope)
- Tab Search overlay redesign (explicitly out of scope)
- Tab Groups DnD redesign (explicitly out of scope)
- Real PSL package (simplified eTLD+1 helper used instead)

---

## Итого: 137 проблем

| Категория | P0 | P1 | P2 | P3 | Всего |
|---|---|---|---|---|---|
| Безопасность | 2 | 14 | 24 | 9 | 49 |
| Производительность | 5 | 6 | 16 | 9 | 36 |
| UI/UX и A11y | 0 | 12 | 24 | 22 | 58 |
| **Итого** | **7** | **32** | **64** | **40** | **137** |

---

## БЕЗОПАСНОСТЬ (49 проблем)

### P0 — Критические

**SEC-01. Нет `will-navigate` handler на renderer webContents**
`VeilWindow.ts` — renderer webContents не имеет `will-navigate` handler. XSS в renderer может навигировать на `file:///etc/passwd` или `javascript:alert(document.cookie)`. `contextIsolation` и `sandbox` защищают от Node.js доступа, но webContents может быть навигирован.
**Fix:** Добавить `mainWindow.window.webContents.on('will-navigate', ...)` с URL валидацией.

**SEC-02. `veil://` URLs не проходят валидацию**
`TabService.ts:148,229` — `veil://` URLs принимаются без проверки `isSafeUrl()`. Атакующий может передать `veil://` URL с path traversal или injection.
**Fix:** Добавить allowlist для `veil://` путей (`veil://home`, `veil://history`, `veil://version`).

### P1 — Высокий приоритет

**SEC-03. ContextMenuService: XSS через params.linkURL / params.srcURL**
`ContextMenuService.ts:72-94` — `linkURL` и `srcURL` передаются в `TAB_NEW` без валидации протокола. `javascript:` и `data:` URL могут выполнить произвольный код.
**Fix:** Проверять протокол через `isSafeUrl()` перед передачей в `TAB_NEW`.

**SEC-04. Path traversal в download filenames**
`DownloadService.ts:58-68` — `item.getFilename()` из Content-Disposition может содержать `../../../etc/passwd`. `path.join` не защищает от `..` в именах файлов.
**Fix:** Санитизировать через `path.basename()` и проверять что итоговый путь начинается с downloadDir.

**SEC-05. Download path не валидируется**
`DownloadService.ts:57` — `settings.general.downloadPath` может быть изменён через `SETTINGS_UPDATE`. Renderer может установить путь в `/etc/` или `C:\Windows\System32\`.
**Fix:** Валидировать downloadPath — существующий каталог в разрешённом дереве.

**SEC-06. ExtensionService: загрузка из произвольных путей**
`ExtensionService.ts:91-108` — `EXT_LOAD_UNPACKED` принимает путь от renderer без ограничения директории.
**Fix:** Ограничить загрузку из `userData/extensions/` или home директории.

**SEC-07. SETTINGS_UPDATE payload не валидируется**
`ActionValidator.ts:59-62` — Проверяется только что payload — объект. Renderer может передать `__proto__`, `constructor` для prototype pollution.
**Fix:** Добавить allowlist ключей для settings payload и deep-merge с проверкой типов.

**SEC-08. RateLimiter глобальный, не per-sender**
`RateLimiter.ts` — Все вкладки делят один лимит 100 req/sec. Злоумышленная страница может исчерпать лимит для всего браузера.
**Fix:** Сделать RateLimiter per-webContents.

**SEC-09. `veil:clear-cookies` — очищает ВСЕ куки без подтверждения**
`index.ts:335-343` — Renderer может вызвать `clearStorageData()` без ведома пользователя.
**Fix:** Переместить в action dispatch с подтверждением через UI.

**SEC-10. CSP: `style-src 'unsafe-inline'`**
`index.html:8` — Позволяет CSS injection.
**Fix:** Использовать nonce-based CSP для стилей.

**SEC-11. `setPermissionCheckHandler` не установлен**
`index.ts:152-155` — Только `setPermissionRequestHandler`. Страница может получить доступ к clipboard через sync API без request.
**Fix:** Добавить `session.setPermissionCheckHandler()`.

**SEC-12. Fingerprint: не блокирует OffscreenCanvas**
`FingerprintProtectionService.ts` — Защищён только `HTMLCanvasElement`. `OffscreenCanvas` в Web Workers не защищён.
**Fix:** Добавить защиту для `OffscreenCanvas.prototype.convertToBlob`.

**SEC-13. Tab webContents не имеют `will-navigate` handler**
`ViewManager.ts` — WebContentsView (tab views) не имеют `will-navigate` handler. Страница может навигировать себя на `javascript:` URL.
**Fix:** Добавить `will-navigate` handler для tab views с URL валидацией.

**SEC-14. BOOKMARK_ADD — URL не валидируется**
`BookmarkService.ts:82-88` — `action.payload.url` передаётся без проверки протокола. Renderer может добавить bookmark с `javascript:` URL.
**Fix:** Валидировать URL при добавлении bookmark.

**SEC-15. CookieService: third-party blocking — timing/race condition**
`CookieService.ts:44-64` — Cookie записывается СНАЧАЛА, ПОТОМ удаляется. В промежутке запрос уже может использовать эту куку.
**Fix:** Использовать `session.webRequest.onBeforeRequest` для блокировки до отправки.

**SEC-16. ActionValidator не проверяет TAB_PIN/TAB_MUTE/TAB_REORDER**
`ActionValidator.ts:13-18` — Эти действия не в `ACTIONS_REQUIRING_ID`. `TAB_REORDER` требует `sourceId`/`targetId`.
**Fix:** Добавить в соответствующие sets проверки.

### P2 — Средний приоритет

**SEC-17. `veil:add-log` — нет валидации входных данных**
`index.ts:376-381` — Принимает `log: unknown` без валидации.

**SEC-18. `veil:set-shell-offset` — нет проверки типа/диапазона**
`index.ts:279-281` — Renderer может передать `Infinity`, `NaN`, отрицательное число.

**SEC-19. `veil:find-in-page` — нет ограничения длины текста**
`index.ts:304-319` — Текст длиной в миллионы символов может вызвать DoS.

**SEC-20. `veil:search-suggestions` — нет ограничения длины query**
`index.ts:383-397` — Аналогично.

**SEC-21. `veil:history-list` — возвращает до 1000 записей без пагинации**
`index.ts:356-364` — Потенциальная утечка через XSS.

**SEC-22. preload-incognito: `addLog` доступен**
`preload-incognito.ts:12-13` — Канал утечки информации из incognito сессии.

**SEC-23. Adblock: обход через поддомены**
`AdblockService.ts:118-129` — Проверка только по hostname. `tracker.google-analytics.com` не совпадёт с `google-analytics.com`.

**SEC-24. Adblock: trackerSet содержит entries с path, но проверяется только hostname**
`AdblockService.ts:58-88,134` — `facebook.com/tr` никогда не совпадёт с hostname `facebook.com`.

**SEC-25. CookieService: `isThirdParty` не учитывает public suffixes**
`CookieService.ts:67-79` — `evil.co.uk` будет считаться first-party для `bbc.co.uk`.

**SEC-26. CookieService: `tabDomains` не обновляется при TAB_FOCUS**
`CookieService.ts:91-105` — Third-party cookie определяется относительно URL последней навигации, а не текущего активного URL.

**SEC-27. Fingerprint: обход через iframe**
`FingerprintProtectionService.ts:37-51` — Инъекция только на `dom-ready` основного webContents. iframe'ы не защищены.

**SEC-28. Fingerprint: canvas шум слишком мал**
`FingerprintProtectionService.ts:61` — Шум ±0.005 на 16x16 пикселях можно усреднить.

**SEC-29. Fingerprint: не блокирует Performance.now() precision**
`FingerprintProtectionService.ts` — Высокоточный таймер не ограничен.

**SEC-30. Fingerprint: не блокирует Intl.DateTimeFormat fingerprinting**
`FingerprintProtectionService.ts` — Часовой пояс пользователя определяется.

**SEC-31. HttpsUpgrade: обход через IP-адреса**
`HttpsUpgradeService.ts:155-187` — HTTP-запросы на IP-адреса не апгрейдятся.

**SEC-32. HttpsUpgrade: `destroy()` не удаляет interceptor**
`HttpsUpgradeService.ts:217-220` — При re-init будет два interceptor'а.

**SEC-33. Adblock: `destroy()` не удаляет interceptors**
`AdblockService.ts:204-209` — Аналогично.

**SEC-34. Adblock bypass через CNAME cloaking**
`AdblockService.ts` — Не разрешает DNS CNAME.

**SEC-35. DownloadService: неполный список опасных расширений**
`DownloadService.ts:136` — Не включает `.hta`, `.cpl`, `.msc`, `.reg`, `.inf`, `.lnk`, `.url`.

**SEC-36. `shell.openPath()` не проверяет MIME type**
`DownloadService.ts:142` — HTML/SVG файлы могут содержать JavaScript.

**SEC-37. Incognito: не очищает DNS cache**
`IncognitoService.ts:84-89` — DNS запросы видны в system DNS cache.

**SEC-38. PersistenceService: race condition при concurrent saves**
`PersistenceService.ts:64-77` — Два файла пишутся асинхронно без мьютекса.

**SEC-39. Extension loading: нет проверки manifest.json**
`ExtensionService.ts:104` — Нет валидации permissions расширения.

**SEC-40. Security headers: нет Strict-Transport-Security**
`index.ts:158-181` — Позволяет понизить HTTPS до HTTP.

**SEC-41. Security headers: нет Cross-Origin-Opener-Policy**
`index.ts` — Отсутствует Spectre/Meltdown mitigation.

**SEC-42. Clipboard permissions слишком permisive**
`index.ts:152` — `clipboard-read` разрешён для ВСЕХ сайтов.

**SEC-43. DebugWindow получает полный `window.veil` API**
`DebugWindow.ts` — Debug window получает доступ к `dispatch()`.

**SEC-44. `veil:version` — information disclosure**
`index.ts:346-354` — Возвращает detailed fingerprinting information.

**SEC-45. ActionValidator: нет ограничения длины строк**
`ActionValidator.ts` — Very long strings могут вызвать DoS.

**SEC-46. CookieService: `clearAllCookies` не работает**
`CookieService.ts:82-89` — `flushStore()` НЕ очищает куки.

### P3 — Низкий приоритет

**SEC-47. Error handler: context может содержать敏感数据**
**SEC-48. Logger: data может содержать敏感数据**
**SEC-49. data: URL для certificate error page**
**SEC-50. HttpsUpgrade: subdomain manipulation**
**SEC-51. Navigator spoofing: фиксированные значения**
**SEC-52. Incognito: нет защиты от screen capture**
**SEC-53. JSON.parse без reviver — prototype pollution из файла**
**SEC-54. ExtensionService: `destroy()` не выгружает расширения**
**SEC-55. Permissions-Policy не блокирует все API**

---

## ПРОИЗВОДИТЕЛЬНОСТЬ (36 проблем)

### P0 — Критические

**PERF-01. Logger emits events on every log call — EventBus history bloat**
`Logger.ts:62` — Каждый `debug/info/warn/error` вызов emit'ит `DEBUG_LOG` в EventBus. EventBus хранит 1000 событий. Логи вытесняют реальные доменные события.
**Fix:** Не хранить `DEBUG_LOG` в eventHistory, или использовать отдельный ring buffer.

**PERF-02. Download progress broadcasts full download list on every chunk**
`DownloadService.ts:77-89` — `item.on('updated')` вызывает `broadcastDownloads()` который сериализует ВСЕ загрузки. Electron fires `updated` до 60Hz.
**Fix:** Debounce или delta-only (changed download ID + receivedBytes).

**PERF-03. TabService broadcasts full tab list on title/favicon/progress/navigate**
`TabService.ts:336-394` — Каждый callback (`onTitleChanged`, `onFaviconChanged`, `onProgress`, `onNavigate`) вызывает `broadcastState()` с полным списком табов. 50ms debounce помогает, но всё равно до 20 broadcast/sec.
**Fix:** Отправлять только изменённые поля конкретного таба.

**PERF-04. FingerprintProtectionService.domReadyCleanups leaks WebContents references**
`FingerprintProtectionService.ts:44-49` — Map хранит WebContents как ключи. `'destroyed'` event не всегда reliably emitted. При dematerialize tab Map entry persists.
**Fix:** Использовать `webContents.id` (number) как ключ.

**PERF-05. StateBroadcaster: полная замена массивов при каждом patch**
`StateBroadcaster.ts:36-52` — При `patch({ tabs: [...] })` весь массив tabs заменяется. 50 табов → каждый patch отправляет все 50 через IPC.
**Fix:** Дифф на уровне элементов.

### P1 — Высокий приоритет

**PERF-06. Logger creates new Date().toISOString() on every log call**
`Logger.ts:42` — Thousands of Date allocations per second в hot paths.
**Fix:** Использовать `Date.now()` и форматировать только при отображении.

**PERF-07. HistoryRepository.search() scans all 5000 entries on every keystroke**
`HistoryRepository.ts:72-78` — Фильтрация и сортировка всего массива. До ~7 сканов/сек при вводе.
**Fix:** Inverted index или reverse iteration с early exit.

**PERF-08. HistoryRepository.save() serializes all 5000 entries on every add**
`HistoryRepository.ts:24` — `this.history.map(h => h.toJSON())` на каждый `add()`. O(n).
**Fix:** Track dirty state, сериализовать только при записи на диск.

**PERF-09. VeilShell/AddressBar: подписка на весь settings объект**
`VeilShell.tsx:16`, `AddressBar.tsx:13` — `useVeilStore((s) => s.settings)` вызывает re-render при любом изменении settings.
**Fix:** Гранулярные селекторы: `useVeilStore((s) => s.settings.appearance.showBookmarksBar)`.

**PERF-10. Zustand store: applyPatch вызывает ререндер всего дерева**
`useVeilStore.ts:29-45` — spread создаёт новую ссылку на каждый slice. Все компоненты ре-рендерятся.
**Fix:** Использовать shallow merge только для изменившихся slice.

**PERF-11. DownloadRepository.add() — три array iterations на overflow**
`DownloadRepository.ts:17-25` — `filter(active)` + `filter(completed)` + `slice(-maxCompleted)`.
**Fix:** Prune from the front без категоризации.

### P2 — Средний приоритет

**PERF-12. RateLimiter.check() — фильтрация массива каждый вызов**
`RateLimiter.ts:11` — 100 аллокаций массива в секунду.

**PERF-13. EventBus: история не очищается автоматически**
`EventBus.ts:14-15` — 1000 объектов в памяти при долгой работе.

**PERF-14. ErrorHandler: slice при достижении лимита**
`ErrorHandler.ts:43-45` — Новый массив каждый раз.

**PERF-15. ActionDispatcher iterates ALL services for every action**
`ActionDispatcher.ts:13-28` — 10+ services, каждый action → 10 `handleAction` вызовов.
**Fix:** Action-type-to-service map.

**PERF-16. VeilShell: ResizeObserver fires IPC on every resize**
`VeilShell.tsx:120-141` — 60Hz при перетаскивании окна. Каждый вызов → `ViewManager.setShellOffset()` → `updateAllViewBounds()`.
**Fix:** Debounce 100ms или requestAnimationFrame.

**PERF-17. PersistenceService.save() — JSON.stringify с pretty-printing**
`PersistenceService.ts:81` — `JSON.stringify(data, null, 2)` удваивает размер output. Данные не читаются с диска.
**Fix:** `JSON.stringify(data)` без отступов.

**PERF-18. ElectronSession: new URL() на каждый HTTP запрос**
`AdblockService.ts:112`, `HttpsUpgradeService.ts:165` — Hundreds of URL parsing operations per page.
**Fix:** Кэшировать или использовать regex для hostname extraction.

**PERF-19. HttpsUpgradeService: string splitting на каждый запрос**
`HttpsUpgradeService.ts:193-207` — Для URLs не в HTTPS domain list.
**Fix:** Пропускать IP адреса early.

**PERF-20. TabBar drag handlers create new closures on every render**
`TabBar.tsx:87-118` — 100+ new function objects per render при 20 табах.
**Fix:** useCallback или data attributes.

**PERF-21. DownloadPanel activeDownloads/recentDownloads computed on every render**
`DownloadPanel.tsx:61-62` — Два новых массива даже когда panel закрыт.
**Fix:** useMemo или compute только когда isOpen.

**PERF-22. SettingsPage creates new update function on every render**
`SettingsPage.tsx:14` — Каскадный re-render всех SettingRow.
**Fix:** useCallback.

**PERF-23. AddressBar subscribes to full settings object**
`AddressBar.tsx:13` — Аналогично VeilShell.

**PERF-24. AddressBar DOM query при каждой навигации**
`AddressBar.tsx:45`, `VeilShell.tsx:89` — `document.querySelector` вместо React ref.

**PERF-25. ViewManager.materializedOrder — array splice для LRU**
`ViewManager.ts:188-191` — O(n) indexOf + splice. При MAX_MATERIALIZED=5 OK, но не масштабируется.

**PERF-26. InitializeApp runs all service inits sequentially**
`index.ts:527` — `await registry.initAll()` sequentially. Slow init блокирует остальные.
**Fix:** Promise.all для independent service inits.

**PERF-27. ContextMenuService.contextMenuCleanups never cleans up on tab close**
`ContextMenuService.ts:57-63` — Cleanup на `destroyed` event, а не на tab close.

### P3 — Низкий приоритет

**PERF-28. HomePage: setInterval для greeting каждую минуту**
**PERF-29. DebugPanel: useMemo для errorCount/warnCount**
**PERF-30. StatusBar: re-render при каждом hover**
**PERF-31. Logger: форматирование timestamp каждый вызов**
**PERF-32. Tokens CSS: !important на input focus**
**PERF-33. glass.css: backdrop-filter expensive на каждом dropdown**
**PERF-34. build.bat: test .d.ts files in dist**
**PERF-35. EventBus.eventHistory stores full payload objects**
**PERF-36. selectActiveTab uses module-level mutable state**

---

## UI/UX И ACCESSIBILITY (58 проблем)

### P1 — Высокий приоритет

**UI-01. Tab overflow — tabs become inaccessible**
`TabBar.tsx:146-157` — `overflowX: auto` + `scrollbarWidth: none`. При 20+ табах нет индикатора и нет прокрутки.
**Fix:** Кнопки прокрутки или overflow menu.

**UI-02. Tab items fixed at 180px — no responsive behavior**
`glass.css:26-28` — `width: 180px; min-width: 180px; max-width: 180px`. Табы никогда не сжимаются.
**Fix:** `min-width: 120px; max-width: 240px; flex: 1 1 0`.

**UI-03. No light theme support — only dark**
`tokens.css` — Только dark theme. `color-scheme: dark` без light варианта.
**Fix:** Добавить `@media (prefers-color-scheme: light)`.

**UI-04. Tab close button uses `<div role="button">` instead of `<button>`**
`TabBar.tsx:216-228` — Нет built-in keyboard activation, focus semantics.
**Fix:** Заменить на `<button type="button">`.

**UI-05. Context menu has no keyboard navigation**
`TabBar.tsx:299-331` — Нет ArrowUp/Down, Home/End, focus trap.
**Fix:** Добавить keyboard handlers, auto-focus first item.

**UI-06. Address bar security icon has no accessible text**
`AddressBar.tsx:202-215` — Lock/warning SVG без `aria-label`.
**Fix:** Добавить `aria-label` для screen readers.

**UI-07. Download progress bar lacks ARIA progress semantics**
`DownloadPanel.tsx:168-179` — Plain `<div>` вместо `role="progressbar"`.
**Fix:** Добавить `role="progressbar"`, `aria-valuenow`, `aria-valuemin`, `aria-valuemax`.

**UI-08. ErrorBoundary error state lacks `role="alert"`**
`ErrorBoundary.tsx:34-69` — Screen readers не объявляют об ошибке.
**Fix:** Добавить `role="alert"`.

**UI-09. BookmarkBar lacks `role="menubar"` and keyboard navigation**
`BookmarkBar.tsx:47-213` — Нет ArrowLeft/Right, Enter, Escape.
**Fix:** Добавить role и keyboard handlers.

**UI-10. Settings label-input association missing**
`SettingsPage.tsx:211-223` — Нет `<label htmlFor="...">`.
**Fix:** Использовать `<label>` с `htmlFor`.

**UI-11. No loading/skeleton state for history, version pages**
`HistoryPage.tsx`, `VersionPage.tsx` — Пустой flash перед загрузкой данных.
**Fix:** Добавить `isLoading` state с skeleton UI.

**UI-12. FindBar: no match count, no prev/next navigation**
`FindBar.tsx` — Нет "X of Y matches", нет кнопок prev/next.
**Fix:** Добавить match count и навигацию.

### P2 — Средний приоритет

**UI-13. Bookmark bar silently truncates at 20 items**
`BookmarkBar.tsx:181` — `noFolder.slice(0, 20)` без overflow индикатора.

**UI-14. No feedback on bookmark add/remove**
`AddressBar.tsx:252-262` — Нет анимации или toast.

**UI-15. DownloadPanel limited to 5 downloads, no "Show all"**
`DownloadPanel.tsx:62` — Нет навигации на full downloads page.

**UI-16. Quick links not customizable**
`HomePage.tsx:5-12` — 6 links захардкожены.

**UI-17. VersionPage uses undefined `--bg-card`**
`VersionPage.tsx:34` — CSS variable не существует.

**UI-18. DebugPanel: broken font-family declaration**
`DebugPanel.tsx:141` — `'var(--font-family-var(--font-family-monospace))'` — вложенная var() не работает.

**UI-19. SettingsPage appearance section has only 1 setting**
`SettingsPage.tsx:194-205` — "Appearance" содержит только "Show bookmarks bar".

**UI-20. No "Reset to defaults" in settings**
`SettingsPage.tsx` — Нет пути восстановления настроек.

**UI-21. Context menu can overflow viewport**
`TabBar.tsx:300-303` — Нет boundary checking.

**UI-22. FindBar: duplicate aria-label**
`FindBar.tsx:42,66` — Одинаковый `aria-label` на div и input.

**UI-23. DownloadPanel active indicator has no accessible text**
`DownloadPanel.tsx:84-96` — Blue dot без screen reader текста.

**UI-24. HistoryPage clear button has no confirmation**
`HistoryPage.tsx:24-27` — Безвозвратное удаление без подтверждения.

**UI-25. SettingsPage "Clear All Data" has no confirmation**
`SettingsPage.tsx:178-189` — Аналогично.

**UI-26. No zoom indicator or zoom controls**
— Нет zoom state в store, нет UI.

**UI-27. No right-click context menu on web pages**
— Только tab-level context menu.

**UI-28. No full-screen handling**
— Нет F11, нет auto-hide chrome.

**UI-29. No download progress in taskbar**
— Нет `win.setProgressBar()`.

**UI-30. No notification for completed downloads**
— Нет system notification.

**UI-31. Inconsistent hardcoded values across components**
— `#fff`, `rgba(255,255,255,0.15)`, `rgba(0,0,0,0.3)` вместо tokens.

**UI-32. Inconsistent font sizes — hardcoded vs tokens**
— `'24px'`, `'12px'`, `'13px'`, `'11px'` вместо `var(--font-size-*)`.

**UI-33. Inconsistent padding — pixels vs tokens**
— `'32px 40px 24px'`, `'40px'` — нет tokens для 32, 40.

**UI-33. Missing z-index scale**
— 1000, 9999, 10000 разбросаны по коду.

**UI-34. Inconsistent animation durations**
— `100ms`, `150ms`, `0.2s`, `0.3s` вместо tokens.

**UI-35. No transition animations for view changes**
`VeilShell.tsx:186-202` — Instant swap без transition.

**UI-36. No loading indicator during initial store init**
`main.tsx:9-22` — Пустой flash при загрузке.

**UI-37. No hover/focus states on action buttons**
`DownloadPanel.tsx:183-203`, `SettingsPage.tsx:262` — Inline styles без pseudo-classes.

### P3 — Низкий приоритет

**UI-38. DebugPanel: fixed 600x400 dimensions**
**UI-39. Settings sidebar fixed at 180px**
**UI-40. History/Version pages use large fixed paddings**
**UI-41. Tab drag indicator is minimal**
**UI-42. No empty states with illustrations**
**UI-43. Twitter link uses x.com but label says "Twitter"**
**UI-44. Quick link colors hardcoded**
**UI-45. StatusBar: no click-to-copy URL**
**UI-46. Toggle has no disabled state**
**UI-47. No tab search**
**UI-48. No reading mode**
**UI-49. No print preview**
**UI-50. No bookmark manager page**
**UI-51. No downloads page**
**UI-52. No keyboard shortcuts help page**
**UI-53. No tab groups**
**UI-54. DownloadPanel: no grouping by date**
**UI-55. ErrorBoundary: no "Copy error" button**
**UI-56. Tab close button: too small click target**
**UI-57. Status bar: too compact (24px)**
**UI-58. BookmarkBar: no drag-and-drop for bookmarks**

---

## ТОП-10 ПРИОРИТЕТНЫХ ИСПРАВЛЕНИЙ

| # | ID | Категория | Описание | Влияние |
|---|---|---|---|---|
| 1 | SEC-01 | Безопасность | Нет `will-navigate` handler на renderer | XSS → навигация на file:/// |
| 2 | SEC-02 | Безопасность | `veil://` URLs не валидируются | XSS через veil:// injection |
| 3 | SEC-04 | Безопасность | Path traversal в download filenames | Запись в произвольные директории |
| 4 | SEC-03 | Безопасность | XSS через context menu linkURL | JS execution через правый клик |
| 5 | PERF-01 | Производительность | Logger → EventBus history bloat | Memory churn, CPU waste |
| 6 | PERF-02 | Производительность | Download progress broadcast storm | 60Hz IPC с полным списком |
| 7 | PERF-03 | Производительность | Tab broadcast full list | 20 broadcast/sec с 20 табами |
| 8 | UI-01 | UI/UX | Tab overflow — tabs inaccessible | 20+ табов → потеря доступа |
| 9 | SEC-07 | Безопасность | SETTINGS_UPDATE prototype pollution | Injection произвольных ключей |
| 10 | SEC-08 | Безопасность | RateLimiter глобальный | DoS одной вкладкой всего браузера |
