#!/bin/bash

# =============================================================================
# Skhoot Desktop Seeker - Cross-Platform Release Script
# =============================================================================
# This script builds release packages for Windows, macOS, and Linux.
# Run with: ./scripts/release.sh [platform] [options]
#
# Platforms: all, windows, macos, linux
# Options:
#   --skip-deps     Skip dependency checks
#   --clean         Clean build artifacts before building
#   --verbose       Enable verbose output
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Default values
PLATFORM="${1:-all}"
SKIP_DEPS=false
CLEAN_BUILD=false
VERBOSE=false

# Parse arguments
shift || true
while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-deps) SKIP_DEPS=true ;;
        --clean) CLEAN_BUILD=true ;;
        --verbose) VERBOSE=true ;;
        *) echo -e "${RED}Unknown option: $1${NC}"; exit 1 ;;
    esac
    shift
done

# Logging functions
log_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }

# Header
echo ""
echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║       Skhoot Desktop Seeker - Release Build Script          ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Detect current OS
detect_os() {
    case "$(uname -s)" in
        Linux*)     echo "linux" ;;
        Darwin*)    echo "macos" ;;
        MINGW*|MSYS*|CYGWIN*) echo "windows" ;;
        *)          echo "unknown" ;;
    esac
}

CURRENT_OS=$(detect_os)
log_info "Detected OS: $CURRENT_OS"
log_info "Target platform: $PLATFORM"

# Check common dependencies
check_common_deps() {
    log_info "Checking common dependencies..."
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed. Please install Node.js 18+ first."
        exit 1
    fi
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        log_error "Node.js 18+ is required. Current version: $(node -v)"
        exit 1
    fi
    log_success "Node.js $(node -v) found"
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        log_error "npm is not installed."
        exit 1
    fi
    log_success "npm $(npm -v) found"
    
    # Check Rust
    if ! command -v rustc &> /dev/null; then
        log_error "Rust is not installed. Please install Rust first:"
        echo "   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh"
        exit 1
    fi
    log_success "Rust $(rustc --version | cut -d' ' -f2) found"
    
    # Check Cargo
    if ! command -v cargo &> /dev/null; then
        log_error "Cargo is not installed."
        exit 1
    fi
    log_success "Cargo found"
}

# Clean build artifacts
clean_build() {
    log_info "Cleaning build artifacts..."
    cd "$PROJECT_ROOT"
    rm -rf dist/
    rm -rf src-tauri/target/release/bundle/
    cargo clean -p skhoot-backend --release 2>/dev/null || true
    cargo clean -p src-tauri --release 2>/dev/null || true
    log_success "Build artifacts cleaned"
}

# Install dependencies
install_deps() {
    log_info "Installing Node.js dependencies..."
    cd "$PROJECT_ROOT"
    npm ci || npm install
    log_success "Node.js dependencies installed"
}

# Build frontend
build_frontend() {
    log_info "Building frontend..."
    cd "$PROJECT_ROOT"
    npm run build
    log_success "Frontend built"
}

# Build backend
build_backend() {
    log_info "Building backend..."
    cd "$PROJECT_ROOT/backend"
    cargo build --release
    log_success "Backend built"
}

# Build Tauri app
build_tauri() {
    local targets="$1"
    log_info "Building Tauri application..."
    cd "$PROJECT_ROOT"
    
    if [ -n "$targets" ]; then
        npm run tauri build -- --target "$targets"
    else
        npm run tauri build
    fi
    log_success "Tauri application built"
}

# Platform-specific builds
build_linux() {
    log_info "Building for Linux..."
    
    if [ "$SKIP_DEPS" = false ]; then
        # Check Linux-specific dependencies
        MISSING_DEPS=()
        
        for pkg in libwebkit2gtk-4.1-dev build-essential curl wget file \
                   libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev \
                   libgstreamer1.0-dev libgstreamer-plugins-base1.0-dev; do
            if ! dpkg -l | grep -q "^ii  $pkg"; then
                MISSING_DEPS+=("$pkg")
            fi
        done
        
        if [ ${#MISSING_DEPS[@]} -ne 0 ]; then
            log_error "Missing Linux dependencies. Please install them:"
            echo "   sudo apt update"
            echo "   sudo apt install ${MISSING_DEPS[*]}"
            exit 1
        fi
        log_success "Linux dependencies verified"
    fi
    
    build_tauri
    
    log_success "Linux build complete!"
    echo ""
    log_info "Output packages:"
    echo "   📦 DEB: src-tauri/target/release/bundle/deb/"
    echo "   📦 AppImage: src-tauri/target/release/bundle/appimage/"
}

build_macos() {
    log_info "Building for macOS..."
    
    if [ "$SKIP_DEPS" = false ]; then
        # Check Xcode Command Line Tools
        if ! xcode-select -p &> /dev/null; then
            log_error "Xcode Command Line Tools not installed. Run:"
            echo "   xcode-select --install"
            exit 1
        fi
        log_success "Xcode Command Line Tools found"
    fi
    
    # Build for both Intel and Apple Silicon if on macOS
    if [ "$CURRENT_OS" = "macos" ]; then
        # Check if we can build universal binary
        if rustup target list --installed | grep -q "aarch64-apple-darwin"; then
            log_info "Building universal binary (Intel + Apple Silicon)..."
            build_tauri "universal-apple-darwin"
        else
            log_warning "aarch64-apple-darwin target not installed. Building for current architecture only."
            log_info "To build universal binary, run: rustup target add aarch64-apple-darwin x86_64-apple-darwin"
            build_tauri
        fi
    else
        log_warning "Cross-compiling for macOS from $CURRENT_OS is not supported."
        log_info "Please build on a macOS machine or use GitHub Actions."
        exit 1
    fi
    
    log_success "macOS build complete!"
    echo ""
    log_info "Output packages:"
    echo "   📦 DMG: src-tauri/target/release/bundle/dmg/"
    echo "   📦 App: src-tauri/target/release/bundle/macos/"
}

build_windows() {
    log_info "Building for Windows..."
    
    if [ "$CURRENT_OS" = "windows" ]; then
        if [ "$SKIP_DEPS" = false ]; then
            # Check for Visual Studio Build Tools
            if ! command -v cl &> /dev/null; then
                log_warning "Visual Studio Build Tools may not be in PATH"
                log_info "Ensure you have Visual Studio Build Tools installed with C++ workload"
            fi
        fi
        
        build_tauri
        
        log_success "Windows build complete!"
        echo ""
        log_info "Output packages:"
        echo "   📦 MSI: src-tauri/target/release/bundle/msi/"
        echo "   📦 NSIS: src-tauri/target/release/bundle/nsis/"
    else
        log_warning "Cross-compiling for Windows from $CURRENT_OS is not supported."
        log_info "Please build on a Windows machine or use GitHub Actions."
        exit 1
    fi
}

# Main execution
main() {
    cd "$PROJECT_ROOT"
    
    # Check common dependencies
    if [ "$SKIP_DEPS" = false ]; then
        check_common_deps
    fi
    
    # Clean if requested
    if [ "$CLEAN_BUILD" = true ]; then
        clean_build
    fi
    
    # Install dependencies
    install_deps
    
    # Build based on platform
    case "$PLATFORM" in
        all)
            if [ "$CURRENT_OS" = "linux" ]; then
                build_linux
            elif [ "$CURRENT_OS" = "macos" ]; then
                build_macos
            elif [ "$CURRENT_OS" = "windows" ]; then
                build_windows
            else
                log_error "Unknown OS. Please specify a platform: linux, macos, or windows"
                exit 1
            fi
            ;;
        linux)
            build_linux
            ;;
        macos)
            build_macos
            ;;
        windows)
            build_windows
            ;;
        *)
            log_error "Unknown platform: $PLATFORM"
            echo "Usage: $0 [all|linux|macos|windows] [--skip-deps] [--clean] [--verbose]"
            exit 1
            ;;
    esac
    
    echo ""
    echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                    Build Complete! 🎉                        ║${NC}"
    echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    log_info "All release packages are in: src-tauri/target/release/bundle/"
}

main
