# Button System Documentation

Ce dossier contient un système de boutons réutilisables basé sur une primitive commune.

## Architecture

### Base Components
- **`buttons.tsx`** - Primitive de base avec `BaseButton` et `Button` générique
- **`index.tsx`** - Point d'entrée pour tous les exports

### Specialized Components
- **`close-button.tsx`** - Bouton de fermeture avec icône X
- **`back-button.tsx`** - Bouton de retour avec flèche
- **`tab-button.tsx`** - Bouton d'onglet avec effet de clic
- **`save-button.tsx`** - Bouton de sauvegarde avec états
- **`upload-button.tsx`** - Bouton d'upload avec icône
- **`connection-button.tsx`** - Bouton de test de connexion
- **`premium-button.tsx`** - Bouton pour actions premium
- **`toggle-button.tsx`** - Bouton toggle on/off
- **`toggle-switch.tsx`** - Toggle switch avec knob animé et design glassmorphique
- **`icon-button.tsx`** - Bouton avec icône uniquement

## Usage

```tsx
import { Button, SaveButton, TabButton } from './buttonFormat';

// Bouton générique
<Button variant="primary" size="md" onClick={handleClick}>
  Click me
</Button>

// Bouton spécialisé
<SaveButton 
  onClick={handleSave}
  isSaved={isSaved}
  saveText="Save Changes"
/>

// Bouton d'onglet avec effet
<TabButton
  label="Settings"
  icon={<Settings />}
  isActive={activeTab === 'settings'}
  onTabClick={() => setActiveTab('settings')}
/>

// Switch toggle avec tailles
<SwitchToggle
  isToggled={isEnabled}
  onToggle={setIsEnabled}
  size="md"
  disabled={false}
/>

// Toggle switch avec design glassmorphique
<ToggleSwitch
  isToggled={isEnabled}
  onToggle={setIsEnabled}
  disabled={false}
  className="w-12 h-6"
/>
```

## Variants

- **primary** - Bouton principal (accent color)
- **secondary** - Bouton secondaire (glass effect)
- **danger** - Actions destructives (rouge)
- **ghost** - Bouton transparent
- **glass** - Effet verre
- **violet** - Couleur violette Skhoot (#9a8ba3)
- **blue** - Couleur bleue (#DDEBF4)

## Sizes

- **xs** - Extra small (px-2 py-1)
- **sm** - Small (px-3 py-1.5 / w-8 h-4 for switches)
- **md** - Medium (px-4 py-2 / settings-toggle for switches) - défaut
- **lg** - Large (px-6 py-3 / w-16 h-8 for switches)

## Switch Toggle Sizes

The `SwitchToggle` component uses specific dimensions:
- **sm** - 8x4 with 3x3 knob
- **md** - Uses `settings-toggle` class with `settings-toggle-knob`
- **lg** - 16x8 with 7x7 knob

## Features

- Animations et transitions cohérentes (300ms duration)
- Support des états disabled/loading
- Icônes avec positionnement flexible
- Styles adaptatifs light/dark mode
- Accessibilité (aria-label, title, role="switch" for toggles)
- TypeScript avec types stricts
- Toggle switches avec animation fluide du knob et changement de couleur
- Design glassmorphique avec bordures et effets de profondeur
- Customisation flexible via className prop