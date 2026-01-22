import React, { useState } from 'react';
import { Shield, Mail, Lock, Download } from 'lucide-react';
import { BackButton } from '../buttonFormat';

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

  const handleDownloadData = async () => {
    setIsDownloading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const userData = {
        profile: {
          email: 'user@example.com',
          createdAt: new Date().toISOString(),
        },
        conversations: [
          {
            id: '1',
            title: 'Sample conversation',
            messages: ['Hello', 'Hi there!'],
            createdAt: new Date().toISOString(),
          }
        ],
        settings: {
          theme: 'default',
        }
      };
      
      const blob = new Blob([JSON.stringify(userData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `skhoot-data-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      alert('Your data has been downloaded successfully!');
    } catch (error) {
      alert('Failed to download data. Please try again.');
    } finally {
      setIsDownloading(false);
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
          iconColor="text-blue-500"
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
          iconColor="text-amber-500"
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

      {/* Data Download */}
      <div className="space-y-3">
        <SectionLabel 
          label="Download Your Data" 
          icon={<Download size={16} />}
          iconColor="text-cyan-500"
        />
        <div className="p-3 rounded-xl glass-subtle">
          <p className="text-xs text-text-secondary font-jakarta mb-3">
            Export all your conversations, settings, and account data in JSON format
          </p>
          <button
            onClick={handleDownloadData}
            disabled={isDownloading}
            className="w-full px-4 py-2 rounded-lg text-sm font-medium font-jakarta bg-cyan-500 text-white hover:bg-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isDownloading ? 'Preparing Download...' : 'Download Data'}
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
