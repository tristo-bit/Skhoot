import React, { useState, useCallback, useRef } from 'react';
import { Camera, User as UserIcon, Info } from 'lucide-react';
import { Modal } from '../ui';
import { SaveButton, UploadButton } from '../buttonFormat';
import { userProfileService } from '../../services/userProfileService';

interface UserPanelProps {
  onClose: () => void;
}

const UserPanel: React.FC<UserPanelProps> = ({ onClose }) => {
  // Load profile from localStorage on mount
  const [profile] = useState(() => userProfileService.loadProfile());
  
  const [firstName, setFirstName] = useState(profile.firstName);
  const [lastName, setLastName] = useState(profile.lastName);
  const [profileImage, setProfileImage] = useState<string | null>(profile.profileImage);
  
  // Track changes for save button
  const [originalFirstName] = useState(profile.firstName);
  const [originalLastName] = useState(profile.lastName);
  const [originalProfileImage] = useState<string | null>(profile.profileImage);
  const [hasProfileChanges, setHasProfileChanges] = useState(false);
  const [hasNameChanges, setHasNameChanges] = useState(false);
  const [userEmail] = useState(profile.email);
  
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

  const handleSaveAll = useCallback(() => {
    try {
      if (hasProfileChanges) {
        userProfileService.saveProfileImage(profileImage);
      }
      if (hasNameChanges) {
        userProfileService.saveName(firstName, lastName);
      }
      setHasProfileChanges(false);
      setHasNameChanges(false);
      console.log('[UserPanel] All changes saved successfully');
    } catch (error) {
      console.error('[UserPanel] Failed to save changes:', error);
      alert('Failed to save changes. Please try again.');
    }
  }, [hasProfileChanges, hasNameChanges, profileImage, firstName, lastName]);

  return (
    <Modal
      onClose={onClose}
      panelClassName="user-panel"
      headerClassName="user-panel-header"
      bodyClassName="user-panel-body"
      footerClassName="user-panel-footer"
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
        <div className="flex justify-end items-center">
          {(hasProfileChanges || hasNameChanges) ? (
            <span className="px-3 py-1 text-xs font-medium font-jakarta text-orange-600">
              Unsaved changes
            </span>
          ) : (
            <span className="px-3 py-1 text-xs font-medium font-jakarta text-gray-400">
              All changes saved
            </span>
          )}
        </div>
      )}
    >
      <div className="space-y-5">
        {/* Profile Picture Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-bold font-jakarta text-text-primary">Profile Picture</label>
          </div>
          <div className="flex flex-col items-center gap-3">
            {/* Profile Image Display */}
            <div
              className="relative w-20 h-20 rounded-full border-2 border-dashed border-glass-border flex items-center justify-center overflow-hidden cursor-pointer transition-all hover:border-accent glass-subtle"
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
                <div className="flex flex-col items-center gap-0.5">
                  <UserIcon size={20} className="text-text-secondary" />
                  <span className="text-[10px] text-text-secondary font-jakarta">Drop or click</span>
                </div>
              )}

              {/* Camera overlay */}
              <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center rounded-full">
                <Camera size={18} className="text-white" />
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
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-bold font-jakarta text-text-primary">Personal Information</label>
          </div>
          
          {/* First Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-text-secondary font-jakarta">First Name</label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full p-2.5 rounded-xl border-glass-border glass-subtle text-sm font-medium font-jakarta text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent"
              placeholder="Enter your first name"
            />
          </div>
          
          {/* Last Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-text-secondary font-jakarta">Last Name</label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full p-2.5 rounded-xl border-glass-border glass-subtle text-sm font-medium font-jakarta text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent"
              placeholder="Enter your last name"
            />
          </div>
          
          {/* Email Section */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <label className="text-xs font-medium text-text-secondary font-jakarta">Email Address</label>
              <div className="group relative">
                <Info size={14} className="text-text-secondary cursor-help" />
                <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block z-50 w-64">
                  <div className="glass-subtle border border-glass-border rounded-lg px-3 py-2 shadow-lg backdrop-blur-xl">
                    <p className="text-xs font-medium font-jakarta text-text-primary">
                      Go to Settings &gt; Privacy to update your email.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-2.5 rounded-xl glass-subtle text-sm font-medium font-jakarta text-text-secondary">
              {userEmail}
            </div>
          </div>
        </div>

        {/* Save Button at Bottom */}
        <div className="pt-2">
          <button
            onClick={handleSaveAll}
            disabled={!hasProfileChanges && !hasNameChanges}
            className={`w-full py-3 px-4 rounded-xl font-bold font-jakarta text-sm transition-all ${
              hasProfileChanges || hasNameChanges
                ? 'bg-[#B0A7B9] hover:bg-[#9A8FA9] active:bg-[#8A7F99] text-white shadow-lg cursor-pointer'
                : 'bg-[#C0B7C9] text-white cursor-not-allowed opacity-70'
            }`}
          >
            Save informations
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default UserPanel;
