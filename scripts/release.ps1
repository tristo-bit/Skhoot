# =============================================================================
# Skhoot Desktop Seeker - Windows Release Script (PowerShell)
# =============================================================================
# This script builds release packages for Windows 11.
# Run with: .\scripts\release.ps1 [options]
#
# Options:
#   -SkipDeps       Skip dependency checks
#   -Clean          Clean build artifacts before building
#   -Verbose        Enable verbose output
# =============================================================================

param(
    [switch]$SkipDeps,
    [switch]$Clean,
    [switch]$VerboseOutput
)

$ErrorActionPreference = "Stop"

# Colors
function Write-Info { Write-Host "ℹ️  $args" -ForegroundColor Cyan }
function Write-Success { Write-Host "✅ $args" -ForegroundColor Green }
function Write-Warning { Write-Host "⚠️  $args" -ForegroundColor Yellow }
function Write-Error { Write-Host "❌ $args" -ForegroundColor Red }

# Get script and project paths
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir

# Header
Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Blue
Write-Host "║       Skhoot Desktop Seeker - Windows Release Script         ║" -ForegroundColor Blue
Write-Host "╚══════════════════════════════════════════════════════════════╝" -ForegroundColor Blue
Write-Host ""

# Check common dependencies
function Test-CommonDeps {
    Write-Info "Checking common dependencies..."
    
    # Check Node.js
    try {
        $nodeVersion = node -v
        $majorVersion = [int]($nodeVersion -replace 'v(\d+)\..*', '$1')
        if ($majorVersion -lt 18) {
            Write-Error "Node.js 18+ is required. Current version: $nodeVersion"
            exit 1
        }
        Write-Success "Node.js $nodeVersion found"
    } catch {
        Write-Error "Node.js is not installed. Please install Node.js 18+ first."
        Write-Host "   Download from: https://nodejs.org/"
        exit 1
    }
    
    # Check npm
    try {
        $npmVersion = npm -v
        Write-Success "npm $npmVersion found"
    } catch {
        Write-Error "npm is not installed."
        exit 1
    }
    
    # Check Rust
    try {
        $rustVersion = rustc --version
        Write-Success "Rust $($rustVersion -replace 'rustc ', '') found"
    } catch {
        Write-Error "Rust is not installed. Please install Rust first:"
        Write-Host "   Download from: https://rustup.rs/"
        exit 1
    }
    
    # Check Cargo
    try {
        cargo --version | Out-Null
        Write-Success "Cargo found"
    } catch {
        Write-Error "Cargo is not installed."
        exit 1
    }
}

# Check Windows-specific dependencies
function Test-WindowsDeps {
    Write-Info "Checking Windows-specific dependencies..."
    
    # Check for Visual Studio Build Tools
    $vsWhere = "${env:ProgramFiles(x86)}\Microsoft Visual Studio\Installer\vswhere.exe"
    if (Test-Path $vsWhere) {
        $vsPath = & $vsWhere -latest -products * -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath
        if ($vsPath) {
            Write-Success "Visual Studio Build Tools found at: $vsPath"
        } else {
            Write-Warning "Visual Studio Build Tools with C++ workload not found."
            Write-Host "   Please install Visual Studio Build Tools with 'Desktop development with C++' workload"
            Write-Host "   Download from: https://visualstudio.microsoft.com/visual-cpp-build-tools/"
        }
    } else {
        Write-Warning "Could not verify Visual Studio installation."
        Write-Host "   Ensure Visual Studio Build Tools are installed with C++ workload"
    }
    
    # Check WebView2
    $webview2Key = "HKLM:\SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}"
    if (Test-Path $webview2Key) {
        Write-Success "WebView2 Runtime found"
    } else {
        Write-Info "WebView2 Runtime will be downloaded during installation (bundled with installer)"
    }
}

# Clean build artifacts
function Clear-BuildArtifacts {
    Write-Info "Cleaning build artifacts..."
    Set-Location $ProjectRoot
    
    if (Test-Path "dist") { Remove-Item -Recurse -Force "dist" }
    if (Test-Path "src-tauri\target\release\bundle") { 
        Remove-Item -Recurse -Force "src-tauri\target\release\bundle" 
    }
    
    Write-Success "Build artifacts cleaned"
}

# Install dependencies
function Install-Dependencies {
    Write-Info "Installing Node.js dependencies..."
    Set-Location $ProjectRoot
    
    if (Test-Path "package-lock.json") {
        npm ci
    } else {
        npm install
    }
    
    Write-Success "Node.js dependencies installed"
}

# Build frontend
function Build-Frontend {
    Write-Info "Building frontend..."
    Set-Location $ProjectRoot
    npm run build
    Write-Success "Frontend built"
}

# Build backend
function Build-Backend {
    Write-Info "Building backend..."
    Set-Location "$ProjectRoot\backend"
    cargo build --release
    Write-Success "Backend built"
}

# Build Tauri app
function Build-TauriApp {
    Write-Info "Building Tauri application..."
    Set-Location $ProjectRoot
    npm run tauri build
    Write-Success "Tauri application built"
}

# Main execution
function Main {
    Set-Location $ProjectRoot
    
    # Check dependencies
    if (-not $SkipDeps) {
        Test-CommonDeps
        Test-WindowsDeps
    }
    
    # Clean if requested
    if ($Clean) {
        Clear-BuildArtifacts
    }
    
    # Install dependencies
    Install-Dependencies
    
    # Build Tauri (this handles frontend and backend via beforeBuildCommand)
    Build-TauriApp
    
    Write-Host ""
    Write-Host "╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Green
    Write-Host "║                    Build Complete! 🎉                        ║" -ForegroundColor Green
    Write-Host "╚══════════════════════════════════════════════════════════════╝" -ForegroundColor Green
    Write-Host ""
    
    Write-Info "Output packages:"
    Write-Host "   📦 MSI Installer: src-tauri\target\release\bundle\msi\"
    Write-Host "   📦 NSIS Installer: src-tauri\target\release\bundle\nsis\"
    Write-Host ""
    Write-Info "All release packages are in: src-tauri\target\release\bundle\"
}

Main
