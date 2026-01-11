import { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, User as UserIcon } from 'lucide-react';
import { authService } from '../../services/auth';
import { User } from '../../types';
import { COLORS } from '../../src/constants';
import { CloseButton, IconButton, SubmitButton, Button } from '../buttonFormat';
import { SSOButton } from './SSOButton';

interface RegisterProps {
  onRegister: (user: User) => void;
  onSwitchToLogin: () => void;
  onClose: () => void;
}

const Register: React.FC<RegisterProps> = ({ onRegister, onSwitchToLogin, onClose }) => {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [ssoLoading, setSsoLoading] = useState<string | null>(null);
  const [error, setError] = useState('');

  const handleEmailRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);
    
    try {
      const user = await authService.registerWithEmail(email, password, displayName);
      onRegister(user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSSORegister = async (provider: 'google' | 'microsoft' | 'apple') => {
    setError('');
    setSsoLoading(provider);
    
    try {
      const user = await authService.loginWithSSO(provider);
      onRegister(user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'SSO registration failed');
    } finally {
      setSsoLoading(null);
    }
  };

  return (
    <div className="absolute inset-0 z-50 flex flex-col bg-bg-primary">
      {/* Header */}
      <div className="px-6 py-5 flex items-center gap-4">
        <CloseButton onClick={onClose} />
        <span className="text-sm font-black tracking-[0.2em] font-jakarta" style={{ color: COLORS.fukuBrand }}>
          CREATE ACCOUNT
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 px-6 py-4 overflow-y-auto">
        <div className="max-w-sm mx-auto space-y-5">
          {/* SSO Buttons */}
          <div className="space-y-3">
            <SSOButton provider="google" onClick={() => handleSSORegister('google')} isLoading={ssoLoading === 'google'} mode="register" />
            <SSOButton provider="microsoft" onClick={() => handleSSORegister('microsoft')} isLoading={ssoLoading === 'microsoft'} mode="register" />
            <SSOButton provider="apple" onClick={() => handleSSORegister('apple')} isLoading={ssoLoading === 'apple'} mode="register" />
          </div>

          {/* Divider */}
          <div className="flex items-center gap-4">
            <div className="flex-1 h-px bg-black/10" />
            <span className="text-xs text-gray-500 font-jakarta">or</span>
            <div className="flex-1 h-px bg-black/10" />
          </div>

          {/* Email Form */}
          <form onSubmit={handleEmailRegister} className="space-y-3">
            {error && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                <p className="text-xs text-red-600 font-jakarta">{error}</p>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-600 font-jakarta">Display Name</label>
              <div className="relative">
                <UserIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your name"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-black/5 glass-subtle text-sm font-jakarta placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-purple-300/50"
                />
              </div>
            </div>

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

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-600 font-jakarta">Confirm Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-black/5 glass-subtle text-sm font-jakarta placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-purple-300/50"
                />
              </div>
            </div>

            <SubmitButton
              type="submit"
              isSubmitting={isLoading}
              submitText="Create Account"
              submittingText="Creating Account..."
              variant="primary"
              style={{ backgroundColor: COLORS.fukuBrand }}
            />
          </form>

          {/* Switch to Login */}
          <p className="text-center text-xs text-gray-500 font-jakarta">
            Already have an account?{' '}
            <button onClick={onSwitchToLogin} className="font-semibold text-gray-700 hover:underline">
              Sign in
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
