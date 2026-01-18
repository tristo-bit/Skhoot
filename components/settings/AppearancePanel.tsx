import React from 'react';
import { RotateCcw } from 'lucide-react';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useSettings, DEFAULT_ILLUMINATION } from '../../src/contexts/SettingsContext';
import { PanelHeader, SectionLabel, Slider, SettingRow, RadioOption } from './shared';
import { Button } from '../buttonFormat';

interface AppearancePanelProps {
  onBack: () => void;
}

export const AppearancePanel: React.FC<AppearancePanelProps> = ({ onBack }) => {
  const { theme, setTheme, showBranding, setShowBranding, resolvedTheme } = useTheme();
  const { illumination, setIllumination, resetIllumination, uiOpacity, setUiOpacity, searchDisplay, setSearchDisplay, tokenDisplay, setTokenDisplay } = useSettings();

  const themeOptions = [
    { value: 'light', label: 'Light', description: 'Always use light theme' },
    { value: 'dark', label: 'Dark', description: 'Always use dark theme' },
    { value: 'system', label: 'System', description: 'Follow system preference' },
  ];

  const searchLayoutOptions = [
    { value: 'list', label: 'List', description: 'Display results in a vertical list' },
    { value: 'grid', label: 'Grid', description: 'Display results in a compact grid' },
  ];

  const handleResetIllumination = () => {
    resetIllumination(resolvedTheme);
  };

  const isIlluminationDefault = () => {
    const defaults = DEFAULT_ILLUMINATION[resolvedTheme];
    return (
      illumination.enabled === defaults.enabled &&
      illumination.intensity === defaults.intensity &&
      illumination.diffusion === defaults.diffusion
    );
  };

  return (
    <div className="space-y-6">
      <PanelHeader title="Appearance" onBack={onBack} />

      {/* Theme Selection */}
      <div className="space-y-3">
        <SectionLabel 
          label="Theme" 
          description="Choose your preferred theme or let the system decide" 
        />
        <div className="space-y-2">
          {themeOptions.map((option) => (
            <RadioOption
              key={option.value}
              value={option.value}
              label={option.label}
              description={option.description}
              selected={theme === option.value}
              onSelect={() => setTheme(option.value as 'light' | 'dark' | 'system')}
            />
          ))}
        </div>
      </div>

      {/* Opacity */}
      <div className="space-y-3">
        <SectionLabel 
          label="UI Opacity" 
          description="Adjust the glass opacity of the interface" 
        />
        <Slider
          value={Math.round(uiOpacity * 100)}
          min={50}
          max={100}
          onChange={(v) => setUiOpacity(v / 100)}
          label="UI Opacity"
        />
      </div>

      {/* Illumination Settings */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <SectionLabel 
            label="Quick Action Illumination" 
            description="Light effect when a quick action button is active" 
          />
          {!isIlluminationDefault() && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetIllumination}
              className="text-xs text-text-secondary hover:text-text-primary"
            >
              <RotateCcw size={12} className="mr-1" />
              Reset
            </Button>
          )}
        </div>

        {/* Enable/Disable */}
        <SettingRow
          label="Enable Illumination"
          description="Show glow effect on prompt area"
          checked={illumination.enabled}
          onChange={(enabled) => setIllumination({ enabled })}
        />

        {/* Intensity */}
        {illumination.enabled && (
          <>
            <div className="space-y-2">
              <label className="text-xs font-medium text-text-secondary">
                Intensity
              </label>
              <Slider
                value={illumination.intensity}
                min={10}
                max={80}
                onChange={(intensity) => setIllumination({ intensity })}
                label="Illumination Intensity"
              />
            </div>

            {/* Diffusion */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-text-secondary">
                Diffusion (spread)
              </label>
              <Slider
                value={illumination.diffusion}
                min={20}
                max={100}
                onChange={(diffusion) => setIllumination({ diffusion })}
                label="Illumination Diffusion"
              />
            </div>
          </>
        )}

        {/* Preview hint */}
        {illumination.enabled && (
          <p className="text-xs text-text-secondary font-jakarta italic">
            Activate a quick action button (Files, Agents, etc.) to preview the effect
          </p>
        )}
      </div>

      {/* Branding */}
      <div className="space-y-3">
        <SectionLabel 
          label="Branding" 
          description="Show or hide the app logo in the interface" 
        />
        <SettingRow
          label="Show Logo & Title"
          checked={showBranding}
          onChange={setShowBranding}
        />
      </div>

      {/* Search Results Display */}
      <div className="space-y-3">
        <SectionLabel 
          label="Search Results Display" 
          description="Choose how file search results are displayed" 
        />
        <div className="space-y-2">
          {searchLayoutOptions.map((option) => (
            <RadioOption
              key={option.value}
              value={option.value}
              label={option.label}
              description={option.description}
              selected={searchDisplay.layout === option.value}
              onSelect={() => setSearchDisplay({ layout: option.value as 'list' | 'grid' })}
            />
          ))}
        </div>
        
        {searchDisplay.layout === 'grid' && (
          <div className="mt-3 pl-4 border-l-2 border-glass-border">
            <SettingRow
              label="Grid only for expanded results"
              description="Use list for initial results, grid when showing more"
              checked={searchDisplay.gridOnlyForMore}
              onChange={(checked) => setSearchDisplay({ gridOnlyForMore: checked })}
            />
          </div>
        )}
      </div>

      {/* Token Display Settings */}
      <div className="space-y-3">
        <SectionLabel 
          label="Token Display" 
          description="Customize how token usage is shown in conversations" 
        />
        <SettingRow
          label="Show Token Counter"
          description="Display token usage in conversations"
          checked={tokenDisplay.enabled}
          onChange={(checked) => setTokenDisplay({ enabled: checked })}
        />
        {tokenDisplay.enabled && (
          <div className="pl-4 border-l-2 border-glass-border">
            <SettingRow
              label="Show Model Name"
              description="Display the AI model name alongside token count"
              checked={tokenDisplay.showModelName}
              onChange={(checked) => setTokenDisplay({ showModelName: checked })}
            />
          </div>
        )}
      </div>

      {/* 3D Background - Currently disabled (feature incomplete) */}
      <div className="space-y-4 opacity-50 pointer-events-none">
        <div className="flex items-center justify-between">
          <SectionLabel 
            label="3D Background" 
            description="Display a rotating 3D model in the background (Coming soon)" 
          />
        </div>

        {/* Enable/Disable - Disabled */}
        <SettingRow
          label="Enable 3D Background"
          description="This feature is currently under development"
          checked={false}
          onChange={() => {}}
        />
        
        <p className="text-xs text-text-secondary italic">
          3D background customization is not yet available. Check back in a future update.
        </p>
      </div>
    </div>
  );
};

export default AppearancePanel;
