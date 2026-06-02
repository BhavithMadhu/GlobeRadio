import React from 'react';
import { Menu, Search, Bell, Radio, User, Compass, Star, Settings2 } from 'lucide-react';
import { User as UserType } from '../types';

interface HeaderProps {
  user: UserType | null;
  onOpenAuth: () => void;
  onNavigateToDashboard: () => void;
  onNavigateToHome: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onToggleDrawer: () => void;
  activeView: string;
}

export default function Header({ 
  user, 
  onOpenAuth, 
  onNavigateToDashboard, 
  onNavigateToHome,
  searchQuery,
  setSearchQuery,
  onToggleDrawer,
  activeView
}: HeaderProps) {
  return (
    <header className="fixed top-0 w-full z-50 bg-neutral-950/80 backdrop-blur-xl border-b border-neutral-900 shadow-sm flex justify-between items-center px-4 md:px-6 h-16">
      {/* Left side: Menu hamburger & App name */}
      <div className="flex items-center gap-3">
        <button 
          onClick={onToggleDrawer}
          className="p-1.5 rounded-lg text-neutral-400 hover:text-indigo-400 hover:bg-neutral-900 active:scale-95 transition-all md:hidden"
        >
          <Menu className="w-5 h-5" />
        </button>
        
        <div 
          onClick={onNavigateToHome} 
          className="flex items-center gap-2.5 cursor-pointer active:scale-98 transition-transform group"
        >
          <div className="w-9 h-9 rounded-lg bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 group-hover:border-indigo-500/50 transition-all">
            <Radio className="w-5 h-5 text-indigo-400 animate-pulse" />
          </div>
          <h1 className="text-xl font-bold tracking-tighter bg-gradient-to-r from-indigo-400 via-indigo-200 to-violet-300 bg-clip-text text-transparent">
            GlobeRadio
          </h1>
        </div>
      </div>

      {/* Center: Search input bar (visible on desktop and index pages) */}
      <div className="hidden md:flex flex-1 max-w-xl mx-12">
        <div className="relative w-full group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500 group-focus-within:text-indigo-400 transition-colors w-4.5 h-4.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-neutral-900 border border-neutral-800 focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 rounded-full pl-11 pr-5 py-1.5 text-sm text-neutral-200 placeholder:text-neutral-500 transition-all outline-none"
            placeholder="Search countries, cities, or frequencies..."
          />
        </div>
      </div>

      {/* Right side: Login state actions */}
      <div className="flex items-center gap-4">
        {user ? (
          <div className="flex items-center gap-3 md:gap-4">
            {/* Active view status headers */}
            {activeView !== 'dashboard' && (
              <button 
                onClick={onNavigateToDashboard}
                className="hidden lg:flex items-center gap-2 text-xs font-semibold text-neutral-400 hover:text-indigo-400 transition-all px-3.5 py-1.5 rounded-full bg-neutral-900 border border-neutral-800 hover:border-indigo-500/30"
              >
                <Compass className="w-3.5 h-3.5" />
                Go to Dashboard
              </button>
            )}

            <button className="p-1.5 rounded-lg text-neutral-400 hover:text-indigo-400 hover:bg-neutral-900 active:scale-95 transition-all relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-indigo-500 rounded-full shadow-[0_0_6px_rgba(99,102,241,0.6)]"></span>
            </button>

            {/* Profile Avatar trigger */}
            <div 
              onClick={onNavigateToDashboard}
              className="flex items-center gap-2 cursor-pointer group active:scale-95 transition-transform"
              title="View Profile Settings"
            >
              <div className="relative">
                <img
                  alt="User Profile"
                  className="w-8.5 h-8.5 rounded-full border border-neutral-800 group-hover:border-indigo-500/50 group-hover:shadow-[0_0_10px_rgba(99,102,241,0.2)] transition-all object-cover"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuB-aGW6UJUSJ6i1jkyGzwlwVaMHUXCygTnImQI_V-FQsj8LVoCqJAbpcAUeefNLtEJwKVHS27XZwFvjXkfF2uNSO1j1Fnq8FvUGNHcTdOSiwBQkJWtLsHoVuY7_27HlpeFuIbohZJLSvYQciCkvxookBD9AwbY8ZWsM7ClOpNZ61I4Gn2H_mYjhN1eyD7MsWnDFRdJ_8nr2FVIgam_NFTGFoFGNkZCQehuF4UMEZ0QLYTpUy-Tf-XN54Yh8MlRSY1xlAy3KidGwy0k"
                />
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-neutral-950" />
              </div>
              <div className="hidden sm:flex flex-col text-left">
                <span className="text-xs font-bold text-neutral-200 leading-tight group-hover:text-indigo-400 transition-colors">
                  {user.name.split(' ')[0]}
                </span>
                <span className="text-[10px] text-neutral-400 leading-none">
                  Level 42 Explorer
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <button 
              onClick={onOpenAuth}
              className="text-xs font-semibold text-neutral-400 hover:text-indigo-400 transition-colors px-3 py-2 cursor-pointer"
            >
              Sign In
            </button>
            <button 
              onClick={onOpenAuth}
              className="bg-indigo-600 text-white font-semibold text-xs px-5 py-2 rounded-full hover:brightness-110 active:scale-95 shadow-[0_0_15px_rgba(99,102,241,0.25)] hover:shadow-[0_0_20px_rgba(99,102,241,0.4)] transition-all cursor-pointer"
            >
              Join Signal
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
