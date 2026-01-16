# Vision API Debug Guide

## Problème Identifié
L'IA ne reconnaît pas qu'une image est attachée et répond à côté de la plaque.

## ✅ FIX APPLIQUÉ: Endpoint Backend Manquant

**Problème**: L'endpoint `/api/v1/files/image` n'existait pas dans le backend
**Solution**: Ajout de la fonction `read_image_file` dans `backend/src/api/search.rs`

### Changements Effectués

1. **backend/src/api/search.rs**:
   - Ajout de la route `.route("/files/image", get(read_image_file))`
   - Ajout de la fonction `read_image_file` qui:
     - Lit les fichiers image en binaire
     - Détecte le MIME type automatiquement (jpg, png, gif, bmp, webp, svg, ico)
     - Retourne les bytes avec le bon Content-Type header

2. **Logs de débogage ajoutés** dans le frontend:
   - `ChatInterface.tsx`: Logs pour tracer le traitement des fichiers
   - `aiService.ts`: Logs pour vérifier l'envoi des images à l'API

## Logs de Débogage Ajoutés

### 1. Dans ChatInterface.tsx (handleSend)
- Log des fichiers référencés: `[ChatInterface] File references:`
- Log des fichiers en cours de traitement: `[ChatInterface] Processing files:`
- Log du nombre d'images traitées: `[ChatInterface] Image files processed:`
- Log de vérification d'extension: `[ChatInterface] Checking if "X" is image:`
- Log d'envoi à l'AI: `[ChatInterface] Sending to AI:`

### 2. Dans aiService.ts (chatWithOpenAI)
- Log des paramètres reçus: `[aiService] chatWithOpenAI called with:`
- Log d'ajout d'images: `[aiService] Adding images to message:`
- Log des infos de la première image: `[aiService] First image info:`

## Comment Tester

1. **Ouvrir la console du navigateur** (F12)
2. **Attacher une image** à un message
3. **Envoyer le message** avec une question sur l'image
4. **Vérifier les logs** dans la console

## Logs Attendus (Si Tout Fonctionne)

```
[ChatInterface] File references: [["image.png", "/path/to/image.png"]]
[ChatInterface] Processing files: [{fileName: "image.png", filePath: "/path/to/image.png"}]
[ChatInterface] Checking if "image.png" is image: ext="png", isImage=true
[ChatInterface] Loaded image file: image.png
[ChatInterface] Image files processed: 1 images
[ChatInterface] Sending to AI: {messageLength: X, imageCount: 1, historyLength: Y, historyWithImages: 0}
[aiService] chatWithOpenAI called with: {messageLength: X, historyLength: Y, imagesCount: 1, historyWithImages: 0}
[aiService] Adding images to message: 1 images
[aiService] First image info: {fileName: "image.png", mimeType: "image/png", base64Length: XXXX}
```

## Scénarios de Problème

### Scénario 1: Aucun fichier détecté
```
[ChatInterface] File references: none
```
**Cause**: Le système de référence de fichiers ne fonctionne pas
**Solution**: Vérifier FileChip et FileAttachmentModal

### Scénario 2: Fichier non reconnu comme image
```
[ChatInterface] Checking if "file.xyz" is image: ext="xyz", isImage=false
```
**Cause**: Extension non supportée
**Solution**: Ajouter l'extension à la liste dans isImageFile

### Scénario 3: Erreur de chargement d'image
```
[ChatInterface] Failed to read image: /path/to/image
```
**Cause**: Backend ne peut pas lire l'image
**Solution**: Vérifier l'endpoint `/api/v1/files/image`

### Scénario 4: Images non envoyées à l'API
```
[aiService] chatWithOpenAI called with: {imagesCount: 0}
```
**Cause**: imageFiles vide malgré le traitement
**Solution**: Vérifier processAttachedFiles

### Scénario 5: Base64 invalide
```
[aiService] First image info: {base64Length: 0}
```
**Cause**: Conversion base64 échouée
**Solution**: Vérifier FileReader dans processAttachedFiles

## Extensions d'Images Supportées
- jpg, jpeg
- png
- gif
- bmp
- webp

## Prochaines Étapes

1. ✅ Ajouter les logs de débogage
2. ⏳ Tester avec une image
3. ⏳ Identifier le scénario de problème
4. ⏳ Appliquer la solution appropriée
