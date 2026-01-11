/**
 * Linux Audio Setup Service
 * Handles Linux-specific audio permission setup using Tauri commands
 */

import { invoke } from '@tauri-apps/api/core';

export interface LinuxAudioStatus {
  isLinux: boolean;
  inAudioGroup: boolean;
  audioServer: 'pulseaudio' | 'pipewire' | 'none' | 'unknown';
  needsSetup: boolean;
}

class LinuxAudioSetupService {
  private static instance: LinuxAudioSetupService;
  private isTauri: boolean = false;
  private isLinux: boolean = false;

  private constructor() {
    this.detectEnvironment();
  }

  static getInstance(): LinuxAudioSetupService {
    if (!LinuxAudioSetupService.instance) {
      LinuxAudioSetupService.instance = new LinuxAudioSetupService();
    }
    return LinuxAudioSetupService.instance;
  }

  private detectEnvironment(): void {
    this.isTauri = typeof window !== 'undefined' && 
      ('__TAURI__' in window || '__TAURI_INTERNALS__' in window);
    
    if (typeof navigator !== 'undefined') {
      this.isLinux = navigator.userAgent.toLowerCase().includes('linux');
    }
  }

  /**
   * Check if we're running on Linux in Tauri
   */
  isLinuxTauri(): boolean {
    return this.isTauri && this.isLinux;
  }

  /**
   * Check the current Linux audio setup status
   */
  async checkStatus(): Promise<LinuxAudioStatus> {
    if (!this.isLinuxTauri()) {
      return {
        isLinux: false,
        inAudioGroup: true,
        audioServer: 'unknown',
        needsSetup: false
      };
    }

    try {
      const [inAudioGroup, audioServer] = await Promise.all([
        this.checkAudioGroupMembership(),
        this.checkAudioServer()
      ]);

      return {
        isLinux: true,
        inAudioGroup,
        audioServer,
        needsSetup: !inAudioGroup || audioServer === 'none'
      };
    } catch (error) {
      console.error('[LinuxAudioSetup] Error checking status:', error);
      return {
        isLinux: true,
        inAudioGroup: false,
        audioServer: 'unknown',
        needsSetup: true
      };
    }
  }

  /**
   * Check if user is in the audio group
   */
  async checkAudioGroupMembership(): Promise<boolean> {
    if (!this.isTauri) return true;

    try {
      return await invoke<boolean>('check_audio_group_membership');
    } catch (error) {
      console.error('[LinuxAudioSetup] Error checking audio group:', error);
      return false;
    }
  }

  /**
   * Check which audio server is running
   */
  async checkAudioServer(): Promise<'pulseaudio' | 'pipewire' | 'none' | 'unknown'> {
    if (!this.isTauri) return 'unknown';

    try {
      const result = await invoke<string>('check_audio_server');
      if (result === 'pulseaudio' || result === 'pipewire') {
        return result;
      }
      return 'unknown';
    } catch (error) {
      console.error('[LinuxAudioSetup] Error checking audio server:', error);
      return 'none';
    }
  }

  /**
   * Add the current user to the audio group using pkexec
   * This will show the native PolicyKit authentication dialog
   */
  async addUserToAudioGroup(): Promise<{ success: boolean; message: string }> {
    if (!this.isTauri) {
      return {
        success: false,
        message: 'This feature is only available in the desktop app.'
      };
    }

    if (!this.isLinux) {
      return {
        success: false,
        message: 'This feature is only available on Linux.'
      };
    }

    try {
      const message = await invoke<string>('add_user_to_audio_group');
      return { success: true, message };
    } catch (error: any) {
      return {
        success: false,
        message: error.toString() || 'Failed to add user to audio group'
      };
    }
  }

  /**
   * Get instructions for manual setup
   */
  getManualInstructions(): string {
    return `To manually fix audio permissions on Linux:

1. Add yourself to the audio group:
   sudo usermod -aG audio $USER

2. Log out and log back in (or reboot)

3. Verify you're in the audio group:
   groups | grep audio

4. Ensure PulseAudio or PipeWire is running:
   • For PulseAudio: pulseaudio --start
   • For PipeWire: systemctl --user start pipewire

5. Test your microphone:
   pactl list sources short`;
  }
}

export const linuxAudioSetup = LinuxAudioSetupService.getInstance();
export default linuxAudioSetup;
