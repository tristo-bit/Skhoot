import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Bot, Key, Activity, Zap, BarChart3, Settings2, Clock, Calendar, CalendarDays, Link, Edit3, ChevronDown, Check } from 'lucide-react';
import { BackButton, SaveButton, ConnectionButton, IconButton } from '../buttonFormat';
import { apiKeyService, PROVIDERS, type ProviderInfo } from '../../services/apiKeyService';

const KiroLogo = ({ className }: { className?: string }) => (
  <img src="/assets/kiro-icon.svg" alt="Kiro Logo" className={className} />
);

import { providerRegistry } from '../../services/providerRegistry';
import { tokenTrackingService, TimePeriod } from '../../services/tokenTrackingService';
import { getMaxOutputTokens } from '../../services/modelCapabilities';
import { hyperlinkSettingsService } from '../../services/hyperlinkSettingsService';

interface AISettingsPanelProps {
  onBack: () => void;
}

export const AISettingsPanel: React.FC<AISettingsPanelProps> = ({ onBack }) => {
  // AI Settings state
  const [agentLogsEnabled, setAgentLogsEnabled] = useState(() => {
    const saved = localStorage.getItem('skhoot_agent_logs_enabled');
    return saved !== 'false';
  });
  const [advancedMode, setAdvancedMode] = useState(() => {
    const saved = localStorage.getItem('skhoot_advanced_mode');
    return saved === 'true';
  });
  const [agentModeDefault, setAgentModeDefault] = useState(() => {
    const saved = localStorage.getItem('skhoot_agent_mode_default');
    return saved !== 'false';
  });
  const [userInstructions, setUserInstructions] = useState(() => {
    const saved = localStorage.getItem('skhoot_user_instructions');
    return saved || '';
  });

  // Memory settings
  const [memoryEnabled, setMemoryEnabled] = useState(() => {
    const saved = localStorage.getItem('skhoot_memory_enabled');
    return saved !== 'false';
  });
  const [memoryAutoSave, setMemoryAutoSave] = useState(() => {
    const saved = localStorage.getItem('skhoot_memory_auto_save');
    return saved !== 'false';
  });
  const [memoryImportance, setMemoryImportance] = useState<'low' | 'medium' | 'high'>(() => {
    const saved = localStorage.getItem('skhoot_memory_importance');
    return (saved as 'low' | 'medium' | 'high') || 'medium';
  });

  // Hyperlink Settings state
  const [hyperlinkSettings, setHyperlinkSettings] = useState(() => 
    hyperlinkSettingsService.loadSettings()
  );

  // API Key state
  const [selectedProvider, setSelectedProvider] = useState<string>('openai');
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [connectionMessage, setConnectionMessage] = useState('');
  const [isApiKeySaved, setIsApiKeySaved] = useState(false);

  // API Parameters state
  const [temperature, setTemperature] = useState(() => {
    const saved = localStorage.getItem('skhoot_ai_temperature');
    return saved ? parseFloat(saved) : 0.7;
  });
  const [maxTokens, setMaxTokens] = useState(() => {
    const saved = localStorage.getItem('skhoot_ai_max_tokens');
    return saved ? parseInt(saved) : 4096;
  });

  // Token usage with time period filter
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('month');
  const [tokenUsage, setTokenUsage] = useState<{
    inputTokens: number;
    outputTokens: number;
    totalCost: number;
  }>({
    inputTokens: 0,
    outputTokens: 0,
    totalCost: 0,
  });

  // Compute max tokens limit based on selected model
  const maxTokensLimit = useMemo(() => {
    if (!selectedModel) return 16384; // Default fallback
    return getMaxOutputTokens(selectedModel, selectedProvider);
  }, [selectedModel, selectedProvider]);

  // Update token usage when period changes or new data arrives
  const updateTokenUsage = useCallback(() => {
    const data = tokenTrackingService.getHistoricalUsage(selectedPeriod);
    setTokenUsage({
      inputTokens: data.inputTokens,
      outputTokens: data.outputTokens,
      totalCost: data.cost,
    });
  }, [selectedPeriod]);

  // Subscribe to token tracking updates
  useEffect(() => {
    updateTokenUsage();
    const unsubscribe = tokenTrackingService.subscribe(() => {
      updateTokenUsage();
    });
    return unsubscribe;
  }, [updateTokenUsage]);

  // Load API key and saved model for selected provider
  useEffect(() => {
    const loadProviderData = async () => {
      try {
        const key = await apiKeyService.loadKey(selectedProvider);
        setApiKey(key);
        setIsApiKeySaved(true);
        
        try {
          const models = await apiKeyService.fetchProviderModels(selectedProvider);
          setAvailableModels(models);
          
          const savedModel = await apiKeyService.loadModel(selectedProvider);
          if (savedModel && models.includes(savedModel)) {
            setSelectedModel(savedModel);
          } else if (models.length > 0) {
            setSelectedModel(models[0]);
          }
        } catch {
          setAvailableModels([]);
        }
      } catch {
        setApiKey('');
        setIsApiKeySaved(false);
        setAvailableModels([]);
        setSelectedModel('');
      }
    };

    loadProviderData();
  }, [selectedProvider]);

  // Save settings to localStorage
  const handleToggleAgentLogs = useCallback((enabled: boolean) => {
    setAgentLogsEnabled(enabled);
    localStorage.setItem('skhoot_agent_logs_enabled', String(enabled));
  }, []);

  const handleToggleAdvancedMode = useCallback((enabled: boolean) => {
    setAdvancedMode(enabled);
    localStorage.setItem('skhoot_advanced_mode', String(enabled));
  }, []);

  const handleToggleAgentDefault = useCallback((enabled: boolean) => {
    setAgentModeDefault(enabled);
    localStorage.setItem('skhoot_agent_mode_default', String(enabled));
  }, []);

  const handleToggleHyperlinks = useCallback((enabled: boolean) => {
    const newSettings = { ...hyperlinkSettings, enabled };
    setHyperlinkSettings(newSettings);
    hyperlinkSettingsService.saveSetting('enabled', enabled);
  }, [hyperlinkSettings]);

  const handleToggleLearningHyperlinks = useCallback((enabled: boolean) => {
    const newSettings = { ...hyperlinkSettings, learningHyperlinks: enabled };
    setHyperlinkSettings(newSettings);
    hyperlinkSettingsService.saveSetting('learningHyperlinks', enabled);
  }, [hyperlinkSettings]);

  const handleToggleSourceHyperlinks = useCallback((enabled: boolean) => {
    const newSettings = { ...hyperlinkSettings, sourceHyperlinks: enabled };
    setHyperlinkSettings(newSettings);
    hyperlinkSettingsService.saveSetting('sourceHyperlinks', enabled);
  }, [hyperlinkSettings]);

  const handleUserInstructionsChange = useCallback((value: string) => {
    setUserInstructions(value);
    localStorage.setItem('skhoot_user_instructions', value);
  }, []);

  const handleToggleMemoryEnabled = useCallback((enabled: boolean) => {
    setMemoryEnabled(enabled);
    localStorage.setItem('skhoot_memory_enabled', String(enabled));
  }, []);

  const handleToggleMemoryAutoSave = useCallback((enabled: boolean) => {
    setMemoryAutoSave(enabled);
    localStorage.setItem('skhoot_memory_auto_save', String(enabled));
  }, []);

  const handleMemoryImportanceChange = useCallback((importance: 'low' | 'medium' | 'high') => {
    setMemoryImportance(importance);
    localStorage.setItem('skhoot_memory_importance', importance);
  }, []);

  const handleTemperatureChange = useCallback((value: number) => {
    setTemperature(value);
    localStorage.setItem('skhoot_ai_temperature', String(value));
  }, []);

  const handleMaxTokensChange = useCallback((value: number) => {
    setMaxTokens(value);
    localStorage.setItem('skhoot_ai_max_tokens', String(value));
  }, []);

  const handleTestConnection = useCallback(async () => {
    // If using Kiro, we don't need an API key check
    if (selectedProvider !== 'kiro' && !apiKey.trim()) {
      setConnectionStatus('error');
      setConnectionMessage('Please enter an API key first');
      return;
    }

    setIsTestingConnection(true);
    setConnectionStatus('idle');
    setConnectionMessage('');

    try {
      const providerInfo: ProviderInfo = await apiKeyService.testKey(selectedProvider, apiKey);
      
      setConnectionStatus('success');
      setConnectionMessage(`✅ Connected! Provider: ${providerInfo.provider}`);
      
      setAvailableModels(providerInfo.models);
      if (providerInfo.models.length > 0 && !selectedModel) {
        setSelectedModel(providerInfo.models[0]);
      }
    } catch (error) {
      setConnectionStatus('error');
      setConnectionMessage(error instanceof Error ? error.message : 'Connection failed');
    } finally {
      setIsTestingConnection(false);
    }
  }, [apiKey, selectedProvider, selectedModel]);

  const handleSaveApiKey = useCallback(async () => {
    // For Kiro, we don't need to validate/save an API key strictly, but we might want to trigger a connection test
    if (selectedProvider !== 'kiro' && !apiKey.trim()) {
      setConnectionMessage('Please enter an API key');
      setConnectionStatus('error');
      return;
    }

    try {
      // Save key (empty string for Kiro is fine as it uses bridge)
      await apiKeyService.saveKey(selectedProvider, apiKey.trim(), true);
      
      if (selectedModel) {
        await apiKeyService.saveModel(selectedProvider, selectedModel);
      }
      
      setIsApiKeySaved(true);
      setTimeout(() => setIsApiKeySaved(false), 2000);
    } catch (error) {
      setConnectionMessage(error instanceof Error ? error.message : 'Failed to save');
      setConnectionStatus('error');
    }
  }, [apiKey, selectedProvider, selectedModel]);

  // Handle provider change
  const handleProviderChange = useCallback((providerId: string) => {
    setSelectedProvider(providerId);
    setConnectionStatus('idle');
    setConnectionMessage('');
  }, []);

  // Get model capabilities
  const modelCapabilities = selectedModel 
    ? providerRegistry.getModelInfo(selectedProvider, selectedModel)?.capabilities
    : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 pb-2 border-b border-glass-border">
        <BackButton onClick={onBack} />
        <Bot size={20} className="text-[#C0B7C9]" />
        <h3 className="text-lg font-black font-jakarta text-text-primary">AI Settings</h3>
      </div>

      {/* Agent Settings */}
      <div className="space-y-3">
        <label className="text-sm font-bold font-jakarta text-text-primary flex items-center gap-2">
          <Zap size={16} className="text-emerald-500" />
          Agent Settings
        </label>
        
        {/* Agent Mode ON/OFF */}
        <div className="flex items-center justify-between p-3 rounded-xl glass-subtle">
          <div>
            <p className="text-sm font-medium font-jakarta text-text-primary">Agent Mode</p>
            <p className="text-xs text-text-secondary font-jakarta">Enable AI agent with tool execution</p>
          </div>
          <button
            onClick={() => handleToggleAgentDefault(!agentModeDefault)}
            className={`w-12 h-6 rounded-full transition-all ${
              agentModeDefault ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'
            }`}
          >
            <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
              agentModeDefault ? 'translate-x-6' : 'translate-x-0.5'
            }`} />
          </button>
        </div>

        {/* Agent Logs */}
        <div className="flex items-center justify-between p-3 rounded-xl glass-subtle">
          <div>
            <p className="text-sm font-medium font-jakarta text-text-primary">Agent Logs in Terminal</p>
            <p className="text-xs text-text-secondary font-jakarta">Show agent activity in terminal</p>
          </div>
          <button
            onClick={() => handleToggleAgentLogs(!agentLogsEnabled)}
            className={`w-12 h-6 rounded-full transition-all ${
              agentLogsEnabled ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'
            }`}
          >
            <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
              agentLogsEnabled ? 'translate-x-6' : 'translate-x-0.5'
            }`} />
          </button>
        </div>

        {/* Advanced Mode */}
        <div className="flex items-center justify-between p-3 rounded-xl glass-subtle">
          <div>
            <p className="text-sm font-medium font-jakarta text-text-primary">Advanced Mode</p>
            <p className="text-xs text-text-secondary font-jakarta">Enable experimental features</p>
          </div>
          <button
            onClick={() => handleToggleAdvancedMode(!advancedMode)}
            className={`w-12 h-6 rounded-full transition-all ${
              advancedMode ? 'bg-[#C0B7C9]' : 'bg-gray-300 dark:bg-gray-600'
            }`}
          >
            <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
              advancedMode ? 'translate-x-6' : 'translate-x-0.5'
            }`} />
          </button>
        </div>
      </div>

      {/* User Instructions */}
      <div className="space-y-3">
        <label className="text-sm font-bold font-jakarta text-text-primary flex items-center gap-2">
          <Edit3 size={16} className="text-[#C0B7C9]" />
          User Instructions
        </label>

        <div className="p-4 rounded-xl glass-subtle space-y-3">
          <div>
            <p className="text-xs text-text-secondary font-jakarta mb-2">
              Provide custom instructions to modify AI behavior. These instructions will be added to the system prompt for all conversations.
            </p>
            <textarea
              value={userInstructions}
              onChange={(e) => handleUserInstructionsChange(e.target.value)}
              placeholder="Example: You are a helpful coding assistant. Always provide clear explanations for your code. When suggesting solutions, prioritize security and best practices..."
              className="w-full bg-transparent text-sm text-text-primary font-jakarta outline-none resize-none min-h-[150px] placeholder:text-text-secondary/50 border-b border-glass-border focus:border-[#C0B7C9] transition-all"
              rows={5}
            />
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-text-secondary font-jakarta">
              {userInstructions.length} characters
            </span>
            {userInstructions.length > 0 && (
              <button
                onClick={() => handleUserInstructionsChange('')}
                className="text-red-400 hover:text-red-300 transition-colors font-medium"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Memory Settings */}
      <div className="space-y-3">
        <label className="text-sm font-bold font-jakarta text-text-primary flex items-center gap-2">
          <Activity size={16} className="text-[#C0B7C9]" />
          Memory Settings
        </label>

        {/* Memory Enable Toggle */}
        <div className="flex items-center justify-between p-3 rounded-xl glass-subtle">
          <div>
            <p className="text-sm font-medium font-jakarta text-text-primary">Enable Memory</p>
            <p className="text-xs text-text-secondary font-jakarta">Allow AI to remember important context across conversations</p>
          </div>
          <button
            onClick={() => handleToggleMemoryEnabled(!memoryEnabled)}
            className={`w-12 h-6 rounded-full transition-all ${
              memoryEnabled ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'
            }`}
          >
            <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
              memoryEnabled ? 'translate-x-6' : 'translate-x-0.5'
            }`} />
          </button>
        </div>

        {/* Conditional Memory Sub-settings */}
        {memoryEnabled && (
          <>
            {/* Auto-Save Toggle */}
            <div className="flex items-center justify-between p-3 rounded-xl glass-subtle">
              <div>
                <p className="text-sm font-medium font-jakarta text-text-primary">Auto-Save Memories</p>
                <p className="text-xs text-text-secondary font-jakarta">Automatically save important information as memories</p>
              </div>
              <button
                onClick={() => handleToggleMemoryAutoSave(!memoryAutoSave)}
                className={`w-12 h-6 rounded-full transition-all ${
                  memoryAutoSave ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'
                }`}
              >
                <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
                  memoryAutoSave ? 'translate-x-6' : 'translate-x-0.5'
                }`} />
              </button>
            </div>

            {/* Importance Selector */}
            <div className="p-4 rounded-xl glass-subtle space-y-3">
              <p className="text-sm font-medium font-jakarta text-text-primary">Memory Importance Threshold</p>
              <div className="flex items-center gap-2">
                {(['low', 'medium', 'high'] as const).map(level => (
                  <button
                    key={level}
                    onClick={() => handleMemoryImportanceChange(level)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium font-jakarta capitalize transition-colors ${
                      memoryImportance === level
                        ? 'bg-[#C0B7C9] text-white'
                        : 'bg-white/10 text-text-secondary hover:bg-white/20'
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
              <p className="text-xs text-text-secondary font-jakarta">
                Determines which conversations are saved as long-term memories
              </p>
            </div>
          </>
        )}
      </div>

      {/* Hyperlink Settings */}
      <div className="space-y-3">
        <label className="text-sm font-bold font-jakarta text-text-primary flex items-center gap-2">
          <Link size={16} className="text-blue-500" />
          Hyperlinks
        </label>
        
        {/* Master Toggle */}
        <div className="flex items-center justify-between p-3 rounded-xl glass-subtle">
          <div>
            <p className="text-sm font-medium font-jakarta text-text-primary">Enable Hyperlinks</p>
            <p className="text-xs text-text-secondary font-jakarta">Allow AI to add hyperlinks to responses</p>
          </div>
          <button
            onClick={() => handleToggleHyperlinks(!hyperlinkSettings.enabled)}
            className={`w-12 h-6 rounded-full transition-all ${
              hyperlinkSettings.enabled ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
            }`}
          >
            <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
              hyperlinkSettings.enabled ? 'translate-x-6' : 'translate-x-0.5'
            }`} />
          </button>
        </div>

        {/* Conditional Sub-toggles */}
        {hyperlinkSettings.enabled && (
          <>
            {/* Learning Hyperlinks */}
            <div className="flex items-center justify-between p-3 rounded-xl glass-subtle ml-4">
              <div>
                <p className="text-sm font-medium font-jakarta text-text-primary">Learning Hyperlinks</p>
                <p className="text-xs text-text-secondary font-jakarta">Link complex terms and concepts for learning</p>
              </div>
              <button
                onClick={() => handleToggleLearningHyperlinks(!hyperlinkSettings.learningHyperlinks)}
                className={`w-12 h-6 rounded-full transition-all ${
                  hyperlinkSettings.learningHyperlinks ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
                }`}
              >
                <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
                  hyperlinkSettings.learningHyperlinks ? 'translate-x-6' : 'translate-x-0.5'
                }`} />
              </button>
            </div>

            {/* Source Hyperlinks */}
            <div className="flex items-center justify-between p-3 rounded-xl glass-subtle ml-4">
              <div>
                <p className="text-sm font-medium font-jakarta text-text-primary">Source Hyperlinks</p>
                <p className="text-xs text-text-secondary font-jakarta">Link to sources and references</p>
              </div>
              <button
                onClick={() => handleToggleSourceHyperlinks(!hyperlinkSettings.sourceHyperlinks)}
                className={`w-12 h-6 rounded-full transition-all ${
                  hyperlinkSettings.sourceHyperlinks ? 'bg-[#C0B7C9]' : 'bg-gray-300 dark:bg-gray-600'
                }`}
              >
                <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
                  hyperlinkSettings.sourceHyperlinks ? 'translate-x-6' : 'translate-x-0.5'
                }`} />
              </button>
            </div>
          </>
        )}
      </div>

        {/* API Configuration */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-bold font-jakarta text-text-primary flex items-center gap-2">
              <Key size={16} className="text-amber-500" />
              API Configuration
            </label>
            {connectionStatus === 'success' && (
              <SaveButton
                onClick={handleSaveApiKey}
                disabled={isApiKeySaved}
                isSaved={isApiKeySaved}
                saveText="Save"
                savedText="Saved!"
                variant="violet"
                size="xs"
              />
            )}
          </div>
          
          {/* Provider Selection */}
          <div className="p-4 rounded-xl glass-subtle ring-1 ring-white/5 space-y-4">
            {/* Dropdown */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-text-secondary font-jakarta block">
                Select Provider
              </label>
              <div className="relative group">
                <select
                  value={selectedProvider}
                  onChange={(e) => handleProviderChange(e.target.value)}
                  className="w-full p-3 pr-10 rounded-lg bg-black/20 border border-white/5 hover:border-white/10 text-sm font-medium text-text-primary focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 appearance-none transition-all cursor-pointer [&>option]:bg-[#1a1a1a] [&>option]:text-white"
                >
                  <option value="" disabled className="bg-[#1a1a1a] text-gray-400">Select a provider...</option>
                  {PROVIDERS.map(p => (
                    <option key={p.id} value={p.id} className="bg-[#1a1a1a] text-white">{p.name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none group-hover:text-text-primary transition-colors" size={16} />
              </div>
            </div>

            {/* API Key Input */}
            <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
              <label className="text-xs font-bold text-text-secondary font-jakarta block">
                API Key
              </label>
              <div className="relative">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => {
                    setApiKey(e.target.value);
                    if (connectionStatus !== 'idle') {
                      setConnectionStatus('idle');
                      setConnectionMessage('');
                    }
                    if (isApiKeySaved) setIsApiKeySaved(false);
                  }}
                  className="w-full p-3 pr-12 rounded-lg bg-black/20 border border-white/5 hover:border-white/10 text-sm font-medium font-jakarta text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition-all"
                  placeholder={`Enter ${PROVIDERS.find(p => p.id === selectedProvider)?.name} API key`}
                />
                <IconButton
                  onClick={() => setShowApiKey(!showApiKey)}
                  icon={<Key size={16} />}
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary"
                />
              </div>
            </div>
          </div>
          
          {/* Model Selection */}
          {availableModels.length > 0 && (
            <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
              <label className="text-xs font-medium text-text-secondary font-jakarta">
                Model ({availableModels.length} available)
              </label>
              <div className="relative group">
                <select
                  value={selectedModel}
                  onChange={async (e) => {
                    const newModel = e.target.value;
                    setSelectedModel(newModel);
                    try {
                      await apiKeyService.saveModel(selectedProvider, newModel);
                    } catch (error) {
                      console.error('Failed to save model:', error);
                    }
                  }}
                  className="w-full p-3 pr-10 rounded-xl glass-subtle text-sm font-medium font-jakarta text-text-primary focus:outline-none focus:ring-2 focus:ring-[#C0B7C9] appearance-none cursor-pointer [&>option]:bg-[#1a1a1a] [&>option]:text-white"
                >
                  {availableModels.map((model) => (
                    <option key={model} value={model} className="bg-[#1a1a1a] text-white">{model}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none group-hover:text-text-primary transition-colors" size={16} />
              </div>
            </div>
          )}

        {/* Model Capabilities */}
        {modelCapabilities && (
          <div className="p-3 rounded-xl glass-subtle space-y-2">
            <p className="text-xs font-bold text-text-secondary font-jakarta">Model Capabilities</p>
            <div className="flex flex-wrap gap-2">
              {modelCapabilities.toolCalling && (
                <span className="px-2 py-1 text-xs rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">🔧 Tools</span>
              )}
              {modelCapabilities.vision && (
                <span className="px-2 py-1 text-xs rounded-lg bg-blue-500/20 text-blue-600 dark:text-blue-400">👁️ Vision</span>
              )}
              {modelCapabilities.ocr && (
                <span className="px-2 py-1 text-xs rounded-lg bg-[#C0B7C9]/20 text-[#C0B7C9]">📄 OCR</span>
              )}
              {modelCapabilities.streaming && (
                <span className="px-2 py-1 text-xs rounded-lg bg-[#C0B7C9]/20 text-[#C0B7C9]">⚡ Stream</span>
              )}
              <span className="px-2 py-1 text-xs rounded-lg bg-gray-500/20 text-text-secondary">
                📝 {modelCapabilities.contextWindow >= 1000000 
                  ? `${(modelCapabilities.contextWindow / 1000000).toFixed(1)}M` 
                  : `${Math.round(modelCapabilities.contextWindow / 1000)}K`} ctx
              </span>
            </div>
          </div>
        )}
        
        {/* Connection Status */}
        {connectionMessage && (
          <div className={`p-3 rounded-xl text-sm font-medium font-jakarta ${
            connectionStatus === 'success' 
              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' 
              : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
          }`}>
            {connectionMessage}
          </div>
        )}
        
        <ConnectionButton
          onClick={handleTestConnection}
          disabled={isTestingConnection || (selectedProvider !== 'kiro' && !apiKey.trim())}
          isConnected={connectionStatus === 'success'}
          isTesting={isTestingConnection}
          testText={selectedProvider === 'kiro' ? "Check CLI Connection" : "Test Connection"}
          connectedText="Connected"
          variant="violet"
        />
      </div>


      {/* API Parameters */}
      <div className="space-y-3">
        <label className="text-sm font-bold font-jakarta text-text-primary flex items-center gap-2">
          <Settings2 size={16} className="text-blue-500" />
          API Parameters
        </label>
        
        {/* Temperature */}
        <div className="p-3 rounded-xl glass-subtle space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium font-jakarta text-text-primary">Temperature</p>
            <span className="text-sm font-bold font-jakarta text-[#C0B7C9]">{temperature.toFixed(2)}</span>
          </div>
          <input
            type="range"
            min="0"
            max="2"
            step="0.1"
            value={temperature}
            onChange={(e) => handleTemperatureChange(parseFloat(e.target.value))}
            className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-gray-200 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#d4e4f1] [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-md [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-[#d4e4f1] [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:shadow-md"
          />
          <p className="text-xs text-text-secondary font-jakarta">
            Lower = more focused, Higher = more creative
          </p>
        </div>

        {/* Max Tokens */}
        <div className="p-3 rounded-xl glass-subtle space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium font-jakarta text-text-primary">Max Output Tokens</p>
            <span className="text-sm font-bold font-jakarta text-[#C0B7C9]">{maxTokens.toLocaleString()}</span>
          </div>
          <input
            type="range"
            min="256"
            max={maxTokensLimit}
            step="256"
            value={Math.min(maxTokens, maxTokensLimit)}
            onChange={(e) => handleMaxTokensChange(parseInt(e.target.value))}
            className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-gray-200 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#d4e4f1] [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-md [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-[#d4e4f1] [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:shadow-md"
          />
          <p className="text-xs text-text-secondary font-jakarta">
            Model: {selectedModel || 'None'} • Max: {maxTokensLimit.toLocaleString()} tokens
          </p>
        </div>
      </div>

      {/* Token Usage */}
      <div className="space-y-3">
        <label className="text-sm font-bold font-jakarta text-text-primary flex items-center gap-2">
          <BarChart3 size={16} className="text-cyan-500" />
          Token Usage
        </label>
        
        {/* Period Filter */}
        <div className="flex gap-1 p-1 rounded-xl glass-subtle">
          {[
            { id: 'hour' as TimePeriod, label: 'Hour', icon: Clock },
            { id: 'day' as TimePeriod, label: 'Day', icon: Calendar },
            { id: 'week' as TimePeriod, label: 'Week', icon: CalendarDays },
            { id: 'month' as TimePeriod, label: 'Month', icon: CalendarDays },
            { id: 'all' as TimePeriod, label: 'All', icon: BarChart3 },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setSelectedPeriod(id)}
              className={`flex-1 flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-xs font-medium font-jakarta transition-all ${
                selectedPeriod === id
                  ? 'bg-cyan-500/20 text-cyan-500'
                  : 'text-text-secondary hover:text-text-primary hover:bg-white/5'
              }`}
            >
              <Icon size={12} />
              {label}
            </button>
          ))}
        </div>
        
        <div className="p-4 rounded-xl glass-subtle space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-text-secondary font-jakarta">
              {selectedPeriod === 'hour' && 'Last Hour'}
              {selectedPeriod === 'day' && 'Last 24 Hours'}
              {selectedPeriod === 'week' && 'Last 7 Days'}
              {selectedPeriod === 'month' && 'Last 30 Days'}
              {selectedPeriod === 'all' && 'All Time'}
            </span>
            <span className="text-sm font-bold font-jakarta text-emerald-500">
              {tokenUsage.totalCost < 0.01 
                ? `$${tokenUsage.totalCost.toFixed(4)}` 
                : `$${tokenUsage.totalCost.toFixed(2)}`}
            </span>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-blue-500/10">
              <p className="text-xs text-text-secondary font-jakarta">Input Tokens</p>
              <p className="text-lg font-bold font-jakarta text-blue-500">
                {formatTokenDisplay(tokenUsage.inputTokens)}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-[#C0B7C9]/10">
              <p className="text-xs text-text-secondary font-jakarta">Output Tokens</p>
              <p className="text-lg font-bold font-jakarta text-[#C0B7C9]">
                {formatTokenDisplay(tokenUsage.outputTokens)}
              </p>
            </div>
          </div>
          
          <p className="text-xs text-text-secondary font-jakarta text-center">
            Token tracking is approximate. Check your provider dashboard for exact usage.
          </p>
        </div>
      </div>
    </div>
  );
};

// Format tokens with K/M suffix
function formatTokenDisplay(tokens: number): string {
  if (tokens >= 1_000_000) {
    return `${(tokens / 1_000_000).toFixed(1)}M`;
  }
  if (tokens >= 1_000) {
    return `${(tokens / 1_000).toFixed(1)}K`;
  }
  return tokens.toLocaleString();
}

export default AISettingsPanel;
