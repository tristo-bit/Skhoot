import React, { useState, useCallback, useEffect } from 'react';
import { Bot, Key, Activity, Zap, BarChart3, Settings2, Clock, Calendar, CalendarDays } from 'lucide-react';
import { BackButton, SaveButton, ConnectionButton, IconButton } from '../buttonFormat';
import { apiKeyService, PROVIDERS, type ProviderInfo } from '../../services/apiKeyService';
import { providerRegistry } from '../../services/providerRegistry';
import { tokenTrackingService, TimePeriod } from '../../services/tokenTrackingService';

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

  const handleTemperatureChange = useCallback((value: number) => {
    setTemperature(value);
    localStorage.setItem('skhoot_ai_temperature', String(value));
  }, []);

  const handleMaxTokensChange = useCallback((value: number) => {
    setMaxTokens(value);
    localStorage.setItem('skhoot_ai_max_tokens', String(value));
  }, []);

  const handleTestConnection = useCallback(async () => {
    if (!apiKey.trim()) {
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
    if (!apiKey.trim()) {
      setConnectionMessage('Please enter an API key');
      setConnectionStatus('error');
      return;
    }

    try {
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

  // Get model capabilities
  const modelCapabilities = selectedModel 
    ? providerRegistry.getModelInfo(selectedProvider, selectedModel)?.capabilities
    : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 pb-2 border-b border-glass-border">
        <BackButton onClick={onBack} />
        <Bot size={20} className="text-purple-500" />
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
              advancedMode ? 'bg-purple-500' : 'bg-gray-300 dark:bg-gray-600'
            }`}
          >
            <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
              advancedMode ? 'translate-x-6' : 'translate-x-0.5'
            }`} />
          </button>
        </div>
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
        <div className="grid grid-cols-2 gap-2">
          {PROVIDERS.map((provider) => (
            <button
              key={provider.id}
              onClick={() => setSelectedProvider(provider.id)}
              className={`p-3 rounded-xl text-sm font-medium font-jakarta transition-all ${
                selectedProvider === provider.id
                  ? 'glass text-text-primary ring-2 ring-purple-500'
                  : 'glass-subtle text-text-secondary hover:glass'
              }`}
            >
              {provider.name}
            </button>
          ))}
        </div>
        
        {/* API Key Input */}
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
            className="w-full p-3 pr-12 rounded-xl glass-subtle text-sm font-medium font-jakarta text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-purple-500"
            placeholder={`Enter ${PROVIDERS.find(p => p.id === selectedProvider)?.name} API key`}
          />
          <IconButton
            onClick={() => setShowApiKey(!showApiKey)}
            icon={<Key size={16} />}
            variant="ghost"
            size="sm"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary"
          />
        </div>
        
        {/* Model Selection */}
        {availableModels.length > 0 && (
          <div className="space-y-2">
            <label className="text-xs font-medium text-text-secondary font-jakarta">
              Model ({availableModels.length} available)
            </label>
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
              className="w-full p-3 rounded-xl glass-subtle text-sm font-medium font-jakarta text-text-primary focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              {availableModels.map((model) => (
                <option key={model} value={model}>{model}</option>
              ))}
            </select>
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
                <span className="px-2 py-1 text-xs rounded-lg bg-purple-500/20 text-purple-600 dark:text-purple-400">📄 OCR</span>
              )}
              {modelCapabilities.streaming && (
                <span className="px-2 py-1 text-xs rounded-lg bg-purple-500/20 text-purple-600 dark:text-purple-400">⚡ Stream</span>
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
          disabled={isTestingConnection || !apiKey.trim()}
          isConnected={connectionStatus === 'success'}
          isTesting={isTestingConnection}
          testText="Test Connection"
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
            <span className="text-sm font-bold font-jakarta text-purple-500">{temperature.toFixed(2)}</span>
          </div>
          <input
            type="range"
            min="0"
            max="2"
            step="0.1"
            value={temperature}
            onChange={(e) => handleTemperatureChange(parseFloat(e.target.value))}
            className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-gray-200 dark:bg-gray-700"
          />
          <p className="text-xs text-text-secondary font-jakarta">
            Lower = more focused, Higher = more creative
          </p>
        </div>

        {/* Max Tokens */}
        <div className="p-3 rounded-xl glass-subtle space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium font-jakarta text-text-primary">Max Output Tokens</p>
            <span className="text-sm font-bold font-jakarta text-purple-500">{maxTokens.toLocaleString()}</span>
          </div>
          <input
            type="range"
            min="256"
            max="16384"
            step="256"
            value={maxTokens}
            onChange={(e) => handleMaxTokensChange(parseInt(e.target.value))}
            className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-gray-200 dark:bg-gray-700"
          />
          <p className="text-xs text-text-secondary font-jakarta">
            Maximum length of AI responses
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
            <div className="p-3 rounded-lg bg-purple-500/10">
              <p className="text-xs text-text-secondary font-jakarta">Output Tokens</p>
              <p className="text-lg font-bold font-jakarta text-purple-500">
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
