# Tutoriel : Résoudre l'erreur "dlltool.exe not found" sur Windows

## Le problème

Quand tu compiles ton projet Rust/Tauri, tu obtiens cette erreur :
```
error: error calling dlltool 'dlltool.exe': program not found
error: could not compile `parking_lot_core` (lib) due to 1 previous error
error: could not compile `windows-sys` (lib) due to 1 previous error
```

## Pourquoi ça arrive ?

Tu utilises actuellement la toolchain **GNU** de Rust (`stable-x86_64-pc-windows-gnu`) qui a besoin d'outils MinGW/GNU qui ne sont pas installés sur ton système Windows.

## Solution recommandée : Passer à MSVC

### Étape 1 : Ouvrir un terminal

- Appuie sur `Win + R`
- Tape `cmd` ou `powershell`
- Appuie sur Entrée

### Étape 2 : Vérifier ta configuration actuelle

```bash
rustup show
```

Tu devrais voir quelque chose comme :
```
Default host: x86_64-pc-windows-msvc
active toolchain: stable-x86_64-pc-windows-gnu (default)
```

### Étape 3 : Changer vers MSVC

```bash
rustup default stable-x86_64-pc-windows-msvc
```

### Étape 4 : Vérifier le changement

```bash
rustup show
```

Maintenant tu devrais voir :
```
active toolchain: stable-x86_64-pc-windows-msvc (default)
```

### Étape 5 : Nettoyer et tester

```bash
# Va dans ton dossier de projet
cd "C:\Users\nfhrt\Documents\Dev\project\Skhoot\Skhoot"

# Nettoie les anciens builds
cargo clean

# Teste la compilation
cargo check
```

## Pourquoi MSVC est mieux ?

✅ **Utilise les outils Microsoft natifs** (déjà installés avec Visual Studio)  
✅ **Meilleure compatibilité** avec l'écosystème Windows  
✅ **Pas besoin d'outils supplémentaires** comme MinGW  
✅ **Recommandé officiellement** pour Tauri sur Windows  
✅ **Meilleures performances** sur Windows  

## Alternative : Si tu veux garder GNU

Si pour une raison tu préfères garder la toolchain GNU, tu peux installer les outils manquants :

### Option A : MSYS2 (recommandé)
```bash
# Installer MSYS2
winget install MSYS2.MSYS2
```

Puis ajouter `C:\msys64\mingw64\bin` à ton PATH système.

### Option B : MinGW-w64
- Télécharge MinGW-w64 depuis https://www.mingw-w64.org/
- Installe-le
- Ajoute le dossier `bin` à ton PATH

## Vérification finale

Après avoir fait le changement, teste que tout fonctionne :

```bash
# Dans ton projet
cargo build --release
```

Si ça compile sans erreur, c'est bon ! 🎉

## En cas de problème

Si tu as encore des erreurs :

1. **Redémarre ton terminal** après le changement de toolchain
2. **Vérifie que Visual Studio Build Tools est installé** :
   ```bash
   winget install Microsoft.VisualStudio.2022.BuildTools
   ```
3. **Nettoie complètement** :
   ```bash
   cargo clean
   rm -rf target/
   cargo build
   ```

## Résumé

La commande magique qui règle tout :
```bash
rustup default stable-x86_64-pc-windows-msvc
```

C'est tout ! Ton problème de `dlltool.exe` sera résolu définitivement.