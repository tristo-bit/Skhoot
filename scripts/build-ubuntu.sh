#!/bin/bash

# Build script for Ubuntu releases
set -e

echo "🚀 Building Skhoot for Ubuntu..."

# Check if Rust is installed
if ! command -v rustc &> /dev/null; then
    echo "❌ Rust is not installed. Please install Rust first:"
    echo "   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh"
    exit 1
fi

# Check if required system dependencies are installed
echo "📦 Checking system dependencies..."
MISSING_DEPS=()

if ! dpkg -l | grep -q libwebkit2gtk-4.1-dev; then
    MISSING_DEPS+=("libwebkit2gtk-4.1-dev")
fi

if ! dpkg -l | grep -q build-essential; then
    MISSING_DEPS+=("build-essential")
fi

if ! dpkg -l | grep -q curl; then
    MISSING_DEPS+=("curl")
fi

if ! dpkg -l | grep -q wget; then
    MISSING_DEPS+=("wget")
fi

if ! dpkg -l | grep -q file; then
    MISSING_DEPS+=("file")
fi

if ! dpkg -l | grep -q libxdo-dev; then
    MISSING_DEPS+=("libxdo-dev")
fi

if ! dpkg -l | grep -q libssl-dev; then
    MISSING_DEPS+=("libssl-dev")
fi

if ! dpkg -l | grep -q libayatana-appindicator3-dev; then
    MISSING_DEPS+=("libayatana-appindicator3-dev")
fi

if ! dpkg -l | grep -q librsvg2-dev; then
    MISSING_DEPS+=("librsvg2-dev")
fi

if [ ${#MISSING_DEPS[@]} -ne 0 ]; then
    echo "❌ Missing system dependencies. Please install them first:"
    echo "   sudo apt update"
    echo "   sudo apt install ${MISSING_DEPS[*]}"
    exit 1
fi

echo "✅ All system dependencies are installed"

# Install Node.js dependencies
echo "📦 Installing Node.js dependencies..."
npm install

# Build the application
echo "🔨 Building application..."
npm run tauri:build

echo "✅ Build completed!"
echo "📁 Ubuntu packages can be found in: src-tauri/target/release/bundle/"
echo "   - .deb package: src-tauri/target/release/bundle/deb/"
echo "   - AppImage: src-tauri/target/release/bundle/appimage/"