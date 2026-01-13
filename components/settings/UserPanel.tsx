import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Camera, Key, Crown, User as UserIcon } from 'lucide-react';
import { Modal } from '../ui';
import { SaveButton, UploadButton, ConnectionButton, PremiumButton, Button, IconButton, PlanButton, BackButton } from '../buttonFormat';
import { apiKeyService, PROVIDERS, type ProviderInfo } from '../../services/apiKeyService';

interface UserPanelProps {
  onClose: () => void;
}

const UserPanel: React.FC<UserPanelProps> = ({ onClose }) => {
  const [firstName, setFirstName] = useState('John');
  const [lastName, setLastName] = useState('Doe');
  const [plan, setPlan] = useState<'guest' | 'subscribed'>('guest');
  const [profileImage, setProfileImage] = useState<string | null>(null);
  
  // API Key state
  const [selectedProvider, setSelectedProvider] = useState<string>('openai');
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('');
  
  // Track changes for save button
  const [originalFirstName] = useState('John');
  const [originalLastName] = useState('Doe');
  const [originalProfileImage] = useState<string | null>(null);
  const [hasProfileChanges, setHasProfileChanges] = useState(false);
  const [hasNameChanges, setHasNameChanges] = useState(false);
  const [showUpgradePanel, setShowUpgradePanel] = useState(false);
  const [showBillingPanel, setShowBillingPanel] = useState(false);
  const [userEmail] = useState('john.doe@example.com');
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [connectionMessage, setConnectionMessage] = useState('');
  const [isApiKeySaved, setIsApiKeySaved] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    console.log('Saving profile image:', profileImage);
    setHasProfileChanges(false);
  }, [profileImage]);

  const handleSaveName = useCallback(() => {
    console.log('Saving name:', { firstName, lastName });
    setHasNameChanges(false);
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

          {/* Plan Section */}
          <div className="space-y-3">
            <label className="text-sm font-bold font-jakarta text-text-primary">Subscription Plan</label>
            <div className="grid grid-cols-2 gap-3">
              {/* Guest Plan */}
              <PlanButton
                onClick={() => handlePlanChange('guest')}
                isActive={plan === 'guest'}
                icon={<UserIcon size={20} />}
                title="Guest"
                description="Free access"
              />
              
              {/* Subscribed Plan */}
              <PlanButton
                onClick={() => handlePlanChange('subscribed')}
                disabled={plan === 'guest'}
                isActive={plan === 'subscribed'}
                icon={<Crown size={20} />}
                title="Subscribed"
                description="Premium features"
                className="relative"
              >
                {/* Lock overlay for guest users */}
                {plan === 'guest' && (
                  <div 
                    className="absolute inset-0 flex items-center justify-center glass-subtle rounded-xl cursor-pointer hover:glass transition-all"
                    onClick={() => setShowUpgradePanel(true)}
                  >
                    <div className="text-center">
                      <img src="/skhoot-purple.svg" alt="Skhoot" className="w-6 h-6 mx-auto mb-1 opacity-60 dark:opacity-40 dark:brightness-90" />
                      <span className="text-xs font-bold font-jakarta" style={{ color: '#9a8ba3' }}>Upgrade</span>
                    </div>
                  </div>
                )}
              </PlanButton>
            </div>
            
            {/* Upgrade message for guest users */}
            {plan === 'guest' && (
              <div 
                className="p-3 rounded-xl glass-subtle cursor-pointer hover:glass transition-all"
                onClick={() => setShowUpgradePanel(true)}
              >
                <p className="text-xs font-jakarta text-center">
                  <span className="font-bold" style={{ color: '#9a8ba3' }}>Unlock premium features!</span> 
                  <span className="text-text-secondary"> Upgrade to access advanced AI capabilities and priority support.</span>
                </p>
              </div>
            )}
          </div>

          {/* API Key Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold font-jakarta text-text-primary">API Configuration</label>
              {connectionStatus === 'success' && (
                <SaveButton
                  onClick={handleSaveApiKey}
                  disabled={isApiKeySaved}
                  isSaved={isApiKeySaved}
                  saveText="Save API Key"
                  savedText="Saved!"
                  variant="violet"
                  size="sm"
                />
              )}
            </div>
            <p className="text-xs text-text-secondary font-jakarta">
              Connect your API key to unlock advanced features and personalized responses.
            </p>
            
            {/* Provider Selection */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-text-secondary font-jakarta">AI Provider</label>
              <div className="grid grid-cols-2 gap-2">
                {PROVIDERS.map((provider) => (
                  <button
                    key={provider.id}
                    onClick={() => setSelectedProvider(provider.id)}
                    className={`p-3 rounded-xl text-sm font-medium font-jakarta transition-all ${
                      selectedProvider === provider.id
                        ? 'glass text-text-primary ring-2 ring-accent'
                        : 'glass-subtle text-text-secondary hover:glass'
                    }`}
                  >
                    {provider.name}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="relative">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => {
                    setApiKey(e.target.value);
                    // Reset connection status when API key changes
                    if (connectionStatus !== 'idle') {
                      setConnectionStatus('idle');
                      setConnectionMessage('');
                    }
                    // Reset saved status when API key changes
                    if (isApiKeySaved) {
                      setIsApiKeySaved(false);
                    }
                  }}
                  className={`w-full p-3 pr-12 rounded-xl text-sm font-medium font-jakarta text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 ${
                    connectionStatus === 'success' 
                      ? 'glass-subtle focus:ring-accent' 
                      : connectionStatus === 'error'
                      ? 'glass-subtle focus:ring-red-500'
                      : 'glass-subtle focus:ring-accent'
                  }`}
                  placeholder={`Enter your ${PROVIDERS.find(p => p.id === selectedProvider)?.name} API key`}
                />
                <IconButton
                  onClick={() => setShowApiKey(!showApiKey)}
                  icon={<Key size={16} />}
                  variant="ghost"
                  size="sm"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary"
                />
              </div>
              
              {/* Available Models */}
              {availableModels.length > 0 && (
                <div className="space-y-2">
                  <label className="text-xs font-medium text-text-secondary font-jakarta">
                    Available Models ({availableModels.length})
                  </label>
                  <select
                    value={selectedModel}
                    onChange={async (e) => {
                      const newModel = e.target.value;
                      setSelectedModel(newModel);
                      // Auto-save model when changed
                      try {
                        await apiKeyService.saveModel(selectedProvider, newModel);
                        console.log(`✅ Model auto-saved: ${newModel} for ${selectedProvider}`);
                      } catch (error) {
                        console.error('❌ Failed to auto-save model:', error);
                      }
                    }}
                    className="w-full p-3 rounded-xl glass-subtle text-sm font-medium font-jakarta text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                  >
                    {availableModels.map((model) => (
                      <option key={model} value={model}>
                        {model}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              
              {/* Connection Status Message */}
              {connectionMessage && (
                <div className={`p-3 rounded-xl text-sm font-medium font-jakarta ${
                  connectionStatus === 'success' 
                    ? 'bg-green-100 border border-green-200 text-green-700' 
                    : 'bg-red-100 border border-red-200 text-red-700'
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
                connectedText="Connected Successfully"
                variant="violet"
              />
            </div>
          </div>
        </div>

        {/* Upgrade Panel */}
        {showUpgradePanel && (
          <div className="absolute inset-0 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div 
              className="w-full max-w-[350px] max-h-[90vh] rounded-2xl overflow-hidden shadow-2xl glass-elevated"
            >
              {/* Upgrade Header */}
              <div className="px-6 py-4 text-center">
                <IconButton 
                  onClick={handleStartBilling}
                  icon={<img src="/skhoot-purple.svg" alt="Skhoot" className="w-10 h-10 dark:brightness-90" style={{ filter: `hue-rotate(20deg) saturate(1.2)` }} />}
                  variant="ghost"
                  className="hover:scale-105 transition-transform cursor-pointer mx-auto mb-2"
                />
                <h3 className="text-lg font-black font-jakarta mb-1 text-text-primary">
                  Upgrade to Premium
                </h3>
                <p className="text-sm text-text-secondary font-jakarta">
                  Unlock advanced AI features and priority support
                </p>
              </div>

              {/* Features */}
              <div className="px-6 py-3 space-y-2">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: '#9a8ba3' }} />
                  <span className="text-sm font-jakarta text-text-primary">Advanced AI responses</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: '#9a8ba3' }} />
                  <span className="text-sm font-jakarta text-text-primary">Priority customer support</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: '#9a8ba3' }} />
                  <span className="text-sm font-jakarta text-text-primary">Unlimited file searches</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: '#9a8ba3' }} />
                  <span className="text-sm font-jakarta text-text-primary">Custom API integrations</span>
                </div>
              </div>

              {/* Pricing */}
              <div className="px-6 py-3 glass-subtle">
                <div className="text-center">
                  <div className="flex items-baseline justify-center gap-1 mb-1">
                    <span className="text-2xl font-black font-jakarta text-text-primary" style={{ color: '#9a8ba3' }}>$9.99</span>
                    <span className="text-sm text-text-secondary font-jakarta">/month</span>
                  </div>
                  <p className="text-xs text-text-secondary font-jakarta">Cancel anytime • 7-day free trial</p>
                </div>
              </div>

              {/* Actions */}
              <div className="px-6 py-4 space-y-3">
                <PremiumButton
                  onClick={handleStartBilling}
                  premiumText="Start Free Trial"
                />
                <Button
                  onClick={() => setShowUpgradePanel(false)}
                  variant="ghost"
                  className="w-full py-2"
                >
                  Maybe later
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Billing Panel */}
        {showBillingPanel && (
          <Modal
            onClose={() => {
              setShowBillingPanel(false);
              setShowUpgradePanel(false);
            }}
            panelClassName="w-full max-w-[450px] max-h-[92vh] rounded-2xl overflow-hidden"
            headerClassName="px-6 py-4 border-b border-glass-border"
            bodyClassName="px-6 py-4 space-y-6"
            closeAriaLabel="Close billing"
            headerContent={(
              <div className="flex items-center gap-3">
                <BackButton
                  onClick={() => {
                    setShowBillingPanel(false);
                    setShowUpgradePanel(true);
                  }}
                />
                <h3 className="text-lg font-black font-jakarta text-text-primary">
                  Billing & Payment
                </h3>
              </div>
            )}
          >
            {/* Plan Summary */}
            <div className="p-4 rounded-xl glass-subtle">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-sm font-jakarta text-text-primary">Skhoot Premium</span>
                <span className="text-lg font-black font-jakarta" style={{ color: '#9a8ba3' }}>$9.99/mo</span>
              </div>
              <p className="text-xs text-text-secondary font-jakarta">7-day free trial • Cancel anytime</p>
            </div>

            {/* Payment Method */}
            <div className="space-y-4">
              <label className="text-sm font-bold font-jakarta text-text-primary">Payment Method</label>
              <input
                type="text"
                placeholder="Card number"
                className="w-full p-3 rounded-xl border-glass-border glass-subtle text-sm font-medium font-jakarta text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="MM/YY"
                  className="p-3 rounded-xl border-glass-border glass-subtle text-sm font-medium font-jakarta text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <input
                  type="text"
                  placeholder="CVC"
                  className="p-3 rounded-xl border-glass-border glass-subtle text-sm font-medium font-jakarta text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            {/* Billing Address */}
            <div className="space-y-4">
              <label className="text-sm font-bold font-jakarta text-text-primary">Billing Address</label>
              <input
                type="email"
                placeholder="Email address"
                defaultValue={userEmail}
                className="w-full p-3 rounded-xl border-glass-border glass-subtle text-sm font-medium font-jakarta text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <input
                type="text"
                placeholder="Full name"
                defaultValue={`${firstName} ${lastName}`}
                className="w-full p-3 rounded-xl border-glass-border glass-subtle text-sm font-medium font-jakarta text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <input
                type="text"
                placeholder="Address"
                className="w-full p-3 rounded-xl border-glass-border glass-subtle text-sm font-medium font-jakarta text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="City"
                  className="p-3 rounded-xl border-glass-border glass-subtle text-sm font-medium font-jakarta text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <input
                  type="text"
                  placeholder="ZIP code"
                  className="p-3 rounded-xl border-glass-border glass-subtle text-sm font-medium font-jakarta text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            {/* Terms */}
            <div className="flex items-start gap-3 py-4">
              <input type="checkbox" className="mt-1" />
              <p className="text-xs text-text-secondary font-jakarta">
                I agree to the <span className="underline cursor-pointer" style={{ color: '#9a8ba3' }}>Terms of Service</span> and <span className="underline cursor-pointer" style={{ color: '#9a8ba3' }}>Privacy Policy</span>
              </p>
            </div>

            {/* Button Section */}
            <div className="space-y-4 pt-2 pb-8">
              <PremiumButton
                onClick={() => {
                  console.log('Start 7-Day Free Trial');
                }}
              />
              <p className="text-xs text-center text-text-secondary font-jakarta">
                You won't be charged until your trial ends
              </p>
            </div>
          </Modal>
        )}
    </Modal>
  );
};

export default UserPanel;
