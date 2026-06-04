import React, { useState, useEffect,useRef} from 'react';
import { 
  Radio, 
  MapPin, 
  TrendingUp, 
  Compass, 
  Heart, 
  Settings, 
  Menu, 
  X, 
  Activity, 
  Users, 
  Search, 
  HelpCircle, 
  ChevronRight, 
  ArrowRight,
  Sparkles,
  Info,
  Play
} from 'lucide-react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import Globe from './components/Globe';
import Player from './components/Player';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import { User, RadioStation } from './types';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  
  // View states
  const [activeView, setActiveView] = useState<string>('home');
  const [authOpen, setAuthOpen] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  // Search & Navigation States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('Japan'); // default starting country
  const [stations, setStations] = useState<RadioStation[]>([]);
  const [loadingStations, setLoadingStations] = useState(false);
  const [currentStation, setCurrentStation] = useState<RadioStation | null>(null);
  const analyticsSessionRef = useRef<string | null>(null);
  // List of station favors (savedUUIDs)
  const [favoriteUUIDs, setFavoriteUUIDs] = useState<string[]>([]);

  // Static stats
  const [activeSignals, setActiveSignals] = useState(14209);
  const [listenersCount, setListenersCount] = useState('248.5K');

  // Authenticate user on load
  const checkAuthStatus = async () => {
    try {
      const res = await fetch('/api/auth/status');
      if (res.ok) {
        const data = await res.json();
        if (data.authenticated && data.user) {
          setUser(data.user);
          // Load favorites
          const favRes = await fetch('/api/stations/favorites');
          if (favRes.ok) {
            const favData = await favRes.json();
            setFavoriteUUIDs(favData.map((f: any) => f.stationId));
          }
        }
      }
    } catch (err) {
      console.warn('Network auth check failed. Running offline.', err);
    }
  };

  useEffect(() => {
    checkAuthStatus();
  }, []);

  // Sync / Fetch radio signals for the locked globe node
  const fetchRadioSignals = async (countryName: string, queryText = '') => {
    setLoadingStations(true);
    try {
      const params = new URLSearchParams();
      if (countryName) params.append('country', countryName);
      if (queryText) params.append('query', queryText);

      const res = await fetch(`/api/stations/search?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setStations(data);

        // Auto select first loaded station as playing if none selected
        if (data.length > 0 && !currentStation) {
          setCurrentStation(data[0]);
        }
      }
    } catch (err) {
      console.error('Failed to query radio signals:', err);
    } finally {
      setLoadingStations(false);
    }
  };

  // Run initial lookup for default country 'Japan'
  useEffect(() => {
    fetchRadioSignals(selectedCountry, searchQuery);
  }, [selectedCountry]);

  // Handle keyword searching with debounce/filter
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchRadioSignals(selectedCountry, searchQuery);
    }, 600);
    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  // Polling simulated signals
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSignals(prev => prev + Math.floor(Math.random() * 6) - 3);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const handleSelectCountry = (country: string) => {
    setSelectedCountry(country);
    setActiveView('home'); // return to world map focus
  };

  // Toggle Favorite
  const handleToggleFavorite = async (station: RadioStation) => {
    if (!user) {
      setAuthOpen(true);
      return;
    }

    const isFav = favoriteUUIDs.includes(station.stationuuid);
    try {
      if (isFav) {
        // Delete
        const res = await fetch(`/api/stations/favorites/${station.stationuuid}`, {
          method: 'DELETE'
        });
        if (res.ok) {
          setFavoriteUUIDs(prev => prev.filter(id => id !== station.stationuuid));
        }
      } else {
        // Save
        const res = await fetch('/api/stations/favorites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            stationId: station.stationuuid,
            name: station.name,
            url: station.url,
            favicon: station.favicon,
            tags: station.tags,
            country: station.country,
            frequency: station.frequency,
            bitrate: station.bitrate ? String(station.bitrate) : 'HQ'
          })
        });
        if (res.ok) {
          setFavoriteUUIDs(prev => [...prev, station.stationuuid]);
        }
      }
    } catch (err) {
      console.error('Failed to change favorite coordinate:', err);
    }
  };

  // Plays a station and registers into played history logs
const handlePlayStation = async (station: any) => {
  setCurrentStation(station);

  if (!user) return;

  try {
    // End previous listening session
    if (analyticsSessionRef.current) {
      await fetch('/api/analytics/end', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          sessionId: analyticsSessionRef.current,
        }),
      });

      analyticsSessionRef.current = null;
    }

    // Record recent station
    await fetch('/api/stations/recents', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        stationId: station.stationuuid,
        name: station.name,
        url: station.url,
        favicon: station.favicon,
        country: station.country,
      }),
    });

    // Start new listening session
    const analyticsResponse = await fetch('/api/analytics/start', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        stationId: station.stationuuid,
        stationName: station.name,
      }),
    });

    if (analyticsResponse.ok) {
      const session = await analyticsResponse.json();
      analyticsSessionRef.current = session.id;
    }
  } catch (err) {
    console.warn('Failed to track listening analytics:', err);
  }
};

  const handleNextStation = () => {
    if (stations.length === 0 || !currentStation) return;
    const currentIndex = stations.findIndex(st => st.stationuuid === currentStation.stationuuid);
    const nextIndex = (currentIndex + 1) % stations.length;
    handlePlayStation(stations[nextIndex]);
  };

  const handlePrevStation = () => {
    if (stations.length === 0 || !currentStation) return;
    const currentIndex = stations.findIndex(st => st.stationuuid === currentStation.stationuuid);
    const prevIndex = (currentIndex - 1 + stations.length) % stations.length;
    handlePlayStation(stations[prevIndex]);
  };

 const handleLogout = async () => {
  try {
    // End active listening session before logout
    if (analyticsSessionRef.current) {
      try {
        await fetch('/api/analytics/end', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            sessionId: analyticsSessionRef.current,
          }),
        });

        analyticsSessionRef.current = null;
      } catch (err) {
        console.warn('Failed to end listening session on logout:', err);
      }
    }

    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
    });

    setUser(null);
    setFavoriteUUIDs([]);
    setActiveView('home');
  } catch (err) {
    console.error('Logout error:', err);
  }
};
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans select-none overflow-x-hidden pb-32">
      
      {/* Glow ambient background graphics */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-indigo-500/5 blur-[120px] pointer-events-none -z-10" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] rounded-full bg-violet-500/3 blur-[120px] pointer-events-none -z-10" />

      {/* Global Application Header */}
      <Header 
        user={user}
        onOpenAuth={() => setAuthOpen(true)}
        onNavigateToDashboard={() => setActiveView('dashboard')}
        onNavigateToHome={() => setActiveView('home')}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onToggleDrawer={() => setMobileDrawerOpen(!mobileDrawerOpen)}
        activeView={activeView}
      />

      {/* Main shell layout container: Sidebar + content */}
      <div className="flex-1 flex pt-16 relative">
        
        {/* Persistent side navigation layout (Desktop) */}
        <Sidebar 
          user={user}
          activeView={activeView}
          onNavigateToView={(view) => {
            setActiveView(view);
            setMobileDrawerOpen(false);
          }}
          onOpenAuth={() => setAuthOpen(true)}
          onLogout={handleLogout}
        />

        {/* Central interactive grid frame */}
        <main className="flex-1 overflow-y-auto px-4 py-6 md:p-6 lg:p-8 flex flex-col gap-8 justify-between">
          
          {activeView === 'home' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-end relative">
              
              {/* Radio Station Info Card (Bento Minimalist) - Left column (4 of 12) */}
              <div className="lg:col-span-4 lg:mb-4 select-text">
                <div className="bg-neutral-900/30 rounded-3xl border border-neutral-800 p-5 md:p-6 shadow-2xl backdrop-blur-md text-left relative overflow-hidden group hover:border-indigo-500/30 transition-all">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-[30px] rounded-full pointer-events-none" />
                  
                  {/* Status header matches screenshot */}
                  <div className="flex items-start justify-between mb-5">
                    <div>
                      <span className="inline-block px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 text-[9px] font-bold tracking-[0.15em] uppercase mb-1.5 border border-indigo-500/20">
                        Signal coordinate locked
                      </span>
                      <h2 className="text-xl md:text-2xl font-bold text-neutral-100 truncate pr-2 max-w-[210px] bg-gradient-to-r from-white via-neutral-100 to-neutral-400 bg-clip-text text-transparent">
                        {currentStation ? currentStation.name : 'Awaiting Tuner'}
                      </h2>
                    </div>
                    <Radio className="w-5 h-5 text-indigo-400 animate-pulse shrink-0" />
                  </div>

                  {/* Frequency rows details list */}
                  <div className="space-y-2.5 mb-5 select-all">
                    <div className="flex justify-between items-center text-xs text-neutral-400 font-medium">
                      <span>Frequency</span>
                      <span className="font-mono font-bold text-indigo-400">
                        {currentStation?.frequency || '87.5 MHz'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs text-neutral-400 font-medium">
                      <span>Bitrate Audio</span>
                      <span className="font-mono font-bold text-neutral-200">
                        {currentStation?.bitrate ? `${currentStation.bitrate}kbps HQ` : '192kbps Standard'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs text-neutral-400 font-medium">
                      <span>Country Coordinate</span>
                      <span className="flex items-center gap-1 font-semibold text-neutral-100">
                        <MapPin className="w-3.5 h-3.5 text-indigo-400" />
                        {currentStation?.country || 'Global Signal'}
                      </span>
                    </div>
                  </div>

                  {/* Horizontal wave line design matches screenshot */}
                  <div className="h-[2px] bg-gradient-to-r from-transparent via-indigo-500 to-transparent w-full opacity-60 mb-5 relative overflow-hidden">
                    <div className="absolute inset-0 bg-indigo-500 translate-x-[-100%] animate-wave-move" style={{ animation: 'wave-move 2.5s infinite linear' }} />
                  </div>

                  {/* Album Cover bottom part */}
                  <div className="flex items-center gap-3.5">
                    <div className="w-13 h-13 rounded-xl overflow-hidden border border-neutral-800 shrink-0 bg-neutral-950">
                      <img 
                        alt="Synth cover Art" 
                        className="w-full h-full object-cover select-none animate-pulse"
                        src={currentStation?.favicon || 'https://lh3.googleusercontent.com/aida-public/AB6AXuA1P7j4eSsAUBx2GxynQnN9m-O9Y5Gy7Rbce8X-TU-P26JJ1SZCqa3FIuA35jLRPITqsUrRpSjtYdgH7Z7bNBAMks_O1wr7YvA789GHexZxeO8akLFf2UlR4B2q2O6wX9lYGRZ6qB7Q3jmvseALUTh_F__Cry8F3M2ZUDrXB98Jnpw7xWo7po-rEl-W-hqwQe1z-ga3JwAhoBkADLjjT-HQFOj7sgISeVobvNyTpfjfctX-kw8JqiObDJdA6hzh0NSmcgHhxj3d-VE'}
                        onError={(e) => {
                          e.currentTarget.src = 'https://lh3.googleusercontent.com/aida-public/AB6AXuA1P7j4eSsAUBx2GxynQnN9m-O9Y5Gy7Rbce8X-TU-P26JJ1SZCqa3FIuA35jLRPITqsUrRpSjtYdgH7Z7bNBAMks_O1wr7YvA789GHexZxeO8akLFf2UlR4B2q2O6wX9lYGRZ6qB7Q3jmvseALUTh_F__Cry8F3M2ZUDrXB98Jnpw7xWo7po-rEl-W-hqwQe1z-ga3JwAhoBkADLjjT-HQFOj7sgISeVobvNyTpfjfctX-kw8JqiObDJdA6hzh0NSmcgHhxj3d-VE';
                        }}
                      />
                    </div>
                    <div className="overflow-hidden text-left">
                      <p className="text-xs font-bold text-neutral-200 truncate max-w-[170px]">
                        {currentStation?.tags ? currentStation.tags.split(',')[0] : 'Electronic Live'} Ambient
                      </p>
                      <p className="text-[10px] text-neutral-400 font-semibold mt-0.5 truncate uppercase">
                        {currentStation?.codec || 'MP3'} Audio Feed
                      </p>
                    </div>
                  </div>

                </div>
              </div>

              {/* Center Map 3D interactive spinning Globe (5 of 12) */}
              <div className="lg:col-span-5 h-[360px] md:h-[480px] flex items-center justify-center relative">
                <Globe 
                  onSelectCountry={handleSelectCountry}
                  selectedCountry={selectedCountry}
                />
              </div>

              {/* Sidebar Stats and Nodes Cards - Right column (3 of 12) */}
              <div className="lg:col-span-3 lg:mb-4 space-y-4">
                
                {/* Active signals card */}
                <div className="bg-neutral-900/30 rounded-2xl p-4.5 border border-neutral-800 flex items-center gap-4.5 shadow-2xl backdrop-blur-md group hover:border-indigo-500/25 transition-all text-left">
                  <div className="w-11 h-11 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-neutral-800 shadow-inner">
                    <Radio className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <p className="text-[9px] uppercase font-bold tracking-wider text-neutral-400 leading-none">
                      Active Transmitted Signals
                    </p>
                    <p className="font-mono text-xl font-bold text-neutral-200 mt-2 leading-none">
                      {activeSignals.toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Total listeners card */}
                <div className="bg-neutral-900/30 rounded-2xl p-4.5 border border-neutral-800 flex items-center gap-4.5 shadow-2xl backdrop-blur-md group hover:border-indigo-500/25 transition-all text-left">
                  <div className="w-11 h-11 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-neutral-800 shadow-inner">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[9px] uppercase font-bold tracking-wider text-neutral-400 leading-none">
                      Global Listening Nodes
                    </p>
                    <p className="font-mono text-xl font-bold text-neutral-200 mt-2 leading-none">
                      {listenersCount}
                    </p>
                  </div>
                </div>

                {/* Local search / Selector dropdown */}
                <div className="bg-neutral-900/30 rounded-2xl p-4 border border-neutral-800 shadow-2xl backdrop-blur-md text-left space-y-2">
                  <span className="text-[9px] uppercase font-bold tracking-widest text-indigo-400">Quick Tuning Nodes</span>
                  <select 
                    value={selectedCountry}
                    onChange={(e) => setSelectedCountry(e.target.value)}
                    className="w-full bg-neutral-900 text-xs font-semibold text-neutral-200 border border-neutral-800 rounded-xl px-3.5 py-2.5 focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 transition-all cursor-pointer shadow-inner outline-none"
                  >
                    <option value="Japan">Japan (Japan HQ)</option>
                    <option value="Germany">Germany (Berlin FM)</option>
                    <option value="United Kingdom">United Kingdom (London FM)</option>
                    <option value="United States">United States (New York US)</option>
                    <option value="France">France (Paris Ambient)</option>
                    <option value="Australia">Australia (Sydney FM)</option>
                    <option value="Brazil">Brazil (Rio Tech)</option>
                    <option value="Canada">Canada (Canada HQ)</option>
                    <option value="South Africa">South Africa (Cape Town)</option>
                    <option value="India">India (Mumbai City)</option>
                    <option value="Spain">Spain (Madrid Feed)</option>
                    <option value="Iceland">Iceland (Reykjavik Chill)</option>
                  </select>
                </div>

              </div>

              {/* Scroller bottom results lists panel under the Globe */}
              <div className="lg:col-span-12 mt-6">
                <div className="flex border-b border-neutral-900 pb-3 items-center justify-between">
                  <h3 className="text-base font-bold text-neutral-100 flex items-center gap-2">
                    <TrendingUp className="w-4.5 h-4.5 text-indigo-400" />
                    <span>Signals from {selectedCountry}</span>
                    {loadingStations && (
                      <span className="w-3.5 h-3.5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></span>
                    )}
                  </h3>
                  <span className="text-xs text-neutral-400">{stations.length} channels loaded</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4 select-text">
                  {stations.map((st) => {
                    const isFav = favoriteUUIDs.includes(st.stationuuid);
                    const isPlaying = currentStation?.stationuuid === st.stationuuid;
                    return (
                      <div 
                        key={st.stationuuid}
                        onClick={() => handlePlayStation(st)}
                        className={`p-3.5 rounded-2xl border flex items-center gap-3.5 transition-all cursor-pointer group text-left ${
                          isPlaying 
                            ? 'bg-indigo-500/10 border-indigo-500/60 shadow-[0_0_15px_rgba(99,102,241,0.15)]' 
                            : 'bg-neutral-900/10 border-neutral-800/85 hover:border-neutral-700/60 hover:bg-neutral-900/35'
                        }`}
                      >
                        <div className="w-11 h-11 rounded-lg bg-neutral-950 overflow-hidden shrink-0 relative flex items-center justify-center border border-neutral-800 shadow-inner">
                          <img 
                            src={st.favicon || 'https://lh3.googleusercontent.com/aida-public/AB6AXuAAEHYcwac15ndrKFnBB1e2z8QgmeJd3TWWuayU6m-vWct5e9WWkyZmyzHTUjvhAoxSc5mKP6moS848TKUg6ISqIwq5_G8AogzcZty9bH3O1UKbORg-gG8IM5LEBrH5BvwOhhOsOL1ykPNGMnAwPuIVgMkwD5PtK1vHq6j_cmTB_HAaaphdD_irzPINj-g_FZbH8Cz7pvkHV9vuAFUUpXvnLKwc2P_Kwh5RPW6KaO-ubaUD5albVpK1FOFWQD77HV8Cvj3281SYCJM'} 
                            alt="St" 
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.src = 'https://lh3.googleusercontent.com/aida-public/AB6AXuAAEHYcwac15ndrKFnBB1e2z8QgmeJd3TWWuayU6m-vWct5e9WWkyZmyzHTUjvhAoxSc5mKP6moS848TKUg6ISqIwq5_G8AogzcZty9bH3O1UKbORg-gG8IM5LEBrH5BvwOhhOsOL1ykPNGMnAwPuIVgMkwD5PtK1vHq6j_cmTB_HAaaphdD_irzPINj-g_FZbH8Cz7pvkHV9vuAFUUpXvnLKwc2P_Kwh5RPW6KaO-ubaUD5albVpK1FOFWQD77HV8Cvj3281SYCJM';
                            }}
                          />
                          <div className="absolute inset-0 bg-neutral-950/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Play className="w-4.5 h-4.5 text-indigo-400 fill-indigo-400" />
                          </div>
                        </div>

                        <div className="flex-1 overflow-hidden">
                          <p className={`font-bold text-xs truncate leading-tight group-hover:text-indigo-400 transition-colors ${isPlaying ? 'text-indigo-400' : 'text-neutral-200'}`}>
                            {st.name}
                          </p>
                          <p className="text-[10px] text-neutral-400 font-medium mt-1 uppercase">
                            {st.frequency || 'Live'} • {st.codec || 'Feed'}
                          </p>
                        </div>

                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleFavorite(st);
                          }}
                          className={`p-1.5 rounded-lg hover:bg-neutral-800 active:scale-95 transition-all cursor-pointer ${
                            isFav ? 'text-red-400' : 'text-neutral-400 hover:text-indigo-400'
                          }`}
                        >
                          <Heart className={`w-3.5 h-3.5 ${isFav ? 'fill-current' : ''}`} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          )}

          {activeView === 'trending' && (
            <div className="space-y-6 text-left max-w-4xl mx-auto select-text">
              <div className="space-y-1.5">
                <h2 className="text-2xl font-bold text-neutral-100 flex items-center gap-2">
                  <TrendingUp className="text-indigo-400 w-6 h-6 animate-pulse" />
                  Trending Global Broadcasting Signals
                </h2>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  Tuned based on global community clicks, high connection bitrates, and listener upvotes. Lock coordinate node to stream the high-fidelity feed instantly.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {stations.slice(0, 16).map((st, i) => {
                  const isFav = favoriteUUIDs.includes(st.stationuuid);
                  const isPlaying = currentStation?.stationuuid === st.stationuuid;
                  return (
                    <div 
                      key={st.stationuuid}
                      onClick={() => handlePlayStation(st)}
                      className={`p-4 rounded-2xl border flex items-center gap-4 cursor-pointer transition-all bg-neutral-900/10 ${
                        isPlaying 
                          ? 'border-indigo-500 bg-indigo-500/10 shadow-[0_0_15px_rgba(99,102,241,0.15)]' 
                          : 'border-neutral-800 hover:border-neutral-700 hover:bg-neutral-900/30 group'
                      }`}
                    >
                      <span className="font-mono text-sm font-bold text-indigo-400 w-6 shrink-0 text-center">
                        #{i + 1}
                      </span>
                      
                      <div className="w-12 h-12 rounded-xl bg-neutral-950 overflow-hidden relative shrink-0 border border-neutral-800">
                        <img 
                          src={st.favicon || 'https://lh3.googleusercontent.com/aida-public/AB6AXuAAEHYcwac15ndrKFnBB1e2z8QgmeJd3TWWuayU6m-vWct5e9WWkyZmyzHTUjvhAoxSc5mKP6moS848TKUg6ISqIwq5_G8AogzcZty9bH3O1UKbORg-gG8IM5LEBrH5BvwOhhOsOL1ykPNGMnAwPuIVgMkwD5PtK1vHq6j_cmTB_HAaaphdD_irzPINj-g_FZbH8Cz7pvkHV9vuAFUUpXvnLKwc2P_Kwh5RPW6KaO-ubaUD5albVpK1FOFWQD77HV8Cvj3281SYCJM'} 
                          alt="Cover" 
                          className="w-full h-full object-cover"
                        />
                      </div>

                      <div className="flex-1 overflow-hidden">
                        <p className="font-bold text-sm text-neutral-200 truncate">{st.name}</p>
                        <p className="text-[10px] text-neutral-400 mt-1">
                          {st.country || 'Global'} • {st.votes} Upvotes
                        </p>
                      </div>

                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleFavorite(st);
                        }}
                        className={`p-2 rounded-lg hover:bg-neutral-850 active:scale-95 transition-all ${
                          isFav ? 'text-red-400' : 'text-neutral-400 hover:text-indigo-400'
                        }`}
                      >
                        <Heart className={`w-4 h-4 ${isFav ? 'fill-current' : ''}`} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeView === 'local' && (
            <div className="space-y-6 text-left max-w-4xl mx-auto select-text">
              <div className="space-y-1.5">
                <h2 className="text-2xl font-bold text-neutral-100 flex items-center gap-2">
                  <MapPin className="text-indigo-400 w-6 h-6 animate-pulse" />
                  Local Broadcasting Stations
                </h2>
                <p className="text-xs text-neutral-400 leading-relaxed font-semibold uppercase tracking-wider text-indigo-400">
                  Drawn from Shinjuku Tokyo, Berlin, and NYC study streams. Click coordinate nodes to listen instantly.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {stations.map((st) => {
                  const isFav = favoriteUUIDs.includes(st.stationuuid);
                  const isPlaying = currentStation?.stationuuid === st.stationuuid;
                  return (
                    <div 
                      key={st.stationuuid}
                      onClick={() => handlePlayStation(st)}
                      className={`p-4 rounded-xl border flex items-center gap-4 cursor-pointer transition-all bg-neutral-900/10 ${
                        isPlaying 
                          ? 'border-indigo-500 bg-indigo-500/10 shadow-[0_0_15px_rgba(99,102,241,0.15)]' 
                          : 'border-neutral-800 hover:border-neutral-700 hover:bg-neutral-900/30'
                      }`}
                    >
                      <div className="w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-neutral-800">
                        <Radio className="w-4.5 h-4.5" />
                      </div>

                      <div className="flex-1 overflow-hidden">
                        <p className="font-bold text-sm text-neutral-200 truncate">{st.name}</p>
                        <p className="text-xs text-neutral-400 mt-0.5">{st.state || 'Local Arena'} State, {st.country}</p>
                      </div>

                      <ChevronRight className="w-5 h-5 text-neutral-400" />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeView === 'help' && (
            <div className="space-y-8 text-left max-w-2xl mx-auto select-text leading-relaxed">
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-neutral-100 flex items-center gap-2">
                  <HelpCircle className="text-indigo-400 w-6 h-6 animate-pulse" />
                  GlobeRadio Tuning Manual
                </h2>
                <p className="text-xs text-indigo-400 uppercase tracking-wider font-bold leading-none">
                  SaaS Signal Discovery Operational Guide
                </p>
              </div>

              <div className="space-y-6">
                <div className="p-4 rounded-2xl bg-neutral-900/20 border border-neutral-800 space-y-2.5">
                  <h4 className="font-bold text-sm text-indigo-400 uppercase tracking-wider">
                    ⭐ Lock Coordinate Nodes
                  </h4>
                  <p className="text-xs text-neutral-400">
                    Drag the interactive visual 3D Globe to rotate the coordinates of planet Earth. Click any glowing hotspot markers representing world radio capitals to instantly fetch and focus live stream channels from that country.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-neutral-900/20 border border-neutral-800 space-y-2.5">
                  <h4 className="font-bold text-sm text-indigo-400 uppercase tracking-wider">
                    🔒 Enable TOTP Defense
                  </h4>
                  <p className="text-xs text-neutral-400">
                    Navigate to settings to activate Two-Factor Authentication. Scan the generated QR code containing the secure private key. Generate backup recovery tokens in case of emergency device connection failures.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-neutral-900/20 border border-neutral-800 space-y-2.5">
                  <h4 className="font-bold text-sm text-indigo-400 uppercase tracking-wider">
                    🎧 HQ Audio streams
                  </h4>
                  <p className="text-xs text-neutral-400">
                    Our servers act as stable proxies querying the crowd-sourced Radio Browser mirror directories. Signals play directly from premium resolved streams at high bitrates (up to 320kbps).
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeView === 'dashboard' && user && (
            <Dashboard 
              user={user}
              onLogout={handleLogout}
              onPlayStation={handlePlayStation}
              currentStation={currentStation}
            />
          )}

        </main>
      </div>

      {/* Floating global playback bar */}
      <Player 
        currentStation={currentStation}
        onNextStation={handleNextStation}
        onPrevStation={handlePrevStation}
        isFavorite={currentStation ? favoriteUUIDs.includes(currentStation.stationuuid) : false}
        onToggleFavorite={handleToggleFavorite}
      />

      {/* Auth Login signup overlay */}
      {authOpen && (
        <Auth 
          onClose={() => setAuthOpen(false)}
          onLoginSuccess={(userData) => {
            setUser(userData);
            checkAuthStatus(); // resync all lists
          }}
        />
      )}

      {/* Slide Navigation Drawer (Mobile Only responsive overlay) */}
      {mobileDrawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex justify-start text-left">
          {/* Backdrop blur */}
          <div 
            onClick={() => setMobileDrawerOpen(false)}
            className="absolute inset-0 bg-[#0c1015]/80 backdrop-blur-sm" 
          />

          <div className="w-80 h-full bg-[#101415]/95 backdrop-blur-3xl border-r border-white/10 shadow-2xl relative flex flex-col py-6 px-4 z-10 transition-transform">
            <div className="absolute top-4 right-4">
              <button 
                onClick={() => setMobileDrawerOpen(false)}
                className="p-1 rounded-full text-on-surface-variant hover:text-on-surface bg-white/5 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-8 pl-2 pt-2 flex items-center gap-2">
              <Radio className="w-6 h-6 text-[#00dbe9] animate-pulse" />
              <h1 className="text-lg font-extrabold text-[#00dbe9] tracking-tight">GlobeRadio</h1>
            </div>

            <nav className="flex-1 space-y-1">
              <button
                onClick={() => { setActiveView('home'); setMobileDrawerOpen(false); }}
                className={`w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold cursor-pointer ${activeView === 'home' ? 'bg-[#00f0ff]/10 text-[#00dbe9]' : 'text-on-surface-variant hover:bg-white/5'}`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 002 2h2m0 0l3.5 3.5M12 2a10 10 0 110 20 10 10 0 010-20z" /></svg>
                <span>World Map</span>
              </button>

              <button
                onClick={() => { setActiveView('trending'); setMobileDrawerOpen(false); }}
                className={`w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold cursor-pointer ${activeView === 'trending' ? 'bg-[#00f0ff]/10 text-[#00dbe9]' : 'text-on-surface-variant hover:bg-white/5'}`}
              >
                <TrendingUp className="w-5 h-5" />
                <span>Trending Feed</span>
              </button>

              <button
                onClick={() => { setActiveView('local'); setMobileDrawerOpen(false); }}
                className={`w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold cursor-pointer ${activeView === 'local' ? 'bg-[#00f0ff]/10 text-[#00dbe9]' : 'text-on-surface-variant hover:bg-white/5'}`}
              >
                <MapPin className="w-5 h-5" />
                <span>Local Signals</span>
              </button>

              {user ? (
                <button
                  onClick={() => { setActiveView('dashboard'); setMobileDrawerOpen(false); }}
                  className={`w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold cursor-pointer ${activeView === 'dashboard' ? 'bg-[#00f0ff]/10 text-[#00dbe9]' : 'text-on-surface-variant hover:bg-white/5'}`}
                >
                  <Settings className="w-5 h-5" />
                  <span>Profile Security</span>
                </button>
              ) : (
                <button
                  onClick={() => { setAuthOpen(true); setMobileDrawerOpen(false); }}
                  className="w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-surface-tint hover:bg-white/5 cursor-pointer"
                >
                  <Compass className="w-5 h-5" />
                  <span>Sign In / Create Account</span>
                </button>
              )}
            </nav>

            <div className="pt-4 border-t border-white/5 mt-auto">
              <div className="flex items-center gap-3">
                <img 
                  alt="Avatar" 
                  className="w-10 h-10 rounded-full border border-[#00dbe9]/20" 
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuB-aGW6UJUSJ6i1jkyGzwlwVaMHUXCygTnImQI_V-FQsj8LVoCqJAbpcAUeefNLtEJwKVHS27XZwFvjXkfF2uNSO1j1Fnq8FvUGNHcTdOSiwBQkJWtLsHoVuY7_27HlpeFuIbohZJLSvYQciCkvxookBD9AwbY8ZWsM7ClOpNZ61I4Gn2H_mYjhN1eyD7MsWnDFRdJ_8nr2FVIgam_NFTGFoFGNkZCQehuF4UMEZ0QLYTpUy-Tf-XN54Yh8MlRSY1xlAy3KidGwy0k" 
                />
                <div>
                  <p className="text-xs font-bold text-on-surface">{user ? user.name : 'Guest Explorer'}</p>
                  <p className="text-[10px] text-on-surface-variant/70 mt-0.5">{user ? 'Premium listener' : 'Upgrade to sync favorites'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Global Application Footer */}
      <footer className="w-full bg-[#0b0f10] border-t border-white/5 py-8 px-4 flex flex-col items-center gap-3 mt-16 pb-28 md:pb-8">
        <div className="flex gap-6">
          <a onClick={() => setActiveView('help')} className="text-on-surface-variant hover:text-[#00dbe9] text-xs font-semibold cursor-pointer select-none">Tuning Manual</a>
          <span className="text-white/10 select-none">|</span>
          <a onClick={() => setActiveView('home')} className="text-on-surface-variant hover:text-[#00dbe9] text-xs font-semibold cursor-pointer select-none font-semibold text-surface-tint">Interactive Globe</a>
          <span className="text-white/10 select-none">|</span>
          <a className="text-on-surface-variant text-xs font-semibold select-none opacity-50">Privacy Standard</a>
        </div>
        <p className="text-[10px] text-on-surface-variant/40 mt-1 font-mono uppercase tracking-[0.15em]">
          © 2026 GlobeRadio Signal Corp • Frequency 440Hz • Global HQ
        </p>
      </footer>

    </div>
  );
}
