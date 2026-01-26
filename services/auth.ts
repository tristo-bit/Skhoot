import { User, AuthState } from '../types';
import { userProfileService } from './userProfileService';

const AUTH_STORAGE_KEY = 'skhoot_auth';

// Simulated auth service - replace with real implementation
export const authService = {
  getStoredAuth(): AuthState {
    try {
      const stored = localStorage.getItem(AUTH_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return { user: parsed.user, isAuthenticated: true, isLoading: false };
      }
    } catch (e) {
      console.error('Failed to parse stored auth:', e);
    }
    return { user: null, isAuthenticated: false, isLoading: false };
  },

  saveAuth(user: User): void {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ user }));
    // Sync email with user profile
    userProfileService.updateEmail(user.email);
  },

  clearAuth(): void {
    localStorage.removeItem(AUTH_STORAGE_KEY);
  },

  // Email/password login - simulated
  async loginWithEmail(email: string, password: string): Promise<User> {
    await new Promise(resolve => setTimeout(resolve, 800));
    
    if (!email || !password) {
      throw new Error('Email and password are required');
    }
    
    const user: User = {
      id: crypto.randomUUID(),
      email,
      displayName: email.split('@')[0],
      provider: 'email',
    };
    
    this.saveAuth(user);
    return user;
  },

  // Email/password register - simulated
  async registerWithEmail(email: string, password: string, displayName: string): Promise<User> {
    await new Promise(resolve => setTimeout(resolve, 800));
    
    if (!email || !password || !displayName) {
      throw new Error('All fields are required');
    }
    
    const user: User = {
      id: crypto.randomUUID(),
      email,
      displayName,
      provider: 'email',
    };
    
    this.saveAuth(user);
    return user;
  },

  // SSO login - simulated
  async loginWithSSO(provider: 'google' | 'microsoft' | 'apple'): Promise<User> {
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const providerEmails = {
      google: 'user@gmail.com',
      microsoft: 'user@outlook.com',
      apple: 'user@icloud.com',
    };
    
    const user: User = {
      id: crypto.randomUUID(),
      email: providerEmails[provider],
      displayName: `${provider.charAt(0).toUpperCase() + provider.slice(1)} User`,
      provider,
    };
    
    this.saveAuth(user);
    return user;
  },

  async logout(): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 300));
    this.clearAuth();
  },
};
