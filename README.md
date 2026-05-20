# Veil Browser

Приватный веб-браузер на Electron 42 + React 19 с фокусом на конфиденциальность, безопасность и производительность.

## Что это

Veil Browser — это десктопный браузер, который блокирует рекламу, трекеры и fingerprinting из коробки. Не собирает данные, не отправляет телеметрию, не требует регистрации.

**Технологии:** Electron 42, React 19, Zustand 5, TypeScript 5.9, Vite 8

**Архитектура:** Clean Architecture (4 слоя), монорепо с 3 пакетами, 123 файла, 78 тестов.

---

## Установка

```bash
# Клонировать репозиторий
git clone https://github.com/dakemoxydo/Veil-Browser.git
cd Veil-Browser

# Установить зависимости
npm install

# Собрать и запустить
npm run build
npm run dev
```

### Сборка .exe

```bash
npm run package
# Результат: dist-release/Veil Browser Setup.exe
```

---

## Функции

### Навигация

| Функция | Описание | Как использовать |
|---|---|---|
| **Адресная строка** | Ввод URL или поискового запроса | Клик по строке, ввод URL или текста |
| **Поисковые подсказки** | Подсказки из истории и закладок | Ввод текста в адресную строку |
| **Назад/Вперёд** | Навигация по истории таба | Кнопки ← → или Alt+Left/Right |
| **Перезагрузка** | Обновление страницы | Кнопка ↻ или Ctrl+R / F5 |
| **Домашняя страница** | Переход на стартовую страницу | Кнопка 🏠 или Ctrl+Shift+H |
| **Режим чтения** | Упрощённое отображение статей | Кнопка 📖 в адресной строке |

### Табы

| Функция | Описание | Как использовать |
|---|---|---|
| **Новый таб** | Открыть новую вкладку | Ctrl+T или кнопка + |
| **Закрыть таб** | Закрыть текущую вкладку | Ctrl+W или кнопка × |
| **Закрепить таб** | Зафиксировать вкладку слева | ПКМ → Pin tab |
| **Отключить звук** | Mute звук в табе | ПКМ → Mute tab |
| **Закрыть другие** | Закрыть все кроме текущего | ПКМ → Close other tabs |
| **Закрыть справа** | Закрыть табы правее | ПКМ → Close tabs to the right |
| **Восстановить таб** | Вернуть закрытый таб | Ctrl+Shift+T |
| **Недавно закрытые** | Список закрытых табов | Кнопка ↩ рядом с + |
| **Переключение табов** | Следующий/предыдущий таб | Ctrl+Tab / Ctrl+Shift+Tab |
| **Поиск по табам** | Найти открытый таб | Ctrl+Shift+A |
| **Группы табов** | Цветные группы с сворачиванием | ПКМ → Add to new group |
| **Индикатор аудио** | Иконка 🔊 на табах с звуком | Автоматически |
| **Перетаскивание** | Изменение порядка табов | Drag & Drop |

### Закладки

| Функция | Описание | Как использовать |
|---|---|---|
| **Добавить закладку** | Сохранить текущую страницу | Ctrl+D или кнопка ☆ |
| **Панель закладок** | Быстрый доступ к закладкам | Settings → Appearance → Show bookmarks bar |
| **Менеджер закладок** | Полная страница управления | Ctrl+B или veil://bookmarks |
| **Папки** | Группировка закладок | При добавлении указать папку |
| **Drag-and-drop** | Перетаскивание закладок | Drag на панели закладок |
| **Поиск** | Поиск по закладкам | На странице veil://bookmarks |

### История

| Функция | Описание | Как использовать |
|---|---|---|
| **Страница истории** | Просмотр всей истории | Ctrl+H или veil://history |
| **Поиск** | Поиск по истории | Строка поиска на странице |
| **Очистить всё** | Удалить всю историю | Кнопка Clear all (с подтверждением) |
| **Очистить по времени** | Удалить за период | Settings → Privacy → Clear browsing data |

### Загрузки

| Функция | Описание | Как использовать |
|---|---|---|
| **Панель загрузок** | Текущие загрузки | Ctrl+J или кнопка ↓ |
| **Страница загрузок** | Полная история загрузок | veil://downloads |
| **Прогресс в taskbar** | Полоска прогресса на Windows | Автоматически при загрузке |
| **Уведомления** | Системные уведомления | Автоматически при завершении |
| **Открыть файл** | Открыть загруженный файл | Кнопка Open в панели |
| **Показать в папке** | Открыть папку с файлом | Кнопка Folder в панели |

### Зум

| Функция | Описание | Как использовать |
|---|---|---|
| **Увеличить** | Zoom in | Ctrl+= или Ctrl++ |
| **Уменьшить** | Zoom out | Ctrl+- |
| **Сбросить** | Вернуть 100% | Ctrl+0 |
| **Индикатор** | Показывает текущий зум | В StatusBar, клик для сброса |

### Поиск

| Функция | Описание | Как использовать |
|---|---|---|
| **Поиск по странице** | Найти текст на странице | Ctrl+F |
| **Поисковая система** | Настройка поисковика | Settings → General → Search engine |
| **Подсказки** | Автодополнение из истории | Ввод в адресную строку |

### Приватность и безопасность

| Функция | Описание | Как использовать |
|---|---|---|
| **Блокировка рекламы** | 160+ доменов + custom lists | Settings → Privacy → Ad blocker |
| **Блокировка трекеров** | 90+ трекер-доменов | Settings → Privacy → Block trackers |
| **Fingerprint защита** | Canvas, WebRTC, WebGL, Audio, Navigator | Settings → Privacy → Fingerprint protection |
| **Блокировка cookies** | Сторонние cookies | Settings → Privacy → Block third-party cookies |
| **HTTPS upgrade** | Авто-апгрейд HTTP → HTTPS | Settings → Privacy → HTTPS Everywhere |
| **DNT** | Do Not Track заголовок | Settings → Privacy → Do Not Track |
| **Инкогнито** | Ephemeral session без следов | Ctrl+Shift+N |
| **Очистка данных** | По времени: час/день/неделя/всё | Settings → Privacy → Clear browsing data |
| **Custom adblock lists** | Загрузка EasyList фильтров | Settings → Privacy → Custom filter lists |
| **Script blocking** | Блокировка JS на сайтах | Settings → Privacy → Script blocking |
| **Password manager** | AES-256-GCM encrypted vault | veil://passwords |
| **Прокси** | SOCKS5/HTTP proxy | Settings → Proxy |
| **Сертификаты** | Exceptions для self-signed | Автоматически при ошибке сертификата |
| **Privacy dashboard** | Статистика блокировок | veil://privacy |

### Настройки

| Функция | Описание | Как использовать |
|---|---|---|
| **Домашняя страница** | Стартовая URL | Settings → General → Homepage |
| **Поисковая система** | DuckDuckGo/Google/Brave/Custom | Settings → General → Search engine |
| **Восстановление табов** | При перезапуске | Settings → General → Restore tabs |
| **Панель закладок** | Показывать/скрывать | Settings → Appearance → Show bookmarks bar |
| **Тема** | Dark/Light/System | Settings → Appearance → Theme |
| **Размер шрифта** | Small/Medium/Large | Settings → Appearance → Font size |
| **Акцентный цвет** | Выбор цвета | Settings → Appearance → Accent color |
| **Компактный режим** | Уменьшенные элементы | Settings → Appearance → Compact mode |
| **Сброс настроек** | Вернуть defaults | Settings → Reset to defaults |
| **Прокси** | Direct/System/Manual | Settings → Proxy |

### Внутренние страницы

| URL | Описание |
|---|---|
| `veil://home` | Домашняя страница с quick links |
| `veil://history` | История浏览ания |
| `veil://bookmarks` | Менеджер закладок |
| `veil://downloads` | История загрузок |
| `veil://privacy` | Privacy dashboard |
| `veil://shortcuts` | Все горячие клавиши |
| `veil://passwords` | Password manager |
| `veil://version` | Информация о версии |

### Прочее

| Функция | Описание | Как использовать |
|---|---|---|
| **Печать** | Печать страницы | Ctrl+P |
| **Сохранить страницу** | Скачать как HTML | Ctrl+S |
| **DevTools** | Инструменты разработчика | Ctrl+Shift+I |
| **Debug консоль** | Логи приложения | Ctrl+Shift+D |
| **Полноэкранный режим** | Без chrome | F11 |
| **Toast уведомления** | Мгновенные уведомления | Автоматически |
| **Подтверждения** | Диалоги для destructive actions | Автоматически |

---

## Горячие клавиши

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

## Архитектура

```
packages/
├── shared/      # Типы, доменные модели (16 файлов)
├── main/        # Electron main process (66 файлов)
│   ├── core/         # Фреймворк: EventBus, ErrorHandler, StateBroadcaster
│   ├── application/  # Сервисы и use cases
│   ├── services/     # 13 feature services
│   └── infrastructure/ # Adapters и repositories
└── renderer/    # React UI (42 файла)
    ├── components/   # 29 компонентов
    ├── store/        # Zustand (9 slices)
    └── styles/       # CSS tokens + glass morphism
```

### Поток данных

```
User Action → React Component → dispatch(action) → IPC → Main Process
    → ActionValidator → RateLimiter → ActionDispatcher → Service
    → UseCase → Repository → broadcast() → StateBroadcaster
    → IPC → React Store → Re-render
```

---

## Тесты

```bash
npm run test        # 78 tests, 1 skipped
npm run test:watch  # Watch mode
```

Покрытие: ErrorHandler, EventBus, StateBroadcaster, ActionValidator, RateLimiter, Logger, доменные модели, use cases.

---

## Сборка

```bash
npm run build       # TypeScript компиляция
npm run lint        # ESLint
npm run format      # Prettier
npm run package     # Electron builder → dist-release/
```

---

## Лицензия

MIT
