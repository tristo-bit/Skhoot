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
        </div>
    </Modal>
  );
};

export default UserPanel;
