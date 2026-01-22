import { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, User as UserIcon } from 'lucide-react';
import { authService } from '../../services/auth';
import { User } from '../../types';
import { COLORS } from '../../src/constants';
import { BackButton, IconButton, SubmitButton } from '../buttonFormat';
import { Modal } from '../ui';
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
    <Modal
      onClose={onClose}
      showClose={false}
      panelClassName="register-panel"
      headerClassName="register-panel-header"
      bodyClassName="register-panel-body"
      closeAriaLabel="Close registration"
      headerContent={(
        <div className="flex items-center gap-3">
          <BackButton onClick={onClose} />
          <span className="text-sm font-black tracking-[0.2em] font-jakarta" style={{ color: COLORS.fukuBrand }}>
            CREATE ACCOUNT
          </span>
        </div>
      )}
    >
      <div className="max-w-sm mx-auto space-y-4">
        {/* SSO Buttons */}
        <div className="space-y-2.5">
          <SSOButton provider="google" onClick={() => handleSSORegister('google')} isLoading={ssoLoading === 'google'} mode="register" />
          <SSOButton provider="microsoft" onClick={() => handleSSORegister('microsoft')} isLoading={ssoLoading === 'microsoft'} mode="register" />
          <SSOButton provider="apple" onClick={() => handleSSORegister('apple')} isLoading={ssoLoading === 'apple'} mode="register" />
        </div>

        {/* Divider */}
        <div className="flex items-center gap-4 py-1">
          <div className="flex-1 h-px border-glass-border bg-current opacity-20" />
          <span className="text-xs text-text-secondary font-jakarta">or</span>
          <div className="flex-1 h-px border-glass-border bg-current opacity-20" />
        </div>

        {/* Email Form */}
        <form onSubmit={handleEmailRegister} className="space-y-2.5">
          {error && (
            <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20">
              <p className="text-xs text-red-600 dark:text-red-400 font-jakarta">{error}</p>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-semibold text-text-secondary font-jakarta">Display Name</label>
            <div className="relative">
              <UserIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border-glass-border glass-subtle text-sm font-jakarta text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent/50"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-text-secondary font-jakarta">Email</label>
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border-glass-border glass-subtle text-sm font-jakarta text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent/50"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-text-secondary font-jakarta">Password</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-10 py-2.5 rounded-xl border-glass-border glass-subtle text-sm font-jakarta text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent/50"
              />
              <IconButton
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                icon={showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                variant="ghost"
                size="sm"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-text-secondary font-jakarta">Confirm Password</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border-glass-border glass-subtle text-sm font-jakarta text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent/50"
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
        <p className="text-center text-xs text-text-secondary font-jakarta">
          Already have an account?{' '}
          <button onClick={onSwitchToLogin} className="font-semibold text-text-primary hover:underline">
            Sign in
          </button>
        </p>
      </div>
    </Modal>
  );
};

export default Register;
