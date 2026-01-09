// UI scaling config modeled after meric-docker's presets and variables.

export type ScalingPreset = 'compact' | 'normal' | 'comfortable' | 'large';

export interface UIScalingConfig {
  preset: ScalingPreset;
  baseWidth: number;
  baseHeight: number;
  minScale: number;
  maxScale: number;
  enableHeightScaling: boolean;
  enableWidthScaling: boolean;
  textScale: number;
  spacingScale: number;
  iconScale: number;
  componentScale: number;
}

const PRESETS: Record<ScalingPreset, Omit<UIScalingConfig, 'preset'>> = {
  compact: {
    baseWidth: 1400,
    baseHeight: 900,
    minScale: 0.55,
    maxScale: 1.0,
    enableHeightScaling: true,
    enableWidthScaling: true,
    textScale: 0.9,
    spacingScale: 0.85,
    iconScale: 0.9,
    componentScale: 0.9,
  },
  normal: {
    baseWidth: 1200,
    baseHeight: 800,
    minScale: 0.6,
    maxScale: 1.1,
    enableHeightScaling: true,
    enableWidthScaling: true,
    textScale: 1.0,
    spacingScale: 1.0,
    iconScale: 1.0,
    componentScale: 1.0,
  },
  comfortable: {
    baseWidth: 1000,
    baseHeight: 700,
    minScale: 0.65,
    maxScale: 1.2,
    enableHeightScaling: true,
    enableWidthScaling: true,
    textScale: 1.05,
    spacingScale: 1.1,
    iconScale: 1.05,
    componentScale: 1.05,
  },
  large: {
    baseWidth: 800,
    baseHeight: 600,
    minScale: 0.7,
    maxScale: 1.3,
    enableHeightScaling: true,
    enableWidthScaling: true,
    textScale: 1.15,
    spacingScale: 1.2,
    iconScale: 1.15,
    componentScale: 1.15,
  },
};

const DEFAULT_PRESET: ScalingPreset = 'normal';

let currentScaling: UIScalingConfig = {
  preset: DEFAULT_PRESET,
  ...PRESETS[DEFAULT_PRESET],
};

export function getScalingConfig(): UIScalingConfig {
  return { ...currentScaling };
}

export function setScalingPreset(preset: ScalingPreset): void {
  currentScaling = { preset, ...PRESETS[preset] };
  applyScalingCSSVariables();
}

export function applyScalingCSSVariables(): void {
  const root = document.documentElement;
  const scaling = currentScaling;
  root.style.setProperty('--text-scale', scaling.textScale.toString());
  root.style.setProperty('--spacing-scale', scaling.spacingScale.toString());
  root.style.setProperty('--icon-scale', scaling.iconScale.toString());
  root.style.setProperty('--component-scale', scaling.componentScale.toString());
}

export function initUIConfig(): void {
  applyScalingCSSVariables();
}
