import React, { useState, useEffect } from 'react';
import { Bell, Volume2, VolumeX, Clock, Settings as SettingsIcon, TestTube, Layers } from 'lucide-react';
import { BackButton } from '../buttonFormat';
import { nativeNotifications, NotificationSettings, NotificationType } from '../../services/nativeNotifications';

interface NotificationsPanelProps {
  onBack: () => void;
}

interface SectionLabelProps {
  label: string;
  icon?: React.ReactNode;
  iconColor?: string;
}

const SectionLabel: React.FC<SectionLabelProps> = ({ label, icon, iconColor = 'text-[#C0B7C9]' }) => (
  <label className="text-sm font-bold font-jakarta text-text-primary flex items-center gap-2">
    {icon && <span className={iconColor}>{icon}</span>}
    {label}
  </label>
);

interface SettingRowProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

const SettingRow: React.FC<SettingRowProps> = ({ label, description, checked, onChange, disabled }) => (
  <div className="flex items-center justify-between p-3 rounded-xl glass-subtle">
    <div>
      <p className="text-sm font-medium font-jakarta text-text-primary">{label}</p>
      {description && <p className="text-xs text-text-secondary font-jakarta">{description}</p>}
    </div>
    <button
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={`w-12 h-6 rounded-full transition-all ${
        checked ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
        checked ? 'translate-x-6' : 'translate-x-0.5'
      }`} />
    </button>
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
  <div className="p-3 rounded-xl glass-subtle space-y-2">
    <div className="flex items-center justify-between">
      <p className="text-sm font-medium font-jakarta text-text-primary">{label}</p>
      <span className="text-sm font-bold font-jakarta text-[#C0B7C9]">
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
      className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-gray-200 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#d4e4f1] [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-md [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-[#d4e4f1] [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:shadow-md"
    />
    {description && <p className="text-xs text-text-secondary font-jakarta">{description}</p>}
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
  <div className="p-3 rounded-xl glass-subtle space-y-2">
    <div className="flex items-center justify-between">
      <div className="flex-1">
        <p className="text-sm font-medium font-jakarta text-text-primary">{label}</p>
        {description && <p className="text-xs text-text-secondary font-jakarta mt-1">{description}</p>}
      </div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="ml-3 px-3 py-1.5 text-sm font-medium font-jakarta bg-transparent text-text-primary rounded-lg glass-subtle focus:outline-none focus:ring-2 focus:ring-[#C0B7C9]"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
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
  <div className="p-3 rounded-xl glass-subtle space-y-2">
    <div className="flex items-center justify-between">
      <div className="flex-1">
        <p className="text-sm font-medium font-jakarta text-text-primary">{label}</p>
        {description && <p className="text-xs text-text-secondary font-jakarta mt-1">{description}</p>}
      </div>
      <input
        type="time"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="ml-3 px-3 py-1.5 text-sm font-medium font-jakarta bg-transparent text-text-primary rounded-lg glass-subtle focus:outline-none focus:ring-2 focus:ring-[#C0B7C9]"
      />
    </div>
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 pb-2 border-b border-glass-border">
        <BackButton onClick={onBack} />
        <Bell size={20} className="text-[#C0B7C9]" />
        <h3 className="text-lg font-black font-jakarta text-text-primary">Notifications</h3>
      </div>

      {/* General Settings */}
      <div className="space-y-3">
        <SectionLabel 
          label="General Settings" 
          icon={<SettingsIcon size={16} />}
          iconColor="text-[#C0B7C9]"
        />
        
        <SettingRow
          label="Enable Notifications"
          description="Allow Skhoot to send native system notifications"
          checked={settings.enabled}
          onChange={(checked) => updateSettings({ enabled: checked })}
        />
      </div>

      {/* Notification Types */}
      <div className="space-y-3">
        <SectionLabel 
          label="Notification Types"
          icon={<Layers size={16} />}
          iconColor="text-emerald-500"
        />
        
        <div className="space-y-3">
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
      <div className="space-y-3">
        <SectionLabel 
          label="Sound Settings"
          icon={settings.sound.enabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
          iconColor="text-blue-500"
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
          value={settings.sound.volume}
          min={0}
          max={100}
          unit="%"
          onChange={(volume) => updateSettings({ 
            sound: { ...settings.sound, volume }
          })}
          disabled={!settings.enabled || !settings.sound.enabled}
          description="Notification sound volume level"
        />
      </div>

      {/* Display Settings */}
      <div className="space-y-3">
        <SectionLabel 
          label="Display Settings"
          icon={<SettingsIcon size={16} />}
          iconColor="text-cyan-500"
        />
        
        <SliderRow
          label="Display Duration"
          value={settings.display.duration}
          min={0}
          max={30}
          unit="s"
          onChange={(duration) => updateSettings({ 
            display: { ...settings.display, duration }
          })}
          disabled={!settings.enabled}
          description="How long notifications stay visible (0 = persistent)"
        />
        
        <SelectRow
          label="Position"
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
          description="Where notifications appear on screen"
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
      <div className="space-y-3">
        <SectionLabel 
          label="Frequency Control"
          icon={<Clock size={16} />}
          iconColor="text-amber-500"
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
          value={settings.frequency.maxPerMinute}
          min={1}
          max={20}
          onChange={(maxPerMinute) => updateSettings({ 
            frequency: { ...settings.frequency, maxPerMinute }
          })}
          disabled={!settings.enabled || !settings.frequency.enabled}
          description="Maximum number of notifications allowed per minute"
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
          value={settings.frequency.quietHours.start}
          onChange={(start) => updateSettings({ 
            frequency: { 
              ...settings.frequency, 
              quietHours: { ...settings.frequency.quietHours, start }
            }
          })}
          disabled={!settings.enabled || !settings.frequency.quietHours.enabled}
          description="When to start suppressing notifications"
        />
        
        <TimeInputRow
          label="Quiet Hours End"
          value={settings.frequency.quietHours.end}
          onChange={(end) => updateSettings({ 
            frequency: { 
              ...settings.frequency, 
              quietHours: { ...settings.frequency.quietHours, end }
            }
          })}
          disabled={!settings.enabled || !settings.frequency.quietHours.enabled}
          description="When to resume notifications"
        />
      </div>

      {/* Priority Settings */}
      <div className="space-y-3">
        <SectionLabel 
          label="Priority Settings"
          icon={<SettingsIcon size={16} />}
          iconColor="text-[#C0B7C9]"
        />
        
        <SelectRow
          label="Success Priority"
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
          description="Priority level for success notifications"
        />
        
        <SelectRow
          label="Error Priority"
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
          description="Priority level for error notifications"
        />
        
        <SelectRow
          label="Warning Priority"
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
          description="Priority level for warning notifications"
        />
        
        <SelectRow
          label="Info Priority"
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
          description="Priority level for info notifications"
        />
      </div>

      {/* Test Notifications */}
      <div className="space-y-3">
        <SectionLabel 
          label="Test Notifications"
          icon={<TestTube size={16} />}
          iconColor="text-cyan-500"
        />
        
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => handleTestNotification('success')}
            disabled={!settings.enabled || !settings.types.success}
            className="p-3 rounded-xl glass-subtle text-sm font-medium font-jakarta text-emerald-600 hover:bg-emerald-500/10 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            ✅ Test Success
          </button>
          
          <button
            onClick={() => handleTestNotification('error')}
            disabled={!settings.enabled || !settings.types.error}
            className="p-3 rounded-xl glass-subtle text-sm font-medium font-jakarta text-red-600 hover:bg-red-500/10 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            ❌ Test Error
          </button>
          
          <button
            onClick={() => handleTestNotification('warning')}
            disabled={!settings.enabled || !settings.types.warning}
            className="p-3 rounded-xl glass-subtle text-sm font-medium font-jakarta text-amber-600 hover:bg-amber-500/10 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            ⚠️ Test Warning
          </button>
          
          <button
            onClick={() => handleTestNotification('info')}
            disabled={!settings.enabled || !settings.types.info}
            className="p-3 rounded-xl glass-subtle text-sm font-medium font-jakarta text-blue-600 hover:bg-blue-500/10 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            ℹ️ Test Info
          </button>
        </div>
      </div>

      {/* Reset Settings */}
      <div className="space-y-3 pt-4 border-t border-glass-border">
        <div className="p-3 rounded-xl glass-subtle">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium font-jakarta text-text-primary">Reset to Defaults</p>
              <p className="text-xs text-text-secondary font-jakarta mt-1">
                Restore all notification settings to their default values
              </p>
            </div>
            <button
              onClick={handleResetSettings}
              className="px-4 py-2 rounded-lg text-sm font-medium font-jakarta text-red-600 hover:bg-red-500/10 transition-all"
            >
              Reset All
            </button>
          </div>
        </div>
        
        {/* Debug Button */}
        <div className="p-3 rounded-xl glass-subtle">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium font-jakarta text-text-primary">Debug Information</p>
              <p className="text-xs text-text-secondary font-jakarta mt-1">
                View service state and troubleshooting info
              </p>
            </div>
            <button
              onClick={handleDebugInfo}
              className="px-4 py-2 rounded-lg text-sm font-medium font-jakarta text-blue-600 hover:bg-blue-500/10 transition-all"
            >
              Debug Info
            </button>
          </div>
        </div>
        
        {/* Reinitialize Button */}
        <div className="p-3 rounded-xl glass-subtle">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium font-jakarta text-text-primary">Reinitialize Service</p>
              <p className="text-xs text-text-secondary font-jakarta mt-1">
                Force reload the notification service (fixes initialization issues)
              </p>
            </div>
            <button
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
              className="px-4 py-2 rounded-lg text-sm font-medium font-jakarta text-[#C0B7C9] hover:bg-[#C0B7C9]/10 transition-all"
            >
              Reinitialize
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationsPanel;