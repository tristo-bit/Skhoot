import React from 'react';
import { ChevronRight } from 'lucide-react';
import { BackButton } from '../buttonFormat';

// Panel header component
interface PanelHeaderProps {
  title: string;
  onBack: () => void;
}

export const PanelHeader: React.FC<PanelHeaderProps> = ({ title, onBack }) => (
  <div className="flex items-center gap-3 mb-6">
    <BackButton onClick={onBack} />
    <h3 className="text-lg font-black font-jakarta text-text-primary">
      {title}
    </h3>
  </div>
);

// Section label component
interface SectionLabelProps {
  label: string;
  description?: string;
}

export const SectionLabel: React.FC<SectionLabelProps> = ({ label, description }) => (
  <div className="space-y-1">
    <label className="text-sm font-bold font-jakarta text-text-primary">{label}</label>
    {description && (
      <p className="text-xs text-text-secondary font-jakarta">{description}</p>
    )}
  </div>
);

// Slider component
interface SliderProps {
  value: number;
  min?: number;
  max?: number;
  onChange: (value: number) => void;
  label?: string;
  showValue?: boolean;
  valueFormat?: (value: number) => string;
}

export const Slider: React.FC<SliderProps> = ({ 
  value, 
  min = 0, 
  max = 100, 
  onChange, 
  label,
  showValue = true,
  valueFormat = (v) => `${v}%`
}) => (
  <div className="flex items-center gap-3">
    <div className="relative flex-1">
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer border border-gray-300 dark:border-gray-600 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#d4e4f1] [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-md [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-[#d4e4f1] [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:shadow-md"
        aria-label={label}
      />
    </div>
    {showValue && (
      <span className="text-xs font-bold font-jakarta text-[#C0B7C9] min-w-[3rem] text-right">
        {valueFormat(value)}
      </span>
    )}
  </div>
);

// Toggle switch component
interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
}

export const ToggleSwitch: React.FC<ToggleSwitchProps> = ({ checked, onChange, label }) => (
  <button
    onClick={() => onChange(!checked)}
    className={`w-12 h-6 rounded-full transition-all duration-300 relative cursor-pointer ${
      checked ? 'bg-[#C0B7C9]' : 'bg-gray-300 dark:bg-gray-600'
    }`}
    role="switch"
    aria-checked={checked}
    aria-label={label}
  >
    <div 
      className={`w-5 h-5 absolute top-0.5 rounded-full bg-white shadow-md transition-all duration-300 ${
        checked ? 'translate-x-6' : 'translate-x-0.5'
      }`}
    />
  </button>
);

// Setting row with toggle
interface SettingRowProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export const SettingRow: React.FC<SettingRowProps> = ({ label, description, checked, onChange }) => (
  <div className="flex items-center justify-between">
    <div>
      <span className="text-sm font-medium text-text-primary">{label}</span>
      {description && (
        <p className="text-xs text-text-secondary font-jakarta">{description}</p>
      )}
    </div>
    <ToggleSwitch checked={checked} onChange={onChange} label={label} />
  </div>
);

// Radio option component
interface RadioOptionProps {
  value: string;
  label: string;
  description: string;
  selected: boolean;
  onSelect: () => void;
}

export const RadioOption: React.FC<RadioOptionProps> = ({ 
  value, 
  label, 
  description, 
  selected, 
  onSelect 
}) => (
  <button
    onClick={onSelect}
    className={`w-full p-4 rounded-xl transition-all flex items-center justify-between ${
      selected
        ? 'bg-[#C0B7C9]/20 border-2 border-[#C0B7C9]'
        : 'glass-subtle hover:brightness-95 border-2 border-transparent'
    }`}
  >
    <div className="text-left">
      <p className="text-sm font-bold font-jakarta text-text-primary">{label}</p>
      <p className="text-xs text-text-secondary font-jakarta">{description}</p>
    </div>
    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
      selected
        ? 'border-[#C0B7C9] bg-[#C0B7C9]'
        : 'border-gray-300 dark:border-gray-600'
    }`}>
      {selected && <div className="w-2 h-2 rounded-full bg-white" />}
    </div>
  </button>
);

// Menu item for settings list
interface MenuItemProps {
  icon: React.ReactNode;
  label: string;
  color: string;
  onClick: () => void;
}

export const MenuItem: React.FC<MenuItemProps> = ({ icon, label, color, onClick }) => (
  <button
    onClick={onClick}
    className="w-full p-4 rounded-xl glass-subtle hover:brightness-95 transition-all flex items-center gap-4"
  >
    <div 
      className="w-10 h-10 rounded-xl flex items-center justify-center"
      style={{ backgroundColor: `var(--color-${color})` }}
    >
      {icon}
    </div>
    <span className="flex-1 text-left text-sm font-bold font-jakarta text-text-primary">
      {label}
    </span>
    <ChevronRight size={18} className="text-text-secondary" />
  </button>
);

// Info box component
interface InfoBoxProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  variant?: 'info' | 'warning' | 'success' | 'error';
}

export const InfoBox: React.FC<InfoBoxProps> = ({ 
  icon, 
  title, 
  description, 
  variant = 'info' 
}) => {
  const variantStyles = {
    info: 'bg-[#d9e2eb] border-[#c1d0db] text-[#3d5a73]',
    warning: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-700 text-amber-800 dark:text-amber-300',
    success: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700 text-green-800 dark:text-green-300',
    error: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400',
  };

  return (
    <div className={`p-4 rounded-xl border ${variantStyles[variant]}`}>
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex-shrink-0">{icon}</div>
        <div>
          <p className="text-sm font-bold font-jakarta mb-1">{title}</p>
          <p className="text-xs font-jakarta opacity-80">{description}</p>
        </div>
      </div>
    </div>
  );
};
