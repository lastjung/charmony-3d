import React from 'react';
import { motion } from 'motion/react';
import { Play, Pause, RotateCcw, RotateCw, FastForward, Rewind, Volume2, VolumeX, SkipForward, Maximize, Minimize } from 'lucide-react';

interface PlayerBoxProps {
  isPlotting: boolean;
  setIsPlotting: (val: boolean) => void;
  drawProgress: number;
  setDrawProgress: (val: number) => void;
  reset: () => void;
  partialReset: () => void;
  nextPreset: () => void;
  plotSpeed: number;
  setPlotSpeed: (val: number) => void;
  isMuted: boolean;
  setIsMuted: (val: boolean) => void;
  isFullscreen: boolean;
  setIsFullscreen: (val: boolean) => void;
}

export const PlayerBox: React.FC<PlayerBoxProps> = ({
  isPlotting,
  setIsPlotting,
  drawProgress,
  setDrawProgress,
  reset,
  partialReset,
  nextPreset,
  plotSpeed,
  setPlotSpeed,
  isMuted,
  setIsMuted,
  isFullscreen,
  setIsFullscreen,
}) => {
  return (
    <motion.div 
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 h-[32px] px-4 bg-zinc-950/40 backdrop-blur-2xl border border-white/5 rounded-full flex items-center shadow-2xl pointer-events-auto z-50 hover:bg-zinc-950/60 transition-all duration-500 ease-in-out"
      style={{ minWidth: '600px' }}
    >
      {/* Left: Volume & Next (160px) */}
      <div className="flex items-center gap-2 w-[160px] justify-start pr-3 border-r border-white/5">
        <button 
          onClick={() => setIsMuted(!isMuted)} 
          className={`p-1 transition-colors ${isMuted ? 'text-zinc-600' : 'text-blue-400'}`}
        >
          {isMuted ? <VolumeX size={13} /> : <Volume2 size={13} />}
        </button>
        <div className="w-12 h-0.5 bg-zinc-800 rounded-full overflow-hidden relative">
          <div className={`absolute inset-y-0 left-0 ${isMuted ? 'bg-zinc-700' : 'bg-blue-500'}`} style={{ width: '70%' }} />
        </div>
        <button 
          onClick={nextPreset}
          className="p-1 hover:text-white text-zinc-500 transition-colors ml-1"
          title="Next Preset"
        >
          <SkipForward size={12} fill="currentColor" />
        </button>
      </div>

      {/* Center: Playback (Original Symmetry Order) */}
      <div className="flex-1 flex items-center justify-center gap-4 px-6">
        <button 
          onClick={partialReset}
          className="p-1.5 text-zinc-400 hover:text-white transition-all active:scale-90"
          title="Partial Reset (↩)"
        >
          <RotateCcw size={14} />
        </button>

        <button 
          onClick={() => setPlotSpeed(Math.max(0.001, plotSpeed / 2))}
          className="p-1.5 text-zinc-500 hover:text-white transition-colors"
          title="Slower"
        >
          <Rewind size={13} fill="currentColor" />
        </button>

        <button 
          onClick={() => {
            if (!isPlotting && drawProgress >= 0.99) setDrawProgress(0);
            setIsPlotting(!isPlotting);
          }}
          className={`w-7 h-7 flex items-center justify-center rounded-full transition-all ${
            isPlotting 
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' 
              : 'bg-white/5 text-white hover:bg-white/10'
          }`}
        >
          {isPlotting ? <Pause size={12} fill="currentColor" /> : <Play size={12} fill="currentColor" className="ml-0.5" />}
        </button>

        <button 
          onClick={() => setPlotSpeed(Math.min(0.05, plotSpeed * 2))}
          className="p-1.5 text-zinc-500 hover:text-white transition-colors"
        >
          <FastForward size={13} fill="currentColor" />
        </button>

        <button 
          onClick={reset}
          className="p-1.5 text-zinc-400 hover:text-white transition-all"
        >
          <RotateCw size={14} />
        </button>
      </div>

      {/* Right: Timeline & Full View (160px) */}
      <div className="flex items-center gap-3 w-[160px] justify-end pl-3 border-l border-white/5">
        <div 
          className="w-20 h-0.5 bg-zinc-900 border border-white/5 rounded-full overflow-hidden relative cursor-pointer" 
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = e.clientX - rect.left;
            setDrawProgress(x / rect.width);
          }}
        >
          <motion.div 
            className="absolute inset-y-0 left-0 bg-blue-500"
            style={{ width: `${drawProgress * 100}%` }}
          />
        </div>
        
        <button 
          onClick={() => setIsFullscreen(!isFullscreen)}
          className={`p-1.5 rounded-lg transition-all ${isFullscreen ? 'text-blue-400' : 'text-zinc-500 hover:text-white'}`}
          title="Toggle Full View (Esc to exit)"
        >
          {isFullscreen ? <Minimize size={14} /> : <Maximize size={14} />}
        </button>
      </div>
    </motion.div>
  );
};
