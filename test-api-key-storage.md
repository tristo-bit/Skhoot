# Test Plan - API Key Storage (Task 2.1)

## Test Date: January 13, 2026
## Platform: Windows 10/11
## Tester: [À compléter]

---

## ✅ Pre-Test Checklist

- [ ] Backend compile sans erreurs critiques
- [ ] Tauri compile sans erreurs critiques
- [ ] Application Tauri lancée via `npm run tauri:dev`

---

## 🧪 Test 1: UI UserPanel - Accès et Affichage

### Objectif
Vérifier que la section "API Configuration" s'affiche correctement dans UserPanel.

### Étapes
1. Lancer l'application: `npm run tauri:dev`
2. Ouvrir le UserPanel (icône utilisateur)
3. Scroller jusqu'à la section "API Configuration"

### Critères de Succès
- [ ] Section "API Configuration" visible
- [ ] 4 boutons providers visibles (OpenAI, Anthropic, Google AI, Custom)
- [ ] Input clé API visible avec icône masquage
- [ ] Bouton "Test Connection" visible
- [ ] Texte descriptif présent

### Résultat
- [ ] ✅ PASS
- [ ] ❌ FAIL - Raison: _______________

---

## 🧪 Test 2: Sélection Provider

### Objectif
Vérifier que la sélection de provider fonctionne.

### Étapes
1. Cliquer sur "OpenAI"
2. Vérifier l'état actif (ring violet)
3. Cliquer sur "Anthropic"
4. Vérifier changement d'état

### Critères de Succès
- [ ] Provider sélectionné a ring violet (`ring-2 ring-accent`)
- [ ] Placeholder input change selon provider
- [ ] Transition visuelle fluide

### Résultat
- [ ] ✅ PASS
- [ ] ❌ FAIL - Raison: _______________

---

## 🧪 Test 3: Saisie et Masquage Clé API

### Objectif
Vérifier la saisie et le masquage de la clé API.

### Étapes
1. Sélectionner "OpenAI"
2. Taper une fausse clé: `sk-test1234567890abcdef`
3. Vérifier que le texte est masqué (type="password")
4. Cliquer sur l'icône Key pour afficher
5. Vérifier que le texte est visible

### Critères de Succès
- [ ] Texte masqué par défaut (••••••)
- [ ] Icône Key cliquable
- [ ] Toggle show/hide fonctionne
- [ ] Texte visible après toggle

### Résultat
- [ ] ✅ PASS
- [ ] ❌ FAIL - Raison: _______________

---

## 🧪 Test 4: Test Connection - Clé Invalide

### Objectif
Vérifier la gestion d'erreur pour clé invalide.

### Étapes
1. Saisir clé invalide: `invalid-key-123`
2. Cliquer "Test Connection"
3. Observer le message d'erreur

### Critères de Succès
- [ ] Bouton passe en état "testing" (spinner/disabled)
- [ ] Message d'erreur s'affiche (rouge)
- [ ] Message clair: "Failed to validate API key" ou similaire
- [ ] Pas de crash application

### Résultat
- [ ] ✅ PASS
- [ ] ❌ FAIL - Raison: _______________

---

## 🧪 Test 5: Test Connection - Clé Valide (Si disponible)

### Objectif
Vérifier la validation avec une vraie clé API.

### Étapes
1. Saisir une vraie clé API OpenAI (si disponible)
2. Cliquer "Test Connection"
3. Observer le résultat

### Critères de Succès
- [ ] Message succès s'affiche (vert)
- [ ] Message contient: "✅ API key validated successfully!"
- [ ] Dropdown "Available Models" apparaît
- [ ] Liste de modèles affichée (gpt-4, gpt-3.5-turbo, etc.)
- [ ] Bouton "Save API Key" apparaît

### Résultat
- [ ] ✅ PASS
- [ ] ❌ FAIL - Raison: _______________
- [ ] ⏭️ SKIP - Pas de clé API disponible

---

## 🧪 Test 6: Sauvegarde Clé API

### Objectif
Vérifier la sauvegarde sécurisée de la clé.

### Étapes
1. Après validation réussie (Test 5)
2. Cliquer "Save API Key"
3. Observer le feedback
4. Fermer UserPanel
5. Rouvrir UserPanel
6. Vérifier que la clé est chargée

### Critères de Succès
- [ ] Bouton change en "Saved!" temporairement
- [ ] Pas d'erreur console
- [ ] Après réouverture: clé chargée automatiquement
- [ ] Modèles disponibles rechargés

### Résultat
- [ ] ✅ PASS
- [ ] ❌ FAIL - Raison: _______________
- [ ] ⏭️ SKIP - Dépend Test 5

---

## 🧪 Test 7: Keychain Windows - Credential Manager

### Objectif
Vérifier que la clé de chiffrement est stockée dans Windows Credential Manager.

### Étapes
1. Sauvegarder une clé API (Test 6)
2. Ouvrir "Credential Manager" Windows
   - Rechercher "Credential Manager" dans menu Démarrer
   - Ou: Panneau de configuration > Comptes utilisateurs > Credential Manager
3. Aller dans "Windows Credentials"
4. Chercher entrée "com.skhoot.app"

### Critères de Succès
- [ ] Entrée "com.skhoot.app" présente
- [ ] Nom d'utilisateur: "encryption_key"
- [ ] Mot de passe stocké (non visible)

### Résultat
- [ ] ✅ PASS
- [ ] ❌ FAIL - Raison: _______________

### Screenshot
[Insérer screenshot Credential Manager ici]

---

## 🧪 Test 8: Fichier Stockage Chiffré

### Objectif
Vérifier que les clés sont stockées chiffrées sur disque.

### Étapes
1. Sauvegarder une clé API
2. Localiser le fichier de stockage:
   - Windows: `%APPDATA%\com.skhoot.app\api_keys.json`
   - Ou: `C:\Users\[USERNAME]\AppData\Roaming\com.skhoot.app\api_keys.json`
3. Ouvrir le fichier avec un éditeur texte
4. Vérifier le contenu

### Critères de Succès
- [ ] Fichier `api_keys.json` existe
- [ ] Contenu JSON valide
- [ ] Champs présents: `provider`, `encrypted_key`, `nonce`, `is_active`
- [ ] `encrypted_key` est un array de bytes (pas texte clair)
- [ ] Clé API **PAS visible en clair**

### Résultat
- [ ] ✅ PASS
- [ ] ❌ FAIL - Raison: _______________

### Exemple Contenu Attendu
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

---

## 🧪 Test 9: Changement de Provider

### Objectif
Vérifier le changement entre providers avec clés différentes.

### Étapes
1. Sauvegarder clé pour "OpenAI"
2. Changer vers "Anthropic"
3. Vérifier que l'input est vide
4. Saisir et sauvegarder clé Anthropic
5. Revenir à "OpenAI"
6. Vérifier que la clé OpenAI est rechargée

### Critères de Succès
- [ ] Changement provider vide l'input
- [ ] Chaque provider a sa propre clé
- [ ] Clés chargées automatiquement au changement
- [ ] Pas de mélange entre providers

### Résultat
- [ ] ✅ PASS
- [ ] ❌ FAIL - Raison: _______________

---

## 🧪 Test 10: Sécurité - Clés dans Console

### Objectif
Vérifier que les clés API n'apparaissent JAMAIS dans la console.

### Étapes
1. Ouvrir DevTools (F12)
2. Aller dans Console
3. Saisir et sauvegarder une clé API
4. Tester la connexion
5. Charger la clé
6. Scanner tous les logs console

### Critères de Succès
- [ ] Aucune clé API visible en clair dans console
- [ ] Logs montrent seulement: "Saved API key for openai"
- [ ] Pas de log avec contenu de la clé
- [ ] Erreurs ne contiennent pas la clé

### Résultat
- [ ] ✅ PASS
- [ ] ❌ FAIL - Raison: _______________

---

## 🧪 Test 11: Suppression Clé (Future)

### Objectif
Vérifier la suppression de clé (si implémenté).

### Étapes
1. Sauvegarder une clé
2. Chercher option "Delete" ou "Remove"
3. Supprimer la clé
4. Vérifier suppression

### Critères de Succès
- [ ] Option suppression disponible
- [ ] Confirmation demandée
- [ ] Clé supprimée du fichier
- [ ] Input vidé après suppression

### Résultat
- [ ] ✅ PASS
- [ ] ❌ FAIL - Raison: _______________
- [ ] ⏭️ SKIP - Pas encore implémenté

---

## 🧪 Test 12: Performance

### Objectif
Vérifier que les opérations sont rapides.

### Étapes
1. Mesurer temps de sauvegarde
2. Mesurer temps de chargement
3. Mesurer temps de test connexion

### Critères de Succès
- [ ] Sauvegarde < 200ms
- [ ] Chargement < 200ms
- [ ] Test connexion < 5s (dépend réseau)
- [ ] UI reste responsive

### Résultat
- [ ] ✅ PASS
- [ ] ❌ FAIL - Raison: _______________

---

## 📊 Résumé des Tests

### Tests Réussis: __ / 12
### Tests Échoués: __ / 12
### Tests Skippés: __ / 12

---

## 🐛 Bugs Identifiés

1. **Bug #1**: _______________
   - Sévérité: [ ] Critique [ ] Majeur [ ] Mineur
   - Description: _______________
   - Steps to reproduce: _______________

2. **Bug #2**: _______________
   - Sévérité: [ ] Critique [ ] Majeur [ ] Mineur
   - Description: _______________
   - Steps to reproduce: _______________

---

## 📝 Notes Additionnelles

_______________
_______________
_______________

---

## ✅ Validation Finale

- [ ] Tous les tests critiques passent
- [ ] Keychain Windows fonctionne
- [ ] Clés chiffrées sur disque
- [ ] Clés jamais visibles en clair (console/logs)
- [ ] UI responsive et intuitive
- [ ] Pas de crash ou erreur bloquante

### Recommandation
- [ ] ✅ APPROUVÉ - Passer à Task 2.2
- [ ] ⚠️ APPROUVÉ AVEC RÉSERVES - Bugs mineurs à corriger
- [ ] ❌ REJETÉ - Bugs critiques à corriger

---

## 🔄 Tests Plateforme Additionnels (Future)

### macOS
- [ ] Test Keychain Access
- [ ] Vérifier entrée "com.skhoot.app" dans Keychain
- [ ] Fichier: `~/Library/Application Support/com.skhoot.app/api_keys.json`

### Linux
- [ ] Test libsecret/gnome-keyring
- [ ] Commande: `secret-tool lookup service com.skhoot.app username encryption_key`
- [ ] Fichier: `~/.local/share/com.skhoot.app/api_keys.json`

---

**Testeur**: _______________
**Date**: _______________
**Signature**: _______________
