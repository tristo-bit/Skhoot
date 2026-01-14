/**
 * AISettingsModal - AI configuration modal
 * Includes: Agent mode toggle, AI logs, advanced mode, API parameters, usage stats
 */
import React, { useState, useEffect, useCallback } from 'react';
import { 
  Bot, Terminal, Zap, Settings, Key, BarChart3,
  ChevronRight, Check, AlertCircle, Eye, EyeOff,
  RefreshCw, Sliders, Clock, Cpu
} from 'lucide-react';
import { Modal } from '../ui';
import { TabButton } from '../buttonFormat';
import { apiKeyService } from '../../services/apiKeyService';

type Tab = 'general' | 'parameters' | 'usage';

interface AISettingsModalProps {
  onClose: () => void;
}

interface ProviderConfig {
  id: string;
  name: string;
  hasKey: boolean;
  model: string;
  isActive: boolean;
}

const STORAGE_KEYS = {
  agentModeDefault: 'skhoot_agent_mode_default',
  aiLogsEnabled: 'skhoot_ai_logs_enabled',
  advancedMode: 'skhoot_advanced_mode',
  temperature: 'skhoot_ai_temperature',
  maxTokens: 'skhoot_ai_max_tokens',
  topP: 'skhoot_ai_top_p',
  frequencyPenalty: 'skhoot_ai_frequency_penalty',
  presencePenalty: 'skhoot_ai_presence_penalty',
};

export const AISettingsModal: React.FC<AISettingsModalProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<Tab>('general');
  const [providers, setProviders] = useState<ProviderConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // General settings
  const [agentModeDefault, setAgentModeDefault] = useState(() => 
    localStorage.getItem(STORAGE_KEYS.agentModeDefault) !== 'false'
  );
  const [aiLogsEnabled, setAiLogsEnabled] = useState(() => 
    localStorage.getItem(STORAGE_KEYS.aiLogsEnabled) === 'true'
  );
  const [advancedMode, setAdvancedMode] = useState(() => 
    localStorage.getItem(STORAGE_KEYS.advancedMode) === 'true'
  );

  // AI Parameters
  const [temperature, setTemperature] = useState(() => 
    parseFloat(localStorage.getItem(STORAGE_KEYS.temperature) || '0.7')
  );
  const [maxTokens, setMaxTokens] = useState(() => 
    parseInt(localStorage.getItem(STORAGE_KEYS.maxTokens) || '4096')
  );
  const [topP, setTopP] = useState(() => 
    parseFloat(localStorage.getItem(STORAGE_KEYS.topP) || '1.0')
  );
  const [frequencyPenalty, setFrequencyPenalty] = useState(() => 
    parseFloat(localStorage.getItem(STORAGE_KEYS.frequencyPenalty) || '0')
  );
  const [presencePenalty, setPresencePenalty] = useState(() => 
    parseFloat(localStorage.getItem(STORAGE_KEYS.presencePenalty) || '0')
  );

  // Usage stats (mock data for now)
  const [usageStats] = useState({
    currentMonth: {
      tokens: 125000,
      requests: 342,
      cost: 2.45,
    },
    lastMonth: {
      tokens: 98000,
      requests: 287,
      cost: 1.89,
    },
  });

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'general', label: 'General', icon: <Settings size={14} /> },
    { id: 'parameters', label: 'Parameters', icon: <Sliders size={14} /> },
    { id: 'usage', label: 'Usage', icon: <BarChart3 size={14} /> },
  ];

  // Load provider configs
  useEffect(() => {
    const loadProviders = async () => {
      setIsLoading(true);
      try {
        const providerIds = ['openai', 'google', 'anthropic', 'custom'];
        const activeProvider = await apiKeyService.getActiveProvider();
        
        const configs: ProviderConfig[] = await Promise.all(
          providerIds.map(async (id) => {
            const hasKey = await apiKeyService.hasKey(id);
            const model = await apiKeyService.loadModel(id) || getDefaultModel(id);
            return {
              id,
              name: getProviderName(id),
              hasKey,
              model,
              isActive: id === activeProvider,
            };
          })
        );
        
        setProviders(configs);
      } catch (error) {
        console.error('Failed to load providers:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadProviders();
  }, []);

  // Save settings handlers
  const handleAgentModeChange = useCallback((enabled: boolean) => {
    setAgentModeDefault(enabled);
    localStorage.setItem(STORAGE_KEYS.agentModeDefault, enabled.toString());
  }, []);

  const handleAiLogsChange = useCallback((enabled: boolean) => {
    setAiLogsEnabled(enabled);
    localStorage.setItem(STORAGE_KEYS.aiLogsEnabled, enabled.toString());
  }, []);

  const handleAdvancedModeChange = useCallback((enabled: boolean) => {
    setAdvancedMode(enabled);
    localStorage.setItem(STORAGE_KEYS.advancedMode, enabled.toString());
  }, []);

  const handleParameterChange = useCallback((key: string, value: number) => {
    localStorage.setItem(key, value.toString());
    switch (key) {
      case STORAGE_KEYS.temperature: setTemperature(value); break;
      case STORAGE_KEYS.maxTokens: setMaxTokens(value); break;
      case STORAGE_KEYS.topP: setTopP(value); break;
      case STORAGE_KEYS.frequencyPenalty: setFrequencyPenalty(value); break;
      case STORAGE_KEYS.presencePenalty: setPresencePenalty(value); break;
    }
  }, []);

  const handleSetActiveProvider = useCallback(async (providerId: string) => {
    try {
      await apiKeyService.setActiveProvider(providerId);
      setProviders(prev => prev.map(p => ({ ...p, isActive: p.id === providerId })));
    } catch (error) {
      console.error('Failed to set active provider:', error);
    }
  }, []);

  return (
    <Modal
      title="AI Settings"
      onClose={onClose}
      panelClassName="ai-settings-modal"
      headerClassName="ai-settings-header"
      bodyClassName="ai-settings-body"
    >
      <div className="px-4 py-2 flex gap-1 flex-shrink-0 border-b border-glass-border">
        {tabs.map(tab => (
          <TabButton
            key={tab.id}
            label={tab.label}
            icon={tab.icon}
            isActive={activeTab === tab.id}
            onTabClick={() => setActiveTab(tab.id)}
          />
        ))}
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar p-4">
        {activeTab === 'general' && (
          <GeneralTab
            agentModeDefault={agentModeDefault}
            aiLogsEnabled={aiLogsEnabled}
            advancedMode={advancedMode}
            providers={providers}
            isLoading={isLoading}
            onAgentModeChange={handleAgentModeChange}
            onAiLogsChange={handleAiLogsChange}
            onAdvancedModeChange={handleAdvancedModeChange}
            onSetActiveProvider={handleSetActiveProvider}
          />
        )}
        {activeTab === 'parameters' && (
          <ParametersTab
            temperature={temperature}
            maxTokens={maxTokens}
            topP={topP}
            frequencyPenalty={frequencyPenalty}
            presencePenalty={presencePenalty}
            onParameterChange={handleParameterChange}
          />
        )}
        {activeTab === 'usage' && (
          <UsageTab stats={usageStats} />
        )}
      </div>
    </Modal>
  );
};

// Helper functions
const getProviderName = (id: string): string => {
  const names: Record<string, string> = {
    openai: 'OpenAI',
    google: 'Google Gemini',
    anthropic: 'Anthropic Claude',
    custom: 'Custom Provider',
  };
  return names[id] || id;
};

const getDefaultModel = (id: string): string => {
  const models: Record<string, string> = {
    openai: 'gpt-4o-mini',
    google: 'gemini-2.0-flash',
    anthropic: 'claude-3-5-sonnet',
    custom: 'custom-model',
  };
  return models[id] || 'default';
};

// General Tab
const GeneralTab: React.FC<{
  agentModeDefault: boolean;
  aiLogsEnabled: boolean;
  advancedMode: boolean;
  providers: ProviderConfig[];
  isLoading: boolean;
  onAgentModeChange: (enabled: boolean) => void;
  onAiLogsChange: (enabled: boolean) => void;
  onAdvancedModeChange: (enabled: boolean) => void;
  onSetActiveProvider: (id: string) => void;
}> = ({
  agentModeDefault, aiLogsEnabled, advancedMode, providers, isLoading,
  onAgentModeChange, onAiLogsChange, onAdvancedModeChange, onSetActiveProvider
}) => (
  <div className="space-y-6">
    {/* Mode Settings */}
    <div className="space-y-3">
      <p className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">Mode Settings</p>
      
      <ToggleSetting
        icon={<Bot size={16} />}
        title="Agent Mode Default"
        description="Enable agent mode by default for new conversations"
        enabled={agentModeDefault}
        onChange={onAgentModeChange}
      />
      
      <ToggleSetting
        icon={<Terminal size={16} />}
        title="AI Logs in Terminal"
        description="Show AI request/response logs in terminal"
        enabled={aiLogsEnabled}
        onChange={onAiLogsChange}
      />
      
      <ToggleSetting
        icon={<Zap size={16} />}
        title="Advanced Mode"
        description="Enable advanced features (coming soon)"
        enabled={advancedMode}
        onChange={onAdvancedModeChange}
        badge="Beta"
      />
    </div>

    {/* Provider Selection */}
    <div className="space-y-3">
      <p className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">AI Provider</p>
      
      {isLoading ? (
        <div className="flex items-center justify-center py-4">
          <RefreshCw size={20} className="animate-spin text-text-secondary" />
        </div>
      ) : (
        <div className="space-y-2">
          {providers.map(provider => (
            <div
              key={provider.id}
              onClick={() => provider.hasKey && onSetActiveProvider(provider.id)}
              className={`p-3 rounded-xl border transition-all ${
                provider.isActive 
                  ? 'border-purple-500/50 bg-purple-500/10' 
                  : provider.hasKey 
                    ? 'border-glass-border hover:bg-white/5 cursor-pointer' 
                    : 'border-glass-border opacity-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    provider.isActive ? 'bg-purple-500/20' : 'bg-white/5'
                  }`}>
                    <Cpu size={16} className={provider.isActive ? 'text-purple-400' : 'text-text-secondary'} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-text-primary">{provider.name}</p>
                    <p className="text-xs text-text-secondary">{provider.model}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {provider.hasKey ? (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-medium">
                      Configured
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-medium">
                      No API Key
                    </span>
                  )}
                  {provider.isActive && <Check size={16} className="text-purple-400" />}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      <button
        onClick={() => window.dispatchEvent(new CustomEvent('open-api-config'))}
        className="w-full p-3 rounded-xl border border-dashed border-glass-border text-sm font-medium text-text-secondary hover:bg-white/5 transition-all flex items-center justify-center gap-2"
      >
        <Key size={14} />
        Configure API Keys
      </button>
    </div>
  </div>
);

// Toggle Setting Component
const ToggleSetting: React.FC<{
  icon: React.ReactNode;
  title: string;
  description: string;
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  badge?: string;
}> = ({ icon, title, description, enabled, onChange, badge }) => (
  <div className="flex items-center gap-3 p-3 rounded-xl glass-subtle">
    <div className="w-10 h-10 rounded-xl flex items-center justify-center glass-subtle text-text-secondary">
      {icon}
    </div>
    <div className="flex-1">
      <div className="flex items-center gap-2">
        <p className="text-sm font-medium text-text-primary">{title}</p>
        {badge && (
          <span className="px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-400 text-[9px] font-bold">
            {badge}
          </span>
        )}
      </div>
      <p className="text-xs text-text-secondary">{description}</p>
    </div>
    <button
      onClick={() => onChange(!enabled)}
      className={`w-11 h-6 rounded-full transition-all relative ${
        enabled ? 'bg-purple-500' : 'bg-white/20'
      }`}
    >
      <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${
        enabled ? 'left-6' : 'left-1'
      }`} />
    </button>
  </div>
);

// Parameters Tab
const ParametersTab: React.FC<{
  temperature: number;
  maxTokens: number;
  topP: number;
  frequencyPenalty: number;
  presencePenalty: number;
  onParameterChange: (key: string, value: number) => void;
}> = ({ temperature, maxTokens, topP, frequencyPenalty, presencePenalty, onParameterChange }) => (
  <div className="space-y-4">
    <p className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">Model Parameters</p>
    
    <SliderSetting
      label="Temperature"
      description="Controls randomness (0 = deterministic, 2 = creative)"
      value={temperature}
      min={0}
      max={2}
      step={0.1}
      onChange={(v) => onParameterChange(STORAGE_KEYS.temperature, v)}
    />
    
    <SliderSetting
      label="Max Tokens"
      description="Maximum response length"
      value={maxTokens}
      min={256}
      max={8192}
      step={256}
      onChange={(v) => onParameterChange(STORAGE_KEYS.maxTokens, v)}
    />
    
    <SliderSetting
      label="Top P"
      description="Nucleus sampling threshold"
      value={topP}
      min={0}
      max={1}
      step={0.05}
      onChange={(v) => onParameterChange(STORAGE_KEYS.topP, v)}
    />
    
    <SliderSetting
      label="Frequency Penalty"
      description="Reduces repetition of tokens"
      value={frequencyPenalty}
      min={0}
      max={2}
      step={0.1}
      onChange={(v) => onParameterChange(STORAGE_KEYS.frequencyPenalty, v)}
    />
    
    <SliderSetting
      label="Presence Penalty"
      description="Encourages new topics"
      value={presencePenalty}
      min={0}
      max={2}
      step={0.1}
      onChange={(v) => onParameterChange(STORAGE_KEYS.presencePenalty, v)}
    />
  </div>
);

// Slider Setting Component
const SliderSetting: React.FC<{
  label: string;
  description: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}> = ({ label, description, value, min, max, step, onChange }) => (
  <div className="p-3 rounded-xl glass-subtle">
    <div className="flex items-center justify-between mb-2">
      <div>
        <p className="text-sm font-medium text-text-primary">{label}</p>
        <p className="text-xs text-text-secondary">{description}</p>
      </div>
      <span className="text-sm font-bold text-purple-400 min-w-[60px] text-right">
        {value.toFixed(step < 1 ? 1 : 0)}
      </span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="w-full h-2 rounded-full appearance-none cursor-pointer"
      style={{
        background: `linear-gradient(to right, #8b5cf6 0%, #8b5cf6 ${((value - min) / (max - min)) * 100}%, rgba(255,255,255,0.1) ${((value - min) / (max - min)) * 100}%, rgba(255,255,255,0.1) 100%)`,
      }}
    />
  </div>
);

// Usage Tab
const UsageTab: React.FC<{ stats: any }> = ({ stats }) => (
  <div className="space-y-4">
    <div className="flex items-center justify-between">
      <p className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">This Month</p>
      <span className="text-xs text-text-secondary">
        <Clock size={12} className="inline mr-1" />
        January 2026
      </span>
    </div>
    
    <div className="grid grid-cols-3 gap-3">
      <StatCard label="Tokens" value={stats.currentMonth.tokens.toLocaleString()} icon={<BarChart3 size={16} />} />
      <StatCard label="Requests" value={stats.currentMonth.requests.toString()} icon={<Zap size={16} />} />
      <StatCard label="Est. Cost" value={`$${stats.currentMonth.cost.toFixed(2)}`} icon={<Key size={16} />} />
    </div>
    
    <div className="p-4 rounded-xl glass-subtle">
      <p className="text-xs font-bold text-text-secondary mb-3">Comparison to Last Month</p>
      <div className="space-y-2">
        <ComparisonRow label="Tokens" current={stats.currentMonth.tokens} previous={stats.lastMonth.tokens} />
        <ComparisonRow label="Requests" current={stats.currentMonth.requests} previous={stats.lastMonth.requests} />
        <ComparisonRow label="Cost" current={stats.currentMonth.cost} previous={stats.lastMonth.cost} isCurrency />
      </div>
    </div>
  </div>
);

const StatCard: React.FC<{ label: string; value: string; icon: React.ReactNode }> = ({ label, value, icon }) => (
  <div className="p-3 rounded-xl glass-subtle text-center">
    <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center mx-auto mb-2 text-purple-400">
      {icon}
    </div>
    <p className="text-lg font-bold text-text-primary">{value}</p>
    <p className="text-[10px] text-text-secondary">{label}</p>
  </div>
);

const ComparisonRow: React.FC<{ label: string; current: number; previous: number; isCurrency?: boolean }> = ({ 
  label, current, previous, isCurrency 
}) => {
  const change = ((current - previous) / previous) * 100;
  const isPositive = change > 0;
  
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-text-secondary">{label}</span>
      <span className={`text-xs font-medium ${isPositive ? 'text-amber-400' : 'text-emerald-400'}`}>
        {isPositive ? '+' : ''}{change.toFixed(1)}%
      </span>
    </div>
  );
};

export default AISettingsModal;
