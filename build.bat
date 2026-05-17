@echo off
setlocal enabledelayedexpansion

:: Veil Browser Build System (Optimized)

set SESSION_ID=%RANDOM%
set BUILD_DIR=%~dp0logs
set BUILD_LOG=%BUILD_DIR%\build_%SESSION_ID%.log
set DEBUG_LOG=%BUILD_DIR%\build_debug_%SESSION_ID%.log
set LOCK_FILE=.build.lock
set NO_PAUSE=0
set TIMESTAMP=%DATE% %TIME%

if not exist "%BUILD_DIR%" mkdir "%BUILD_DIR%"

:: Kill only Veil Browser processes
taskkill /F /IM "Veil Browser.exe" /T >nul 2>&1

:: Parse Arguments
for %%a in (%*) do (
    if "%%a"=="--no-pause" set NO_PAUSE=1
    if "%%a"=="--fast" set FAST=1
)

:: Check for Lock
if exist %LOCK_FILE% (
    echo [!] BUILD LOCK DETECTED. Delete %LOCK_FILE% if no build is running.
    if %NO_PAUSE%==0 pause
    exit /b 1
)
mkdir %LOCK_FILE% 2>nul
if %errorlevel% neq 0 (
    echo [!] Failed to acquire build lock.
    if %NO_PAUSE%==0 pause
    exit /b 1
)

echo ======================================== > "%BUILD_LOG%"
echo VEIL BROWSER BUILD - %TIMESTAMP% >> "%BUILD_LOG%"
echo ======================================== >> "%BUILD_LOG%"

cls
echo ========================================
echo    VEIL BROWSER - BUILD SYSTEM
echo ========================================
echo.

:: Stage 1: Dependencies (skip if node_modules exists and --fast)
echo [1/4] Dependencies...
if "%FAST%"=="1" (
    if exist node_modules (
        echo [SKIP] node_modules exists, use without --fast to reinstall.
        goto :SKIP_INSTALL
    )
)
call npm install --no-audit --no-fund --prefer-offline >> "%BUILD_LOG%" 2>&1
if %errorlevel% neq 0 (
    echo [!] ERROR: npm install failed.
    goto :FAIL
)
:SKIP_INSTALL
echo [OK]
echo.

:: Stage 2: TypeScript (all packages in one tsc -b call - uses incremental builds)
echo [2/4] TypeScript compilation...
call npx tsc -b >> "%BUILD_LOG%" 2>&1
if %errorlevel% neq 0 (
    echo [!] ERROR: TypeScript build failed.
    goto :FAIL
)
echo [OK]
echo.

:: Stage 3: Vite (renderer production build)
echo [3/4] Vite bundling...
pushd packages\renderer
call npx vite build >> "%BUILD_LOG%" 2>&1
popd
if %errorlevel% neq 0 (
    echo [!] ERROR: Vite build failed.
    goto :FAIL
)
echo [OK]
echo.

:: Stage 4: Fix @veil/shared paths + Package (.exe)
echo [4/4] Packaging...
:: Fix module paths for asar (single PowerShell call)
powershell -Command "$files = Get-ChildItem -Path 'packages\main\dist' -Recurse -Filter '*.js'; foreach($f in $files) { $c = Get-Content $f.FullName -Raw; if($c -match '@veil/shared') { $depth = ($f.FullName -replace [regex]::Escape((Get-Location).Path+'\packages\main\dist\'),'').Split('\').Count - 1; $prefix = '../' * ($depth + 2); $c = $c -replace '@veil/shared', ($prefix + 'shared/dist'); Set-Content $f.FullName $c -NoNewline } }" >> "%BUILD_LOG%" 2>&1
call npx electron-builder --win --x64 >> "%BUILD_LOG%" 2>&1
if %errorlevel% neq 0 (
    echo [!] ERROR: Packaging failed.
    goto :FAIL
)
echo [OK]
echo.

:SUCCESS
if exist %LOCK_FILE% rmdir /s /q %LOCK_FILE%
echo ========================================
echo    BUILD SUCCESSFUL
echo ========================================
echo.
if %NO_PAUSE%==0 pause > nul
exit /b 0

:FAIL
if exist %LOCK_FILE% rmdir /s /q %LOCK_FILE%
echo ========================================
echo    BUILD FAILED - see %BUILD_LOG%
echo ========================================
echo.
if %NO_PAUSE%==0 pause > nul
exit /b 1
