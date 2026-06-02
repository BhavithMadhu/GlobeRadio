import React from 'react';
import { Map, TrendingUp, Radio, Settings, HelpCircle, User, Compass, Info, Github } from 'lucide-react';
import { User as UserType } from '../types';

interface SidebarProps {
  user: UserType | null;
  activeView: string;
  onNavigateToView: (view: string) => void;
  onOpenAuth: () => void;
  onLogout: () => void;
}

export default function Sidebar({ 
  user, 
  activeView, 
  onNavigateToView,
  onOpenAuth,
  onLogout
}: SidebarProps) {
  return (
    <aside className="hidden md:flex h-full w-72 bg-[#0a0a0a]/95 backdrop-blur-3xl border-r border-neutral-900 shadow-2xl flex-col py-6 shrink-0 z-20">
      {/* Sidebar Header with User short card info */}
      <div className="px-6 mb-6">
        {user ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <img 
                alt="Avatar" 
                className="w-11 h-11 rounded-xl object-cover border border-indigo-500/20 shadow-md bg-neutral-950" 
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuBuYxek3I9y_l9HD3RGg5O9aTJZykBGRa-NoXE0EuZ92uR4wns03ylTy1117nnxdrkx8pgcy30UKDlodmg-dsNmYX4Yvti6CwCcooXWb8bvV0wgMa9Y0opiPuqDTm6MzgHZX94GHTSde0vqDdfVME19CepzTClTvgG1AbAl6o_eRDi-q_V4OTeVX7cFsR0yxCrOD5q6MFr33TgqSveBKTHDtpDt8ZuA9fM2Trs1IFI3cKQhBIjiC7OrIJeDjDR08jBW8xIQdlkpF3c"
              />
              <div className="overflow-hidden">
                <p className="font-bold text-sm text-indigo-400 truncate leading-tight">
                  {user.name}
                </p>
                <p className="text-[10px] text-neutral-400 font-medium leading-normal">
                  Premium Explorer
                </p>
              </div>
            </div>

            <div className="bg-indigo-500/10 px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5 border border-indigo-500/10 w-full justify-center">
              <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(99,102,241,0.5)]" />
              <span className="text-[9px] font-extrabold text-indigo-400 tracking-wider uppercase">
                HQ Streams Activated
              </span>
            </div>
          </div>
        ) : (
          <div className="p-4 bg-neutral-900/40 rounded-xl border border-neutral-900 space-y-3">
            <p className="text-xs text-neutral-400 leading-relaxed">
              Sign in to save stations, track history, and lock 2FA protection.
            </p>
            <button 
              onClick={onOpenAuth}
              className="w-full py-2 bg-indigo-600 text-white font-semibold text-xs rounded-lg hover:bg-indigo-700 active:scale-95 transition-all cursor-pointer text-center"
            >
              Sign In to Account
            </button>
          </div>
        )}
      </div>

      {/* Main navigation options list */}
      <nav className="flex-1 space-y-1.5 px-3">
        <button
          onClick={() => onNavigateToView('home')}
          className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-left text-sm font-semibold transition-all cursor-pointer ${
            activeView === 'home' 
              ? 'bg-indigo-500/10 text-indigo-400 border-l-3 border-indigo-500' 
              : 'text-neutral-400 hover:text-indigo-400 hover:bg-neutral-900/50'
          }`}
        >
          <Map className="w-5 h-5 shrink-0" />
          <span>World Signal Map</span>
        </button>

        <button
          onClick={() => onNavigateToView('trending')}
          className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-left text-sm font-semibold transition-all cursor-pointer ${
            activeView === 'trending' 
              ? 'bg-indigo-500/10 text-indigo-400 border-l-3 border-indigo-500' 
              : 'text-neutral-400 hover:text-indigo-400 hover:bg-neutral-900/50'
          }`}
        >
          <TrendingUp className="w-5 h-5 shrink-0" />
          <span>Trending Channels</span>
        </button>

        <button
          onClick={() => onNavigateToView('local')}
          className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-left text-sm font-semibold transition-all cursor-pointer ${
            activeView === 'local' 
              ? 'bg-indigo-500/10 text-indigo-400 border-l-3 border-indigo-500' 
              : 'text-neutral-400 hover:text-indigo-400 hover:bg-neutral-900/50'
          }`}
        >
          <Radio className="w-5 h-5 shrink-0" />
          <span>Local Signals</span>
        </button>

        <div className="h-px bg-neutral-900 my-4 mx-4"></div>

        {user && (
          <button
            onClick={() => onNavigateToView('dashboard')}
            className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-left text-sm font-semibold transition-all cursor-pointer ${
              activeView === 'dashboard' 
                ? 'bg-indigo-500/10 text-indigo-400 border-l-3 border-indigo-500' 
                : 'text-neutral-400 hover:text-indigo-400 hover:bg-neutral-900/50'
            }`}
          >
            <Settings className="w-5 h-5 shrink-0" />
            <span>Profile settings</span>
          </button>
        )}

        <button
          onClick={() => onNavigateToView('help')}
          className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-left text-sm font-semibold transition-all cursor-pointer ${
            activeView === 'help' 
              ? 'bg-indigo-500/10 text-indigo-400 border-l-3 border-indigo-500' 
              : 'text-neutral-400 hover:text-indigo-400 hover:bg-neutral-900/50'
          }`}
        >
          <HelpCircle className="w-5 h-5 shrink-0" />
          <span>Tuning Instructions</span>
        </button>
      </nav>

      {/* Sidebar Footer with system stats */}
      <div className="px-6 pt-4 border-t border-neutral-900 mt-auto text-left">
        <div className="flex flex-col gap-1 text-[10px] text-neutral-500 font-semibold tracking-wider uppercase">
          <span>Signal Quality</span>
          <span className="text-indigo-400 font-bold text-xs flex items-center gap-1 mt-0.5">
            <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-ping"></span>
            LATENCY 24MS
          </span>
        </div>
      </div>
    </aside>
  );
}
