import { useState } from 'react';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { authService } from '../../services/auth';
import { User } from '../../types';
import { COLORS } from '../../src/constants';
import { BackButton, IconButton, SubmitButton } from '../buttonFormat';
import { Modal } from '../ui';
import { SSOButton } from './SSOButton';

interface LoginProps {
  onLogin: (user: User) => void;
  onSwitchToRegister: () => void;
  onClose: () => void;
}

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
    <Modal
      onClose={onClose}
      showClose={false}
      panelClassName="login-panel"
      headerClassName="login-panel-header"
      bodyClassName="login-panel-body"
      closeAriaLabel="Close sign in"
      headerContent={(
        <div className="flex items-center gap-3">
          <BackButton onClick={onClose} />
          <span className="text-sm font-black tracking-[0.2em] font-jakarta" style={{ color: COLORS.fukuBrand }}>
            SIGN IN
          </span>
        </div>
      )}
    >
      <div className="max-w-sm mx-auto space-y-6">
        {/* SSO Buttons */}
        <div className="space-y-3">
          <SSOButton provider="google" onClick={() => handleSSOLogin('google')} isLoading={ssoLoading === 'google'} />
          <SSOButton provider="microsoft" onClick={() => handleSSOLogin('microsoft')} isLoading={ssoLoading === 'microsoft'} />
          <SSOButton provider="apple" onClick={() => handleSSOLogin('apple')} isLoading={ssoLoading === 'apple'} />
        </div>

        {/* Divider */}
        <div className="flex items-center gap-4">
          <div className="flex-1 h-px border-glass-border bg-current opacity-20" />
          <span className="text-xs text-text-secondary font-jakarta">or</span>
          <div className="flex-1 h-px border-glass-border bg-current opacity-20" />
        </div>

        {/* Email Form */}
        <form onSubmit={handleEmailLogin} className="space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20">
              <p className="text-xs text-red-600 dark:text-red-400 font-jakarta">{error}</p>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-semibold text-text-secondary font-jakarta">Email</label>
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full pl-10 pr-4 py-3 rounded-xl border-glass-border glass-subtle text-sm font-jakarta text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent/50"
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
                className="w-full pl-10 pr-10 py-3 rounded-xl border-glass-border glass-subtle text-sm font-jakarta text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent/50"
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
        <p className="text-center text-xs text-text-secondary font-jakarta">
          Don't have an account?{' '}
          <button onClick={onSwitchToRegister} className="font-semibold text-text-primary hover:underline">
            Sign up
          </button>
        </p>
      </div>
    </Modal>
  );
};

export default Login;
