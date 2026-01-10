import React, { useState, useCallback, memo, useRef } from 'react';
import { Camera, Upload, Key, Crown, User as UserIcon } from 'lucide-react';
import { COLORS } from '../src/constants';
import { Modal } from './shared';

interface UserPanelProps {
  onClose: () => void;
}

const UserPanel: React.FC<UserPanelProps> = ({ onClose }) => {
  const [firstName, setFirstName] = useState('John');
  const [lastName, setLastName] = useState('Doe');
  const [plan, setPlan] = useState<'guest' | 'subscribed'>('guest');
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  
  // Track changes for save button
  const [originalFirstName] = useState('John');
  const [originalLastName] = useState('Doe');
  const [originalProfileImage] = useState<string | null>(null);
  const [hasProfileChanges, setHasProfileChanges] = useState(false);
  const [hasNameChanges, setHasNameChanges] = useState(false);
  const [showUpgradePanel, setShowUpgradePanel] = useState(false);
  const [showBillingPanel, setShowBillingPanel] = useState(false);
  const [userEmail] = useState('john.doe@example.com'); // Email du compte
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [connectionMessage, setConnectionMessage] = useState('');
  const [isApiKeySaved, setIsApiKeySaved] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleSaveChanges = useCallback(() => {
    // Here you would save the changes to your backend/storage
    console.log('Saving changes:', { firstName, lastName, profileImage });
    // For now, just show success and reset changes tracking
    setHasProfileChanges(false);
    setHasNameChanges(false);
    // You could show a toast notification here
  }, [firstName, lastName, profileImage]);

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

    // Basic format validation - API key should be at least 20 characters and contain alphanumeric
    if (apiKey.length < 20 || !/^[a-zA-Z0-9\-_]+$/.test(apiKey)) {
      setConnectionStatus('error');
      setConnectionMessage('Invalid API key format. Must be at least 20 characters with letters, numbers, hyphens, or underscores only.');
      return;
    }

    setIsTestingConnection(true);
    setConnectionStatus('idle');
    setConnectionMessage('');

    try {
      // Simulate API call - replace with your actual API endpoint
      await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
      
      // Mock validation - in real app, this would call your API
      // For demo: keys starting with 'sk-' are valid, others fail
      const isValid = apiKey.startsWith('sk-') || apiKey.startsWith('API-') || apiKey.length >= 32;
      
      if (isValid) {
        setConnectionStatus('success');
        setConnectionMessage('✅ API key validated successfully! Connection established.');
        console.log('✅ API Key validated:', apiKey);
      } else {
        throw new Error('Invalid API key or insufficient permissions. Please check your key and try again.');
      }
    } catch (error) {
      setConnectionStatus('error');
      setConnectionMessage(error instanceof Error ? error.message : 'Connection failed. Please check your API key.');
      console.error('❌ API Key validation failed:', error);
    } finally {
      setIsTestingConnection(false);
    }
  }, [apiKey]);

  const handleSaveApiKey = useCallback(() => {
    console.log('Saving API key:', apiKey);
    // Here you would save the API key to your backend/storage
    // For example: localStorage.setItem('apiKey', apiKey) or API call
    
    // Simulate saving process
    setIsApiKeySaved(true);
    
    // Show success message temporarily
    setTimeout(() => {
      setIsApiKeySaved(false);
    }, 2000);
    
    // You could also show a toast notification here
  }, [apiKey]);

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
    >
      <div className="space-y-6">
        {/* Profile Picture Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-bold font-jakarta text-text-primary">Profile Picture</label>
                {hasProfileChanges && (
                  <button
                    onClick={handleSaveProfile}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold font-jakarta transition-all text-white bg-accent"
                  >
                    Save Photo
                  </button>
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
              <button
                onClick={triggerFileInput}
                className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm font-jakarta transition-all text-white"
                style={{ backgroundColor: '#9a8ba3' }}
              >
                <Upload size={16} />
                Upload Photo
              </button>
              
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
                <button
                  onClick={handleSaveName}
                  className="px-3 py-1 rounded-lg text-xs font-bold font-jakarta transition-all text-white bg-accent"
                >
                  Save Name
                </button>
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
              <button
                onClick={() => handlePlanChange('guest')}
                className={`p-4 rounded-xl transition-all ${
                  plan === 'guest' 
                    ? 'glass-subtle border-2' 
                    : 'glass-subtle hover:glass'
                }`}
                style={plan === 'guest' ? { borderColor: '#9a8ba3' } : {}}
              >
                <div className="flex flex-col items-center gap-2">
                  <UserIcon size={20} className={plan === 'guest' ? 'text-text-primary' : 'text-text-secondary'} style={plan === 'guest' ? { color: '#9a8ba3' } : {}} />
                  <span className={`text-sm font-bold font-jakarta ${
                    plan === 'guest' ? 'text-text-primary' : 'text-text-secondary'
                  }`} style={plan === 'guest' ? { color: '#9a8ba3' } : {}}>
                    Guest
                  </span>
                  <span className="text-xs text-text-secondary font-jakarta">Free access</span>
                </div>
              </button>
              
              {/* Subscribed Plan */}
              <button
                onClick={() => handlePlanChange('subscribed')}
                disabled={plan === 'guest'}
                className={`p-4 rounded-xl transition-all relative ${
                  plan === 'subscribed' 
                    ? 'glass-subtle border-2' 
                    : plan === 'guest'
                    ? 'glass-subtle cursor-not-allowed opacity-60'
                    : 'glass-subtle hover:glass'
                }`}
                style={plan === 'subscribed' ? { borderColor: '#9a8ba3' } : {}}
              >
                <div className="flex flex-col items-center gap-2">
                  <Crown size={20} className={plan === 'subscribed' ? 'text-text-primary' : 'text-text-secondary'} style={plan === 'subscribed' ? { color: '#9a8ba3' } : {}} />
                  <span className={`text-sm font-bold font-jakarta ${
                    plan === 'subscribed' ? 'text-text-primary' : 'text-text-secondary'
                  }`} style={plan === 'subscribed' ? { color: '#9a8ba3' } : {}}>
                    Subscribed
                  </span>
                  <span className="text-xs text-text-secondary font-jakarta">Premium features</span>
                </div>
                
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
              </button>
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
                <button
                  onClick={handleSaveApiKey}
                  disabled={isApiKeySaved}
                  className={`px-4 py-2 rounded-lg text-sm font-bold font-jakarta transition-all text-white ${
                    isApiKeySaved 
                      ? 'cursor-not-allowed opacity-50' 
                      : 'hover:opacity-90'
                  }`}
                  style={{ backgroundColor: '#DDEBF4' }}
                >
                  {isApiKeySaved ? (
                    <div className="flex items-center gap-2">
                      <span>✓</span>
                      Saved!
                    </div>
                  ) : (
                    'Save API Key'
                  )}
                </button>
              )}
            </div>
            <p className="text-xs text-text-secondary font-jakarta">
              Connect your API key to unlock advanced features and personalized responses.
            </p>
            
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
                  placeholder="Enter your API key"
                />
                <button
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary transition-colors"
                >
                  <Key size={16} />
                </button>
              </div>
              
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
              
              <button
                onClick={handleTestConnection}
                disabled={isTestingConnection || !apiKey.trim()}
                className={`w-full py-3 px-4 rounded-xl text-sm font-bold font-jakarta transition-all text-white ${
                  isTestingConnection || !apiKey.trim()
                    ? 'cursor-not-allowed opacity-50'
                    : 'hover:opacity-90'
                }`}
                style={{ backgroundColor: '#DDEBF4' }}
              >
                {isTestingConnection ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Testing Connection...
                  </div>
                ) : connectionStatus === 'success' ? (
                  <div className="flex items-center justify-center gap-2">
                    <span>✓</span>
                    Connected Successfully
                  </div>
                ) : (
                  'Test Connection'
                )}
              </button>
            </div>
          </div>

          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-black/5 flex justify-between items-center">
          <p 
            className="text-[10px] font-medium font-jakarta opacity-40" 
            style={{ color: '#1e1e1e' }}
          >
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

        {/* Upgrade Panel */}
        {showUpgradePanel && (
          <div className="absolute inset-0 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div 
              className="w-full max-w-[350px] max-h-[90vh] rounded-2xl overflow-hidden shadow-2xl glass-elevated"
            >
              {/* Upgrade Header */}
              <div className="px-6 py-4 text-center">
                <button 
                  onClick={handleStartBilling}
                  className="hover:scale-105 transition-transform cursor-pointer"
                >
                  <img src="/skhoot-purple.svg" alt="Skhoot" className="w-10 h-10 mx-auto mb-2 dark:brightness-90" style={{ filter: `hue-rotate(20deg) saturate(1.2)` }} />
                </button>
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
                <button
                  className="w-full py-3 rounded-xl font-bold text-sm font-jakarta transition-all text-white hover:opacity-90"
                  style={{ backgroundColor: '#9a8ba3' }}
                  onClick={handleStartBilling}
                >
                  Start Free Trial
                </button>
                <button
                  onClick={() => setShowUpgradePanel(false)}
                  className="w-full py-2 text-sm font-jakarta text-text-secondary hover:text-text-primary transition-colors"
                >
                  Maybe later
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Billing Panel */}
        {showBillingPanel && (
          <div className="absolute inset-0 backdrop-blur-sm flex items-start justify-center z-50 pt-4 pb-4">
            <div className="w-full max-w-[450px] max-h-[92vh] rounded-2xl glass-elevated shadow-2xl overflow-hidden">
              
              {/* Header - Always visible */}
              <div className="px-6 py-4 border-b border-glass-border flex items-center justify-between bg-white/90 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => {
                      setShowBillingPanel(false);
                      setShowUpgradePanel(true);
                    }}
                    className="w-8 h-8 flex items-center justify-center rounded-xl hover:glass-subtle transition-all text-text-secondary"
                  >
                    ←
                  </button>
                  <h3 className="text-lg font-black font-jakarta text-text-primary">
                    Billing & Payment
                  </h3>
                </div>
                <button 
                  onClick={() => {
                    setShowBillingPanel(false);
                    setShowUpgradePanel(false);
                  }}
                  className="w-8 h-8 flex items-center justify-center rounded-xl hover:glass-subtle transition-all text-text-secondary"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Scrollable Content */}
              <div 
                className="overflow-y-scroll px-6 py-4 space-y-6"
                style={{ 
                  height: 'calc(92vh - 90px)',
                  scrollBehavior: 'smooth',
                  paddingBottom: '2rem',
                  minHeight: '600px'
                }}
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
                <div className="space-y-4 pt-6 pb-16">
                  <button
                    className="w-full py-3 rounded-xl font-bold text-sm font-jakarta transition-all text-white hover:opacity-90"
                    style={{ backgroundColor: '#9a8ba3' }}
                    onClick={() => {
                      console.log('Start 7-Day Free Trial');
                      // Here you would process the trial signup
                    }}
                  >
                    Start 7-Day Free Trial
                  </button>
                  <p className="text-xs text-center text-text-secondary font-jakarta">
                    You won't be charged until your trial ends
                  </p>
                </div>

                {/* Extra padding to ensure scroll reaches bottom */}
                <div className="h-24"></div>

              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default UserPanel;
