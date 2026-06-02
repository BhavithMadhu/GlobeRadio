import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Trash2, 
  Play, 
  Activity, 
  Smartphone, 
  Key, 
  Check, 
  Copy, 
  Settings, 
  LogOut, 
  Clock, 
  Award,
  Lock,
  Compass,
  Radio,
  FileCheck
} from 'lucide-react';
import { User, FavoriteStation, RecentlyPlayed, RadioStation } from '../types';

interface DashboardProps {
  user: User;
  onLogout: () => void;
  onPlayStation: (station: any) => void;
  currentStation: RadioStation | null;
}

export default function Dashboard({ 
  user, 
  onLogout, 
  onPlayStation,
  currentStation
}: DashboardProps) {
  const [favorites, setFavorites] = useState<FavoriteStation[]>([]);
  const [recents, setRecents] = useState<RecentlyPlayed[]>([]);
  
  // 2FA Security states
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(user.twoFactorEnabled);
  const [isSettingUp2fa, setIsSettingUp2fa] = useState(false);
  const [setupData, setSetupData] = useState<{ secret: string; qrCode: string; recoveryCodes: string[] } | null>(null);
  const [verifyCode, setVerifyCode] = useState('');
  
  // Feedback alerts
  const [p2faError, setP2faError] = useState('');
  const [p2faSuccess, setP2faSuccess] = useState('');
  const [copiedSecret, setCopiedSecret] = useState(false);

  // Load User Data (favorites & played history)
  const loadUserData = async () => {
    try {
      const favRes = await fetch('/api/stations/favorites');
      if (favRes.ok) {
        const favData = await favRes.json();
        setFavorites(favData);
      }
      const recRes = await fetch('/api/stations/recents');
      if (recRes.ok) {
        const recData = await recRes.json();
        setRecents(recData);
      }
    } catch (err) {
      console.error('Failed to load user info:', err);
    }
  };

  useEffect(() => {
    loadUserData();
  }, [user, currentStation]);

  // Remove Favorite
  const handleRemoveFavorite = async (stationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/stations/favorites/${stationId}`, { method: 'DELETE' });
      if (res.ok) {
        setFavorites(favorites.filter(fav => fav.stationId !== stationId));
      }
    } catch (err) {
      console.error('Error deleting favorite:', err);
    }
  };

  // Turn Two-Factor Auth on/off
  const handle2faToggle = async () => {
    if (twoFactorEnabled) {
      // Disable 2FA
      if (confirm('Are you absolutely sure you want to disable 2FA? This will reduce account defense level.')) {
        try {
          const res = await fetch('/api/auth/2fa/disable', { method: 'POST' });
          if (res.ok) {
            setTwoFactorEnabled(false);
            setP2faSuccess('Two-factor authentication disabled successfully.');
          }
        } catch (err) {
          console.error('Failed to disable 2FA:', err);
        }
      }
    } else {
      // Start 2FA setup flow
      setIsSettingUp2fa(true);
      setP2faError('');
      setP2faSuccess('');
      try {
        const res = await fetch('/api/auth/2fa/setup');
        if (res.ok) {
          const data = await res.json();
          setSetupData(data);
        } else {
          setP2faError('Could not start 2FA configuration. Try again later.');
        }
      } catch (err) {
        console.error('Failed to start 2FA:', err);
        setP2faError('Network error starting 2FA.');
      }
    }
  };

  // Confirm TOTP Pin to enable 2FA
  const handleVerify2fa = async (e: React.FormEvent) => {
    e.preventDefault();
    setP2faError('');
    setP2faSuccess('');

    try {
      const res = await fetch('/api/auth/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: verifyCode })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Code verification failed.');

      setTwoFactorEnabled(true);
      setIsSettingUp2fa(false);
      setP2faSuccess('Two-Factor Authentication is fully secure and enabled!');
      setVerifyCode('');
    } catch (err: any) {
      setP2faError(err.message || 'Verification error occurred.');
    }
  };

  const handleCopySecret = () => {
    if (!setupData) return;
    navigator.clipboard.writeText(setupData.secret)
      .then(() => {
        setCopiedSecret(true);
        setTimeout(() => setCopiedSecret(false), 2000);
      });
  };

  return (
    <div className="space-y-8 animate-fade-in text-left">
      
      {/* 2FA Alerts inside settings */}
      {p2faSuccess && (
        <div className="p-4 rounded-xl bg-emerald-400/10 border border-emerald-400/20 text-emerald-300 text-xs font-semibold leading-relaxed flex items-center gap-2.5">
          <ShieldCheck className="w-4.5 h-4.5 text-emerald-400" />
          <span>{p2faSuccess}</span>
        </div>
      )}

      {/* User info banner block matches page 2 */}
      <section className="relative rounded-3xl overflow-hidden bg-[#0f0f0f]/80 backdrop-blur-xl border border-neutral-900 p-6 md:p-8 flex flex-col md:flex-row items-center gap-6 md:gap-8 shadow-2xl glass-panel">
        <div className="absolute inset-0 opacity-15 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 10% 20%, rgba(99,102,241,0.15) 0%, transparent 40%)' }} />
        
        <div className="relative shrink-0">
          <img
            alt="Profile Avatar Large"
            className="w-24 h-24 md:w-32 md:h-32 rounded-3xl bg-neutral-950 shadow-xl border-2 border-indigo-500/20"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuCC0slcUqDpJ6ZqETg_ccIkPmhmIqDvc8NJtCD-iosbbGLbkUI-siqAMFvnd5-960NAIY1twgXqs7FXcEHWQ55JSH6F--4ZuAuST4C9sAc52yvsOTFx2FL8vF8f4bEc-NY_vHXPsh6xZtbvlXEjaqCgcOTPR_v4yHSO6Z5LcsxLW-WXtXG4ckLU_AiiZGOfVDc27-qfH9Aj3c2OQl3D780SpPDKhFCoPCHJG7TRU54xviCYzl43kuwDWpdh5uk72pNTDR70kNTqwXw"
          />
          <div className="absolute -bottom-2 -right-2 bg-gradient-to-tr from-indigo-500 to-indigo-600 text-white rounded-full p-2 border-4 border-neutral-950 shadow-lg cursor-pointer">
            <Settings className="w-4.5 h-4.5" />
          </div>
        </div>

        <div className="text-center md:text-left space-y-2 flex-1">
          <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3">
            <h2 className="text-2xl font-bold tracking-tight text-neutral-200">
              {user.name}
            </h2>
            <span className="inline-flex self-center px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-xs font-semibold text-indigo-400 border border-indigo-500/20 shadow-[0_0_8px_rgba(99,102,241,0.05)]">
              LEVEL 42 SIGNAL EXPLORER
            </span>
          </div>
          
          <p className="text-xs text-neutral-400 font-medium leading-relaxed">
            Frequency 440Hz Authorized • Premium Subscriber since {' '}
            <span className="text-neutral-200 font-semibold">
              {new Date(user.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long' })}
            </span>
          </p>
          
          {/* Tag Badges row */}
          <div className="flex flex-wrap justify-center md:justify-start gap-1.5 mt-3.5">
            <span className="bg-neutral-900 text-neutral-400 px-3 py-1 rounded-full text-[10px] font-bold border border-neutral-800 uppercase">
              Audiophile
            </span>
            <span className="bg-neutral-900 text-neutral-400 px-3 py-1 rounded-full text-[10px] font-bold border border-neutral-800 uppercase">
              Synthesizer Fan
            </span>
            <span className="bg-neutral-900 text-neutral-400 px-3 py-1 rounded-full text-[10px] font-bold border border-neutral-800 uppercase">
              Shortwave Expert
            </span>
          </div>
        </div>

        {/* Listen Time panel */}
        <div className="md:ml-auto flex flex-col items-center gap-0.5 bg-neutral-900 border border-neutral-800 px-6 py-4.5 rounded-2xl shadow-md shrink-0 w-full md:w-auto">
          <p className="text-[10px] uppercase font-bold tracking-widest text-indigo-400 flex items-center gap-1.5 leading-none">
            <Clock className="w-3.5 h-3.5 animate-pulse" />
            Active Listen Time
          </p>
          <p className="font-extrabold text-3xl md:text-4xl text-indigo-300 mt-2 leading-none">
            1,428h
          </p>
        </div>
      </section>

      {/* Grid: Bento cards for Saved list & Played history */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Side: Saved/favorites stations list (8 cols of 12) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-neutral-200 flex items-center gap-2">
              <Compass className="text-indigo-400 w-5 h-5" />
              Saved Radio coordinate stations
            </h3>
            <span className="text-[10px] uppercase font-bold text-neutral-400 bg-neutral-900 px-2.5 py-1 rounded-full">
              {favorites.length} saved
            </span>
          </div>

          {favorites.length === 0 ? (
            <div className="p-8 text-center rounded-2xl border border-dashed border-neutral-800 bg-neutral-950">
              <Radio className="w-8 h-8 text-neutral-600 mx-auto mb-2.5 animate-pulse" />
              <p className="text-xs text-neutral-400 font-medium uppercase leading-relaxed">
                No coordinates saved in favorites yet. Return to map to save.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {favorites.map((fav) => (
                <div 
                  key={fav.id}
                  onClick={() => onPlayStation({
                    stationuuid: fav.stationId,
                    name: fav.name,
                    url: fav.url,
                    url_resolved: fav.url,
                    favicon: fav.favicon,
                    tags: fav.tags,
                    country: fav.country,
                    frequency: fav.frequency,
                    bitrate: fav.bitrate
                  })}
                  className={`relative p-3.5 rounded-2xl border flex items-center gap-4 transition-all cursor-pointer group bg-neutral-900/20 backdrop-blur-sm ${
                    currentStation?.stationuuid === fav.stationId 
                      ? 'border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.15)]' 
                      : 'border-neutral-900 hover:border-indigo-500/35 hover:bg-neutral-900/45'
                  }`}
                >
                  {/* Station Art */}
                  <div className="w-13.5 h-13.5 rounded-xl bg-neutral-950 overflow-hidden shrink-0 relative border border-neutral-900">
                    <img 
                      alt="Station Art" 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      src={fav.favicon || 'https://lh3.googleusercontent.com/aida-public/AB6AXuAAEHYcwac15ndrKFnBB1e2z8QgmeJd3TWWuayU6m-vWct5e9WWkyZmyzHTUjvhAoxSc5mKP6moS848TKUg6ISqIwq5_G8AogzcZty9bH3O1UKbORg-gG8IM5LEBrH5BvwOhhOsOL1ykPNGMnAwPuIVgMkwD5PtK1vHq6j_cmTB_HAaaphdD_irzPINj-g_FZbH8Cz7pvkHV9vuAFUUpXvnLKwc2P_Kwh5RPW6KaO-ubaUD5albVpK1FOFWQD77HV8Cvj3281SYCJM'}
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Play className="w-4 h-4 text-indigo-400 fill-indigo-400" />
                    </div>
                  </div>

                  {/* Title and metadata */}
                  <div className="flex-1 overflow-hidden text-left">
                    <p className="font-bold text-sm text-neutral-200 truncate group-hover:text-indigo-400 transition-colors leading-tight">
                      {fav.name}
                    </p>
                    <p className="text-[10px] text-neutral-400 font-medium mt-1 truncate">
                      {fav.frequency || 'Live Station'} • {fav.country || 'Global'}
                    </p>
                  </div>

                  {/* Delete trigger */}
                  <button 
                    onClick={(e) => handleRemoveFavorite(fav.stationId, e)}
                    className="text-neutral-400 hover:text-red-300 p-2 rounded-lg bg-transparent hover:bg-neutral-800 active:scale-95 transition-all cursor-pointer select-none"
                    title="Remove Favorite"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Side Column: History / Signal status stats (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-neutral-200 flex items-center gap-2">
              <Clock className="text-indigo-400 w-5 h-5" />
              Recently Tuned Signals
            </h3>

            <div className="bg-[#0f0f0f]/80 backdrop-blur-xl rounded-2xl p-2 pb-1.5 border border-neutral-900 glass-panel">
              {recents.length === 0 ? (
                <p className="text-xs text-neutral-400 py-8 text-center uppercase tracking-wider">
                  No playing history tracked.
                </p>
              ) : (
                <div className="space-y-0.5">
                  {recents.map((rec) => {
                    const isPlaying = currentStation?.stationuuid === rec.stationId;
                    return (
                      <div 
                        key={rec.id}
                        onClick={() => onPlayStation({
                          stationuuid: rec.stationId,
                          name: rec.name,
                          url: rec.url,
                          url_resolved: rec.url,
                          favicon: rec.favicon,
                          country: rec.country
                        })}
                        className={`flex items-center gap-3.5 p-2 rounded-xl transition-colors cursor-pointer group ${
                          isPlaying ? 'bg-indigo-500/10 text-indigo-400' : 'hover:bg-neutral-900/50'
                        }`}
                      >
                        <div className="w-8.5 h-8.5 rounded-lg bg-neutral-950 flex items-center justify-center relative shrink-0 border border-neutral-900">
                          <Radio className={`w-4 h-4 text-neutral-500 group-hover:hidden ${isPlaying ? 'text-indigo-400' : ''}`} />
                          <div className={`hidden group-hover:flex items-center gap-0.5 h-3.5`}>
                            <span className="w-0.5 bg-indigo-500 rounded h-1 animate-pulse" />
                            <span className="w-0.5 bg-indigo-500 rounded h-3.5 animate-pulse [animation-delay:0.2s]" />
                            <span className="w-0.5 bg-indigo-500 rounded h-2 animate-pulse [animation-delay:0.1s]" />
                          </div>
                        </div>

                        <div className="flex-1 overflow-hidden text-left">
                          <p className={`text-xs font-bold truncate leading-tight group-hover:text-indigo-400 transition-colors ${isPlaying ? 'text-indigo-400' : 'text-neutral-205 text-neutral-200'}`}>
                            {rec.name}
                          </p>
                          <p className="text-[9px] text-neutral-400 leading-normal leading-none mt-0.5">
                            {new Date(rec.playedAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })} • {rec.country || 'Global'}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Connectivity Quality Gauge Card */}
          <div className="bg-indigo-500/5 p-5 rounded-2xl border border-indigo-500/10 shadow-lg">
            <div className="flex items-center justify-between font-semibold">
              <span className="text-[10px] text-indigo-400 uppercase tracking-wider">
                Signal Integrity Gauge
              </span>
              <span className="text-indigo-400 text-xs font-bold uppercase tracking-wider">
                Optimal (100%)
              </span>
            </div>
            {/* Visual Signal waveform columns stack */}
            <div className="flex items-end gap-1 h-9 mt-4.5 bg-neutral-950 rounded px-3 py-1.5 border border-neutral-900">
              <div className="w-full bg-indigo-400/20 rounded-full h-1 animate-pulse" />
              <div className="w-full bg-indigo-400/30 rounded-full h-1.5 [animation-delay:0.1s] animate-pulse" />
              <div className="w-full bg-indigo-500/40 rounded-full h-2.5 [animation-delay:0.3s] animate-pulse" />
              <div className="w-full bg-indigo-500/50 rounded-full h-1 [animation-delay:0.2s] animate-pulse" />
              <div className="w-full bg-indigo-500 rounded-full h-4 animate-pulse" />
              <div className="w-full bg-indigo-400/65 rounded-full h-2 [animation-delay:0.4s] animate-pulse" />
            </div>
            <p className="text-[10px] font-semibold text-neutral-400 mt-3 flex items-center justify-between">
              <span>PING: 24ms</span>
              <span>PACKET LOSS: 0%</span>
            </p>
          </div>
        </div>

      </div>

      {/* Profile Security Settings row */}
      <section className="space-y-4">
        <h3 className="text-lg font-bold text-neutral-200 flex items-center gap-2">
          <Lock className="text-indigo-400 w-5 h-5" />
          Node Security & Multi-Factor Settings
        </h3>

        <div className="bg-[#0f0f0f]/80 backdrop-blur-xl rounded-2xl border border-neutral-900 p-6 shadow-2xl glass-panel relative overflow-hidden text-left">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            
            <div className="space-y-1.5 text-left max-w-xl">
              <div className="flex items-center gap-2.5">
                <h4 className="text-base font-bold text-neutral-200">
                  Two-Factor Authentication (2FA)
                </h4>
                <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full border uppercase tracking-wider ${
                  twoFactorEnabled 
                    ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20 shadow-[0_0_8px_rgba(99,102,241,0.1)]' 
                    : 'bg-red-500/10 text-red-400 border-red-500/10'
                }`}>
                  {twoFactorEnabled ? 'PROTECTED' : 'DISABLED'}
                </span>
              </div>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Add defensive cryptographic authentication checks during sign-in. Protect profile data, favorites, and secure listener statistics using TOTP authenticator tokens.
              </p>
            </div>

            <div>
              {/* Checkbox toggle styled as a premium switch */}
              <label className="relative inline-flex items-center cursor-pointer group">
                <input 
                  type="checkbox" 
                  className="sr-only peer"
                  checked={twoFactorEnabled}
                  onChange={handle2faToggle}
                />
                <div className="w-14 h-7 bg-neutral-800 peer-focus:outline-none rounded-full peer peer-checked:peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-neutral-950 after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-indigo-600" />
                <span className="ms-3 text-xs font-bold text-neutral-400 group-hover:text-indigo-400 transition-colors leading-none uppercase tracking-wider select-none">
                  Defensive Core Toggle
                </span>
              </label>
            </div>

          </div>

          {/* Active Setup Overlay block matches page 2 settings */}
          {isSettingUp2fa && setupData && (
            <div className="mt-6 pt-6 border-t border-neutral-900 text-left space-y-6">
              
              <div className="p-4 bg-neutral-900/40 border border-neutral-900 rounded-2xl flex flex-col md:flex-row items-center gap-6 justify-between gap-4">
                <div className="space-y-1.5 flex-1">
                  <p className="text-sm font-bold text-indigo-400 flex items-center gap-2">
                    <Smartphone className="w-4.5 h-4.5" />
                    Step 1: Scan Authenticator QR Code
                  </p>
                  <p className="text-xs text-neutral-400 max-w-lg leading-relaxed">
                    Scan this QR code using Google Authenticator, Authy, or Microsoft Authenticator. Alternatively, write the raw secret directly into your app.
                  </p>
                  
                  {/* Raw Secret code container */}
                  <div className="pt-2">
                    <span className="text-[10px] text-neutral-400 uppercase font-bold tracking-wider">Raw base32 secret</span>
                    <div className="bg-neutral-950 border border-neutral-800 px-3.5 py-2.5 rounded-xl flex items-center justify-between gap-3 mt-1 w-full max-w-md font-mono select-all">
                      <span className="text-indigo-400 text-xs font-semibold tracking-wider break-all leading-relaxed">
                        {setupData.secret}
                      </span>
                      <button 
                        onClick={handleCopySecret}
                        className="text-neutral-400 hover:text-indigo-400 transition-colors p-1"
                        title="Copy text secret"
                      >
                        {copiedSecret ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* QR Code Container */}
                <div className="bg-white p-3 rounded-lg flex items-center justify-center shrink-0 border border-neutral-800 shadow-lg">
                  <img src={setupData.qrCode} alt="TOTP QR Code" className="w-32 h-32 select-none" />
                </div>
              </div>

              {/* Recovery Codes panel block */}
              <div className="p-4 bg-neutral-950/40 border border-neutral-900 rounded-2xl space-y-3">
                <div className="flex items-center gap-2 text-sm font-bold text-indigo-400">
                  <Key className="w-4 h-4" />
                  <span>Important: Save Emergency Backup Recovery Codes</span>
                </div>
                <p className="text-xs text-neutral-400 leading-relaxed max-w-2xl">
                  Store these recovery codes securely. If you lose access to your phone/authenticator app, you can use these to recover access. Each code can be consumed once.
                </p>
                
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2.5 font-mono text-center">
                  {setupData.recoveryCodes.map((code, index) => (
                    <div key={index} className="bg-neutral-950 border border-neutral-900 rounded-xl px-2.5 py-1.5 text-xs text-neutral-200 font-semibold tracking-wider">
                      {code}
                    </div>
                  ))}
                </div>
              </div>

              {/* Verify form panel */}
              <form onSubmit={handleVerify2fa} className="p-4 bg-neutral-900/60 border border-neutral-800 rounded-2xl flex flex-col sm:flex-row items-end gap-4">
                <div className="flex-1 space-y-1.5 text-left w-full">
                  <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider block">
                    Confirm setup code from app
                  </label>
                  <input
                    type="text"
                    required
                    value={verifyCode}
                    onChange={(e) => setVerifyCode(e.target.value)}
                    placeholder="e.g. 123456"
                    className="w-full bg-neutral-950 text-white tracking-widest text-center border border-neutral-800 rounded-xl focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 py-2.5 font-mono outline-none"
                  />
                </div>
                <div className="flex gap-2 w-full sm:w-auto shrink-0 mt-3 md:mt-0 justify-end">
                  <button 
                    type="button"
                    onClick={() => {
                      setIsSettingUp2fa(false);
                      setSetupData(null);
                      setVerifyCode('');
                    }}
                    className="px-5 py-2.5 rounded-xl bg-neutral-850 hover:bg-neutral-800 text-xs text-neutral-400 font-semibold uppercase transition-colors cursor-pointer"
                  >
                    Cancel Setup
                  </button>
                  <button 
                    type="submit"
                    className="px-6 py-2.5 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 font-bold text-xs uppercase shadow-[0_0_12px_rgba(99,102,241,0.2)] transition-colors cursor-pointer"
                  >
                    Verify & Activate
                  </button>
                </div>
              </form>

            </div>
          )}

          {p2faError && (
            <div className="mt-4 p-3 rounded-xl bg-red-400/10 border border-red-500/20 text-red-300 text-xs font-semibold">
              {p2faError}
            </div>
          )}

        </div>
      </section>

      {/* Sign out node trigger row */}
      <div className="flex justify-start">
        <button 
          onClick={onLogout}
          className="bg-red-500/10 border border-red-500/10 hover:bg-red-500/20 text-red-400 font-bold text-xs px-5 py-2.5 rounded-xl flex items-center gap-2 active:scale-95 transition-all cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          Disconnect Account Node (Sign Out)
        </button>
      </div>

    </div>
  );
}
