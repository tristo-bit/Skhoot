# 🔍 DEBUG - Notifications & Toggles

## État Actuel

### ✅ Modifications Appliquées

#### 1. Toggles (SwitchToggle)
- **Utilisation des classes CSS existantes** : `settings-toggle` et `settings-toggle-knob`
- **Stroke blanche visible** : `border-2` avec `border-white/40` (inactif) et `border-white/60` (hover)
- **Contraste amélioré** : Background `bg-accent` (actif) vs `bg-glass-border` (inactif)
- **Knob visible** : `bg-white` avec `border-2 border-white/50`

#### 2. Notifications - Logs Détaillés Ajoutés
- **Initialisation du plugin Tauri** : Logs détaillés de l'import et des fonctions
- **Test de notification** : Logs complets du flux (panel → service → Tauri)
- **Payload de notification** : Affichage complet des données envoyées
- **Gestion d'erreurs** : Logs détaillés des erreurs avec stack trace

### 🎯 Points à Vérifier

#### A. Toggles
1. **Ouvre Settings → Notifications**
2. **Vérifie la visibilité** : Les toggles ont-ils une bordure blanche visible ?
3. **Teste l'interaction** : Le hover change-t-il la bordure ?
4. **Vérifie les états** : Actif (accent) vs Inactif (glass-border) sont-ils distincts ?

#### B. Notifications de Test
1. **Ouvre Settings → Notifications**
2. **Active "Enable Notifications"** (toggle principal)
3. **Active au moins un type** (Success, Error, Warning, Info)
4. **Clique sur un bouton de test** (✅❌⚠️ℹ️)
5. **Ouvre la console DevTools** (F12) et cherche les logs `[Notifications]`

### 🔎 Logs à Rechercher dans la Console

Quand tu cliques sur un bouton de test, tu devrais voir :

```
[NotificationsPanel] ========== TEST BUTTON CLICKED ==========
[NotificationsPanel] Testing notification type: success
[NotificationsPanel] Current settings state: {...}
[NotificationsPanel] Settings enabled: true
[NotificationsPanel] Type enabled: true
[NotificationsPanel] Calling nativeNotifications.testNotification...

[Notifications] Testing notification type: success
[Notifications] Current settings: {...}
[Notifications] Tauri available: true/false

[Notifications] ========== DIRECT NOTIFICATION START ==========
[Notifications] Type: success
[Notifications] Title: Test Success
[Notifications] Body: This is a test success notification
[Notifications] Tauri available: true/false
[Notifications] Settings enabled: true
[Notifications] Type enabled: true
[Notifications] Icon: ✅
[Notifications] Sound enabled: true
[Notifications] Attempting to send via Tauri...
[Notifications] Notification payload: {...}
[Notifications] ✅ Native notification sent successfully!
[Notifications] ========== DIRECT NOTIFICATION END ==========

[NotificationsPanel] ✅ Test notification sent successfully
[NotificationsPanel] ========== TEST BUTTON END ==========
```

### ❌ Erreurs Possibles

#### Si `Tauri available: false`
**Cause** : Le plugin Tauri ne se charge pas
**Logs à chercher** :
```
[Notifications] ❌ Tauri plugin not available: [error details]
[Notifications] Error type: [type]
[Notifications] Error message: [message]
```

**Solutions possibles** :
1. Vérifier que `@tauri-apps/plugin-notification` est installé : `npm list @tauri-apps/plugin-notification`
2. Vérifier le fichier `src-tauri/Cargo.toml` contient `tauri-plugin-notification`
3. Recompiler Tauri : `npm run tauri build` ou redémarrer `npm run tauri:dev`

#### Si erreur lors de l'envoi
**Logs à chercher** :
```
[Notifications] ❌ Tauri sendNotification failed: [error]
[Notifications] Error details: {...}
```

**Solutions possibles** :
1. Vérifier les permissions Windows pour les notifications
2. Vérifier que l'app a les permissions dans `src-tauri/capabilities/default.json`
3. Tester avec une notification simple sans icon/sound

### 🧪 Tests à Effectuer

1. **Test Toggle Visibility**
   - [ ] Toggles visibles en mode light
   - [ ] Toggles visibles en mode dark
   - [ ] Bordure blanche visible
   - [ ] Hover fonctionne
   - [ ] États actif/inactif distincts

2. **Test Notifications**
   - [ ] Ouvrir console DevTools (F12)
   - [ ] Activer notifications dans settings
   - [ ] Cliquer sur test Success ✅
   - [ ] Vérifier logs dans console
   - [ ] Vérifier notification Windows apparaît
   - [ ] Répéter pour Error ❌, Warning ⚠️, Info ℹ️

3. **Test Permissions**
   - [ ] Vérifier permissions Windows (Settings → System → Notifications)
   - [ ] Vérifier que Skhoot est autorisé à envoyer des notifications

### 📝 Informations à Me Fournir

Si ça ne fonctionne toujours pas, copie-colle :

1. **Les logs de la console** (tout ce qui commence par `[Notifications]`)
2. **La valeur de `Tauri available`** (true ou false)
3. **Les erreurs éventuelles** (en rouge dans la console)
4. **Résultat de** : `npm list @tauri-apps/plugin-notification`
5. **Screenshot des toggles** pour voir la visibilité

### 🔧 Commandes Utiles

```bash
# Vérifier le plugin est installé
npm list @tauri-apps/plugin-notification

# Nettoyer et réinstaller
npm ci

# Recompiler Tauri
npm run tauri build

# Redémarrer en dev
npm run tauri:dev
```

---

**App actuellement lancée** : `npm run tauri:dev` (Process ID: 6)
**Prochaine étape** : Ouvre l'app, va dans Settings → Notifications, et teste !
