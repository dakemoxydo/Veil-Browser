@echo off
setlocal EnableDelayedExpansion

title Veil Browser - Build Script
color 0A
echo.
echo ===================================================
echo             VEIL BROWSER BUILD SCRIPT
echo ===================================================
echo.

REM ── Kill lingering browser processes ─────────────────────────────────────────
echo [INFO] Terminating any lingering Veil Browser processes to free locked files...
taskkill /F /IM "Veil Browser.exe" /T >nul 2>&1
taskkill /F /IM "VeilBrowser-*-portable.exe" /T >nul 2>&1
echo [INFO] Cleanup complete.
echo.
REM ── Disable code signing to avoid winCodeSign symlink error on Windows ──────
REM Without a valid cert, electron-builder tries to download winCodeSign which
REM contains macOS symlinks that 7-Zip cannot extract without Developer Mode.
set CSC_IDENTITY_AUTO_DISCOVERY=false
set WIN_CSC_LINK=
echo [INFO] Code signing disabled (no certificate configured).
echo.

REM ── Pre-extract winCodeSign to avoid macOS-symlink error ─────────────────────
REM app-builder downloads winCodeSign-2.6.0.7z and extracts it with 7-Zip.
REM The archive contains macOS symlinks that 7-Zip cannot create on Windows
REM without Developer Mode → exit code 2 → build fails.
REM Fix: extract once ourselves, pre-creating the symlink targets as empty files.
echo [PRE] Preparing winCodeSign cache (macOS-symlink workaround)...
set "SCRIPT_DIR=%~dp0"
set "LOCALAPPDATA_CACHE=%LOCALAPPDATA%\electron-builder\Cache\winCodeSign"
powershell -NoProfile -Command ^
  "$cacheDir = '%LOCALAPPDATA_CACHE%';" ^
  "$zip7 = '%SCRIPT_DIR%node_modules\7zip-bin\win\x64\7za.exe';" ^
  "if (-not (Test-Path $zip7)) { $zip7 = Join-Path (Get-Location) 'node_modules\7zip-bin\win\x64\7za.exe'; };" ^
  "if (-not (Test-Path $cacheDir)) { New-Item -ItemType Directory -Force -Path $cacheDir | Out-Null; };" ^
  "$archives = Get-ChildItem $cacheDir -Filter *.7z -ErrorAction SilentlyContinue;" ^
  "foreach ($arc in $archives) {" ^
    "$outDir = $arc.FullName -replace '\.7z$','';" ^
    "if ((Test-Path $outDir) -and (Test-Path (Join-Path $outDir 'windows-10\x64\signtool.exe'))) { continue };" ^
    "if (Test-Path $outDir) { Remove-Item $outDir -Recurse -Force -ErrorAction SilentlyContinue };" ^
    "New-Item -ItemType Directory -Force -Path $outDir | Out-Null;" ^
    "$sl = Join-Path $outDir 'darwin\10.12\lib';" ^
    "New-Item -ItemType Directory -Force -Path $sl | Out-Null;" ^
    "New-Item -ItemType File -Force -Path (Join-Path $sl 'libcrypto.dylib') | Out-Null;" ^
    "New-Item -ItemType File -Force -Path (Join-Path $sl 'libssl.dylib') | Out-Null;" ^
    "if (Test-Path $zip7) { & $zip7 x -y -o$outDir $arc.FullName | Out-Null; };" ^
    "Write-Host ('[PRE] Extracted: ' + (Split-Path $outDir -Leaf))" ^
  "}"
echo [PRE] winCodeSign cache ready.
echo.

echo [1/4] Ensuring all dependencies are installed...
call npm install
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Failed to install dependencies.
    goto :error
)
echo [SUCCESS] Dependencies installed.
echo.

echo [2/4] Building TypeScript Source Code (Shared ^> Main ^> Renderer)...
call npm run build --workspace=packages/shared
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Shared package build failed.
    goto :error
)
call npm run build --workspace=packages/renderer
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Renderer package build failed.
    goto :error
)
call npm run build --workspace=packages/main
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Main package build failed.
    goto :error
)
echo [SUCCESS] Source code built successfully.
echo.

echo [3/4] Bundling Executable with Electron Builder...
echo       [INFO] This step compresses the entire Chromium engine (400 MB) into one file.
echo       [INFO] Please wait. It usually takes 1-3 minutes and may appear frozen...
echo       --------------------------------------------------------------------------------
call npx electron-builder --win
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Electron Builder failed to package the application.
    echo [HINT]  Check errors above. Common causes:
    echo         - Missing icon file at assets/icons/veil.ico
    echo         - Insufficient disk space
    echo         - Antivirus blocking file operations
    goto :error
)
echo [SUCCESS] Executable bundled successfully.
echo.

echo [4/4] Build Complete!
echo.
echo  Output location: %~dp0dist\
echo  Launcher:        %~dp0dist\VeilBrowser-0.1.0-portable.exe
echo  Unpacked:        %~dp0dist\win-unpacked\Veil Browser.exe
echo.
echo ===================================================
echo                    FINISHED ^(^_^)
echo ===================================================
echo.
pause
exit /b 0

:error
echo.
echo ===================================================
echo             BUILD FAILED WITH ERRORS
echo ===================================================
echo.
pause
exit /b 1
