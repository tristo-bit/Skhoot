// Custom hook for Tauri window management
import { useCallback, useEffect } from 'react';

type ResizeDirection = 'East' | 'North' | 'NorthEast' | 'NorthWest' | 'South' | 'SouthEast' | 'SouthWest' | 'West';

export const useTauriWindow = () => {
  // Handle window close
  const handleClose = useCallback(async () => {
    try {
      const { getCurrentWindow } = await import(/* @vite-ignore */ '@tauri-apps/api/window');
      await getCurrentWindow().close();
    } catch {
      window.close();
    }
  }, []);

  // Handle window minimize
  const handleMinimize = useCallback(async () => {
    try {
      const { getCurrentWindow } = await import(/* @vite-ignore */ '@tauri-apps/api/window');
      await getCurrentWindow().minimize();
    } catch {
      // noop - not in Tauri environment (web version)
    }
  }, []);

  // Handle window maximize/restore
  const handleMaximize = useCallback(async () => {
    try {
      console.log('[Window] Maximize button clicked');
      const { getCurrentWindow } = await import(/* @vite-ignore */ '@tauri-apps/api/window');
      const win = getCurrentWindow();
      
      // Try toggleMaximize first (simpler API)
      if (typeof win.toggleMaximize === 'function') {
        console.log('[Window] Using toggleMaximize()');
        await win.toggleMaximize();
      } else {
        // Fallback to manual check
        const isMaximized = await win.isMaximized();
        console.log('[Window] Current maximized state:', isMaximized);
        
        if (isMaximized) {
          console.log('[Window] Unmaximizing...');
          await win.unmaximize();
        } else {
          console.log('[Window] Maximizing...');
          await win.maximize();
        }
      }
      console.log('[Window] Operation complete');
    } catch (error) {
      console.error('[Window] Maximize error:', error);
    }
  }, []);

  // Start window drag
  const startWindowDrag = useCallback(async () => {
    try {
      const { getCurrentWindow } = await import(/* @vite-ignore */ '@tauri-apps/api/window');
      await getCurrentWindow().startDragging();
    } catch {
      // noop - not in Tauri environment
    }
  }, []);

  // Handle drag on mouse down
  const handleDragMouseDown = useCallback(async (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest('[data-no-drag]')) return;
    await startWindowDrag();
  }, [startWindowDrag]);

  // Handle background drag
  const handleBackgroundDrag = useCallback(async (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    if (e.target !== e.currentTarget) return;
    await startWindowDrag();
  }, [startWindowDrag]);

  // Handle resize
  const handleResizeStart = useCallback(async (direction: ResizeDirection) => {
    try {
      const { getCurrentWindow } = await import(/* @vite-ignore */ '@tauri-apps/api/window');
      await getCurrentWindow().startResizeDragging(direction);
    } catch {
      // noop - not in Tauri environment
    }
  }, []);

  // Setup window radius based on fullscreen state
  useEffect(() => {
    let cleanup: (() => void) | undefined;
    document.documentElement.style.setProperty('--app-radius', '32px');

    (async () => {
      try {
        const { getCurrentWindow, currentMonitor } = await import(/* @vite-ignore */ '@tauri-apps/api/window');
        const win = getCurrentWindow();

        const updateRadius = async () => {
          const [size, maxed, full, scaleFactor] = await Promise.all([
            win.outerSize(),
            win.isMaximized(),
            win.isFullscreen(),
            win.scaleFactor(),
          ]);
          const monitor = await currentMonitor();
          const screen = monitor?.size;
          const tolerance = Math.max(8, Math.round(8 * (scaleFactor || 1)));
          const widthFull = Boolean(screen && size.width >= screen.width - tolerance);
          const heightFull = Boolean(screen && size.height >= screen.height - tolerance);
          const cssWidthFull = window.innerWidth >= window.screen.availWidth - tolerance;
          const cssHeightFull = window.innerHeight >= window.screen.availHeight - tolerance;
          const fullScreenLike = full || maxed || widthFull || heightFull || cssWidthFull || cssHeightFull;
          const radius = fullScreenLike ? '0px' : '32px';
          document.documentElement.style.setProperty('--app-radius', radius);
        };

        await updateRadius();
        const unlisten1 = await win.onResized(updateRadius);
        const unlisten2 = await win.onScaleChanged(updateRadius);
        const unlisten3 = await win.onFocusChanged(updateRadius);
        window.addEventListener('resize', updateRadius);

        cleanup = () => {
          unlisten1();
          unlisten2();
          unlisten3();
          window.removeEventListener('resize', updateRadius);
        };
      } catch {
        // noop - not in Tauri environment
      }
    })();

    return () => cleanup?.();
  }, []);

  return {
    handleClose,
    handleMinimize,
    handleMaximize,
    handleDragMouseDown,
    handleBackgroundDrag,
    handleResizeStart,
  };
};

export default useTauriWindow;
