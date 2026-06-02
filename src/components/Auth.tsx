import React, { useState } from 'react';
import { X, Lock, Mail, User, ShieldCheck, ArrowRight, Eye, EyeOff, KeyRound } from 'lucide-react';

interface AuthProps {
  onClose: () => void;
  onLoginSuccess: (user: any) => void;
}

export default function Auth({ onClose, onLoginSuccess }: AuthProps) {
  const [mode, setMode] = useState<'signin' | 'signup' | 'reset'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [conPass, setConPass] = useState('');
  const [showPass, setShowPass] = useState(false);
  
  // 2FA login mode states
  const [requires2fa, setRequires2fa] = useState(false);
  const [totpCode, setTotpCode] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // Submit forms
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      if (mode === 'signup') {
        if (!email || !password || !name) {
          throw new Error('All fields are required.');
        }
        if (password !== conPass) {
          throw new Error('Passwords do not match.');
        }

        const res = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, name })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Signup failed.');
        
        onLoginSuccess(data.user);
        onClose();
      } else if (mode === 'signin') {
        if (requires2fa) {
          // Verify 2FA challenge code
          const res = await fetch('/api/auth/totp-challenge', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code: totpCode })
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || '2FA code verification failed.');

          onLoginSuccess(data.user);
          onClose();
        } else {
          // Standard login attempt
          const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Login failed.');

          if (data.requiresTwoFactor) {
            setRequires2fa(true);
            setLoading(false);
          } else {
            onLoginSuccess(data.user);
            onClose();
          }
        }
      } else if (mode === 'reset') {
        if (!email || !password) {
          throw new Error('Please enter both your email and the desired new password.');
        }
        const res = await fetch('/api/auth/reset-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, newPassword: password })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Reset failed.');

        setMessage('Your password has been successfully reset! You can now sign in.');
        setMode('signin');
        setPassword('');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 text-left">
      {/* Dark backdrop blur */}
      <div 
        onClick={onClose}
        className="absolute inset-0 bg-black/80 backdrop-blur-md" 
      />

      <div className="relative w-full max-w-md bg-neutral-900/95 border border-neutral-800 rounded-2xl p-6 md:p-8 shadow-2xl glass-panel text-left z-10 overflow-hidden shrink-0">
        <div className="absolute inset-0 opacity-15 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 10% 20%, rgba(99,102,241,0.15) 0%, transparent 40%)' }} />

        {/* Head header */}
        <div className="flex items-center justify-between mb-6 relative">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-neutral-200">
              {requires2fa 
                ? 'Security Verification' 
                : mode === 'signin' 
                  ? 'Access Stream Node' 
                  : mode === 'signup' 
                    ? 'Forge Signal Connection' 
                    : 'System Coordinate Reset'}
            </h2>
            <p className="text-xs text-indigo-400 mt-1 font-semibold tracking-wide uppercase">
              {requires2fa ? 'Two-Factor Challenge' : 'GlobeRadio Encryption Protocol'}
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 active:scale-95 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Alert handlers */}
        {error && (
          <div className="mb-5 p-3 rounded-xl bg-red-400/10 border border-red-400/20 text-red-300 text-xs font-semibold leading-relaxed">
            {error}
          </div>
        )}
        {message && (
          <div className="mb-5 p-3 rounded-xl bg-emerald-400/10 border border-emerald-400/20 text-emerald-300 text-xs font-semibold leading-relaxed">
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4.5 relative">
          
          {requires2fa ? (
            <div className="space-y-4">
              <div className="text-center p-4 bg-neutral-950 rounded-xl border border-neutral-800">
                <p className="text-xs text-neutral-400 leading-relaxed">
                  Enter the 6-digit verification code from your authenticator application (Google Authenticator, Authy, etc.) or a recovery code to sync logs.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider block">
                  Verify 2FA Pin / Recovery Code
                </label>
                <div className="relative">
                  <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-550 w-4.5 h-4.5 text-indigo-400" />
                  <input
                    type="text"
                    required
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value)}
                    placeholder="e.g. 123456 or a8b6c4d2"
                    className="w-full bg-neutral-950 text-neutral-200 font-semibold tracking-wider placeholder:text-neutral-600 text-center border border-neutral-800 rounded-xl focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 py-2.5 font-mono outline-none"
                  />
                </div>
              </div>
            </div>
          ) : (
            <>
              {mode === 'signup' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider block">
                    Your Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500 w-4.5 h-4.5" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Alex Vance"
                      className="w-full bg-neutral-950 text-neutral-200 placeholder:text-neutral-600 border border-neutral-800 rounded-xl focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 pl-11 pr-4 py-2.5 text-sm outline-none"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider block">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500 w-4.5 h-4.5" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="alex@signal.com"
                    className="w-full bg-neutral-950 text-neutral-200 placeholder:text-neutral-600 border border-neutral-800 rounded-xl focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 pl-11 pr-4 py-2.5 text-sm outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider block">
                    {mode === 'reset' ? 'Desired New Password' : 'Secure Password'}
                  </label>
                  {mode === 'signin' && (
                    <button 
                      type="button"
                      onClick={() => setMode('reset')}
                      className="text-[10px] text-indigo-451 text-indigo-400 hover:underline uppercase tracking-wide font-semibold cursor-pointer"
                    >
                      Forgot?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500 w-4.5 h-4.5" />
                  <input
                    type={showPass ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-neutral-950 text-neutral-200 placeholder:text-neutral-600 border border-neutral-800 rounded-xl focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 pl-11 pr-11 py-2.5 text-sm font-mono outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-200 cursor-pointer p-1"
                  >
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {mode === 'signup' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider block">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500 w-4.5 h-4.5" />
                    <input
                      type={showPass ? 'text' : 'password'}
                      required
                      value={conPass}
                      onChange={(e) => setConPass(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-neutral-950 text-neutral-200 placeholder:text-neutral-600 border border-neutral-800 rounded-xl focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 pl-11 pr-4 py-2.5 text-sm font-mono outline-none"
                    />
                  </div>
                </div>
              )}
            </>
          )}

          {/* Submit action trigger */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-4 bg-indigo-600 disabled:opacity-50 text-white font-bold text-sm py-3 rounded-full hover:bg-indigo-700 shadow-[0_0_20px_rgba(99,102,241,0.25)] hover:shadow-[0_0_25px_rgba(99,102,241,0.4)] transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            ) : (
              <>
                <span>
                  {requires2fa
                    ? 'Validate Security Credentials'
                    : mode === 'signin'
                      ? 'Decrypt Signal Stream'
                      : mode === 'signup'
                        ? 'Join Signal Network'
                        : 'Deploy System Override'}
                </span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Footer toggles list */}
        <div className="mt-6 pt-5 border-t border-neutral-800 text-center">
          {requires2fa ? (
            <button
              onClick={() => {
                setRequires2fa(false);
                setTotpCode('');
                setError('');
              }}
              className="text-xs text-neutral-400 hover:text-indigo-400 hover:underline cursor-pointer py-1"
            >
              Back to general login
            </button>
          ) : (
            <p className="text-xs text-neutral-4005 text-neutral-400">
              {mode === 'signin' ? (
                <>
                  New coordinate?{' '}
                  <button 
                    onClick={() => { setMode('signup'); setError(''); }} 
                    className="text-indigo-400 font-bold hover:underline cursor-pointer"
                  >
                    Join Signal
                  </button>
                </>
              ) : mode === 'signup' ? (
                <>
                  Already connected?{' '}
                  <button 
                    onClick={() => { setMode('signin'); setError(''); }} 
                    className="text-indigo-400 font-bold hover:underline cursor-pointer"
                  >
                    Sign In
                  </button>
                </>
              ) : (
                <button 
                  onClick={() => { setMode('signin'); setError(''); }} 
                  className="text-indigo-400 font-bold hover:underline cursor-pointer"
                >
                  Return to login
                </button>
              )}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
