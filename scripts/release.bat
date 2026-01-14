@echo off
REM =============================================================================
REM Skhoot Desktop Seeker - Windows Release Script (Batch)
REM =============================================================================
REM One-click release build for Windows 11
REM Double-click this file or run from Command Prompt
REM =============================================================================

echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║       Skhoot Desktop Seeker - Windows Release Build          ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.

REM Get script directory
set SCRIPT_DIR=%~dp0
set PROJECT_ROOT=%SCRIPT_DIR%..

cd /d "%PROJECT_ROOT%"

echo [INFO] Checking Node.js...
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js is not installed. Please install Node.js 18+ first.
    echo         Download from: https://nodejs.org/
    pause
    exit /b 1
)
for /f "tokens=1" %%v in ('node -v') do echo [OK] Node.js %%v found

echo [INFO] Checking Rust...
where rustc >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Rust is not installed. Please install Rust first.
    echo         Download from: https://rustup.rs/
    pause
    exit /b 1
)
for /f "tokens=2" %%v in ('rustc --version') do echo [OK] Rust %%v found

echo.
echo [INFO] Installing Node.js dependencies...
call npm ci
if %ERRORLEVEL% neq 0 (
    echo [WARNING] npm ci failed, trying npm install...
    call npm install
)

echo.
echo [INFO] Building Tauri application...
call npm run tauri build
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Build failed!
    pause
    exit /b 1
)

echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║                    Build Complete! 🎉                        ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.
echo Output packages:
echo    MSI Installer:  src-tauri\target\release\bundle\msi\
echo    NSIS Installer: src-tauri\target\release\bundle\nsis\
echo.

REM Open the bundle folder
explorer "src-tauri\target\release\bundle"

pause
