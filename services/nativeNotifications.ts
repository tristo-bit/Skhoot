
import { 
  isPermissionGranted, 
  requestPermission, 
  sendNotification,
  Options 
} from '@tauri-apps/plugin-notification';

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
  private permissionGranted = false;

  constructor() {
    this.settings = this.loadSettings();
    this.initializeService();
  }

  public getSettings(): NotificationSettings {
    return { ...this.settings };
  }

  public updateSettings(newSettings: Partial<NotificationSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
    this.saveSettings();
  }

  public resetSettings(): void {
    this.settings = this.getDefaultSettings();
    this.saveSettings();
  }

  public async testNotification(type: NotificationType): Promise<void> {
    const titles = {
      success: 'Test Success',
      error: 'Test Error',
      warning: 'Test Warning',
      info: 'Test Info'
    };
    
    await this.notify({
      title: titles[type],
      body: `This is a test ${type} notification from Skhoot settings.`,
      type: type
    });
  }

  public getDebugInfo(): any {
    return {
      settings: this.settings,
      queueLength: this.notificationQueue.length,
      tauriAvailable: this.tauriAvailable,
      permissionGranted: this.permissionGranted
    };
  }

  public async reinitialize(): Promise<void> {
    await this.initializeService();
  }

  private async initializeService() {
    console.log('[Notifications] Initializing notification service...');
    
    // Check if we are in a Tauri environment
    // @ts-ignore
    this.tauriAvailable = !!(window.__TAURI_INTERNALS__ || window.__TAURI__);

    if (this.tauriAvailable) {
      console.log('[Notifications] Tauri environment detected.');
      await this.checkPermissions();
    } else {
      console.warn('[Notifications] Running in web mode - notifications will be simulated or use Browser API.');
      if ('Notification' in window) {
        this.permissionGranted = Notification.permission === 'granted';
      }
    }
  }

  private async checkPermissions(): Promise<boolean> {
    if (!this.tauriAvailable) return false;

    try {
      let granted = await isPermissionGranted();
      
      if (!granted) {
        console.log('[Notifications] Requesting permission...');
        const permission = await requestPermission();
        granted = permission === 'granted';
      }

      this.permissionGranted = granted;
      console.log('[Notifications] Permission status:', granted ? 'GRANTED' : 'DENIED');
      return granted;
    } catch (error) {
      console.error('[Notifications] Failed to check/request permissions:', error);
      return false;
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
        return { ...this.getDefaultSettings(), ...parsed };
      }
    } catch (error) {
      console.error('Failed to load notification settings:', error);
    }
    return this.getDefaultSettings();
  }

  private saveSettings(): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.settings));
    } catch (error) {
      console.error('[Notifications] Failed to save settings:', error);
    }
  }

  private isInQuietHours(): boolean {
    if (!this.settings.frequency.quietHours.enabled) return false;

    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const { start, end } = this.settings.frequency.quietHours;

    if (start > end) {
      return currentTime >= start || currentTime <= end;
    }
    return currentTime >= start && currentTime <= end;
  }

  private checkFrequencyLimit(type: NotificationType): boolean {
    if (!this.settings.frequency.enabled) return true;

    const now = Date.now();
    const oneMinuteAgo = now - 60000;

    this.notificationQueue = this.notificationQueue.filter(n => n.timestamp > oneMinuteAgo);

    return this.notificationQueue.length < this.settings.frequency.maxPerMinute;
  }

  private getNotificationIcon(type: NotificationType): string | undefined {
    // Icons are problematic in some OSs if paths are not correct. 
    // Usually better to let the OS decide or provide a valid asset path if bundled.
    // For now, returning undefined to use app icon or OS default.
    return undefined; 
  }

  async notify(options: NotificationOptions): Promise<void> {
    try {
      if (!this.settings.enabled || !this.settings.types[options.type]) return;
      if (this.isInQuietHours()) return;
      if (!this.checkFrequencyLimit(options.type)) return;

      this.notificationQueue.push({
        timestamp: Date.now(),
        type: options.type,
      });

      // Ensure permission is checked before sending
      if (this.tauriAvailable && !this.permissionGranted) {
         await this.checkPermissions();
      }

      if (this.tauriAvailable && this.permissionGranted) {
        await sendNotification({
          title: options.title,
          body: options.body,
          icon: options.icon,
          sound: this.settings.sound.enabled && !options.silent ? 'default' : undefined,
          id: options.tag ? stringToNumber(options.tag) : undefined, // Plugin expects ID as number sometimes? v2 might be different. 
          // Checking v2 docs: options is { title, body, icon, id, sound, ... }
          // id is optional number.
        });
      } else {
        this.fallbackNotify(options);
      }
    } catch (error) {
      console.error('[Notifications] Failed to send notification:', error);
      this.fallbackNotify(options);
    }
  }

  private fallbackNotify(options: NotificationOptions) {
    console.log(`[Notification - ${options.type.toUpperCase()}] ${options.title}: ${options.body}`);
    
    if ('Notification' in window && Notification.permission === 'granted') {
       new Notification(options.title, {
         body: options.body,
         icon: options.icon,
         tag: options.tag,
         silent: options.silent
       });
    }
  }

  // Convenience methods
  async success(title: string, body: string, options?: Partial<NotificationOptions>): Promise<void> {
    await this.notify({ title, body, type: 'success', ...options });
  }

  async error(title: string, body: string, options?: Partial<NotificationOptions>): Promise<void> {
    await this.notify({ title, body, type: 'error', ...options });
  }

  async warning(title: string, body: string, options?: Partial<NotificationOptions>): Promise<void> {
    await this.notify({ title, body, type: 'warning', ...options });
  }

  async info(title: string, body: string, options?: Partial<NotificationOptions>): Promise<void> {
    await this.notify({ title, body, type: 'info', ...options });
  }
}

// Helper to convert string tag to number if needed by some platforms
function stringToNumber(str: string): number {
  let hash = 0;
  if (str.length === 0) return hash;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

export const nativeNotifications = new NativeNotificationService();
export default nativeNotifications;
