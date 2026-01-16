# Fix: "I cannot view the image because the file was not found"

## 🔴 Problème

L'IA répond: "I am sorry, I cannot view the image because the file was not found"

## ✅ Solution Rapide (3 étapes)

### Étape 1: Vérifier que le backend tourne

```powershell
# Ouvrir un terminal PowerShell
cd backend
cargo run
```

**Attendez de voir:**
```
Listening on http://0.0.0.0:3001
```

### Étape 2: Tester avec le script de diagnostic

```powershell
# Dans un autre terminal
.\test-vision-diagnostic.ps1
```

Ce script va:
- ✅ Vérifier si le backend tourne
- ✅ Créer une image de test
- ✅ Tester l'endpoint d'image
- ✅ Vous donner des instructions précises

### Étape 3: Vérifier les logs dans la console

1. Ouvrir Skhoot dans le navigateur
2. Appuyer sur **F12** pour ouvrir la console
3. Attacher une image
4. Chercher ces messages:

**✅ Si ça marche:**
```
[ChatInterface] Loading image: test.png from C:\Users\...\test.png
[ChatInterface] ✅ Successfully loaded image file: test.png
[ChatInterface] Base64 length: 45231 chars
```

**❌ Si ça échoue:**
```
[ChatInterface] ❌ Failed to read image: C:\Users\...\test.png
[ChatInterface] Image fetch response: { ok: false, status: 404 }
```

## 🔍 Diagnostic Détaillé

### Cause 1: Backend non démarré (90% des cas)

**Symptôme:** `Failed to fetch` ou `Network error` dans la console

**Solution:**
```powershell
cd backend
cargo run
```

Laissez ce terminal ouvert pendant que vous utilisez Skhoot.

### Cause 2: Chemin de fichier incorrect

**Symptôme:** `status: 404` dans la console

**Solution:**
1. Vérifier que le fichier existe vraiment
2. Utiliser un chemin absolu (ex: `C:\Users\VotreNom\Documents\image.png`)
3. Éviter les caractères spéciaux dans le nom de fichier

### Cause 3: Permissions de fichier

**Symptôme:** `status: 403` ou `Permission denied`

**Solution:**
1. Copier l'image dans `Documents` ou `Desktop`
2. Vérifier les permissions du fichier
3. Essayer avec une autre image

## 🧪 Test Rapide

### Test 1: Backend Health Check

```powershell
# Dans PowerShell
Invoke-WebRequest -Uri "http://localhost:3001/api/v1/health"
```

**Résultat attendu:** `StatusCode : 200`

Si erreur → Le backend ne tourne pas → Lancer `cargo run` dans `backend/`

### Test 2: Test avec une image système

```powershell
# Créer une image de test
$testImage = "$env:USERPROFILE\Documents\test-vision.png"
Copy-Item "C:\Windows\Web\Wallpaper\Windows\img0.jpg" $testImage

# Tester l'endpoint
$encoded = [System.Web.HttpUtility]::UrlEncode($testImage)
Invoke-WebRequest -Uri "http://localhost:3001/api/v1/files/image?path=$encoded"
```

**Résultat attendu:** `StatusCode : 200` et des données binaires

### Test 3: Test dans Skhoot

1. Ouvrir Skhoot
2. Activer Agent Mode (`Ctrl+Shift+A`)
3. Attacher l'image: `C:\Users\VotreNom\Documents\test-vision.png`
4. Demander: "What do you see in this image?"
5. Vérifier la console (F12)

## 📋 Checklist de Dépannage

- [ ] Backend est démarré (`cargo run` dans `backend/`)
- [ ] Port 3001 est accessible (`netstat -ano | findstr :3001`)
- [ ] L'image existe au chemin spécifié
- [ ] Le chemin ne contient pas de caractères spéciaux
- [ ] Les permissions du fichier sont correctes
- [ ] La console du navigateur est ouverte (F12)
- [ ] Les logs montrent le chargement de l'image

## 🎯 Solution Garantie

Si rien ne fonctionne, suivez ces étapes **exactement**:

### 1. Arrêter tout
```powershell
# Fermer Skhoot
# Arrêter le backend (Ctrl+C dans le terminal)
```

### 2. Créer une image de test
```powershell
# Créer un dossier de test
New-Item -Path "$env:USERPROFILE\Documents\SkhootTest" -ItemType Directory -Force

# Copier une image système
Copy-Item "C:\Windows\Web\Wallpaper\Windows\img0.jpg" "$env:USERPROFILE\Documents\SkhootTest\test.jpg"
```

### 3. Démarrer le backend
```powershell
cd backend
cargo run
```

**Attendez de voir:** `Listening on http://0.0.0.0:3001`

### 4. Démarrer Skhoot
```powershell
# Dans un autre terminal
npm run dev
```

### 5. Tester
1. Ouvrir http://localhost:5173
2. Ouvrir la console (F12)
3. Activer Agent Mode (Ctrl+Shift+A)
4. Attacher: `C:\Users\VotreNom\Documents\SkhootTest\test.jpg`
5. Demander: "Describe this image"

### 6. Vérifier les logs

**Dans la console du navigateur:**
```
[ChatInterface] Loading image: test.jpg from C:\Users\...\test.jpg
[ChatInterface] ✅ Successfully loaded image file: test.jpg
```

**Dans le terminal du backend:**
```
Reading image file: "C:\\Users\\...\\test.jpg"
```

## 📞 Si le problème persiste

Collectez ces informations:

1. **Logs de la console** (F12 → Console → Copier tout)
2. **Logs du backend** (Terminal où `cargo run` est lancé)
3. **Commande exacte** utilisée pour démarrer le backend
4. **Chemin exact** de l'image utilisée
5. **Mode d'exécution** (Web dev, Tauri desktop, ou production)

Puis partagez ces informations pour un diagnostic précis.

## 📚 Documentation Complète

- **VISION_TROUBLESHOOTING.md** - Guide de dépannage détaillé
- **VISION_AGENT_MODE_TEST.md** - Guide de test complet
- **VISION_OCR_ANALYSIS.md** - Analyse technique du système

## ⚡ TL;DR

```powershell
# Terminal 1: Démarrer le backend
cd backend
cargo run

# Terminal 2: Démarrer Skhoot
npm run dev

# Dans Skhoot:
# 1. F12 pour ouvrir la console
# 2. Ctrl+Shift+A pour Agent Mode
# 3. Attacher une image
# 4. Vérifier les logs [ChatInterface]
```

**Si vous voyez ✅ dans les logs → Ça marche!**  
**Si vous voyez ❌ dans les logs → Vérifier VISION_TROUBLESHOOTING.md**
