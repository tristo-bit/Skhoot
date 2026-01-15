# Guide Utilisateur - Stockage Sécurisé des Clés API

## 📚 Vue d'Ensemble

Skhoot utilise un système de stockage sécurisé pour vos clés API avec:
- **Chiffrement AES-256-GCM** - Standard militaire
- **Keychain système** - Intégration native Windows/macOS/Linux
- **Stockage local** - Vos clés restent sur votre machine

---

## 🔐 Comment Ça Marche

### Architecture de Sécurité

```
┌─────────────────────────────────────────────────────────┐
│                    Votre Clé API                        │
│                  (ex: sk-abc123...)                     │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
         ┌───────────────────────┐
         │  Chiffrement AES-256  │
         │  avec nonce aléatoire │
         └───────────┬───────────┘
                     │
                     ▼
         ┌───────────────────────┐
         │   Clé Chiffrée        │
         │   [123, 45, 67, ...]  │
         └───────────┬───────────┘
                     │
                     ▼
         ┌───────────────────────┐
         │  Stockage sur Disque  │
         │  api_keys.json        │
         └───────────────────────┘

┌─────────────────────────────────────────────────────────┐
│              Clé de Chiffrement                         │
│         (générée automatiquement)                       │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
         ┌───────────────────────┐
         │  Windows Credential   │
         │  Manager / Keychain   │
         └───────────────────────┘
```

### Niveaux de Protection

1. **Niveau 1 - Chiffrement**: Votre clé API est chiffrée avec AES-256-GCM
2. **Niveau 2 - Clé de chiffrement**: Stockée dans le keychain système (protégé par votre session Windows)
3. **Niveau 3 - Fichier**: Le fichier chiffré est stocké dans votre AppData (accessible uniquement par vous)

---

## 🚀 Guide d'Utilisation

### 1. Ajouter une Clé API

1. **Ouvrir UserPanel**
   - Cliquer sur l'icône utilisateur en haut à droite
   - Ou utiliser le raccourci clavier (si configuré)

2. **Scroller vers "API Configuration"**
   - Section située après "Subscription Plan"

3. **Sélectionner votre Provider**
   - OpenAI (GPT-4, GPT-3.5, etc.)
   - Anthropic (Claude)
   - Google AI (Gemini)
   - Custom Endpoint

4. **Entrer votre Clé API**
   - Coller votre clé dans le champ
   - Utiliser l'icône 🔑 pour afficher/masquer

5. **Tester la Connexion**
   - Cliquer "Test Connection"
   - Attendre la validation (quelques secondes)
   - ✅ Succès: Liste des modèles disponibles s'affiche

6. **Sauvegarder**
   - Cliquer "Save API Key"
   - Confirmation: Bouton devient "Saved!" temporairement

### 2. Changer de Provider

1. Cliquer sur un autre provider (ex: Anthropic)
2. Le champ se vide automatiquement
3. Entrer la nouvelle clé
4. Tester et sauvegarder

**Note**: Chaque provider a sa propre clé stockée séparément.

### 3. Modifier une Clé Existante

1. Sélectionner le provider
2. La clé existante se charge automatiquement (masquée)
3. Modifier la clé
4. Tester et sauvegarder à nouveau

---

## 🔍 Où Sont Stockées Mes Clés ?

### Windows

**Clé de chiffrement**:
```
Windows Credential Manager
→ Windows Credentials
→ Generic Credentials
→ com.skhoot.app
```

**Fichier chiffré**:
```
C:\Users\[VOTRE_NOM]\AppData\Roaming\com.skhoot.app\api_keys.json
```

### macOS (Future)

**Clé de chiffrement**:
```
Keychain Access
→ login keychain
→ com.skhoot.app
```

**Fichier chiffré**:
```
~/Library/Application Support/com.skhoot.app/api_keys.json
```

### Linux (Future)

**Clé de chiffrement**:
```
libsecret / gnome-keyring
Service: com.skhoot.app
```

**Fichier chiffré**:
```
~/.local/share/com.skhoot.app/api_keys.json
```

---

## 🛡️ Sécurité

### Ce Qui Est Protégé

✅ **Votre clé API est chiffrée** avec AES-256-GCM
✅ **La clé de chiffrement** est dans le keychain système
✅ **Jamais en clair** dans les logs ou la console
✅ **Accessible uniquement** par votre session utilisateur
✅ **Nonce aléatoire** pour chaque sauvegarde

### Ce Qui N'Est PAS Protégé

⚠️ **Nom du provider** (visible dans le fichier JSON)
⚠️ **Timestamp dernière validation** (visible dans le fichier JSON)
⚠️ **Provider actif** (visible dans le fichier JSON)

**Pourquoi ?** Ces informations ne sont pas sensibles et permettent de gérer les clés sans déchiffrement.

### Bonnes Pratiques

1. ✅ **Ne partagez jamais** votre clé API
2. ✅ **Utilisez des clés différentes** pour dev/prod
3. ✅ **Révoquez les clés** si compromises
4. ✅ **Vérifiez régulièrement** l'usage de vos clés sur le dashboard du provider
5. ✅ **Limitez les permissions** de vos clés API (si le provider le permet)

---

## 🔧 Dépannage

### Problème: "Failed to save API key"

**Causes possibles**:
1. Permissions insuffisantes sur le dossier AppData
2. Keychain système inaccessible
3. Clé API vide ou invalide

**Solutions**:
1. Vérifier que vous avez les droits d'écriture dans `%APPDATA%`
2. Redémarrer l'application
3. Vérifier que la clé n'est pas vide

### Problème: "Failed to load API key"

**Causes possibles**:
1. Clé jamais sauvegardée pour ce provider
2. Fichier de stockage corrompu
3. Clé de chiffrement perdue

**Solutions**:
1. Vérifier que vous avez bien sauvegardé une clé pour ce provider
2. Vérifier l'existence du fichier `api_keys.json`
3. En dernier recours: supprimer le fichier et re-sauvegarder

### Problème: "Connection failed" lors du test

**Causes possibles**:
1. Clé API invalide ou expirée
2. Pas de connexion internet
3. Service du provider indisponible
4. Quota API dépassé

**Solutions**:
1. Vérifier la clé sur le dashboard du provider
2. Vérifier votre connexion internet
3. Attendre quelques minutes et réessayer
4. Vérifier votre quota sur le dashboard du provider

### Problème: Keychain entry non trouvée

**Windows**:
1. Ouvrir Credential Manager: `Win+R` → `control /name Microsoft.CredentialManager`
2. Chercher "com.skhoot.app"
3. Si absent: Lancer l'app et sauvegarder une clé

---

## 🧪 Vérification Manuelle

### Vérifier le Chiffrement

1. **Ouvrir le fichier de stockage**:
   ```
   notepad %APPDATA%\com.skhoot.app\api_keys.json
   ```

2. **Vérifier le format**:
   ```json
   {
     "openai": {
       "provider": "openai",
       "encrypted_key": [123, 45, 67, 89, ...],
       "nonce": [12, 34, 56, 78, ...],
       "is_active": true,
       "last_tested": 1705161600
     }
   }
   ```

3. **Confirmer**:
   - ✅ `encrypted_key` est un array de nombres (pas de texte)
   - ✅ Votre clé API n'est PAS visible en clair
   - ✅ Format JSON valide

### Vérifier le Keychain

**Windows**:
1. `Win+R` → `control /name Microsoft.CredentialManager`
2. Aller dans "Windows Credentials"
3. Chercher "com.skhoot.app"
4. Vérifier:
   - ✅ Nom d'utilisateur: "encryption_key"
   - ✅ Mot de passe: (masqué)

---

## 📊 Format du Fichier de Stockage

### Structure JSON

```json
{
  "provider_name": {
    "provider": "string",           // Nom du provider
    "encrypted_key": [u8],          // Clé chiffrée (array de bytes)
    "nonce": [u8],                  // Nonce pour déchiffrement (12 bytes)
    "is_active": boolean,           // Provider actif ou non
    "last_tested": i64 | null       // Timestamp dernière validation (Unix)
  }
}
```

### Exemple Réel

```json
{
  "openai": {
    "provider": "openai",
    "encrypted_key": [
      147, 23, 89, 234, 12, 67, 190, 45, 123, 78, 
      201, 156, 34, 89, 167, 223, 45, 98, 134, 67
    ],
    "nonce": [
      98, 234, 12, 67, 145, 89, 23, 178, 56, 123, 90, 45
    ],
    "is_active": true,
    "last_tested": 1705161600
  },
  "anthropic": {
    "provider": "anthropic",
    "encrypted_key": [
      234, 67, 123, 89, 45, 178, 90, 234, 12, 67,
      145, 89, 23, 178, 56, 123, 90, 45, 98, 134
    ],
    "nonce": [
      45, 123, 78, 201, 156, 34, 89, 167, 223, 45, 98, 134
    ],
    "is_active": false,
    "last_tested": null
  }
}
```

---

## 🔄 Migration et Sauvegarde

### Sauvegarder Vos Clés

**Option 1: Exporter depuis le provider**
- Recommandé: Gardez une copie de vos clés API dans un gestionnaire de mots de passe

**Option 2: Backup du fichier chiffré** (avancé)
```powershell
# Copier le fichier de stockage
copy "%APPDATA%\com.skhoot.app\api_keys.json" "backup_api_keys.json"

# Note: Sans la clé de chiffrement du keychain, ce fichier est inutilisable
```

### Restaurer Vos Clés

**Méthode recommandée**:
1. Réinstaller Skhoot
2. Re-saisir vos clés API manuellement
3. Tester et sauvegarder

**Méthode avancée** (même machine):
1. Restaurer le fichier `api_keys.json`
2. La clé de chiffrement est toujours dans le keychain
3. Les clés devraient se charger automatiquement

---

## ❓ FAQ

### Q: Mes clés sont-elles envoyées à Skhoot ?
**R**: Non. Vos clés sont stockées localement sur votre machine et ne sont jamais envoyées à nos serveurs.

### Q: Que se passe-t-il si je perds ma clé de chiffrement ?
**R**: Vous devrez re-saisir vos clés API. La clé de chiffrement est stockée dans le keychain système et liée à votre session utilisateur.

### Q: Puis-je utiliser la même clé sur plusieurs machines ?
**R**: Oui, mais vous devrez la saisir sur chaque machine. Le stockage est local et non synchronisé.

### Q: Le chiffrement AES-256-GCM est-il sûr ?
**R**: Oui. AES-256-GCM est un standard de chiffrement utilisé par les gouvernements et les banques. C'est le même niveau de sécurité que HTTPS.

### Q: Puis-je voir ma clé en clair après l'avoir sauvegardée ?
**R**: Non, pour des raisons de sécurité. Vous pouvez la remplacer, mais pas la visualiser. Gardez une copie dans un gestionnaire de mots de passe.

### Q: Que se passe-t-il si je change de mot de passe Windows ?
**R**: Vos clés restent accessibles. Le keychain Windows est lié à votre compte utilisateur, pas à votre mot de passe.

---

## 🆘 Support

### Besoin d'Aide ?

1. **Documentation**: Consultez ce guide
2. **Tests**: Exécutez `.\test-keychain-integration.ps1`
3. **Logs**: Vérifiez la console DevTools (F12)
4. **GitHub**: Ouvrez une issue avec les détails

### Informations Utiles pour le Support

Lors d'une demande de support, incluez:
- ✅ Système d'exploitation et version
- ✅ Version de Skhoot
- ✅ Message d'erreur exact
- ✅ Résultat du script de test
- ❌ **NE PAS inclure** votre clé API

---

**Version**: 1.0  
**Dernière mise à jour**: 13 janvier 2026  
**Auteur**: Équipe Skhoot
