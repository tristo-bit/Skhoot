# Vision/OCR Troubleshooting - "File Not Found" Error

## Symptom

L'IA répond: "I am sorry, I cannot view the image because the file was not found"

## Root Cause

Ce message signifie que l'image n'a **pas été chargée correctement**. Le système a ajouté une note d'erreur au message, et l'IA a lu cette note au lieu de l'image.

## Diagnostic Steps

### 1. Vérifier les logs de la console (F12)

Ouvrez la console du navigateur et cherchez ces messages:

**Si l'image se charge correctement:**
```
[ChatInterface] Loading image: screenshot.png from /path/to/screenshot.png
[ChatInterface] ✅ Loaded image via Tauri: screenshot.png, base64 length: 45231
```
OU
```
[ChatInterface] Falling back to backend API for: screenshot.png
[ChatInterface] Image fetch response: { ok: true, status: 200, ... }
[ChatInterface] ✅ Successfully loaded image file: screenshot.png
```

**Si l'image échoue:**
```
[ChatInterface] ❌ Failed to read image: /path/to/screenshot.png
[ChatInterface] Image fetch response: { ok: false, status: 404, ... }
```

### 2. Causes Possibles

#### A. Backend non démarré
**Symptôme:** `Failed to fetch` ou `Network error`

**Solution:**
```bash
# Vérifier si le backend tourne sur le port 3001
netstat -ano | findstr :3001

# Si rien, démarrer le backend
cd backend
cargo run
```

#### B. Chemin de fichier incorrect
**Symptôme:** `status: 404` ou `File not found`

**Problème:** Le chemin du fichier n'est pas correct ou le fichier n'existe pas à cet emplacement.

**Solution:**
- Vérifier que le fichier existe vraiment
- Vérifier le chemin dans les logs console
- Essayer avec un chemin absolu

#### C. Permissions de fichier
**Symptôme:** `status: 403` ou `Permission denied`

**Solution:**
- Vérifier les permissions du fichier
- Essayer avec un fichier dans un dossier accessible

#### D. Tauri API échoue
**Symptôme:** `Tauri file read failed` suivi de fallback au backend

**Solution:**
- C'est normal, le système devrait fallback au backend
- Si le backend échoue aussi, voir causes A, B, C

### 3. Tests de Diagnostic

#### Test 1: Vérifier le Backend
```bash
# Test manuel de l'endpoint
curl "http://localhost:3001/api/v1/files/image?path=C:\path\to\image.png"
```

Si ça retourne l'image, le backend fonctionne.

#### Test 2: Vérifier Tauri
Ouvrir la console et taper:
```javascript
console.log(window.__TAURI__);
```

Si `undefined`, Tauri n'est pas disponible (normal en mode web).

#### Test 3: Tester avec un fichier simple
1. Créer un fichier image dans un dossier accessible
2. Noter le chemin complet
3. Attacher ce fichier
4. Vérifier les logs

### 4. Solutions par Scénario

#### Scénario 1: Mode Desktop (Tauri)
Si vous utilisez l'app desktop:

1. **Vérifier que Tauri fonctionne:**
   - L'app doit être lancée via `npm run tauri dev` ou l'exécutable
   - Pas via `npm run dev` (mode web)

2. **Permissions Tauri:**
   - Vérifier `src-tauri/tauri.conf.json`
   - Section `allowlist` doit inclure `fs` permissions

#### Scénario 2: Mode Web (Browser)
Si vous utilisez le navigateur:

1. **Backend DOIT être démarré:**
   ```bash
   cd backend
   cargo run
   ```

2. **CORS doit être configuré:**
   - Le backend doit accepter les requêtes depuis `http://localhost:5173`

3. **Chemin de fichier:**
   - Doit être accessible par le backend
   - Chemins relatifs résolus depuis le home directory

#### Scénario 3: Mode Production
Si vous utilisez un build de production:

1. **Backend doit être démarré séparément**
2. **Chemins de fichiers doivent être absolus**
3. **Vérifier les permissions de l'app**

## Quick Fix

### Option 1: Utiliser un fichier de test
```bash
# Créer un fichier image de test dans le dossier home
# Windows:
copy C:\Windows\System32\@2x_cursor.png %USERPROFILE%\test-image.png

# Puis attacher: %USERPROFILE%\test-image.png
```

### Option 2: Vérifier le backend
```bash
# Terminal 1: Démarrer le backend
cd backend
cargo run

# Terminal 2: Tester l'endpoint
curl http://localhost:3001/api/v1/health
```

### Option 3: Activer les logs détaillés
Dans la console du navigateur:
```javascript
localStorage.setItem('debug', 'true');
```

Puis recharger la page et réessayer.

## Code à Vérifier

### 1. ChatInterface.tsx - Ligne 890-945
Vérifier que les erreurs sont bien loggées:
```typescript
console.log(`[ChatInterface] Loading image: ${file.fileName} from ${file.filePath}`);
```

### 2. Backend - src/api/search.rs
Vérifier que l'endpoint `read_image_file` fonctionne:
```rust
pub async fn read_image_file(
    Query(params): Query<HashMap<String, String>>,
) -> Result<axum::response::Response, AppError>
```

## Logs à Collecter

Pour diagnostiquer, collectez ces informations:

1. **Console logs complets** (F12 → Console)
2. **Network tab** (F12 → Network) - Chercher la requête `/api/v1/files/image`
3. **Backend logs** (terminal où cargo run est lancé)
4. **Chemin du fichier** utilisé
5. **Mode d'exécution** (Tauri desktop, web dev, production)

## Solution Temporaire

Si le problème persiste, vous pouvez:

1. **Copier l'image dans un dossier accessible:**
   ```bash
   # Windows
   copy "chemin\source\image.png" "%USERPROFILE%\Documents\test.png"
   ```

2. **Utiliser le chemin complet:**
   - Attacher: `C:\Users\VotreNom\Documents\test.png`

3. **Vérifier que le backend tourne:**
   ```bash
   cd backend
   cargo run
   ```

## Prochaines Étapes

1. Ouvrir la console (F12)
2. Attacher une image
3. Copier tous les logs `[ChatInterface]`
4. Partager les logs pour diagnostic précis

## Amélioration Future

Pour éviter ce problème, nous pourrions:

1. **Ajouter une validation de fichier avant envoi**
2. **Afficher une erreur UI claire** au lieu de laisser l'IA répondre
3. **Tester la disponibilité du fichier** avant de l'envoyer
4. **Ajouter un retry automatique** avec différentes méthodes
5. **Permettre l'upload direct** au lieu de référencer un chemin

## Contact

Si le problème persiste après ces étapes:
1. Collectez les logs (console + backend)
2. Notez le mode d'exécution (Tauri/Web/Production)
3. Partagez le chemin du fichier utilisé
4. Décrivez les étapes exactes suivies
