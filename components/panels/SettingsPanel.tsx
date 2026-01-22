import React, { useState, memo } from 'react';
import { ChevronRight, Volume2, Shield, Palette, HelpCircle, Bell, Bot } from 'lucide-react';
import { useTheme } from '../../src/contexts/ThemeContext';
import { Modal } from '../ui';
import { AISettingsPanel, AppearancePanel, HelpCenterPanel, PrivacyPanel, SoundPanel, NotificationsPanel } from '../settings';

interface SettingsPanelProps {
  onClose: () => void;
}

const SETTINGS_ITEMS = [
  { icon: Bot, label: 'AI Settings', color: 'orchid-tint' },
  { icon: Volume2, label: 'Sound', color: 'almost-aqua' },
  { icon: Bell, label: 'Notifications', color: 'peach-dust' },
  { icon: Palette, label: 'Appearance', color: 'lemon-icing' },
  { icon: Shield, label: 'Privacy', color: 'ice-melt' },
  { icon: HelpCircle, label: 'Help Center', color: 'raindrops-on-roses' },
] as const;

const SettingsPanel: React.FC<SettingsPanelProps> = ({ onClose }) => {
  const { resolvedTheme } = useTheme();
  const [activePanel, setActivePanel] = useState<string | null>(null);

  const handleSettingClick = (label: string) => {
    setActivePanel(label);
  };

  const handleBack = () => {
    setActivePanel(null);
  };

  return (
    <Modal
      key={resolvedTheme}
      title="Settings"
      onClose={onClose}
      panelClassName="settings-panel"
      headerClassName="settings-panel-header"
      bodyClassName="settings-panel-body"
      closeAriaLabel="Close settings"
    >
      {activePanel === 'AI Settings' ? (
        <AISettingsPanel onBack={handleBack} />
      ) : activePanel === 'Sound' ? (
        <SoundPanel onBack={handleBack} />
      ) : activePanel === 'Notifications' ? (
        <NotificationsPanel onBack={handleBack} />
      ) : activePanel === 'Privacy' ? (
        <PrivacyPanel onBack={handleBack} />
      ) : activePanel === 'Appearance' ? (
        <AppearancePanel onBack={handleBack} />
      ) : activePanel === 'Help Center' ? (
        <HelpCenterPanel onBack={handleBack} />
      ) : (
        <div className="space-y-3">
          {SETTINGS_ITEMS.map(item => (
            <SettingsItem 
              key={item.label}
              icon={<item.icon size={18} />} 
              label={item.label} 
              color={item.color}
              onClick={() => handleSettingClick(item.label)}
            />
          ))}
        </div>
      )}
    </Modal>
  );
};

const SettingsItem = memo<{
  icon: React.ReactNode;
  label: string;
  color: string;
  onClick?: () => void;
}>(({ icon, label, color, onClick }) => (
  <button 
    onClick={onClick}
    className="settings-item flex items-center justify-between w-full p-4 rounded-2xl transition-all hover:brightness-[1.02] active:scale-[0.99] glass-subtle"
  >
    <div className="flex items-center gap-3">
      <IconBox color={color}>{icon}</IconBox>
      <p className="text-sm font-bold font-jakarta text-text-primary">{label}</p>
    </div>
    <ChevronRight size={18} className="text-text-secondary" />
  </button>
));
SettingsItem.displayName = 'SettingsItem';

const IconBox = memo<{ color: string; children: React.ReactNode }>(({ color, children }) => (
  <div 
    className={`settings-icon w-10 h-10 rounded-xl flex items-center justify-center bg-${color}/60`}
    style={{ 
      boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.4), inset 0 -1px 1px rgba(0,0,0,0.05)'
    }}
  >
    <span className="text-text-primary">{children}</span>
  </div>
));
IconBox.displayName = 'IconBox';

export default SettingsPanel;
