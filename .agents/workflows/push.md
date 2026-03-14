---
description: Автоматический коммит и пуш на GitHub (https://github.com/dakemoxydo/Veil-Browser)
---

Этот воркфлоу инициализирует git (если нужно), добавляет все файлы, делает коммит с авто-сгенерированным или заданным сообщением и пушит изменения в репозиторий.

1. Инициализация репозитория и настройка remote
// turbo
```powershell
git init
git branch -M main
git remote add origin https://github.com/dakemoxydo/Veil-Browser
```

2. Индексация всех изменений
// turbo
```powershell
git add .
```

3. Создание коммита (ты можешь поменять сообщение на более детальное перед выполнением этой команды, если нужно)
// turbo
```powershell
git commit -m "Auto-commit: Update features and fixes"
```

4. Пуш изменений на GitHub
// turbo
```powershell
git push -u origin main
```
