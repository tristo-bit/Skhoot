import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Camera, Key, Crown, User as UserIcon } from 'lucide-react';
import { Modal } from '../ui';
import { SaveButton, UploadButton, ConnectionButton, PremiumButton, Button, IconButton, PlanButton, BackButton } from '../buttonFormat';
import { apiKeyService, PROVIDERS, type ProviderInfo } from '../../services/apiKeyService';
import { userProfileService } from '../../services/userProfileService';

interface UserPanelProps {
  onClose: () => void;
}

const UserPanel: React.FC<UserPanelProps> = ({ onClose }) => {
  // Load profile from localStorage on mount
  const [profile] = useState(() => userProfileService.loadProfile());
  
  const [firstName, setFirstName] = useState(profile.firstName);
  const [lastName, setLastName] = useState(profile.lastName);
  const [plan, setPlan] = useState<'guest' | 'subscribed'>('guest');
  const [profileImage, setProfileImage] = useState<string | null>(profile.profileImage);
  
  // API Key state
  const [selectedProvider, setSelectedProvider] = useState<string>('openai');
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('');
  
  // Track changes for save button
  const [originalFirstName] = useState(profile.firstName);
  const [originalLastName] = useState(profile.lastName);
  const [originalProfileImage] = useState<string | null>(profile.profileImage);
  const [hasProfileChanges, setHasProfileChanges] = useState(false);
  const [hasNameChanges, setHasNameChanges] = useState(false);
  const [showUpgradePanel, setShowUpgradePanel] = useState(false);
  const [showBillingPanel, setShowBillingPanel] = useState(false);
  const [userEmail] = useState(profile.email);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [connectionMessage, setConnectionMessage] = useState('');
  const [isApiKeySaved, setIsApiKeySaved] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const apiConfigRef = useRef<HTMLDivElement>(null);

  // Listen for scroll-to-api-config event
  useEffect(() => {
    const handleScrollToApiConfig = () => {
      if (apiConfigRef.current) {
        apiConfigRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    };

    window.addEventListener('scroll-to-api-config', handleScrollToApiConfig);
    return () => window.removeEventListener('scroll-to-api-config', handleScrollToApiConfig);
  }, []);

  // Load API key and saved model for selected provider on mount and provider change
  useEffect(() => {
    const loadProviderData = async () => {
      try {
        const key = await apiKeyService.loadKey(selectedProvider);
        setApiKey(key);
        setIsApiKeySaved(true);
        
        // Try to fetch models
        try {
          const models = await apiKeyService.fetchProviderModels(selectedProvider);
          setAvailableModels(models);
          
          // Load saved model for this provider
          const savedModel = await apiKeyService.loadModel(selectedProvider);
          if (savedModel && models.includes(savedModel)) {
            setSelectedModel(savedModel);
          } else if (models.length > 0) {
            setSelectedModel(models[0]);
          }
        } catch {
          // Models fetch failed, that's ok
          setAvailableModels([]);
        }
      } catch {
        // No key stored for this provider
        setApiKey('');
        setIsApiKeySaved(false);
        setAvailableModels([]);
        setSelectedModel('');
      }
    };

    loadProviderData();
  }, [selectedProvider]);

  // Check if there are unsaved changes
  React.useEffect(() => {
    setHasProfileChanges(profileImage !== originalProfileImage);
  }, [profileImage, originalProfileImage]);

  React.useEffect(() => {
    setHasNameChanges(firstName !== originalFirstName || lastName !== originalLastName);
  }, [firstName, lastName, originalFirstName, originalLastName]);

  const handleImageUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setProfileImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const handleImageDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setProfileImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  }, []);

  const triggerFileInput = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleSaveProfile = useCallback(() => {
    try {
      userProfileService.saveProfileImage(profileImage);
      setHasProfileChanges(false);
      console.log('[UserPanel] Profile image saved successfully');
    } catch (error) {
      console.error('[UserPanel] Failed to save profile image:', error);
      alert('Failed to save profile image. Please try again.');
    }
  }, [profileImage]);

  const handleSaveName = useCallback(() => {
    try {
      userProfileService.saveName(firstName, lastName);
      setHasNameChanges(false);
      console.log('[UserPanel] Name saved successfully:', { firstName, lastName });
    } catch (error) {
      console.error('[UserPanel] Failed to save name:', error);
      alert('Failed to save name. Please try again.');
    }
  }, [firstName, lastName]);

  const handlePlanChange = useCallback((newPlan: 'guest' | 'subscribed') => {
    if (newPlan === 'subscribed' && plan === 'guest') {
      // Show upgrade panel
      setShowUpgradePanel(true);
      return;
    }
    setPlan(newPlan);
  }, [plan]);

  const handleStartBilling = useCallback(() => {
    setShowUpgradePanel(false);
    setShowBillingPanel(true);
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
      // Test the API key using the backend
      const providerInfo: ProviderInfo = await apiKeyService.testKey(selectedProvider, apiKey);
      
      setConnectionStatus('success');
      setConnectionMessage(`✅ API key validated successfully! Provider: ${providerInfo.provider}`);
      
      // Update available models
      setAvailableModels(providerInfo.models);
      if (providerInfo.models.length > 0 && !selectedModel) {
        setSelectedModel(providerInfo.models[0]);
      }
      
      console.log('✅ API Key validated:', providerInfo);
    } catch (error) {
      setConnectionStatus('error');
      setConnectionMessage(error instanceof Error ? error.message : 'Connection failed. Please check your API key.');
      console.error('❌ API Key validation failed:', error);
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
      // Save the API key using the secure backend
      await apiKeyService.saveKey(selectedProvider, apiKey.trim(), true);
      
      // Also save the selected model
      if (selectedModel) {
        await apiKeyService.saveModel(selectedProvider, selectedModel);
        console.log(`✅ Model saved: ${selectedModel} for ${selectedProvider}`);
      }
      
      setIsApiKeySaved(true);
      
      // Show success message temporarily
      setTimeout(() => {
        setIsApiKeySaved(false);
      }, 2000);
      
      console.log(`✅ API key saved for ${selectedProvider}`);
    } catch (error) {
      setConnectionMessage(error instanceof Error ? error.message : 'Failed to save API key');
      setConnectionStatus('error');
      console.error('❌ Failed to save API key:', error);
    }
  }, [apiKey, selectedProvider, selectedModel]);

  return (
    <Modal
      onClose={onClose}
      panelClassName="user-panel"
      headerClassName="user-panel-header"
      bodyClassName="user-panel-body"
      closeAriaLabel="Close user panel"
      headerContent={(
        <>
          <h2 className="text-lg font-black font-jakarta text-text-primary">
            User Profile
          </h2>
          {(hasProfileChanges || hasNameChanges) && (
            <div className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" title="Unsaved changes" />
          )}
        </>
      )}
      footer={(
        <div className="flex justify-between items-center">
          <p className="text-[10px] font-medium font-jakarta opacity-40 text-text-primary">
            Profile v1.0
          </p>
          <div className="flex gap-2">
            {(hasProfileChanges || hasNameChanges) ? (
              <span className="px-4 py-2 text-xs font-medium font-jakarta text-orange-600">
                Unsaved changes
              </span>
            ) : (
              <span className="px-4 py-2 text-xs font-medium font-jakarta text-gray-400">
                All changes saved
              </span>
            )}
          </div>
        </div>
      )}
    >
      <div className="space-y-6">
        {/* Profile Picture Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-sm font-bold font-jakarta text-text-primary">Profile Picture</label>
            {hasProfileChanges && (
              <SaveButton
                onClick={handleSaveProfile}
                saveText="Save Photo"
                size="xs"
              />
            )}
          </div>
          <div className="flex flex-col items-center gap-4">
            {/* Profile Image Display */}
            <div
              className="relative w-24 h-24 rounded-full border-2 border-dashed border-glass-border flex items-center justify-center overflow-hidden cursor-pointer transition-all hover:border-accent glass-subtle"
              onDrop={handleImageDrop}
              onDragOver={handleDragOver}
              onClick={triggerFileInput}
            >
              {profileImage ? (
                <img
                  src={profileImage}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center gap-1">
                  <UserIcon size={24} className="text-text-secondary" />
                  <span className="text-xs text-text-secondary font-jakarta">Drop or click</span>
                </div>
              )}

              {/* Camera overlay */}
              <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center rounded-full">
                <Camera size={20} className="text-white" />
              </div>
            </div>

            {/* Upload Button */}
            <UploadButton
              onClick={triggerFileInput}
              uploadText="Upload Photo"
            />

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
          </div>
          </div>

          {/* Name Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold font-jakarta text-text-primary">Personal Information</label>
              {hasNameChanges && (
                <SaveButton
                  onClick={handleSaveName}
                  saveText="Save Name"
                  size="xs"
                />
              )}
            </div>
            
            {/* First Name */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-text-secondary font-jakarta">First Name</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full p-3 rounded-xl border-glass-border glass-subtle text-sm font-medium font-jakarta text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent"
                placeholder="Enter your first name"
              />
            </div>
            
            {/* Last Name */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-text-secondary font-jakarta">Last Name</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full p-3 rounded-xl border-glass-border glass-subtle text-sm font-medium font-jakarta text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent"
                placeholder="Enter your last name"
              />
            </div>
            
            {/* Email Section */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-text-secondary font-jakarta">Email Address</label>
              <div className="p-3 rounded-xl glass-subtle text-sm font-medium font-jakarta text-text-secondary">
                {userEmail}
              </div>
            </div>
          </div>

          {/* API Configuration Section */}
          <div ref={apiConfigRef} className="space-y-4 pt-4 border-t border-glass-border">
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
                  size="xs"
                />
              )}
            </div>

            <div className="p-4 rounded-xl glass-subtle space-y-4">
              {/* Provider Selection */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-text-secondary font-jakarta block">
                  Select Provider
                </label>
                <select
                  value={selectedProvider}
                  onChange={(e) => setSelectedProvider(e.target.value)}
                  className="w-full p-3 rounded-lg bg-black/20 border border-white/5 text-sm font-medium text-text-primary focus:outline-none focus:border-accent appearance-none cursor-pointer [&>option]:bg-[#1a1a1a] [&>option]:text-white"
                >
                  {PROVIDERS.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              {/* API Key Input */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-text-secondary font-jakarta block">
                  API Key
                </label>
                <div className="relative">
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    value={apiKey}
                    onChange={(e) => {
                      setApiKey(e.target.value);
                      setConnectionStatus('idle');
                      setConnectionMessage('');
                      setIsApiKeySaved(false);
                    }}
                    className="w-full p-3 pr-12 rounded-lg bg-black/20 border border-white/5 text-sm font-medium font-jakarta text-text-primary placeholder:text-text-secondary/50 focus:outline-none"
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

              {/* Model Selection */}
              {availableModels.length > 0 && (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-text-secondary font-jakarta block">
                    Default Model
                  </label>
                  <select
                    value={selectedModel}
                    onChange={async (e) => {
                      const newModel = e.target.value;
                      setSelectedModel(newModel);
                      await apiKeyService.saveModel(selectedProvider, newModel);
                    }}
                    className="w-full p-3 rounded-lg bg-black/20 border border-white/5 text-sm font-medium text-text-primary focus:outline-none appearance-none cursor-pointer [&>option]:bg-[#1a1a1a] [&>option]:text-white"
                  >
                    {availableModels.map((model) => (
                      <option key={model} value={model}>{model}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Connection Feedback */}
              {connectionMessage && (
                <div className={`p-3 rounded-lg text-xs font-medium ${
                  connectionStatus === 'success' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'
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
              />
            </div>
          </div>
        </div>
    </Modal>
  );
};

export default UserPanel;
