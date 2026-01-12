import React, { useState, useEffect } from 'react';
import { Bell, Volume2, VolumeX, Clock, Settings as SettingsIcon, TestTube } from 'lucide-react';
import { Button, ToggleSwitch } from '../buttonFormat';
import { nativeNotifications, NotificationSettings, NotificationType } from '../../services/nativeNotifications';
import { PanelHeader } from './shared';

interface NotificationsPanelProps {
  onBack: () => void;
}

interface SectionLabelProps {
  label: string;
  description?: string;
  icon?: React.ReactNode;
}

const SectionLabel: React.FC<SectionLabelProps> = ({ label, description, icon }) => (
  <div className="flex items-center gap-3 mb-4">
    {icon && <div className="text-text-secondary">{icon}</div>}
    <div>
      <h3 className="text-sm font-semibold text-text-primary">{label}</h3>
      {description && <p className="text-xs text-text-secondary mt-0.5">{description}</p>}
    </div>
  </div>
);

interface SettingRowProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

const SettingRow: React.FC<SettingRowProps> = ({ label, description, checked, onChange, disabled }) => (
  <div className="flex items-center justify-between py-3 border-b border-black/5 last:border-b-0">
    <div className="flex-1">
      <div className="text-sm font-medium text-text-primary">{label}</div>
      {description && <div className="text-xs text-text-secondary mt-0.5">{description}</div>}
    </div>
    <ToggleSwitch
      isToggled={checked}
      onToggle={onChange}
      disabled={disabled}
    />
  </div>
);

interface SliderRowProps {
  label: string;
  description?: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (value: number) => void;
  disabled?: boolean;
}

const SliderRow: React.FC<SliderRowProps> = ({ 
  label, 
  description, 
  value, 
  min, 
  max, 
  step = 1, 
  unit = '', 
  onChange, 
  disabled 
}) => (
  <div className="py-3 border-b border-black/5 last:border-b-0">
    <div className="flex items-center justify-between mb-2">
      <div>
        <div className="text-sm font-medium text-text-primary">{label}</div>
        {description && <div className="text-xs text-text-secondary mt-0.5">{description}</div>}
      </div>
      <span className="text-sm font-mono text-text-secondary">
        {value}{unit}
      </span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      disabled={disabled}
      className="w-full h-2 bg-black/10 rounded-lg appearance-none cursor-pointer slider"
    />
  </div>
);
interface SelectRowProps {
  label: string;
  description?: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
  disabled?: boolean;
}

const SelectRow: React.FC<SelectRowProps> = ({ 
  label, 
  description, 
  value, 
  options, 
  onChange, 
  disabled 
}) => (
  <div className="flex items-center justify-between py-3 border-b border-black/5 last:border-b-0">
    <div className="flex-1">
      <div className="text-sm font-medium text-text-primary">{label}</div>
      {description && <div className="text-xs text-text-secondary mt-0.5">{description}</div>}
    </div>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="px-3 py-1.5 text-sm bg-white/50 border border-black/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50"
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  </div>
);

interface TimeInputRowProps {
  label: string;
  description?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

const TimeInputRow: React.FC<TimeInputRowProps> = ({ 
  label, 
  description, 
  value, 
  onChange, 
  disabled 
}) => (
  <div className="flex items-center justify-between py-3 border-b border-black/5 last:border-b-0">
    <div className="flex-1">
      <div className="text-sm font-medium text-text-primary">{label}</div>
      {description && <div className="text-xs text-text-secondary mt-0.5">{description}</div>}
    </div>
    <input
      type="time"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="px-3 py-1.5 text-sm bg-white/50 border border-black/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50"
    />
  </div>
);

export const NotificationsPanel: React.FC<NotificationsPanelProps> = ({ onBack }) => {
  const [settings, setSettings] = useState<NotificationSettings>(nativeNotifications.getSettings());

  useEffect(() => {
    setSettings(nativeNotifications.getSettings());
  }, []);

  const updateSettings = (newSettings: Partial<NotificationSettings>) => {
    console.log('[NotificationsPanel] Updating settings:', newSettings);
    console.log('[NotificationsPanel] Previous settings:', settings);
    
    const updated = { ...settings, ...newSettings };
    console.log('[NotificationsPanel] New settings state:', updated);
    
    setSettings(updated);
    nativeNotifications.updateSettings(newSettings);
    
    // Verify the settings were saved
    setTimeout(() => {
      const savedSettings = nativeNotifications.getSettings();
      console.log('[NotificationsPanel] Verified saved settings:', savedSettings);
    }, 100);
  };

  const handleTestNotification = async (type: NotificationType) => {
    console.log('[NotificationsPanel] ========== TEST BUTTON CLICKED ==========');
    console.log('[NotificationsPanel] Testing notification type:', type);
    console.log('[NotificationsPanel] Current settings state:', settings);
    console.log('[NotificationsPanel] Settings enabled:', settings.enabled);
    console.log('[NotificationsPanel] Type enabled:', settings.types[type]);
    
    try {
      // Show immediate feedback
      console.log('[NotificationsPanel] Calling nativeNotifications.testNotification...');
      await nativeNotifications.testNotification(type);
      console.log('[NotificationsPanel] ✅ Test notification sent successfully');
      
      // Show success feedback to user
      alert(`✅ Test ${type} notification sent! Check your system notifications.`);
    } catch (error) {
      console.error('[NotificationsPanel] ❌ Test notification failed:', error);
      alert(`❌ Test notification failed: ${error}`);
    }
    
    console.log('[NotificationsPanel] ========== TEST BUTTON END ==========');
  };

  const handleResetSettings = () => {
    console.log('[NotificationsPanel] Resetting settings to defaults');
    nativeNotifications.resetSettings();
    setSettings(nativeNotifications.getSettings());
  };

  const handleDebugInfo = () => {
    const debugInfo = (nativeNotifications as any).getDebugInfo();
    console.log('[NotificationsPanel] Debug info:', debugInfo);
    alert('Debug info logged to console. Check browser dev tools.');
  };

  return (
    <div className="space-y-8">
      <PanelHeader title="Notifications" onBack={onBack} />
      {/* General Settings */}
      <div className="space-y-4">
        <SectionLabel 
          label="General Settings" 
          description="Enable or disable native system notifications"
          icon={<Bell size={18} />}
        />
        
        <SettingRow
          label="Enable Notifications"
          description="Allow Skhoot to send native system notifications"
          checked={settings.enabled}
          onChange={(checked) => updateSettings({ enabled: checked })}
        />
      </div>

      {/* Notification Types */}
      <div className="space-y-4">
        <SectionLabel 
          label="Notification Types" 
          description="Choose which types of notifications to receive"
        />
        
        <div className="space-y-1">
          <SettingRow
            label="Success Notifications"
            description="File saved, search completed, operations successful"
            checked={settings.types.success}
            onChange={(checked) => updateSettings({ 
              types: { ...settings.types, success: checked }
            })}
            disabled={!settings.enabled}
          />
          
          <SettingRow
            label="Error Notifications"
            description="API failures, file not found, connection errors"
            checked={settings.types.error}
            onChange={(checked) => updateSettings({ 
              types: { ...settings.types, error: checked }
            })}
            disabled={!settings.enabled}
          />
          
          <SettingRow
            label="Warning Notifications"
            description="Low disk space, cleanup recommended, potential issues"
            checked={settings.types.warning}
            onChange={(checked) => updateSettings({ 
              types: { ...settings.types, warning: checked }
            })}
            disabled={!settings.enabled}
          />
          
          <SettingRow
            label="Info Notifications"
            description="New conversation, analysis complete, general updates"
            checked={settings.types.info}
            onChange={(checked) => updateSettings({ 
              types: { ...settings.types, info: checked }
            })}
            disabled={!settings.enabled}
          />
        </div>
      </div>

      {/* Sound Settings */}
      <div className="space-y-4">
        <SectionLabel 
          label="Sound Settings" 
          description="Configure notification sounds and volume"
          icon={settings.sound.enabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
        />
        
        <SettingRow
          label="Enable Notification Sounds"
          description="Play system sounds with notifications"
          checked={settings.sound.enabled}
          onChange={(checked) => updateSettings({ 
            sound: { ...settings.sound, enabled: checked }
          })}
          disabled={!settings.enabled}
        />
        
        <SliderRow
          label="Volume"
          description="Notification sound volume level"
          value={settings.sound.volume}
          min={0}
          max={100}
          unit="%"
          onChange={(volume) => updateSettings({ 
            sound: { ...settings.sound, volume }
          })}
          disabled={!settings.enabled || !settings.sound.enabled}
        />
      </div>

      {/* Display Settings */}
      <div className="space-y-4">
        <SectionLabel 
          label="Display Settings" 
          description="Customize how notifications appear"
        />
        
        <SliderRow
          label="Display Duration"
          description="How long notifications stay visible (0 = persistent)"
          value={settings.display.duration}
          min={0}
          max={30}
          unit="s"
          onChange={(duration) => updateSettings({ 
            display: { ...settings.display, duration }
          })}
          disabled={!settings.enabled}
        />
        
        <SelectRow
          label="Position"
          description="Where notifications appear on screen"
          value={settings.display.position}
          options={[
            { value: 'top-right', label: 'Top Right' },
            { value: 'top-left', label: 'Top Left' },
            { value: 'bottom-right', label: 'Bottom Right' },
            { value: 'bottom-left', label: 'Bottom Left' },
          ]}
          onChange={(position: any) => updateSettings({ 
            display: { ...settings.display, position }
          })}
          disabled={!settings.enabled}
        />
        
        <SettingRow
          label="Show Action Buttons"
          description="Include action buttons in notifications"
          checked={settings.display.showActions}
          onChange={(showActions) => updateSettings({ 
            display: { ...settings.display, showActions }
          })}
          disabled={!settings.enabled}
        />
        
        <SettingRow
          label="Group Similar Notifications"
          description="Combine notifications of the same type"
          checked={settings.display.groupSimilar}
          onChange={(groupSimilar) => updateSettings({ 
            display: { ...settings.display, groupSimilar }
          })}
          disabled={!settings.enabled}
        />
      </div>

      {/* Frequency & Quiet Hours */}
      <div className="space-y-4">
        <SectionLabel 
          label="Frequency Control" 
          description="Manage notification frequency and quiet hours"
          icon={<Clock size={18} />}
        />
        
        <SettingRow
          label="Enable Frequency Limits"
          description="Prevent notification spam by limiting frequency"
          checked={settings.frequency.enabled}
          onChange={(enabled) => updateSettings({ 
            frequency: { ...settings.frequency, enabled }
          })}
          disabled={!settings.enabled}
        />
        
        <SliderRow
          label="Max Notifications Per Minute"
          description="Maximum number of notifications allowed per minute"
          value={settings.frequency.maxPerMinute}
          min={1}
          max={20}
          onChange={(maxPerMinute) => updateSettings({ 
            frequency: { ...settings.frequency, maxPerMinute }
          })}
          disabled={!settings.enabled || !settings.frequency.enabled}
        />
        
        <SettingRow
          label="Enable Quiet Hours"
          description="Suppress notifications during specified hours"
          checked={settings.frequency.quietHours.enabled}
          onChange={(enabled) => updateSettings({ 
            frequency: { 
              ...settings.frequency, 
              quietHours: { ...settings.frequency.quietHours, enabled }
            }
          })}
          disabled={!settings.enabled}
        />
        
        <TimeInputRow
          label="Quiet Hours Start"
          description="When to start suppressing notifications"
          value={settings.frequency.quietHours.start}
          onChange={(start) => updateSettings({ 
            frequency: { 
              ...settings.frequency, 
              quietHours: { ...settings.frequency.quietHours, start }
            }
          })}
          disabled={!settings.enabled || !settings.frequency.quietHours.enabled}
        />
        
        <TimeInputRow
          label="Quiet Hours End"
          description="When to resume notifications"
          value={settings.frequency.quietHours.end}
          onChange={(end) => updateSettings({ 
            frequency: { 
              ...settings.frequency, 
              quietHours: { ...settings.frequency.quietHours, end }
            }
          })}
          disabled={!settings.enabled || !settings.frequency.quietHours.enabled}
        />
      </div>

      {/* Priority Settings */}
      <div className="space-y-4">
        <SectionLabel 
          label="Priority Settings" 
          description="Set notification priority levels for different types"
        />
        
        <SelectRow
          label="Success Priority"
          description="Priority level for success notifications"
          value={settings.priority.success}
          options={[
            { value: 'low', label: 'Low' },
            { value: 'normal', label: 'Normal' },
            { value: 'high', label: 'High' },
          ]}
          onChange={(priority: any) => updateSettings({ 
            priority: { ...settings.priority, success: priority }
          })}
          disabled={!settings.enabled}
        />
        
        <SelectRow
          label="Error Priority"
          description="Priority level for error notifications"
          value={settings.priority.error}
          options={[
            { value: 'low', label: 'Low' },
            { value: 'normal', label: 'Normal' },
            { value: 'high', label: 'High' },
          ]}
          onChange={(priority: any) => updateSettings({ 
            priority: { ...settings.priority, error: priority }
          })}
          disabled={!settings.enabled}
        />
        
        <SelectRow
          label="Warning Priority"
          description="Priority level for warning notifications"
          value={settings.priority.warning}
          options={[
            { value: 'low', label: 'Low' },
            { value: 'normal', label: 'Normal' },
            { value: 'high', label: 'High' },
          ]}
          onChange={(priority: any) => updateSettings({ 
            priority: { ...settings.priority, warning: priority }
          })}
          disabled={!settings.enabled}
        />
        
        <SelectRow
          label="Info Priority"
          description="Priority level for info notifications"
          value={settings.priority.info}
          options={[
            { value: 'low', label: 'Low' },
            { value: 'normal', label: 'Normal' },
            { value: 'high', label: 'High' },
          ]}
          onChange={(priority: any) => updateSettings({ 
            priority: { ...settings.priority, info: priority }
          })}
          disabled={!settings.enabled}
        />
      </div>

      {/* Test Notifications */}
      <div className="space-y-4">
        <SectionLabel 
          label="Test Notifications" 
          description="Test different notification types"
          icon={<TestTube size={18} />}
        />
        
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="glass"
            size="sm"
            onClick={() => handleTestNotification('success')}
            disabled={!settings.enabled || !settings.types.success}
            className="text-green-600 hover:bg-green-50"
          >
            ✅ Test Success
          </Button>
          
          <Button
            variant="glass"
            size="sm"
            onClick={() => handleTestNotification('error')}
            disabled={!settings.enabled || !settings.types.error}
            className="text-red-600 hover:bg-red-50"
          >
            ❌ Test Error
          </Button>
          
          <Button
            variant="glass"
            size="sm"
            onClick={() => handleTestNotification('warning')}
            disabled={!settings.enabled || !settings.types.warning}
            className="text-amber-600 hover:bg-amber-50"
          >
            ⚠️ Test Warning
          </Button>
          
          <Button
            variant="glass"
            size="sm"
            onClick={() => handleTestNotification('info')}
            disabled={!settings.enabled || !settings.types.info}
            className="text-blue-600 hover:bg-blue-50"
          >
            ℹ️ Test Info
          </Button>
        </div>
      </div>

      {/* Reset Settings */}
      <div className="space-y-4 pt-4 border-t border-black/10">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-text-primary">Reset to Defaults</div>
            <div className="text-xs text-text-secondary mt-0.5">
              Restore all notification settings to their default values
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleResetSettings}
            className="text-red-600 hover:bg-red-50"
          >
            Reset All
          </Button>
        </div>
        
        {/* Debug Button */}
        <div className="flex items-center justify-between pt-2 border-t border-black/5">
          <div>
            <div className="text-sm font-medium text-text-primary">Debug Information</div>
            <div className="text-xs text-text-secondary mt-0.5">
              View service state and troubleshooting info
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDebugInfo}
            className="text-blue-600 hover:bg-blue-50"
          >
            Debug Info
          </Button>
        </div>
        
        {/* Reinitialize Button */}
        <div className="flex items-center justify-between pt-2 border-t border-black/5">
          <div>
            <div className="text-sm font-medium text-text-primary">Reinitialize Service</div>
            <div className="text-xs text-text-secondary mt-0.5">
              Force reload the notification service (fixes initialization issues)
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={async () => {
              console.log('[NotificationsPanel] Reinitializing notification service...');
              try {
                await (nativeNotifications as any).reinitialize();
                alert('Notification service reinitialized successfully!');
              } catch (error) {
                console.error('[NotificationsPanel] Reinitialize failed:', error);
                alert(`Reinitialize failed: ${error}`);
              }
            }}
            className="text-purple-600 hover:bg-purple-50"
          >
            Reinitialize
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotificationsPanel;