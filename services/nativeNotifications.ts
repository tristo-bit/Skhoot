// Native notifications service using Tauri plugin
let isPermissionGranted: any, requestPermission: any, sendNotification: any;

// Dynamic import for Tauri plugin with fallback
const initTauriNotifications = async () => {
  try {
    console.log('[Notifications] Attempting to load Tauri notification plugin...');
    const plugin = await import('@tauri-apps/plugin-notification');
    console.log('[Notifications] Plugin imported successfully:', plugin);
    
    isPermissionGranted = plugin.isPermissionGranted;
    requestPermission = plugin.requestPermission;
    sendNotification = plugin.sendNotification;
    
    console.log('[Notifications] Functions assigned:');
    console.log('[Notifications] - isPermissionGranted:', typeof isPermissionGranted);
    console.log('[Notifications] - requestPermission:', typeof requestPermission);
    console.log('[Notifications] - sendNotification:', typeof sendNotification);
    
    console.log('[Notifications] ✅ Tauri plugin loaded successfully');
    return true;
  } catch (error) {
    console.error('[Notifications] ❌ Tauri plugin not available:', error);
    console.error('[Notifications] Error type:', error?.constructor?.name);
    console.error('[Notifications] Error message:', error?.message);
    return false;
  }
};

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface NotificationAction {
  id: string;
  title: string;
}

export interface NotificationOptions {
  title: string;
  body: string;
  type: NotificationType;
  icon?: string;
  actions?: NotificationAction[];
  sound?: boolean;
  silent?: boolean;
  tag?: string; // For grouping/replacing notifications
  data?: Record<string, any>; // Custom data for action handling
}

export interface NotificationSettings {
  enabled: boolean;
  types: {
    success: boolean;
    error: boolean;
    warning: boolean;
    info: boolean;
  };
  sound: {
    enabled: boolean;
    volume: number; // 0-100
    customSounds: {
      success: string;
      error: string;
      warning: string;
      info: string;
    };
  };
  display: {
    duration: number; // seconds, 0 = persistent
    position: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
    showIcon: boolean;
    showActions: boolean;
    groupSimilar: boolean;
  };
  frequency: {
    enabled: boolean;
    maxPerMinute: number;
    quietHours: {
      enabled: boolean;
      start: string; // HH:MM format
      end: string; // HH:MM format
    };
  };
  priority: {
    success: 'low' | 'normal' | 'high';
    error: 'low' | 'normal' | 'high';
    warning: 'low' | 'normal' | 'high';
    info: 'low' | 'normal' | 'high';
  };
}

class NativeNotificationService {
  private settings: NotificationSettings;
  private notificationQueue: Array<{ timestamp: number; type: NotificationType }> = [];
  private readonly STORAGE_KEY = 'skhoot_notification_settings';
  private tauriAvailable = false;

  constructor() {
    this.settings = this.loadSettings();
    this.initializeService();
  }

  private async initializeService() {
    console.log('[Notifications] Initializing notification service...');
    
    try {
      this.tauriAvailable = await initTauriNotifications();
      console.log('[Notifications] Tauri availability check result:', this.tauriAvailable);
      
      if (this.tauriAvailable) {
        console.log('[Notifications] Tauri plugin loaded, initializing permissions...');
        await this.initializePermissions();
      } else {
        console.warn('[Notifications] Running in web mode - notifications will be simulated');
        console.log('[Notifications] Checking browser notification support...');
        
        if ('Notification' in window) {
          console.log('[Notifications] Browser notifications available, permission:', Notification.permission);
        } else {
          console.warn('[Notifications] Browser notifications not supported');
        }
      }
      
      console.log('[Notifications] Service initialization complete');
      console.log('[Notifications] Final settings:', this.settings);
    } catch (error) {
      console.error('[Notifications] Service initialization failed:', error);
    }
  }

  private getDefaultSettings(): NotificationSettings {
    return {
      enabled: true,
      types: {
        success: true,
        error: true,
        warning: true,
        info: true,
      },
      sound: {
        enabled: true,
        volume: 70,
        customSounds: {
          success: 'default',
          error: 'default',
          warning: 'default',
          info: 'default',
        },
      },
      display: {
        duration: 5,
        position: 'top-right',
        showIcon: true,
        showActions: true,
        groupSimilar: true,
      },
      frequency: {
        enabled: true,
        maxPerMinute: 5,
        quietHours: {
          enabled: false,
          start: '22:00',
          end: '08:00',
        },
      },
      priority: {
        success: 'normal',
        error: 'high',
        warning: 'normal',
        info: 'low',
      },
    };
  }

  private loadSettings(): NotificationSettings {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Merge with defaults to handle new settings
        return { ...this.getDefaultSettings(), ...parsed };
      }
    } catch (error) {
      console.error('Failed to load notification settings:', error);
    }
    return this.getDefaultSettings();
  }

  private saveSettings(): void {
    try {
      console.log('[Notifications] Saving settings to localStorage:', this.settings);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.settings));
      console.log('[Notifications] Settings saved successfully');
    } catch (error) {
      console.error('[Notifications] Failed to save settings:', error);
    }
  }

  private async initializePermissions(): Promise<void> {
    try {
      if (!this.tauriAvailable) {
        console.log('[Notifications] Skipping permission check - Tauri not available');
        return;
      }

      let permissionGranted = await isPermissionGranted();
      console.log('[Notifications] Permission granted:', permissionGranted);
      
      if (!permissionGranted) {
        console.log('[Notifications] Requesting permission...');
        const permission = await requestPermission();
        permissionGranted = permission === 'granted';
        console.log('[Notifications] Permission result:', permission);
      }
      
      if (!permissionGranted) {
        console.warn('[Notifications] Permission not granted');
        this.settings.enabled = false;
        this.saveSettings();
      } else {
        console.log('[Notifications] Permission granted - notifications enabled');
      }
    } catch (error) {
      console.error('[Notifications] Failed to initialize permissions:', error);
    }
  }

  private isInQuietHours(): boolean {
    if (!this.settings.frequency.quietHours.enabled) return false;

    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const { start, end } = this.settings.frequency.quietHours;

    // Handle overnight quiet hours (e.g., 22:00 to 08:00)
    if (start > end) {
      return currentTime >= start || currentTime <= end;
    }
    // Handle same-day quiet hours (e.g., 12:00 to 14:00)
    return currentTime >= start && currentTime <= end;
  }

  private checkFrequencyLimit(type: NotificationType): boolean {
    if (!this.settings.frequency.enabled) return true;

    const now = Date.now();
    const oneMinuteAgo = now - 60000;

    // Clean old notifications from queue
    this.notificationQueue = this.notificationQueue.filter(n => n.timestamp > oneMinuteAgo);

    // Check if we're under the limit
    return this.notificationQueue.length < this.settings.frequency.maxPerMinute;
  }

  private getNotificationIcon(type: NotificationType): string {
    const iconMap = {
      success: '✅',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️',
    };
    return iconMap[type];
  }

  private getDefaultActions(type: NotificationType, data?: Record<string, any>): NotificationAction[] {
    const baseActions: NotificationAction[] = [
      { id: 'dismiss', title: 'Dismiss' },
    ];

    // Add type-specific actions
    switch (type) {
      case 'error':
        baseActions.unshift(
          { id: 'retry', title: 'Retry' },
          { id: 'details', title: 'View Details' }
        );
        break;
      case 'success':
        if (data?.actionable) {
          baseActions.unshift({ id: 'view', title: 'View' });
        }
        break;
      case 'warning':
        baseActions.unshift({ id: 'fix', title: 'Fix Now' });
        break;
      case 'info':
        baseActions.unshift({ id: 'open', title: 'Open' });
        break;
    }

    return baseActions;
  }

  async notify(options: NotificationOptions): Promise<void> {
    try {
      console.log('[Notifications] Attempting to send notification:', options.type, options.title);
      
      // Check if notifications are enabled
      if (!this.settings.enabled || !this.settings.types[options.type]) {
        console.log('[Notifications] Notification disabled for type:', options.type);
        return;
      }

      // Check quiet hours
      if (this.isInQuietHours()) {
        console.log('[Notifications] Notification suppressed due to quiet hours');
        return;
      }

      // Check frequency limits
      if (!this.checkFrequencyLimit(options.type)) {
        console.log('[Notifications] Notification suppressed due to frequency limit');
        return;
      }

      // Add to queue for frequency tracking
      this.notificationQueue.push({
        timestamp: Date.now(),
        type: options.type,
      });

      // Prepare notification data
      const icon = options.icon || (this.settings.display.showIcon ? this.getNotificationIcon(options.type) : undefined);
      const actions = this.settings.display.showActions 
        ? (options.actions || this.getDefaultActions(options.type, options.data))
        : undefined;

      if (this.tauriAvailable) {
        // Send native notification via Tauri
        await sendNotification({
          title: options.title,
          body: options.body,
          icon,
          sound: this.settings.sound.enabled && !options.silent ? 'default' : undefined,
          tag: options.tag,
        });
        console.log('[Notifications] Native notification sent successfully');
      } else {
        // Fallback for web environment - use browser notifications or console
        console.log('[Notifications] SIMULATED NOTIFICATION:', {
          type: options.type,
          title: options.title,
          body: options.body,
          icon,
        });
        
        // Try browser notification as fallback
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(options.title, {
            body: options.body,
            icon: icon || undefined,
            tag: options.tag,
          });
          console.log('[Notifications] Browser notification sent');
        } else if ('Notification' in window && Notification.permission === 'default') {
          const permission = await Notification.requestPermission();
          if (permission === 'granted') {
            new Notification(options.title, {
              body: options.body,
              icon: icon || undefined,
              tag: options.tag,
            });
            console.log('[Notifications] Browser notification sent after permission');
          }
        }
      }
    } catch (error) {
      console.error('[Notifications] Failed to send notification:', error);
    }
  }

  // Convenience methods for different notification types
  async success(title: string, body: string, options?: Partial<NotificationOptions>): Promise<void> {
    await this.notify({
      title,
      body,
      type: 'success',
      ...options,
    });
  }

  async error(title: string, body: string, options?: Partial<NotificationOptions>): Promise<void> {
    await this.notify({
      title,
      body,
      type: 'error',
      ...options,
    });
  }

  async warning(title: string, body: string, options?: Partial<NotificationOptions>): Promise<void> {
    await this.notify({
      title,
      body,
      type: 'warning',
      ...options,
    });
  }

  async info(title: string, body: string, options?: Partial<NotificationOptions>): Promise<void> {
    await this.notify({
      title,
      body,
      type: 'info',
      ...options,
    });
  }

  // Settings management
  getSettings(): NotificationSettings {
    return { ...this.settings };
  }

  updateSettings(newSettings: Partial<NotificationSettings>): void {
    console.log('[Notifications] Updating settings:', newSettings);
    this.settings = { ...this.settings, ...newSettings };
    console.log('[Notifications] New settings state:', this.settings);
    this.saveSettings();
  }

  resetSettings(): void {
    console.log('[Notifications] Resetting settings to defaults');
    this.settings = this.getDefaultSettings();
    this.saveSettings();
  }

  // Test notification for settings
  async testNotification(type: NotificationType): Promise<void> {
    console.log('[Notifications] Testing notification type:', type);
    console.log('[Notifications] Current settings:', this.settings);
    console.log('[Notifications] Tauri available:', this.tauriAvailable);
    
    const messages = {
      success: { title: 'Test Success', body: 'This is a test success notification' },
      error: { title: 'Test Error', body: 'This is a test error notification' },
      warning: { title: 'Test Warning', body: 'This is a test warning notification' },
      info: { title: 'Test Info', body: 'This is a test info notification' },
    };

    try {
      // Bypass all filters for test notifications
      await this.sendDirectNotification({
        ...messages[type],
        type,
        tag: 'test-notification',
      });
      console.log('[Notifications] Test notification completed successfully');
    } catch (error) {
      console.error('[Notifications] Test notification failed:', error);
      throw error;
    }
  }

  // Direct notification method that bypasses all filters (for testing)
  private async sendDirectNotification(options: NotificationOptions): Promise<void> {
    try {
      console.log('[Notifications] ========== DIRECT NOTIFICATION START ==========');
      console.log('[Notifications] Type:', options.type);
      console.log('[Notifications] Title:', options.title);
      console.log('[Notifications] Body:', options.body);
      console.log('[Notifications] Tauri available:', this.tauriAvailable);
      console.log('[Notifications] Settings enabled:', this.settings.enabled);
      console.log('[Notifications] Type enabled:', this.settings.types[options.type]);
      
      // Prepare notification data
      const icon = options.icon || (this.settings.display.showIcon ? this.getNotificationIcon(options.type) : undefined);
      const actions = this.settings.display.showActions 
        ? (options.actions || this.getDefaultActions(options.type, options.data))
        : undefined;

      console.log('[Notifications] Icon:', icon);
      console.log('[Notifications] Sound enabled:', this.settings.sound.enabled);

      if (this.tauriAvailable) {
        console.log('[Notifications] Attempting to send via Tauri...');
        
        const notificationPayload = {
          title: options.title,
          body: options.body,
          icon,
          sound: this.settings.sound.enabled && !options.silent ? 'default' : undefined,
          tag: options.tag,
        };
        
        console.log('[Notifications] Notification payload:', notificationPayload);
        
        try {
          await sendNotification(notificationPayload);
          console.log('[Notifications] ✅ Native notification sent successfully!');
        } catch (sendError) {
          console.error('[Notifications] ❌ Tauri sendNotification failed:', sendError);
          throw sendError;
        }
      } else {
        console.error('[Notifications] ❌ Tauri not available - this should not happen in desktop app');
        throw new Error('Tauri notifications not available in desktop environment');
      }
      
      console.log('[Notifications] ========== DIRECT NOTIFICATION END ==========');
    } catch (error) {
      console.error('[Notifications] ❌ Failed to send direct notification:', error);
      console.error('[Notifications] Error details:', JSON.stringify(error, null, 2));
      throw error;
    }
  }

  // Debug method to check service state
  getDebugInfo(): any {
    return {
      tauriAvailable: this.tauriAvailable,
      settings: this.settings,
      queueLength: this.notificationQueue.length,
      isInQuietHours: this.isInQuietHours(),
      hasPermission: this.tauriAvailable ? 'unknown' : 'n/a',
      browserSupport: 'Notification' in window ? Notification.permission : 'not supported',
    };
  }

  // Force re-initialization (useful for debugging)
  async reinitialize(): Promise<void> {
    console.log('[Notifications] Force re-initializing service...');
    await this.initializeService();
  }
}

// Export singleton instance
export const nativeNotifications = new NativeNotificationService();
export default nativeNotifications;