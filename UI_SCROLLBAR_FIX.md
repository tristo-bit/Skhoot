# Fix UI - Scrollbar Custom (Dark Mode)

## Problème
Dans les écrans suivants, la scrollbar native du système était utilisée, cassant la cohérence visuelle en dark mode :
- **Agents > Create**
- **Workflows > Workflows**
- **Workflows > Create**

## Solution
Application de la classe `custom-scrollbar` existante à tous les conteneurs avec `overflow-y-auto` dans les panneaux concernés.

## Fichiers modifiés

### 1. `components/panels/AgentsPanel.tsx`
- **Agent List** (ligne 206) : Ajout de `custom-scrollbar`
- **Agent Detail** (ligne 236) : Ajout de `custom-scrollbar`
- **AgentList component** (ligne 303) : Ajout de `custom-scrollbar`
- **AgentCreator component** (ligne 764) : Ajout de `custom-scrollbar`

### 2. `components/panels/WorkflowsPanel.tsx`
- **Left Column** (ligne 258) : Ajout de `custom-scrollbar`
- **Right Column** (ligne 279) : Ajout de `custom-scrollbar`
- **ExecutionDetail output** (ligne 427) : Ajout de `custom-scrollbar`
- **ImportView** (ligne 1522) : Ajout de `custom-scrollbar`

## Styles appliqués
Les styles de scrollbar custom sont définis dans `components/ui/Scrollbar.tsx` et injectés globalement via `MainArea.tsx` :

```css
.custom-scrollbar::-webkit-scrollbar {
  width: 14px;
  background: transparent;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: var(--nimbus-cloud);
  border-radius: 8px;
  border: 5px solid transparent;
  background-clip: padding-box;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: var(--orchid-tint);
}

.custom-scrollbar::-webkit-scrollbar-thumb:active {
  background: var(--fuku-brand);
}
```

## Vérification
✅ Build réussi sans erreurs
✅ Cohérence visuelle maintenue avec le reste de l'UI
✅ Styles dark mode appliqués correctement
✅ Aucune nouvelle dépendance ajoutée

## Impact
- Amélioration de la cohérence visuelle en dark mode
- Meilleure expérience utilisateur dans les panneaux Agents et Workflows
- Respect du design system glassmorphique de l'application
