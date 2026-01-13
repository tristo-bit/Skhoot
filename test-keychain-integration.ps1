# Test Script - API Key Storage Keychain Integration
# Platform: Windows
# Date: January 13, 2026

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "API Key Storage - Keychain Test Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Test 1: Check if Credential Manager is accessible
Write-Host "[Test 1] Checking Windows Credential Manager..." -ForegroundColor Yellow
try {
    $creds = cmdkey /list 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Credential Manager accessible" -ForegroundColor Green
    } else {
        Write-Host "❌ Credential Manager not accessible" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Error accessing Credential Manager: $_" -ForegroundColor Red
}
Write-Host ""

# Test 2: Check for Skhoot keychain entry
Write-Host "[Test 2] Searching for Skhoot keychain entry..." -ForegroundColor Yellow
$skhootEntry = cmdkey /list | Select-String "com.skhoot.app"
if ($skhootEntry) {
    Write-Host "✅ Found Skhoot keychain entry:" -ForegroundColor Green
    Write-Host $skhootEntry -ForegroundColor Gray
} else {
    Write-Host "⚠️  No Skhoot keychain entry found (expected if app not run yet)" -ForegroundColor Yellow
}
Write-Host ""

# Test 3: Check for storage file
Write-Host "[Test 3] Checking for encrypted storage file..." -ForegroundColor Yellow
$appDataPath = "$env:APPDATA\com.skhoot.app"
$storageFile = "$appDataPath\api_keys.json"

if (Test-Path $appDataPath) {
    Write-Host "✅ App data directory exists: $appDataPath" -ForegroundColor Green
    
    if (Test-Path $storageFile) {
        Write-Host "✅ Storage file exists: $storageFile" -ForegroundColor Green
        
        # Read and display file content (should be encrypted)
        Write-Host ""
        Write-Host "File content preview:" -ForegroundColor Cyan
        $content = Get-Content $storageFile -Raw
        Write-Host $content -ForegroundColor Gray
        
        # Verify it's JSON
        try {
            $json = $content | ConvertFrom-Json
            Write-Host ""
            Write-Host "✅ Valid JSON format" -ForegroundColor Green
            
            # Check for expected fields
            $providers = $json.PSObject.Properties.Name
            if ($providers.Count -gt 0) {
                Write-Host "✅ Found $($providers.Count) provider(s): $($providers -join ', ')" -ForegroundColor Green
                
                foreach ($provider in $providers) {
                    $config = $json.$provider
                    Write-Host ""
                    Write-Host "Provider: $provider" -ForegroundColor Cyan
                    Write-Host "  - encrypted_key length: $($config.encrypted_key.Count) bytes" -ForegroundColor Gray
                    Write-Host "  - nonce length: $($config.nonce.Count) bytes" -ForegroundColor Gray
                    Write-Host "  - is_active: $($config.is_active)" -ForegroundColor Gray
                    Write-Host "  - last_tested: $($config.last_tested)" -ForegroundColor Gray
                    
                    # Security check: ensure key is not in plain text
                    if ($config.encrypted_key -is [Array]) {
                        Write-Host "  ✅ Key is encrypted (byte array)" -ForegroundColor Green
                    } else {
                        Write-Host "  ❌ WARNING: Key might not be encrypted!" -ForegroundColor Red
                    }
                }
            } else {
                Write-Host "⚠️  No providers configured yet" -ForegroundColor Yellow
            }
        } catch {
            Write-Host "❌ Invalid JSON format: $_" -ForegroundColor Red
        }
    } else {
        Write-Host "⚠️  Storage file not found (expected if no keys saved yet)" -ForegroundColor Yellow
    }
} else {
    Write-Host "⚠️  App data directory not found (expected if app not run yet)" -ForegroundColor Yellow
}
Write-Host ""

# Test 4: Check Rust dependencies
Write-Host "[Test 4] Verifying Rust dependencies..." -ForegroundColor Yellow
$backendCargoToml = "backend\Cargo.toml"
if (Test-Path $backendCargoToml) {
    $cargoContent = Get-Content $backendCargoToml -Raw
    
    $requiredDeps = @("aes-gcm", "keyring", "rand", "hex", "anyhow", "serde")
    $missingDeps = @()
    
    foreach ($dep in $requiredDeps) {
        if ($cargoContent -match $dep) {
            Write-Host "  ✅ $dep" -ForegroundColor Green
        } else {
            Write-Host "  ❌ $dep (missing)" -ForegroundColor Red
            $missingDeps += $dep
        }
    }
    
    if ($missingDeps.Count -eq 0) {
        Write-Host "✅ All required dependencies present" -ForegroundColor Green
    } else {
        Write-Host "❌ Missing dependencies: $($missingDeps -join ', ')" -ForegroundColor Red
    }
} else {
    Write-Host "❌ backend/Cargo.toml not found" -ForegroundColor Red
}
Write-Host ""

# Test 5: Check Tauri commands registration
Write-Host "[Test 5] Checking Tauri commands registration..." -ForegroundColor Yellow
$tauriMain = "src-tauri\src\main.rs"
if (Test-Path $tauriMain) {
    $mainContent = Get-Content $tauriMain -Raw
    
    $requiredCommands = @(
        "save_api_key",
        "load_api_key",
        "delete_api_key",
        "list_providers",
        "get_active_provider",
        "set_active_provider",
        "test_api_key",
        "fetch_provider_models"
    )
    
    $missingCommands = @()
    
    foreach ($cmd in $requiredCommands) {
        if ($mainContent -match $cmd) {
            Write-Host "  ✅ $cmd" -ForegroundColor Green
        } else {
            Write-Host "  ❌ $cmd (not registered)" -ForegroundColor Red
            $missingCommands += $cmd
        }
    }
    
    if ($missingCommands.Count -eq 0) {
        Write-Host "✅ All commands registered" -ForegroundColor Green
    } else {
        Write-Host "❌ Missing commands: $($missingCommands -join ', ')" -ForegroundColor Red
    }
} else {
    Write-Host "❌ src-tauri/src/main.rs not found" -ForegroundColor Red
}
Write-Host ""

# Test 6: Check frontend service
Write-Host "[Test 6] Checking frontend service..." -ForegroundColor Yellow
$apiKeyService = "services\apiKeyService.ts"
if (Test-Path $apiKeyService) {
    Write-Host "✅ apiKeyService.ts exists" -ForegroundColor Green
    
    $serviceContent = Get-Content $apiKeyService -Raw
    
    # Check for key methods
    $methods = @("saveKey", "loadKey", "deleteKey", "testKey", "fetchProviderModels")
    foreach ($method in $methods) {
        if ($serviceContent -match "async $method") {
            Write-Host "  ✅ $method()" -ForegroundColor Green
        } else {
            Write-Host "  ❌ $method() (missing)" -ForegroundColor Red
        }
    }
} else {
    Write-Host "❌ services/apiKeyService.ts not found" -ForegroundColor Red
}
Write-Host ""

# Test 7: Compilation check
Write-Host "[Test 7] Checking compilation status..." -ForegroundColor Yellow
Write-Host "Running cargo check on backend..." -ForegroundColor Gray
$backendCheck = cargo check --manifest-path backend/Cargo.toml 2>&1 | Select-String -Pattern "error" -Context 0,2
if ($backendCheck) {
    Write-Host "❌ Backend has compilation errors:" -ForegroundColor Red
    Write-Host $backendCheck -ForegroundColor Red
} else {
    Write-Host "✅ Backend compiles successfully" -ForegroundColor Green
}

Write-Host ""
Write-Host "Running cargo check on Tauri..." -ForegroundColor Gray
$tauriCheck = cargo check --manifest-path src-tauri/Cargo.toml 2>&1 | Select-String -Pattern "error" -Context 0,2
if ($tauriCheck) {
    Write-Host "❌ Tauri has compilation errors:" -ForegroundColor Red
    Write-Host $tauriCheck -ForegroundColor Red
} else {
    Write-Host "✅ Tauri compiles successfully" -ForegroundColor Green
}
Write-Host ""

# Summary
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Test Summary" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. Run the application: npm run tauri:dev" -ForegroundColor White
Write-Host "2. Open UserPanel and test API Configuration section" -ForegroundColor White
Write-Host "3. Follow the manual test plan in test-api-key-storage.md" -ForegroundColor White
Write-Host "4. Verify keychain entry in Windows Credential Manager" -ForegroundColor White
Write-Host ""
Write-Host "To view Credential Manager:" -ForegroundColor Yellow
Write-Host "  - Press Win+R" -ForegroundColor White
Write-Host "  - Type: control /name Microsoft.CredentialManager" -ForegroundColor White
Write-Host "  - Press Enter" -ForegroundColor White
Write-Host ""
