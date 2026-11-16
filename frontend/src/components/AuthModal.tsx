import { useState, useEffect, useRef } from 'react';
import { X, Mail, Lock, User as UserIcon, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            auto_select?: boolean;
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: {
              theme?: 'outline' | 'filled_blue' | 'filled_black';
              size?: 'large' | 'medium' | 'small';
              text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
              shape?: 'rectangular' | 'pill' | 'circle' | 'square';
              width?: number | string;
            }
          ) => void;
          prompt: () => void;
        };
      };
    };
  }
}

export function AuthModal() {
  const {
    authModalOpen,
    closeAuthModal,
    authModalMode,
    setAuthModalMode,
    login,
    register,
    loginWithGoogle,
  } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const googleBtnRef = useRef<HTMLDivElement>(null);
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

  // Reset form when modal opens or switches mode
  useEffect(() => {
    if (authModalOpen) {
      setError(null);
      setEmail('');
      setPassword('');
      setFullName('');
    }
  }, [authModalOpen, authModalMode]);

  // Load and initialize Google Identity Services
  useEffect(() => {
    if (!authModalOpen) return;

    const scriptId = 'google-gsi-client';
    let script = document.getElementById(scriptId) as HTMLScriptElement | null;

    function initGsi() {
      if (!window.google?.accounts?.id || !googleClientId) return;

      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: async (response) => {
          try {
            setSubmitting(true);
            setError(null);
            await loginWithGoogle(response.credential);
          } catch (err: any) {
            setError(err.message || 'Google sign-in failed');
          } finally {
            setSubmitting(false);
          }
        },
      });

      if (googleBtnRef.current) {
        googleBtnRef.current.innerHTML = '';
        window.google.accounts.id.renderButton(googleBtnRef.current, {
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
          shape: 'rectangular',
          width: 320,
        });
      }
    }

    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = initGsi;
      document.body.appendChild(script);
    } else {
      initGsi();
    }
  }, [authModalOpen, googleClientId, loginWithGoogle]);

  if (!authModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password.trim()) {
      setError('Please fill in all required fields');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setSubmitting(true);
    try {
      if (authModalMode === 'register') {
        await register(email.trim(), password, fullName.trim() || undefined);
      } else {
        await login(email.trim(), password);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleManualGoogleClick = () => {
    if (googleClientId && window.google?.accounts?.id) {
      window.google.accounts.id.prompt();
    } else {
      setError('Google Sign-In requires VITE_GOOGLE_CLIENT_ID to be configured in your environment.');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(10, 8, 35, 0.75)', backdropFilter: 'blur(8px)' }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <div
        className="w-full max-w-md rounded-2xl p-6 md:p-8 relative shadow-2xl border"
        style={{
          background: '#17144F',
          borderColor: 'rgba(237, 240, 247, 0.12)',
          color: '#EDF0F7',
          fontFamily: 'DM Mono, monospace',
        }}
      >
        {/* Close button */}
        <button
          onClick={closeAuthModal}
          className="absolute top-5 right-5 p-1 rounded-full text-slate-400 hover:text-white transition-colors"
          aria-label="Close authentication modal"
          style={{ background: 'rgba(237,240,247,0.06)' }}
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <div
            className="text-2xl font-black mb-1"
            style={{ fontFamily: 'Syne Variable, Syne, sans-serif', color: '#EDF0F7' }}
            id="auth-modal-title"
          >
            Praman<span style={{ color: '#F2A93B' }}>.</span>
          </div>
          <p className="text-xs text-slate-400">
            {authModalMode === 'login'
              ? 'Sign in to access your risk screening workspace'
              : 'Create an account to start screening with verifiable proof'}
          </p>
        </div>

        {/* Tab switcher */}
        <div
          className="flex p-1 rounded-lg mb-6 border"
          style={{
            background: 'rgba(237, 240, 247, 0.04)',
            borderColor: 'rgba(237, 240, 247, 0.08)',
          }}
        >
          <button
            type="button"
            onClick={() => setAuthModalMode('login')}
            className={`flex-1 py-2 text-xs font-semibold rounded-md transition-all ${
              authModalMode === 'login' ? 'shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
            style={{
              background: authModalMode === 'login' ? '#F2A93B' : 'transparent',
              color: authModalMode === 'login' ? '#17144F' : 'inherit',
              fontFamily: 'Syne Variable, Syne, sans-serif',
            }}
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => setAuthModalMode('register')}
            className={`flex-1 py-2 text-xs font-semibold rounded-md transition-all ${
              authModalMode === 'register' ? 'shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
            style={{
              background: authModalMode === 'register' ? '#F2A93B' : 'transparent',
              color: authModalMode === 'register' ? '#17144F' : 'inherit',
              fontFamily: 'Syne Variable, Syne, sans-serif',
            }}
          >
            Create account
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div
            className="mb-5 p-3 rounded-lg flex items-start gap-2.5 text-xs border"
            style={{
              background: 'rgba(239, 68, 68, 0.1)',
              borderColor: 'rgba(239, 68, 68, 0.25)',
              color: '#FCA5A5',
            }}
            role="alert"
          >
            <AlertCircle size={15} className="mt-0.5 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Google Sign-In Container */}
        <div className="mb-5 flex flex-col items-center">
          <div ref={googleBtnRef} className="w-full flex justify-center min-h-[40px]">
            {/* Fallback button if GSI client is loading or not configured */}
            <button
              type="button"
              onClick={handleManualGoogleClick}
              disabled={submitting}
              className="w-full py-2.5 px-4 rounded-lg flex items-center justify-center gap-3 text-xs font-medium border transition-colors hover:bg-white/5"
              style={{
                borderColor: 'rgba(237, 240, 247, 0.18)',
                background: 'rgba(237, 240, 247, 0.05)',
                color: '#EDF0F7',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Continue with Google</span>
            </button>
          </div>
        </div>

        {/* Divider */}
        <div className="relative my-5 flex items-center justify-center">
          <div
            className="w-full border-t"
            style={{ borderColor: 'rgba(237, 240, 247, 0.1)' }}
          />
          <span
            className="absolute px-3 text-[10px] uppercase tracking-wider text-slate-400"
            style={{ background: '#17144F' }}
          >
            Or with email
          </span>
        </div>

        {/* Email & Password Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {authModalMode === 'register' && (
            <div>
              <label
                htmlFor="auth-fullname"
                className="block text-[11px] uppercase tracking-wider text-slate-400 mb-1.5"
              >
                Full Name (optional)
              </label>
              <div className="relative">
                <UserIcon
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  id="auth-fullname"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Alex Rivera"
                  className="w-full pl-9 pr-3 py-2 rounded-lg text-xs bg-slate-900/60 border focus:outline-none transition-colors"
                  style={{
                    borderColor: 'rgba(237, 240, 247, 0.15)',
                    color: '#EDF0F7',
                  }}
                />
              </div>
            </div>
          )}

          <div>
            <label
              htmlFor="auth-email"
              className="block text-[11px] uppercase tracking-wider text-slate-400 mb-1.5"
            >
              Email Address
            </label>
            <div className="relative">
              <Mail
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                id="auth-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="w-full pl-9 pr-3 py-2 rounded-lg text-xs bg-slate-900/60 border focus:outline-none transition-colors"
                style={{
                  borderColor: 'rgba(237, 240, 247, 0.15)',
                  color: '#EDF0F7',
                }}
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="auth-password"
              className="block text-[11px] uppercase tracking-wider text-slate-400 mb-1.5"
            >
              Password
            </label>
            <div className="relative">
              <Lock
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                id="auth-password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full pl-9 pr-3 py-2 rounded-lg text-xs bg-slate-900/60 border focus:outline-none transition-colors"
                style={{
                  borderColor: 'rgba(237, 240, 247, 0.15)',
                  color: '#EDF0F7',
                }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full mt-2 py-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-transform active:scale-[0.98] disabled:opacity-50"
            style={{
              background: '#F2A93B',
              color: '#17144F',
              fontFamily: 'Syne Variable, Syne, sans-serif',
            }}
          >
            {submitting ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>Processing...</span>
              </>
            ) : authModalMode === 'login' ? (
              'Sign In'
            ) : (
              'Create Account & Start'
            )}
          </button>
        </form>

        {/* Footer switch prompt */}
        <div className="mt-5 text-center text-xs text-slate-400">
          {authModalMode === 'login' ? (
            <p>
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => setAuthModalMode('register')}
                className="text-amber-400 hover:underline font-medium ml-1"
              >
                Sign up
              </button>
            </p>
          ) : (
            <p>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => setAuthModalMode('login')}
                className="text-amber-400 hover:underline font-medium ml-1"
              >
                Sign in
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
