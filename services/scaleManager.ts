// Proportional scaling service modeled after meric-docker.

import { getScalingConfig } from './uiConfig';

export interface ScaleState {
  scale: number;
  heightScale: number;
  viewportWidth: number;
  viewportHeight: number;
  isCompact: boolean;
  isMobile: boolean;
  isMicro: boolean;
}

const BREAKPOINTS = {
  compact: 800,
  mobile: 600,
  micro: 480,
};

let currentState: ScaleState = {
  scale: 1,
  heightScale: 1,
  viewportWidth: typeof window !== 'undefined' ? window.innerWidth : 1200,
  viewportHeight: typeof window !== 'undefined' ? window.innerHeight : 800,
  isCompact: false,
  isMobile: false,
  isMicro: false,
};

let resizeTimeout: number | null = null;
const DEBOUNCE_MS = 100;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function applyScale(state: ScaleState): void {
  const root = document.documentElement;
  const textScale = clamp(state.scale, 0.85, 1);
  root.style.setProperty('--scale', state.scale.toString());
  root.style.setProperty('--height-scale', state.heightScale.toString());
  root.style.setProperty('--scale-text', textScale.toString());

  if (state.isCompact) {
    root.classList.add('compact-mode');
  } else {
    root.classList.remove('compact-mode');
  }

  if (state.isMobile) {
    root.classList.add('mobile-mode');
  } else {
    root.classList.remove('mobile-mode');
  }

  if (state.isMicro) {
    root.classList.add('micro-mode');
  } else {
    root.classList.remove('micro-mode');
  }
}

export function updateScale(viewportWidth: number, viewportHeight: number): void {
  const scaling = getScalingConfig();

  const widthScale = scaling.enableWidthScaling
    ? clamp(viewportWidth / scaling.baseWidth, scaling.minScale, 1)
    : 1;

  const heightScale = scaling.enableHeightScaling
    ? clamp(viewportHeight / scaling.baseHeight, scaling.minScale, scaling.maxScale)
    : 1;

  const nextState: ScaleState = {
    scale: widthScale,
    heightScale,
    viewportWidth,
    viewportHeight,
    isCompact: viewportWidth < BREAKPOINTS.compact,
    isMobile: viewportWidth < BREAKPOINTS.mobile,
    isMicro: viewportWidth < BREAKPOINTS.micro,
  };

  if (
    nextState.scale !== currentState.scale ||
    nextState.heightScale !== currentState.heightScale ||
    nextState.isCompact !== currentState.isCompact ||
    nextState.isMobile !== currentState.isMobile ||
    nextState.isMicro !== currentState.isMicro
  ) {
    currentState = nextState;
    applyScale(currentState);
  }
}

function handleResize(): void {
  if (resizeTimeout) {
    clearTimeout(resizeTimeout);
  }
  resizeTimeout = window.setTimeout(() => {
    updateScale(window.innerWidth, window.innerHeight);
  }, DEBOUNCE_MS);
}

export function initScaleManager(): void {
  updateScale(window.innerWidth, window.innerHeight);
  window.addEventListener('resize', handleResize);
}

export function destroyScaleManager(): void {
  window.removeEventListener('resize', handleResize);
  if (resizeTimeout) {
    clearTimeout(resizeTimeout);
  }
  resizeTimeout = null;
}
