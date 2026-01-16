# Vision/OCR Diagnostic Script
# Run this to diagnose image loading issues

Write-Host "=== Vision/OCR Diagnostic ===" -ForegroundColor Cyan
Write-Host ""

# Test 1: Check if backend is running
Write-Host "Test 1: Checking backend..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3001/api/v1/health" -Method GET -TimeoutSec 2
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ Backend is running on port 3001" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ Backend is NOT running on port 3001" -ForegroundColor Red
    Write-Host "   Solution: cd backend && cargo run" -ForegroundColor Yellow
}
Write-Host ""

# Test 2: Check if port 3001 is in use
Write-Host "Test 2: Checking port 3001..." -ForegroundColor Yellow
$port = Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue
if ($port) {
    Write-Host "✅ Port 3001 is in use (PID: $($port.OwningProcess))" -ForegroundColor Green
} else {
    Write-Host "❌ Port 3001 is not in use" -ForegroundColor Red
    Write-Host "   Backend is not running" -ForegroundColor Yellow
}
Write-Host ""

# Test 3: Create a test image
Write-Host "Test 3: Creating test image..." -ForegroundColor Yellow
$testImagePath = "$env:USERPROFILE\Documents\skhoot-test-image.png"

# Try to find a system image to copy
$sourceImages = @(
    "C:\Windows\Web\Wallpaper\Windows\img0.jpg",
    "C:\Windows\System32\@2x_cursor.png",
    "$env:USERPROFILE\Pictures\*.*"
)

$testImageCreated = $false
foreach ($source in $sourceImages) {
    if (Test-Path $source) {
        try {
            Copy-Item $source $testImagePath -ErrorAction Stop
            Write-Host "✅ Test image created at: $testImagePath" -ForegroundColor Green
            $testImageCreated = $true
            break
        } catch {
            continue
        }
    }
}

if (-not $testImageCreated) {
    Write-Host "⚠️  Could not create test image automatically" -ForegroundColor Yellow
    Write-Host "   Please manually place an image at: $testImagePath" -ForegroundColor Yellow
}
Write-Host ""

# Test 4: Test backend image endpoint
if ($testImageCreated) {
    Write-Host "Test 4: Testing backend image endpoint..." -ForegroundColor Yellow
    try {
        $encodedPath = [System.Web.HttpUtility]::UrlEncode($testImagePath)
        $response = Invoke-WebRequest -Uri "http://localhost:3001/api/v1/files/image?path=$encodedPath" -Method GET -TimeoutSec 5
        if ($response.StatusCode -eq 200) {
            Write-Host "✅ Backend can read the test image" -ForegroundColor Green
            Write-Host "   Image size: $($response.RawContentLength) bytes" -ForegroundColor Gray
        }
    } catch {
        Write-Host "❌ Backend cannot read the test image" -ForegroundColor Red
        Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Yellow
    }
} else {
    Write-Host "Test 4: Skipped (no test image)" -ForegroundColor Gray
}
Write-Host ""

# Test 5: Check Tauri environment
Write-Host "Test 5: Checking Tauri environment..." -ForegroundColor Yellow
$tauriProcess = Get-Process -Name "Skhoot" -ErrorAction SilentlyContinue
if ($tauriProcess) {
    Write-Host "✅ Skhoot desktop app is running (PID: $($tauriProcess.Id))" -ForegroundColor Green
} else {
    Write-Host "ℹ️  Skhoot desktop app is not running (web mode)" -ForegroundColor Cyan
}
Write-Host ""

# Summary
Write-Host "=== Summary ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "To test vision/OCR:" -ForegroundColor White
Write-Host "1. Make sure backend is running: cd backend && cargo run" -ForegroundColor Gray
if ($testImageCreated) {
    Write-Host "2. Attach this test image: $testImagePath" -ForegroundColor Gray
} else {
    Write-Host "2. Create a test image at: $testImagePath" -ForegroundColor Gray
}
Write-Host "3. Enable Agent Mode (Ctrl+Shift+A)" -ForegroundColor Gray
Write-Host "4. Ask: 'What do you see in this image?'" -ForegroundColor Gray
Write-Host ""
Write-Host "Check browser console (F12) for detailed logs" -ForegroundColor Yellow
Write-Host ""

# Instructions
Write-Host "=== Next Steps ===" -ForegroundColor Cyan
Write-Host ""
if (-not $port) {
    Write-Host "❗ START THE BACKEND FIRST:" -ForegroundColor Red
    Write-Host "   cd backend" -ForegroundColor White
    Write-Host "   cargo run" -ForegroundColor White
    Write-Host ""
}
Write-Host "Then in Skhoot:" -ForegroundColor White
Write-Host "1. Open browser console (F12)" -ForegroundColor Gray
Write-Host "2. Attach an image" -ForegroundColor Gray
Write-Host "3. Look for these logs:" -ForegroundColor Gray
Write-Host "   [ChatInterface] Loading image: ..." -ForegroundColor DarkGray
Write-Host "   [ChatInterface] ✅ Successfully loaded image file" -ForegroundColor DarkGray
Write-Host ""
Write-Host "If you see ❌ errors, check VISION_TROUBLESHOOTING.md" -ForegroundColor Yellow
