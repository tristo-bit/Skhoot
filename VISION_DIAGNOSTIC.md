# Vision API - Guide de Diagnostic

## 🔍 Étapes de Diagnostic

### Étape 1: Vérifier la Console du Navigateur

1. **Ouvrir la console** (F12 → onglet Console)
2. **Attacher une image** à un message
3. **Envoyer le message**
4. **Chercher ces logs**:

#### ✅ Logs Attendus (Si Tout Fonctionne)
```
[ChatInterface] File references: [["image.png", "/path/to/image.png"]]
[ChatInterface] Processing files: [{fileName: "image.png", filePath: "/path/to/image.png"}]
[ChatInterface] Checking if "image.png" is image: ext="png", isImage=true
[ChatInterface] Loaded image file: image.png
[ChatInterface] Image files processed: 1 images
[ChatInterface] Sending to AI: {imageCount: 1, ...}
[aiService] chatWithOpenAI called with: {imagesCount: 1, ...}
[aiService] Adding images to message: 1 images
[aiService] First image info: {fileName: "image.png", mimeType: "image/png", base64Length: >1000}
```

### Étape 2: Identifier le Problème

#### Scénario A: Aucun fichier détecté
```
[ChatInterface] File references: none
```
**Problème**: Le système de fichiers attachés ne fonctionne pas
**Solution**: Vérifier que le fichier est bien attaché (icône de fichier visible)

#### Scénario B: Fichier non reconnu comme image
```
[ChatInterface] Checking if "file.xyz" is image: ext="xyz", isImage=false
```
**Problème**: Extension non supportée
**Solution**: Utiliser jpg, jpeg, png, gif, bmp, ou webp

#### Scénario C: Erreur de chargement
```
[ChatInterface] Failed to read image: /path/to/image
```
**Problème**: Backend ne peut pas lire l'image
**Solutions**:
1. Vérifier que le backend est démarré: `cd backend && cargo run`
2. Vérifier l'URL du backend: `http://localhost:3001`
3. Tester l'endpoint manuellement: `http://localhost:3001/api/v1/files/image?path=C:\path\to\image.png`

#### Scénario D: Images non envoyées à l'API
```
[aiService] chatWithOpenAI called with: {imagesCount: 0}
```
**Problème**: Les images ne sont pas passées à l'API
**Solution**: Vérifier que `imageFiles` n'est pas vide dans `handleSend`

#### Scénario E: Base64 vide
```
[aiService] First image info: {base64Length: 0}
```
**Problème**: Conversion base64 échouée
**Solution**: Vérifier la réponse de l'endpoint `/api/v1/files/image`

#### Scénario F: Modèle ne supporte pas la vision
```
[aiService] Model gpt-3.5-turbo may not support vision
```
**Problème**: Le modèle sélectionné ne supporte pas les images
**Solution**: Changer le modèle dans les paramètres:
- ✅ gpt-4o
- ✅ gpt-4o-mini
- ✅ gpt-4-turbo
- ❌ gpt-3.5-turbo (pas de vision)

### Étape 3: Vérifier le Backend

#### Test 1: Backend est-il démarré?
```bash
curl http://localhost:3001/health
```
**Attendu**: `{"status":"healthy",...}`

#### Test 2: Endpoint image fonctionne-t-il?
```bash
# Windows PowerShell
Invoke-WebRequest -Uri "http://localhost:3001/api/v1/files/image?path=C:\path\to\image.png"

# Ou dans le navigateur
http://localhost:3001/api/v1/files/image?path=C:\Users\YourName\Pictures\test.png
```
**Attendu**: L'image s'affiche dans le navigateur

### Étape 4: Vérifier le Modèle

1. **Ouvrir les paramètres** (icône utilisateur en haut à droite)
2. **Aller dans "API Configuration"**
3. **Vérifier le modèle sélectionné** pour OpenAI
4. **S'assurer que c'est un modèle avec vision**:
   - ✅ GPT-4o
   - ✅ GPT-4o Mini
   - ✅ GPT-4 Turbo

### Étape 5: Vérifier le Format de l'Image

#### Extensions supportées:
- ✅ .jpg, .jpeg
- ✅ .png
- ✅ .gif
- ✅ .bmp
- ✅ .webp
- ❌ .pdf (pas encore supporté)
- ❌ .svg (peut ne pas fonctionner avec vision)

#### Taille de l'image:
- Les images très grandes peuvent causer des problèmes
- Recommandé: < 5 MB

## 🔧 Solutions Rapides

### Solution 1: Redémarrer le Backend
```bash
cd backend
cargo run
```

### Solution 2: Vider le Cache du Navigateur
1. F12 → Network
2. Clic droit → Clear browser cache
3. Recharger la page (Ctrl+R)

### Solution 3: Changer de Modèle
1. Paramètres → API Configuration
2. Sélectionner "GPT-4o" ou "GPT-4o Mini"
3. Sauvegarder

### Solution 4: Tester avec une Image Simple
1. Créer un screenshot simple (Windows+Shift+S)
2. Sauvegarder en PNG
3. Attacher et tester

## 📊 Checklist de Vérification

- [ ] Backend démarré (`cargo run` dans `/backend`)
- [ ] Console ouverte (F12)
- [ ] Image attachée (icône visible)
- [ ] Extension supportée (.jpg, .png, etc.)
- [ ] Modèle avec vision sélectionné (gpt-4o, gpt-4o-mini)
- [ ] Logs visibles dans la console
- [ ] `imagesCount: 1` dans les logs
- [ ] `base64Length > 1000` dans les logs

## 🆘 Si Rien Ne Fonctionne

Envoyez-moi:
1. **Tous les logs de la console** (copier-coller)
2. **Le modèle utilisé** (visible dans les paramètres)
3. **L'extension du fichier** (ex: .png, .jpg)
4. **La taille du fichier** (ex: 2 MB)
5. **Le message d'erreur exact** de l'IA

---

**Dernière mise à jour**: Corrections appliquées pour l'endpoint backend
