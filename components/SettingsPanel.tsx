import React, { useState, useCallback, memo } from 'react';
import { COLORS, GLASS_STYLES } from '../constants';
import { X, Bot, ChevronRight, Volume2, Bell, Shield, Palette, HelpCircle } from 'lucide-react';

interface SettingsPanelProps {
  onClose: () => void;
}

const SETTINGS_ITEMS = [
  { icon: Volume2, label: 'Sound', color: COLORS.almostAqua },
  { icon: Bell, label: 'Notifications', color: COLORS.raindropsOnRoses },
  { icon: Palette, label: 'Appearance', color: COLORS.lemonIcing },
  { icon: Shield, label: 'Privacy', color: COLORS.iceMelt },
  { icon: HelpCircle, label: 'Help Center', color: COLORS.peachDust },
] as const;

const SettingsPanel: React.FC<SettingsPanelProps> = ({ onClose }) => {
  const [aiEnabled, setAiEnabled] = useState(true);

  const toggleAi = useCallback(() => setAiEnabled(v => !v), []);

  return (
    <div 
      className="absolute inset-0 z-30 flex items-center justify-center bg-black/20 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="w-[90%] max-w-[400px] max-h-[80%] rounded-3xl overflow-hidden shadow-2xl border border-black/5 animate-in zoom-in-95 duration-300"
        style={{ 
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(20px)'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 flex items-center justify-between border-b border-black/5">
          <h2 className="text-lg font-black font-jakarta" style={{ color: '#1e1e1e' }}>
            Settings
          </h2>
          <button 
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-black/5 transition-all text-gray-500 active:scale-90"
            aria-label="Close settings"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 overflow-y-auto max-h-[500px] no-scrollbar">
          {/* AI Section */}
          <SettingsSection title="AI Assistant">
            <SettingsToggle 
              icon={<Bot size={18} />}
              label="AI Assistance"
              description="Enable smart file suggestions"
              enabled={aiEnabled}
              onToggle={toggleAi}
              color={COLORS.orchidTint}
            />
          </SettingsSection>

          {/* General Section */}
          <SettingsSection title="General">
            {SETTINGS_ITEMS.map(item => (
              <SettingsItem 
                key={item.label}
                icon={<item.icon size={18} />} 
                label={item.label} 
                color={item.color} 
              />
            ))}
          </SettingsSection>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-black/5">
          <p 
            className="text-[10px] font-medium font-jakarta text-center opacity-40" 
            style={{ color: '#1e1e1e' }}
          >
            Skhoot v1.0
          </p>
        </div>
      </div>
    </div>
  );
};

const SettingsSection = memo<{ title: string; children: React.ReactNode }>(({ title, children }) => (
  <div className="space-y-3">
    <p 
      className="text-[10px] font-black uppercase tracking-[0.1em] font-jakarta opacity-40" 
      style={{ color: '#1e1e1e' }}
    >
      {title}
    </p>
    {children}
  </div>
));
SettingsSection.displayName = 'SettingsSection';

const SettingsToggle = memo<{
  icon: React.ReactNode;
  label: string;
  description: string;
  enabled: boolean;
  onToggle: () => void;
  color: string;
}>(({ icon, label, description, enabled, onToggle, color }) => (
  <div 
    className="flex items-center justify-between p-4 rounded-2xl border border-black/5 transition-all"
    style={{ 
      backgroundColor: enabled ? `${color}30` : 'rgba(255, 255, 255, 0.5)',
      boxShadow: GLASS_STYLES.subtle.boxShadow,
    }}
  >
    <div className="flex items-center gap-3">
      <IconBox color={color}>{icon}</IconBox>
      <div>
        <p className="text-sm font-bold font-jakarta" style={{ color: '#1e1e1e' }}>{label}</p>
        <p className="text-[10px] font-medium font-jakarta opacity-50" style={{ color: '#1e1e1e' }}>
          {description}
        </p>
      </div>
    </div>
    <Toggle enabled={enabled} onToggle={onToggle} />
  </div>
));
SettingsToggle.displayName = 'SettingsToggle';

const Toggle = memo<{ enabled: boolean; onToggle: () => void }>(({ enabled, onToggle }) => (
  <button 
    onClick={onToggle}
    className={`w-12 h-7 rounded-full transition-all duration-300 relative ${
      enabled ? '' : 'bg-black/10'
    }`}
    style={{ backgroundColor: enabled ? COLORS.fukuBrand : undefined }}
    role="switch"
    aria-checked={enabled}
  >
    <div 
      className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow-md transition-all duration-300 ${
        enabled ? 'left-6' : 'left-1'
      }`}
    />
  </button>
));
Toggle.displayName = 'Toggle';

const SettingsItem = memo<{
  icon: React.ReactNode;
  label: string;
  color: string;
}>(({ icon, label, color }) => (
  <button 
    className="flex items-center justify-between w-full p-4 rounded-2xl border border-black/5 transition-all hover:brightness-[1.02] active:scale-[0.99]"
    style={{ 
      backgroundColor: 'rgba(255, 255, 255, 0.5)',
      boxShadow: GLASS_STYLES.subtle.boxShadow,
    }}
  >
    <div className="flex items-center gap-3">
      <IconBox color={color}>{icon}</IconBox>
      <p className="text-sm font-bold font-jakarta" style={{ color: '#1e1e1e' }}>{label}</p>
    </div>
    <ChevronRight size={18} className="text-gray-400" />
  </button>
));
SettingsItem.displayName = 'SettingsItem';

const IconBox = memo<{ color: string; children: React.ReactNode }>(({ color, children }) => (
  <div 
    className="w-10 h-10 rounded-xl flex items-center justify-center border border-black/5"
    style={{ 
      backgroundColor: `${color}60`,
      boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.4), inset 0 -1px 1px rgba(0,0,0,0.05)'
    }}
  >
    <span style={{ color: COLORS.textPrimary }}>{children}</span>
  </div>
));
IconBox.displayName = 'IconBox';

export default SettingsPanel;
