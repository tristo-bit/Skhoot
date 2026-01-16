# Guide de Test - Vision API

## État Actuel
✅ Backend en cours d'exécution (port 3001)
✅ Endpoint `/api/v1/files/image` implémenté
✅ Code frontend implémenté avec support vision
✅ Logs de débogage ajoutés

## Comment Tester

### 1. Ouvrir la Console du Navigateur
Appuie sur **F12** pour ouvrir les DevTools et va dans l'onglet **Console**.

### 2. Attacher une Image
1. Dans le chat, clique sur l'icône de pièce jointe (📎)
2. Sélectionne une image (JPG, PNG, GIF, etc.)
3. L'image devrait apparaître comme une "chip" dans l'interface

### 3. Envoyer un Message avec l'Image
Écris un message comme:
- "Qu'est-ce que tu vois dans cette image ?"
- "Décris cette image"
- "Lis le texte dans cette image" (pour OCR)

### 4. Vérifier les Logs

Tu devrais voir dans la console:

#### Logs de Chargement d'Image
```
[ChatInterface] File references: [...]
[ChatInterface] Processing files: [...]
[ChatInterface] Checking if "image.png" is image: ext="png", isImage=true
[ChatInterface] Loading image: image.png from /path/to/image.png
[ChatInterface] Image fetch response: { ok: true, status: 200, ... }
[ChatInterface] Image blob size: XXXXX bytes, type: image/png
[ChatInterface] Base64 length: XXXXX chars
[ChatInterface] ✅ Successfully loaded image file: image.png
```

#### Logs d'Envoi à l'AI
```
[ChatInterface] Sending to AI: { messageLength: XX, imageCount: 1, ... }
[aiService] chatWithGoogle called with: { imagesCount: 1, ... }
[aiService] Using Gemini model: gemini-2.0-flash
[aiService] Adding images to current message: 1 images
[aiService] System prompt includes vision: true
[aiService] Sending request to Gemini: { hasImages: true, ... }
```

#### Logs de Réponse
```
[aiService] Gemini response: { hasCandidates: true, ... }
```

## Problèmes Possibles

### ❌ "Failed to read image" (404)
**Cause**: Le backend ne trouve pas le fichier
**Solution**: Vérifie que le chemin du fichier est correct

### ❌ "Base64 length: 0"
**Cause**: L'image n'a pas été convertie correctement
**Solution**: Vérifie que le blob est valide

### ❌ "I cannot process images"
**Causes possibles**:
1. Les images n'atteignent pas l'API (vérifie les logs `[aiService] Adding images`)
2. Le système prompt n'inclut pas les capacités vision (vérifie `System prompt includes vision: true`)
3. Le modèle ne supporte pas la vision (vérifie que tu utilises `gemini-2.0-flash` ou `gemini-1.5-pro`)

## Modèles Supportant la Vision

### ✅ Google Gemini
- gemini-2.0-flash ⭐ (recommandé)
- gemini-1.5-pro
- gemini-1.5-flash

### ✅ OpenAI
- gpt-4o ⭐ (recommandé)
- gpt-4o-mini
- gpt-4-turbo
- gpt-4-vision-preview

### ✅ Anthropic
- claude-3-5-sonnet-20241022 ⭐ (recommandé)
- claude-3-opus-20240229
- claude-3-haiku-20240307

## Prochaines Étapes

1. **Teste maintenant** avec une image
2. **Copie les logs** de la console ici si ça ne marche pas
3. On pourra identifier exactement où le problème se situe dans le pipeline

## Notes Importantes

- Le backend DOIT être en cours d'exécution (vérifié ✅)
- Les images sont converties en base64 côté frontend
- Le format pour Gemini est `inlineData` avec `mimeType` et `data`
- Le système prompt inclut maintenant les capacités vision
