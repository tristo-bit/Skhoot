import React, { useState } from 'react';
import { Shield } from 'lucide-react';
import { PanelHeader, SectionLabel } from './shared';
import { Button, SubmitButton } from '../buttonFormat';

interface PrivacyPanelProps {
  onBack: () => void;
}

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
      <PanelHeader title="Privacy & Security" onBack={onBack} />

      {/* Email Update */}
      <div className="space-y-3">
        <SectionLabel label="Update Email" description="Change your account email address" />
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
            className="flex-1 p-3 rounded-xl border-glass-border glass-subtle text-sm font-medium font-jakarta text-text-primary focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <SubmitButton
            onClick={handleUpdateEmail}
            isSubmitting={isUpdatingEmail}
            submitText="Update"
            submittingText="Updating..."
            variant="primary"
            size="md"
          />
        </div>
        
        {emailError && (
          <div className="p-3 rounded-xl bg-red-100 border border-red-200">
            <p className="text-sm font-medium text-red-700">❌ {emailError}</p>
          </div>
        )}
        
        {emailSuccess && (
          <div className="p-3 rounded-xl bg-green-100 border border-green-200">
            <p className="text-sm font-medium text-green-700">✅ {emailSuccess}</p>
          </div>
        )}
      </div>

      {/* Password Change */}
      <div className="space-y-3">
        <SectionLabel label="Change Password" description="Update your account password" />
        <div className="space-y-2">
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => {
              setCurrentPassword(e.target.value);
              setPasswordError('');
              setPasswordSuccess('');
            }}
            placeholder="Current password"
            className="w-full p-3 rounded-xl border-glass-border glass-subtle text-sm font-medium font-jakarta text-text-primary focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <input
            type="password"
            value={newPassword}
            onChange={(e) => {
              setNewPassword(e.target.value);
              setPasswordError('');
              setPasswordSuccess('');
            }}
            placeholder="New password"
            className="w-full p-3 rounded-xl border-glass-border glass-subtle text-sm font-medium font-jakarta text-text-primary focus:outline-none focus:ring-2 focus:ring-purple-500"
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
            className="w-full p-3 rounded-xl border-glass-border glass-subtle text-sm font-medium font-jakarta text-text-primary focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <SubmitButton
            onClick={handleChangePassword}
            isSubmitting={isChangingPassword}
            submitText="Change Password"
            submittingText="Changing..."
            variant="primary"
            size="md"
            className="w-full"
          />
        </div>
        
        {passwordError && (
          <div className="p-3 rounded-xl bg-red-100 border border-red-200">
            <p className="text-sm font-medium text-red-700">❌ {passwordError}</p>
          </div>
        )}
        
        {passwordSuccess && (
          <div className="p-3 rounded-xl bg-green-100 border border-green-200">
            <p className="text-sm font-medium text-green-700">✅ {passwordSuccess}</p>
          </div>
        )}
      </div>

      {/* Data Download */}
      <div className="space-y-3">
        <SectionLabel label="Download Your Data" description="Export all your conversations and settings" />
        <Button
          onClick={handleDownloadData}
          variant="primary"
          size="md"
          className="w-full"
          disabled={isDownloading}
        >
          {isDownloading ? 'Preparing Download...' : 'Download Data'}
        </Button>
      </div>

      {/* Privacy Notice */}
      <div className="p-4 rounded-xl glass-subtle">
        <div className="flex items-start gap-3">
          <Shield size={16} className="mt-0.5 flex-shrink-0" style={{ color: '#c0b7c9' }} />
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
