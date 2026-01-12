# Meric-docker Responsivity Model (Reference for Skhoot)

This document captures how **meric-docker** implements responsive scaling (width, height, and user‑controlled granular scaling). Use this as the blueprint for Skhoot’s responsive behavior.

## 1) Proportional viewport scaling (width + height)
**Source:** `src/services/scaleManager.ts`

- **Width-based scaling**
  - Base width: `baseWidth` (default `1200`) from `ScaleConfig`.
  - `scale = clamp(minScale, viewportWidth / baseWidth, 1)`.
  - Applied to CSS variable `--scale`.

- **Height-based scaling**
  - Base height: `baseHeight` from UI config (default `800`).
  - `heightScale = clamp(minScale, viewportHeight / baseHeight, maxScale)`.
  - Applied to CSS variable `--height-scale`.

- **Diagonal scaling**
  - Both width and height scaling are applied simultaneously.
  - Width scaling is used for general layout + font scaling (`--scale`), height scaling for vertical sizing (sidebar item heights, etc.).

- **Breakpoints**
  - `compact` at `< 800px` width, `mobile` at `< 600px` width.
  - Adds `compact-mode` / `mobile-mode` classes to `<html>` for CSS overrides.

- **Runtime behavior**
  - `initScaleManager()` calls `updateScale(window.innerWidth, window.innerHeight)` at startup.
  - Resizes are debounced (~100ms) and reapply scaling.

## 2) User‑configurable granular scaling
**Source:** `src/config/uiConfig.ts`

- **Granular scale factors (multipliers)**
  - `textScale`, `spacingScale`, `iconScale`, `componentScale`.

- **Presets**
  - `compact`, `normal`, `comfortable`, `large`.
  - Each preset defines base dimensions + min/max scales + granular multipliers.

- **CSS variables computed from user factors**
  - `--text-scale`, `--spacing-scale`, `--icon-scale`, `--component-scale`.
  - Derived variables:
    - Text: `--scaled-text-xs` .. `--scaled-text-3xl`
    - Spacing: `--scaled-space-1` .. `--scaled-space-6`
    - Icons: `--scaled-icon-sm` .. `--scaled-icon-xl`
    - Components: `--scaled-btn-height`, `--scaled-input-height`, `--scaled-card-padding`

- **Storage**
  - Stored in `localStorage` (`meric-ui-config`).
  - Updates are debounced via `requestAnimationFrame`.

## 3) CSS application model
**Source:** `src/style.css`

- **Root variables** define:
  - Base spacing sizes (`--space-*`).
  - Scaled spacing (`--scale-space-*`) tied to `--scale`.
  - Scaled font sizes (`--scale-font-*`) tied to `--scale`.
  - User‑scaled values (`--scaled-*`) tied to the granular factors.

- **Usage pattern**
  - Layout spacing uses `--scale-space-*` (viewport width scaling).
  - Typography uses `--scale-font-*` and optionally the `--scaled-text-*` overrides.
  - Component sizing uses `--scaled-*` for user preference scaling.
  - Sidebar-specific values scale with `--height-scale`.

## 4) Summary to replicate in Skhoot
- **Two‑axis scaling:** width (`--scale`) + height (`--height-scale`) applied together.
- **Granular scaling layer:** text/spacing/icon/component multipliers, applied on top of proportional scaling.
- **CSS variable strategy:** precompute commonly used sizes into CSS vars; use those vars consistently in components.
- **Breakpoints:** toggle `compact-mode` / `mobile-mode` to adjust layout at smaller widths.

## 5) Implementation checklist for Skhoot
- Add a scale manager like `scaleManager.ts` with width/height scaling + breakpoints.
- Add a UI config module like `uiConfig.ts` with presets and granular sliders.
- Apply CSS variables at root and ensure components consume them.
- Initialize on app start and update on resize with debounce.
