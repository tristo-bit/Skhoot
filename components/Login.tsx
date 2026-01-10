import React, { useState, memo } from 'react';
import { Mail, Lock, Eye, EyeOff, ArrowLeft, Loader2 } from 'lucide-react';
import { authService } from '../services/auth';
import { User } from '../types';
import { CloseButton, Button, IconButton, SubmitButton } from './buttonFormat';

interface LoginProps {
  onLogin: (user: User) => void;
  onSwitchToRegister: () => void;
  onClose: () => void;
}

const SSOButton = memo<{
  provider: 'google' | 'microsoft' | 'apple';
  onClick: () => void;
  isLoading: boolean;
}>(({ provider, onClick, isLoading }) => {
  const icons = {
    google: (
      <svg viewBox="0 0 24 24" className="w-5 h-5">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
      </svg>
    ),
    microsoft: (
      <svg viewBox="0 0 24 24" className="w-5 h-5">
        <path fill="#F25022" d="M1 1h10v10H1z"/>
        <path fill="#00A4EF" d="M1 13h10v10H1z"/>
        <path fill="#7FBA00" d="M13 1h10v10H13z"/>
        <path fill="#FFB900" d="M13 13h10v10H13z"/>
      </svg>
    ),
    apple: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
      </svg>
    ),
  };

  const labels = {
    google: 'Continue with Google',
    microsoft: 'Continue with Microsoft',
    apple: 'Continue with Apple',
  };

  return (
    <button
      onClick={onClick}
      disabled={isLoading}
      className="w-full flex items-center justify-center gap-3 p-3 rounded-xl border border-black/5 transition-all hover:bg-white/10 dark:hover:bg-white/5 active:scale-[0.98] disabled:opacity-50"
      style={{ backgroundColor: 'rgba(255,255,255,0.4)' }}
    >
      {isLoading ? <Loader2 size={20} className="animate-spin" /> : icons[provider]}
      <span className="text-sm font-semibold text-gray-700 font-jakarta">{labels[provider]}</span>
    </button>
  );
});
SSOButton.displayName = 'SSOButton';

const Login: React.FC<LoginProps> = ({ onLogin, onSwitchToRegister, onClose }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [ssoLoading, setSsoLoading] = useState<string | null>(null);
  const [error, setError] = useState('');

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    try {
      const user = await authService.loginWithEmail(email, password);
      onLogin(user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSSOLogin = async (provider: 'google' | 'microsoft' | 'apple') => {
    setError('');
    setSsoLoading(provider);
    
    try {
      const user = await authService.loginWithSSO(provider);
      onLogin(user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'SSO login failed');
    } finally {
      setSsoLoading(null);
    }
  };

  return (
    <div 
      className="absolute inset-0 z-50 flex flex-col"
      style={{ backgroundColor: THEME.background }}
    >
      {/* Header */}
      <div className="px-6 py-5 flex items-center gap-4">
        <CloseButton onClick={onClose} />
        <span className="text-sm font-black tracking-[0.2em] font-jakarta" style={{ color: COLORS.fukuBrand }}>
          SIGN IN
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 px-6 py-4 overflow-y-auto">
        <div className="max-w-sm mx-auto space-y-6">
          {/* SSO Buttons */}
          <div className="space-y-3">
            <SSOButton provider="google" onClick={() => handleSSOLogin('google')} isLoading={ssoLoading === 'google'} />
            <SSOButton provider="microsoft" onClick={() => handleSSOLogin('microsoft')} isLoading={ssoLoading === 'microsoft'} />
            <SSOButton provider="apple" onClick={() => handleSSOLogin('apple')} isLoading={ssoLoading === 'apple'} />
          </div>

          {/* Divider */}
          <div className="flex items-center gap-4">
            <div className="flex-1 h-px bg-black/10" />
            <span className="text-xs text-gray-500 font-jakarta">or</span>
            <div className="flex-1 h-px bg-black/10" />
          </div>

          {/* Email Form */}
          <form onSubmit={handleEmailLogin} className="space-y-4">
            {error && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                <p className="text-xs text-red-600 font-jakarta">{error}</p>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-600 font-jakarta">Email</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-black/5 glass-subtle text-sm font-jakarta placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-purple-300/50"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-600 font-jakarta">Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-3 rounded-xl border border-black/5 glass-subtle text-sm font-jakarta placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-purple-300/50"
                />
                <IconButton
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  icon={showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  variant="ghost"
                  size="sm"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                />
              </div>
            </div>

            <SubmitButton
              type="submit"
              isSubmitting={isLoading}
              submitText="Sign In"
              submittingText="Signing In..."
              variant="primary"
              style={{ backgroundColor: COLORS.fukuBrand }}
            />
          </form>

          {/* Switch to Register */}
          <p className="text-center text-xs text-gray-500 font-jakarta">
            Don't have an account?{' '}
            <button onClick={onSwitchToRegister} className="font-semibold text-gray-700 hover:underline">
              Sign up
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
