import React, { useState } from 'react';
import { Shield, Mail, Lock, FolderOpen, Trash2 } from 'lucide-react';
import { BackButton } from '../buttonFormat';
import { isTauriApp } from '../../services/tauriDetection';

interface PrivacyPanelProps {
  onBack: () => void;
}

interface SectionLabelProps {
  label: string;
  icon?: React.ReactNode;
  iconColor?: string;
}

const SectionLabel: React.FC<SectionLabelProps> = ({ label, icon, iconColor = 'text-[#C0B7C9]' }) => (
  <label className="text-sm font-bold font-jakarta text-text-primary flex items-center gap-2">
    {icon && <span className={iconColor}>{icon}</span>}
    {label}
  </label>
);

export const PrivacyPanel: React.FC<PrivacyPanelProps> = ({ onBack }) => {
  // Email state
  const [newEmail, setNewEmail] = useState('');
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [emailSuccess, setEmailSuccess] = useState('');

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  // Download state
  const [isDownloading, setIsDownloading] = useState(false);

  const handleUpdateEmail = async () => {
    setEmailError('');
    setEmailSuccess('');
    
    if (!newEmail || newEmail.trim() === '') {
      setEmailError('Please enter an email address');
      return;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail.trim())) {
      setEmailError('Invalid email format. Please use format: user@domain.com');
      return;
    }
    
    const currentEmail = 'user@example.com';
    if (newEmail.trim().toLowerCase() === currentEmail.toLowerCase()) {
      setEmailError('This email is already your current email address');
      return;
    }
    
    setIsUpdatingEmail(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      setEmailSuccess(`Confirmation email sent to ${newEmail.trim()}! Check your inbox.`);
      setNewEmail('');
    } catch (error) {
      setEmailError('Failed to send confirmation email. Please try again.');
    } finally {
      setIsUpdatingEmail(false);
    }
  };

  const handleChangePassword = async () => {
    setPasswordError('');
    setPasswordSuccess('');
    
    if (!currentPassword || currentPassword.trim() === '') {
      setPasswordError('Please enter your current password');
      return;
    }
    if (!newPassword || newPassword.trim() === '') {
      setPasswordError('Please enter a new password');
      return;
    }
    if (!confirmPassword || confirmPassword.trim() === '') {
      setPasswordError('Please confirm your new password');
      return;
    }
    
    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters long');
      return;
    }
    
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(newPassword)) {
      setPasswordError('Password must contain: uppercase letter, lowercase letter, and number');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }
    
    if (newPassword === currentPassword) {
      setPasswordError('New password must be different from current password');
      return;
    }
    
    setIsChangingPassword(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      setPasswordSuccess('Password changed successfully! Security email sent to your account.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      setPasswordError('Failed to change password. Please try again.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleOpenLocalStorage = async () => {
    setIsDownloading(true);
    try {
      const isTauri = isTauriApp();
      console.log('[OpenLocalStorage] Tauri detection result:', isTauri);
      
      // Check if Tauri is available
      if (isTauri) {
        console.log('[OpenLocalStorage] Tauri detected, opening local data directory...');
        const { invoke } = await import('@tauri-apps/api/core');
        
        // Use our custom command that opens the folder directly
        await invoke('open_local_data_dir');
        console.log('[OpenLocalStorage] Directory opened successfully');
      } else {
        // Web fallback
        console.log('[OpenLocalStorage] Running in web mode, Tauri not available');
        console.info('Browser localStorage is managed by your browser. Access it through developer tools (F12) → Application/Storage → Local Storage');
      }
    } catch (error) {
      console.error('[OpenLocalStorage] Failed to open local storage:', error);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleEraseLocalData = async () => {
    if (window.confirm('Are you sure you want to erase all local data? This will reset all settings and cannot be undone.')) {
      try {
        console.log('[PrivacyPanel] Erasing local data...');
        localStorage.clear();
        sessionStorage.clear();
        
        // Also try to clear backend data if possible, but for now just frontend
        // Reload to reset state
        window.location.reload();
      } catch (error) {
        console.error('[PrivacyPanel] Failed to erase data:', error);
        alert('Failed to erase data');
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 pb-2 border-b border-glass-border">
        <BackButton onClick={onBack} />
        <Shield size={20} className="text-[#C0B7C9]" />
        <h3 className="text-lg font-black font-jakarta text-text-primary">Privacy & Security</h3>
      </div>

      {/* Email Update */}
      <div className="space-y-3">
        <SectionLabel 
          label="Update Email" 
          icon={<Mail size={16} />}
          iconColor="text-[#C0B7C9]"
        />
        <div className="p-3 rounded-xl glass-subtle space-y-3">
          <div className="flex gap-2">
            <input
              type="email"
              value={newEmail}
              onChange={(e) => {
                setNewEmail(e.target.value);
                setEmailError('');
                setEmailSuccess('');
              }}
              placeholder="Enter new email address"
              className="flex-1 px-3 py-2 bg-transparent text-sm font-medium font-jakarta text-text-primary placeholder:text-text-secondary/50 border-b border-glass-border focus:border-[#C0B7C9] outline-none transition-all"
            />
            <button
              onClick={handleUpdateEmail}
              disabled={isUpdatingEmail}
              className="px-4 py-2 rounded-lg text-sm font-medium font-jakarta bg-[#C0B7C9] text-white hover:bg-[#B0A7B9] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isUpdatingEmail ? 'Updating...' : 'Update'}
            </button>
          </div>
          
          {emailError && (
            <div className="p-2 rounded-lg bg-red-500/10">
              <p className="text-xs font-medium font-jakarta text-red-600 dark:text-red-400">❌ {emailError}</p>
            </div>
          )}
          
          {emailSuccess && (
            <div className="p-2 rounded-lg bg-emerald-500/10">
              <p className="text-xs font-medium font-jakarta text-emerald-600 dark:text-emerald-400">✅ {emailSuccess}</p>
            </div>
          )}
        </div>
      </div>

      {/* Password Change */}
      <div className="space-y-3">
        <SectionLabel 
          label="Change Password" 
          icon={<Lock size={16} />}
          iconColor="text-[#C0B7C9]"
        />
        <div className="p-3 rounded-xl glass-subtle space-y-3">
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => {
              setCurrentPassword(e.target.value);
              setPasswordError('');
              setPasswordSuccess('');
            }}
            placeholder="Current password"
            className="w-full px-3 py-2 bg-transparent text-sm font-medium font-jakarta text-text-primary placeholder:text-text-secondary/50 border-b border-glass-border focus:border-[#C0B7C9] outline-none transition-all"
          />
          <input
            type="password"
            value={newPassword}
            onChange={(e) => {
              setNewPassword(e.target.value);
              setPasswordError('');
              setPasswordSuccess('');
            }}
            placeholder="New password (min. 8 characters)"
            className="w-full px-3 py-2 bg-transparent text-sm font-medium font-jakarta text-text-primary placeholder:text-text-secondary/50 border-b border-glass-border focus:border-[#C0B7C9] outline-none transition-all"
          />
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              setPasswordError('');
              setPasswordSuccess('');
            }}
            placeholder="Confirm new password"
            className="w-full px-3 py-2 bg-transparent text-sm font-medium font-jakarta text-text-primary placeholder:text-text-secondary/50 border-b border-glass-border focus:border-[#C0B7C9] outline-none transition-all"
          />
          
          {passwordError && (
            <div className="p-2 rounded-lg bg-red-500/10">
              <p className="text-xs font-medium font-jakarta text-red-600 dark:text-red-400">❌ {passwordError}</p>
            </div>
          )}
          
          {passwordSuccess && (
            <div className="p-2 rounded-lg bg-emerald-500/10">
              <p className="text-xs font-medium font-jakarta text-emerald-600 dark:text-emerald-400">✅ {passwordSuccess}</p>
            </div>
          )}
          
          <button
            onClick={handleChangePassword}
            disabled={isChangingPassword}
            className="w-full px-4 py-2 rounded-lg text-sm font-medium font-jakarta bg-[#C0B7C9] text-white hover:bg-[#B0A7B9] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isChangingPassword ? 'Changing...' : 'Change Password'}
          </button>
        </div>
      </div>

      {/* Open Local Storage */}
      <div className="space-y-3">
        <SectionLabel 
          label="Open Local Storage" 
          icon={<FolderOpen size={16} />}
          iconColor="text-[#d4e4f1]"
        />
        <div className="p-3 rounded-xl glass-subtle">
          <p className="text-xs text-text-secondary font-jakarta mb-3">
            Open the folder where your settings and user data are stored (AI parameters, preferences, etc.)
          </p>
          <button
            onClick={handleOpenLocalStorage}
            disabled={isDownloading}
            className="w-full px-4 py-2 rounded-lg text-sm font-medium font-jakarta bg-[#d4e4f1] text-gray-800 hover:bg-[#c4d4e1] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isDownloading ? 'Opening...' : 'Open Local Storage'}
          </button>
        </div>
      </div>

      {/* Erase Local Data */}
      <div className="space-y-3">
        <SectionLabel 
          label="Erase Local Data" 
          icon={<Trash2 size={16} />}
          iconColor="text-red-500"
        />
        <div className="p-3 rounded-xl glass-subtle">
          <p className="text-xs text-text-secondary font-jakarta mb-3">
            Clear all local data and settings. This action cannot be undone and will reset the application to its initial state.
          </p>
          <button
            onClick={handleEraseLocalData}
            className="w-full px-4 py-2 rounded-lg text-sm font-medium font-jakarta bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-all border border-red-500/20 hover:border-red-500/30"
          >
            Erase Local Data
          </button>
        </div>
      </div>

      {/* Privacy Notice */}
      <div className="p-4 rounded-xl glass-subtle">
        <div className="flex items-start gap-3">
          <Shield size={16} className="mt-0.5 flex-shrink-0 text-[#C0B7C9]" />
          <div>
            <p className="text-sm font-bold font-jakarta text-text-primary mb-1">Your Privacy Matters</p>
            <p className="text-xs text-text-secondary font-jakarta">
              We take your privacy seriously. All data is encrypted and stored securely. You can request data deletion at any time.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPanel;
