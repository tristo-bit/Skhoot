/**
 * User Profile Service
 * 
 * Manages user profile data persistence in localStorage.
 * Handles profile picture, first name, last name, and other user information.
 */

const STORAGE_KEY = 'skhoot_user_profile';

export interface UserProfile {
  firstName: string;
  lastName: string;
  email: string;
  profileImage: string | null;
  updatedAt: string;
}

const DEFAULT_PROFILE: UserProfile = {
  firstName: 'John',
  lastName: 'Doe',
  email: 'john.doe@example.com',
  profileImage: null,
  updatedAt: new Date().toISOString(),
};

export const userProfileService = {
  /**
   * Load user profile from localStorage
   */
  loadProfile(): UserProfile {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const profile = JSON.parse(stored);
        return {
          ...DEFAULT_PROFILE,
          ...profile,
        };
      }
    } catch (error) {
      console.error('[UserProfileService] Failed to load profile:', error);
    }
    return { ...DEFAULT_PROFILE };
  },

  /**
   * Save complete user profile to localStorage
   */
  saveProfile(profile: Partial<UserProfile>): void {
    try {
      const currentProfile = this.loadProfile();
      const updatedProfile: UserProfile = {
        ...currentProfile,
        ...profile,
        updatedAt: new Date().toISOString(),
      };
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedProfile));
      console.log('[UserProfileService] Profile saved:', updatedProfile);
    } catch (error) {
      console.error('[UserProfileService] Failed to save profile:', error);
      throw new Error('Failed to save profile. Please try again.');
    }
  },

  /**
   * Save profile image only
   */
  saveProfileImage(imageBase64: string | null): void {
    this.saveProfile({ profileImage: imageBase64 });
  },

  /**
   * Save user name (first and last)
   */
  saveName(firstName: string, lastName: string): void {
    this.saveProfile({ firstName, lastName });
  },

  /**
   * Update email (typically from auth service)
   */
  updateEmail(email: string): void {
    this.saveProfile({ email });
  },

  /**
   * Clear all profile data
   */
  clearProfile(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
      console.log('[UserProfileService] Profile cleared');
    } catch (error) {
      console.error('[UserProfileService] Failed to clear profile:', error);
    }
  },

  /**
   * Get profile image only
   */
  getProfileImage(): string | null {
    const profile = this.loadProfile();
    return profile.profileImage;
  },

  /**
   * Get user full name
   */
  getFullName(): string {
    const profile = this.loadProfile();
    return `${profile.firstName} ${profile.lastName}`.trim();
  },
};
