import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Pause, 
  SkipForward, 
  SkipBack, 
  Volume2, 
  VolumeX, 
  Heart, 
  Share2, 
  Radio, 
  Disc, 
  Check 
} from 'lucide-react';
import { RadioStation } from '../types';

interface PlayerProps {
  currentStation: RadioStation | null;
  onNextStation: () => void;
  onPrevStation: () => void;
  isFavorite: boolean;
  onToggleFavorite: (station: RadioStation) => void;
}

export default function Player({
  currentStation,
  onNextStation,
  onPrevStation,
  isFavorite,
  onToggleFavorite
}: PlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [copied, setCopied] = useState(false);
  const [errorLoading, setErrorLoading] = useState(false);
  
  const sessionIdRef = useRef<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  // Sync station URL to HTML5 Audio Tag
useEffect(() => {
  if (!currentStation) return;

  const endPreviousSession = async () => {
    if (sessionIdRef.current) {
      try {
        await fetch('/api/analytics/end', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            sessionId: sessionIdRef.current,
          }),
        });
      } catch (err) {
        console.error('Failed to end listening session:', err);
      }

      sessionIdRef.current = null;
    }
  };

  const startNewSession = async () => {
    try {
      const response = await fetch('/api/analytics/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          stationId:
            currentStation.stationuuid ||
            currentStation.changeuuid,
          stationName: currentStation.name,
        }),
      });

      if (response.ok) {
        const session = await response.json();
        sessionIdRef.current = session.id;
      }
    } catch (err) {
      console.error('Failed to start listening session:', err);
    }
  };

  setIsPlaying(false);
  setErrorLoading(false);

  // endPreviousSession();
  // startNewSession();

  if (audioRef.current) {
    audioRef.current.pause();

    audioRef.current.src =
      currentStation.url_resolved || currentStation.url;

    audioRef.current.load();

    const playPromise = audioRef.current.play();

    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          setIsPlaying(true);
        })
        .catch(err => {
          console.warn(
            'Audio play request was interrupted or blocked by browser autoplay restriction:',
            err
          );
          setIsPlaying(false);
        });
    }
  }
}, [currentStation]);

useEffect(() => {
  return () => {
    if (sessionIdRef.current) {
      fetch('/api/analytics/end', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          sessionId: sessionIdRef.current,
        }),
      }).catch(() => {});
    }
  };
}, []);

  // Handle Play/Pause
  const handlePlayToggle = () => {
    if (!currentStation || !audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      setErrorLoading(false);
      audioRef.current.play()
        .then(() => {
          setIsPlaying(true);
        })
        .catch(err => {
          console.error('Audio play error:', err);
          setErrorLoading(true);
        });
    }
  };

  // Handle volume adjust
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  const handleMuteToggle = () => {
    setIsMuted(!isMuted);
  };

  const handleShareClick = () => {
    if (!currentStation) return;
    const shareUrl = `${window.location.origin}?station=${currentStation.stationuuid}`;
    navigator.clipboard.writeText(shareUrl)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2400);
      });
  };

  if (!currentStation) {
    return (
      <div className="fixed bottom-0 left-0 w-full z-50 p-4 pointer-events-none">
        <div className="max-w-4xl mx-auto bg-neutral-950/80 backdrop-blur-xl border border-neutral-900 rounded-full px-5 py-4 flex items-center justify-center pointer-events-auto shadow-2xl">
          <p className="text-xs text-neutral-400 font-semibold uppercase tracking-wider flex items-center gap-2">
            <Radio className="w-4 h-4 text-neutral-500" />
            No Coordinate Signal Locked. Click a station to begin listening.
          </p>
        </div>
      </div>
    );
  }

  // Generate plausible album art if not provided (Vapor Theory Sunset fallback)
  const defaultAlbumArt = 'https://lh3.googleusercontent.com/aida-public/AB6AXuA1P7j4eSsAUBx2GxynQnN9m-O9Y5Gy7Rbce8X-TU-P26JJ1SZCqa3FIuA35jLRPITqsUrRpSjtYdgH7Z7bNBAMks_O1wr7YvA789GHexZxeO8akLFf2UlR4B2q2O6wX9lYGRZ6qB7Q3jmvseALUTh_F__Cry8F3M2ZUDrXB98Jnpw7xWo7po-rEl-W-hqwQe1z-ga3JwAhoBkADLjjT-HQFOj7sgISeVobvNyTpfjfctX-kw8JqiObDJdA6hzh0NSmcgHhxj3d-VE';
  const albumArt = currentStation.favicon || defaultAlbumArt;

  return (
    <div className="fixed bottom-0 left-0 w-full z-50 p-4 pb-6 md:p-4 pointer-events-none">
      {/* HTML5 Direct stream player */}
      <audio 
        ref={audioRef} 
        onError={() => setErrorLoading(true)}
        className="hidden" 
      />

      <div className="max-w-4xl mx-auto bg-neutral-900/95 backdrop-blur-2xl border border-neutral-800 rounded-2xl md:rounded-full px-4 py-3 md:py-2 flex flex-col md:flex-row items-center justify-between pointer-events-auto shadow-2xl gap-4 md:gap-0">
        
        {/* Left column: Stream thumbnail + Station Info details */}
        <div className="flex items-center gap-3.5 pl-2.5 w-full md:w-auto">
          <div className="w-11 h-11 rounded-lg overflow-hidden border border-neutral-800 shrink-0 relative bg-neutral-950 shadow-inner group">
            <img 
              alt="Station cover Art" 
              className={`w-full h-full object-cover select-none ${isPlaying ? 'animate-pulse' : ''}`}
              src={albumArt}
              onError={(e) => {
                e.currentTarget.src = defaultAlbumArt;
              }}
            />
            {isPlaying && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <Disc className="w-4 h-4 text-indigo-400 animate-spin" />
              </div>
            )}
          </div>
          
          <div className="overflow-hidden text-left flex-1 md:flex-initial">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-indigo-400 font-bold tracking-wider flex items-center gap-1 uppercase">
                <Radio className="w-3 h-3 text-indigo-400" />
                {currentStation.frequency || 'Live Stream'}
              </span>
              {currentStation.bitrate && (
                <span className="text-[8px] bg-neutral-800 border border-neutral-700 text-neutral-400 px-1.5 py-0.2 rounded font-mono font-semibold uppercase">
                  {currentStation.bitrate} kbps
                </span>
              )}
            </div>
            
            <p className="text-sm font-bold text-neutral-250 truncate pr-2 max-w-[200px]">
              {currentStation.name}
            </p>
          </div>
        </div>

        {/* Center column: Main controls play/pause skip */}
        <div className="flex items-center gap-6">
          <button 
            onClick={onPrevStation}
            className="text-neutral-400 hover:text-indigo-400 active:scale-90 transition-all cursor-pointer p-1"
            title="Previous station"
          >
            <SkipBack className="w-5 h-5" />
          </button>
          
          <button 
            onClick={handlePlayToggle}
            className={`w-13 h-13 rounded-full bg-indigo-600 text-white flex items-center justify-center hover:scale-105 hover:bg-indigo-700 active:scale-95 transition-all cursor-pointer shadow-[0_0_20px_rgba(99,102,241,0.35)] ${
              isPlaying ? 'shadow-[0_0_25px_rgba(99,102,241,0.5)]' : ''
            }`}
            title={isPlaying ? 'Pause' : 'Play stream'}
          >
            {isPlaying ? (
              <Pause className="w-5 h-5 fill-current" />
            ) : (
              <Play className="w-5 h-5 fill-current translate-x-0.5" />
            )}
          </button>

          <button 
            onClick={onNextStation}
            className="text-neutral-400 hover:text-indigo-400 active:scale-90 transition-all cursor-pointer p-1"
            title="Next station"
          >
            <SkipForward className="w-5 h-5" />
          </button>
        </div>

        {/* Right column: Options / Volume matches details */}
        <div className="flex items-center justify-between md:justify-end gap-5 w-full md:w-auto pr-3 border-t border-neutral-800 md:border-t-0 pt-3 md:pt-0">
          
          {/* Signal buffer state / Error */}
          {errorLoading && (
            <span className="text-[10px] text-red-400 font-semibold uppercase tracking-wider bg-red-400/10 px-2.5 py-1 rounded-full border border-red-500/10 animate-pulse">
              Buffering/Offline
            </span>
          )}

          {/* Volume adjust slide */}
          <div className="flex items-center gap-2 group ml-2 shrink-0">
            <button 
              onClick={handleMuteToggle}
              className="text-neutral-400 hover:text-indigo-400 transition-all cursor-pointer p-1"
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="w-4 h-4 text-red-400" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={isMuted ? 0 : volume}
              onChange={(e) => {
                setVolume(parseFloat(e.target.value));
                setIsMuted(false);
              }}
              className="w-18 md:w-22 h-1 accent-indigo-500 bg-neutral-800 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          <div className="flex items-center gap-1.5 border-l border-neutral-800 pl-4">
            <button 
              onClick={() => onToggleFavorite(currentStation)}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer hover:bg-neutral-800 ${
                isFavorite 
                  ? 'text-red-400 hover:text-red-300' 
                  : 'text-neutral-400 hover:text-indigo-400'
              }`}
              title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            >
              <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
            </button>

            <button 
              onClick={handleShareClick}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-indigo-400 hover:bg-neutral-800 active:scale-95 transition-all cursor-pointer relative"
              title="Share station coordinate"
            >
              {copied ? (
                <Check className="w-4 h-4 text-emerald-400" />
              ) : (
                <Share2 className="w-4 h-4" />
              )}
              {copied && (
                <span className="absolute -top-10 left-1/2 -translate-x-1/2 bg-emerald-600 text-white text-[9px] font-bold px-2 py-1 rounded shadow-lg whitespace-nowrap">
                  LINK COPIED
                </span>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
