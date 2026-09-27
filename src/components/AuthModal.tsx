import React, { useState } from 'react';
import { authService, UserProfile } from '../lib/authService';
import { Shield, Lock, Mail, User, Building, AlertCircle, ArrowRight, CheckCircle2, X } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'register';
  onAuthSuccess: (user: UserProfile) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'login',
  onAuthSuccess,
}) => {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'SOC Analyst' | 'Lead Engineer' | 'Security Officer' | 'Red Team Architect'>('SOC Analyst');
  const [organization, setOrganization] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setError(null);
    setSuccessMsg(null);
    setIsGoogleLoading(true);
    try {
      const res = await authService.loginWithGoogle();
      if (res.success && res.user) {
        setSuccessMsg(`Google Authentication verified. Welcome ${res.user.name}!`);
        setTimeout(() => {
          onAuthSuccess(res.user!);
          onClose();
        }, 600);
      } else {
        setError(res.error || 'Google sign-in could not be completed.');
      }
    } catch (e: any) {
      setError(e?.message || 'Google authentication error.');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setIsSubmitting(true);

    try {
      if (mode === 'register') {
        const res = await authService.registerWithEmail({
          name,
          email,
          password,
          role,
          organization: organization || 'Cyber Defense Unit'
        });

        if (res.success && res.user) {
          setSuccessMsg('Account registered and profile synced! Session authorized.');
          setTimeout(() => {
            onAuthSuccess(res.user!);
            onClose();
          }, 600);
        } else {
          setError(res.error || 'Failed to register account.');
        }
      } else {
        const res = await authService.loginWithEmail({
          email,
          password
        });

        if (res.success && res.user) {
          setSuccessMsg('Authentication confirmed. Welcome back.');
          setTimeout(() => {
            onAuthSuccess(res.user!);
            onClose();
          }, 500);
        } else {
          setError(res.error || 'Invalid credentials.');
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Authentication operation failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const fillDemoAccount = () => {
    setEmail('sarah.vance@defensesim.ai');
    setPassword('defense2026!');
    setMode('login');
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150">
      <div 
        className="relative w-full max-w-md bg-[#090d16] border border-slate-800 shadow-2xl rounded-xl p-6 sm:p-7 text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors p-1"
          aria-label="Close modal"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-9 h-9 rounded bg-cyan-950/80 border border-cyan-500/50 flex items-center justify-center text-cyan-400">
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-bold tracking-tight text-white font-heading">
              {mode === 'login' ? 'Authenticate Operator' : 'Register Operator Profile'}
            </h3>
            <p className="text-[11px] text-slate-400 font-mono">
              Firebase & Google Cloud Zero-Trust Vault
            </p>
          </div>
        </div>

        {/* Primary Action: Google Account Sign In */}
        <div className="mb-4">
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isGoogleLoading || isSubmitting}
            className="w-full flex items-center justify-center space-x-3 bg-white hover:bg-slate-100 text-slate-900 font-semibold py-2.5 px-4 rounded border border-slate-200 shadow-sm transition-all disabled:opacity-60 cursor-pointer text-xs"
          >
            {isGoogleLoading ? (
              <span className="font-mono">Authenticating with Google...</span>
            ) : (
              <>
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.15z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.16 0 9.98 0 12s.45 3.84 1.25 5.42l4.03-3.15z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                  />
                </svg>
                <span>
                  {mode === 'login' ? 'Sign in with Google' : 'Register with Google'}
                </span>
              </>
            )}
          </button>
        </div>

        {/* Divider */}
        <div className="relative flex py-2 items-center mb-3">
          <div className="flex-grow border-t border-slate-800"></div>
          <span className="flex-shrink mx-3 text-[10px] text-slate-500 uppercase font-mono tracking-wider">
            Or with operator credentials
          </span>
          <div className="flex-grow border-t border-slate-800"></div>
        </div>

        {/* Demo Fill Helper */}
        <div className="mb-4 p-2.5 rounded bg-[#03060c] border border-slate-800 flex items-center justify-between text-xs">
          <span className="text-slate-400 font-mono text-[11px]">Demo operator profile:</span>
          <button
            type="button"
            onClick={fillDemoAccount}
            className="text-cyan-400 hover:text-cyan-300 font-mono text-xs underline underline-offset-2 transition-colors cursor-pointer"
          >
            Fill Demo Account
          </button>
        </div>

        {/* Feedback banners */}
        {error && (
          <div className="mb-4 p-2.5 rounded bg-rose-950/70 border border-rose-500/40 text-rose-300 text-xs flex items-start space-x-2 font-mono">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
            <span>{error}</span>
          </div>
        )}
        {successMsg && (
          <div className="mb-4 p-2.5 rounded bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 text-xs flex items-center space-x-2 font-mono">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === 'register' && (
            <>
              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1">Full Name</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Commander Sarah Vance"
                    className="w-full bg-[#03060c] border border-slate-800 rounded pl-9 pr-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-mono text-slate-300 mb-1">Defense Role</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as any)}
                    className="w-full bg-[#03060c] border border-slate-800 rounded px-2.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500 font-mono"
                  >
                    <option value="SOC Analyst">SOC Analyst</option>
                    <option value="Lead Engineer">Lead Engineer</option>
                    <option value="Security Officer">Security Officer</option>
                    <option value="Red Team Architect">Red Team Architect</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-mono text-slate-300 mb-1">Organization</label>
                  <div className="relative">
                    <Building className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
                    <input
                      type="text"
                      value={organization}
                      onChange={(e) => setOrganization(e.target.value)}
                      placeholder="Agency / Corp"
                      className="w-full bg-[#03060c] border border-slate-800 rounded pl-8 pr-2.5 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-500 font-mono"
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-mono text-slate-300 mb-1">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="operator@organization.com"
                className="w-full bg-[#03060c] border border-slate-800 rounded pl-9 pr-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-500 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono text-slate-300 mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-[#03060c] border border-slate-800 rounded pl-9 pr-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-500 font-mono"
              />
            </div>
            {mode === 'register' && (
              <span className="text-[10px] text-slate-500 mt-1 block font-mono">Minimum 6 characters. Synced with Firebase Cloud Auth.</span>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting || isGoogleLoading}
            className="w-full mt-2 flex items-center justify-center space-x-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold py-2.5 px-4 rounded shadow-md shadow-cyan-950/50 transition-all disabled:opacity-50 cursor-pointer text-xs"
          >
            <span>{isSubmitting ? 'Verifying...' : mode === 'login' ? 'Sign In to Range' : 'Create Operator Account'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Mode Toggle */}
        <div className="mt-4 pt-3 border-t border-slate-800 text-center text-xs text-slate-400 font-mono">
          {mode === 'login' ? (
            <span>
              Don't have an operator profile yet?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setError(null);
                  setSuccessMsg(null);
                }}
                className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2 ml-1 cursor-pointer"
              >
                Register here
              </button>
            </span>
          ) : (
            <span>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setError(null);
                  setSuccessMsg(null);
                }}
                className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2 ml-1 cursor-pointer"
              >
                Sign in directly
              </button>
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
