# 🚀 Démarrage des Tests - Task 2.1

## ⚡ Quick Start

### Étape 1: Lancer l'Application
```powershell
npm run tauri:dev
```

**Attendez que**:
- ✅ Backend compile
- ✅ Frontend compile
- ✅ Fenêtre Tauri s'ouvre

---

### Étape 2: Ouvrir UserPanel

1. **Cliquer** sur l'icône utilisateur (en haut à droite)
2. **Scroller** jusqu'à la section "API Configuration"

**Vous devriez voir**:
- 4 boutons providers (OpenAI, Anthropic, Google AI, Custom)
- Un champ de saisie pour la clé API
- Un bouton "Test Connection"

---

### Étape 3: Test Rapide (Sans Clé Réelle)

#### 3.1 Sélectionner un Provider
- Cliquer sur "OpenAI"
- Le bouton doit avoir un ring violet

#### 3.2 Saisir une Fausse Clé
- Taper: `sk-test1234567890`
- Vérifier que le texte est masqué (••••••)

#### 3.3 Toggle Affichage
- Cliquer sur l'icône 🔑
- Le texte doit devenir visible
- Cliquer à nouveau → masqué

#### 3.4 Test Connexion (Échec Attendu)
- Cliquer "Test Connection"
- Attendre quelques secondes
- **Résultat attendu**: Message d'erreur rouge
- ✅ **C'est normal !** La clé est invalide

---

### Étape 4: Test Complet (Avec Clé Réelle) - OPTIONNEL

⚠️ **Seulement si vous avez une vraie clé API**

#### 4.1 Obtenir une Clé API
- **OpenAI**: https://platform.openai.com/api-keys
- **Anthropic**: https://console.anthropic.com/
- **Google AI**: https://makersuite.google.com/app/apikey

#### 4.2 Tester la Clé
1. Coller votre vraie clé
2. Cliquer "Test Connection"
3. **Résultat attendu**:
   - ✅ Message vert: "API key validated successfully!"
   - ✅ Dropdown "Available Models" apparaît
   - ✅ Liste de modèles affichée
   - ✅ Bouton "Save API Key" apparaît

#### 4.3 Sauvegarder
1. Cliquer "Save API Key"
2. **Résultat attendu**:
   - ✅ Bouton devient "Saved!" temporairement
   - ✅ Pas d'erreur dans la console

#### 4.4 Vérifier Persistance
1. Fermer UserPanel (X)
2. Rouvrir UserPanel
3. **Résultat attendu**:
   - ✅ Clé chargée automatiquement (masquée)
   - ✅ Modèles rechargés

---

### Étape 5: Vérifier le Keychain

#### Windows
```powershell
# Méthode 1: Via Run
Win+R → control /name Microsoft.CredentialManager

# Méthode 2: Via Panneau de configuration
Panneau de configuration → Comptes utilisateurs → Credential Manager
```

**Chercher**:
- Aller dans "Windows Credentials"
- Chercher "com.skhoot.app"
- **Résultat attendu**:
  - ✅ Entrée présente
  - ✅ Nom d'utilisateur: "encryption_key"
  - ✅ Mot de passe: (masqué)

---

### Étape 6: Vérifier le Fichier Chiffré

```powershell
# Ouvrir le fichier
notepad %APPDATA%\com.skhoot.app\api_keys.json
```

**Vérifier**:
- ✅ Format JSON valide
- ✅ `encrypted_key` est un array de nombres: `[123, 45, 67, ...]`
- ✅ Votre clé API **N'EST PAS** visible en clair
- ✅ Champs présents: `provider`, `encrypted_key`, `nonce`, `is_active`

**Exemple attendu**:
```json
{
  "openai": {
    "provider": "openai",
    "encrypted_key": [147, 23, 89, 234, 12, 67, ...],
    "nonce": [98, 234, 12, 67, 145, 89, ...],
    "is_active": true,
    "last_tested": 1705161600
  }
}
```

---

### Étape 7: Vérifier la Sécurité

#### 7.1 Ouvrir DevTools
- Appuyer sur `F12`
- Aller dans l'onglet "Console"

#### 7.2 Effectuer des Opérations
- Sauvegarder une clé
- Charger une clé
- Tester une connexion

#### 7.3 Scanner les Logs
**Vérifier**:
- ✅ Aucune clé API visible en clair
- ✅ Logs montrent seulement: "Saved API key for openai"
- ✅ Pas de log avec le contenu de la clé

---

## ✅ Checklist Rapide

### Tests Basiques (Sans Clé Réelle)
- [ ] Application se lance
- [ ] UserPanel s'ouvre
- [ ] Section "API Configuration" visible
- [ ] Sélection provider fonctionne
- [ ] Saisie clé fonctionne
- [ ] Toggle show/hide fonctionne
- [ ] Test connexion échoue correctement (clé invalide)

### Tests Complets (Avec Clé Réelle) - OPTIONNEL
- [ ] Test connexion réussit
- [ ] Modèles disponibles s'affichent
- [ ] Sauvegarde fonctionne
- [ ] Chargement automatique fonctionne
- [ ] Keychain entry créée
- [ ] Fichier chiffré créé
- [ ] Clé jamais visible en clair

---

## 🐛 Problèmes Courants

### Problème: "Failed to save API key"
**Solution**:
1. Vérifier que le dossier `%APPDATA%\com.skhoot.app` existe
2. Redémarrer l'application
3. Vérifier les permissions du dossier

### Problème: "Failed to load API key"
**Solution**:
1. Vérifier que vous avez bien sauvegardé une clé pour ce provider
2. Vérifier que le fichier `api_keys.json` existe
3. Essayer de re-sauvegarder la clé

### Problème: Keychain entry non trouvée
**Solution**:
1. Sauvegarder une clé d'abord
2. Rafraîchir Credential Manager
3. Chercher exactement "com.skhoot.app"

### Problème: Application ne se lance pas
**Solution**:
```powershell
# Vérifier la compilation
cargo check --manifest-path backend/Cargo.toml
cargo check --manifest-path src-tauri/Cargo.toml

# Nettoyer et relancer
npm run tauri:dev
```

---

## 📊 Résultats Attendus

### ✅ Succès Total
- Tous les tests basiques passent
- Keychain entry créée
- Fichier chiffré créé
- Clés jamais visibles en clair
- UI responsive et intuitive

### ⚠️ Succès Partiel
- Tests basiques passent
- Mais problème avec keychain ou fichier
- → Consulter `API_KEY_STORAGE_GUIDE.md`

### ❌ Échec
- Application ne se lance pas
- Erreurs de compilation
- UI ne s'affiche pas
- → Exécuter `.\test-keychain-integration.ps1`
- → Vérifier les logs console

---

## 📝 Reporter les Résultats

### Si Tout Fonctionne ✅
```
✅ Task 2.1 validée !
- Tous les tests passent
- Keychain fonctionne
- Fichier chiffré OK
- Sécurité validée

Prêt pour Task 2.2 ou 2.3
```

### Si Problèmes ❌
**Fournir**:
1. Message d'erreur exact
2. Screenshot du problème
3. Résultat de `.\test-keychain-integration.ps1`
4. Logs console (F12)
5. ❌ **NE PAS** inclure de clé API

---

## 🔄 Tests Additionnels (Avancés)

### Test Multi-Provider
1. Sauvegarder clé pour "OpenAI"
2. Changer vers "Anthropic"
3. Sauvegarder clé différente
4. Revenir à "OpenAI"
5. **Vérifier**: Clé OpenAI rechargée automatiquement

### Test Performance
1. Mesurer temps de sauvegarde (DevTools → Network)
2. Mesurer temps de chargement
3. **Attendu**: < 200ms pour chaque opération

### Test Changement Provider Actif
1. Sauvegarder clés pour 2 providers
2. Utiliser `set_active_provider` (via console si exposé)
3. Vérifier que le bon provider est actif

---

## 📚 Documentation Complète

### Pour Plus de Détails
- **Guide utilisateur**: `API_KEY_STORAGE_GUIDE.md`
- **Plan de test complet**: `test-api-key-storage.md`
- **Résumé technique**: `TASK_2.1_TEST_SUMMARY.md`

### Scripts Disponibles
- **Tests automatiques**: `.\test-keychain-integration.ps1`

---

## 🎯 Objectif Final

**Valider que**:
1. ✅ Les clés API sont stockées de manière sécurisée
2. ✅ Le chiffrement AES-256-GCM fonctionne
3. ✅ L'intégration keychain fonctionne
4. ✅ L'UI est intuitive et fonctionnelle
5. ✅ Aucune clé n'est jamais visible en clair

---

**Bonne chance avec les tests ! 🚀**

**Questions ?** Consulter `API_KEY_STORAGE_GUIDE.md` section FAQ
