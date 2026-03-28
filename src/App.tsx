import React, { useState, Suspense, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars, ContactShadows } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Settings2, RotateCcw, Share2, Info, Github, Play, Pause, Zap, Camera, Mic, Sparkles, 
  Eye, EyeOff, Maximize, Minimize, Layers, Music, Volume2, VolumeX, Briefcase, Activity
} from 'lucide-react';

// Components
import { LissajousCurve } from './components/LissajousCurve';
import { LissajousModMath } from './components/LissajousModMath';
import LorenzAttractor from './components/LorenzAttractor';
import { ControlSlider } from './components/ControlSlider';
import { BeamCollider3D } from './components/BeamCollider3D';
import { PlayerBox } from './components/PlayerBox';

// Hooks & Constants
import { useAudioReactivity } from './hooks/useAudioReactivity';
import { LISSAJOUS_PRESETS, LORENZ_PRESETS } from './constants/presets';

type AppMode = 'lissajous' | 'lorenz';

export default function App() {
  // Global App State
  const [mode, setMode] = useState<AppMode>('lissajous');
  const [isUIVisible, setIsUIVisible] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showLeftControls, setShowLeftControls] = useState(true);
  const [showControls, setShowControls] = useState(true);
  
  // Shared Visual State
  const [color, setColor] = useState('#3b82f6');
  const [isRainbow, setIsRainbow] = useState(false);
  const [isProRain, setIsProRain] = useState(false);
  const [isBloom, setIsBloom] = useState(true);
  const [isOrbit, setIsOrbit] = useState(false);
  const [orbitSpeed, setOrbitSpeed] = useState(1);
  const [isAudioReactive, setIsAudioReactive] = useState(false);
  const [audioSensitivity, setAudioSensitivity] = useState(1.5);
  const [drawProgress, setDrawProgress] = useState(1);
  const [isPlotting, setIsPlotting] = useState(false);
  const [plotSpeed, setPlotSpeed] = useState(0.005);
  const [soundMode, setSoundMode] = useState<'math' | 'mech' | 'ambient'>('math');
  const [soundProfile, setSoundProfile] = useState<'piano' | 'bell' | 'percussion'>('piano');
  const [isMuted, setIsMuted] = useState(false);

  // Beam Specific State
  const [beamShape, setBeamShape] = useState<'semicircle' | 'V' | 'parabola' | 'U'>('parabola');
  const [beamSpawnRate, setBeamSpawnRate] = useState(0.04);
  const [beamBounceLimit, setBeamBounceLimit] = useState(5);

  // Lissajous Specific State
  const [freqX, setFreqX] = useState(2);
  const [freqY, setFreqY] = useState(3);
  const [freqZ, setFreqZ] = useState(5);
  const [phaseX, setPhaseX] = useState(0);
  const [phaseY, setPhaseY] = useState(Math.PI / 2);
  const [phaseZ, setPhaseZ] = useState(Math.PI / 4);
  const [autoRotate, setAutoRotate] = useState(false);
  const [autoRotateSpeed, setAutoRotateSpeed] = useState(1.5);
  const [showModMath, setShowModMath] = useState(false);
  const [multiplier, setMultiplier] = useState(2);
  const [numPointsLissajous, setNumPointsLissajous] = useState(200);
  const [numPointsLissajousMain, setNumPointsLissajousMain] = useState(2000);
  const [cycles, setCycles] = useState(10);
  const [isAutoMultiplier, setIsAutoMultiplier] = useState(false);
  const [opacity, setOpacity] = useState(0.8);
  const [showHead, setShowHead] = useState(true);

  // Auto States for Lissajous Parameters
  const [isAutoFreqX, setIsAutoFreqX] = useState(false);
  const [isAutoFreqY, setIsAutoFreqY] = useState(false);
  const [isAutoFreqZ, setIsAutoFreqZ] = useState(false);
  const [isAutoPhaseX, setIsAutoPhaseX] = useState(false);
  const [isAutoPhaseY, setIsAutoPhaseY] = useState(false);
  const [isAutoPhaseZ, setIsAutoPhaseZ] = useState(false);
  const [isAutoCycles, setIsAutoCycles] = useState(false);

  // Lorenz Specific State
  const [sigma, setSigma] = useState(10);
  const [rho, setRho] = useState(28);
  const [beta, setBeta] = useState(2.667);
  const [lorenzSpeed, setLorenzSpeed] = useState(0.01);
  const [numPointsLorenz, setNumPointsLorenz] = useState(5000);

  const audioVolume = useAudioReactivity(isAudioReactive);

  // Global Keyboard listener for HUD recovery (Esc to exit full view)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  // Prevent accidental zoom on trackpad scroll while keeping pinch-zoom
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && isUIVisible) {
        e.stopPropagation();
      }
    };
    const canvas = document.querySelector('canvas');
    if (canvas) canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => { if (canvas) canvas.removeEventListener('wheel', handleWheel); };
  }, [isUIVisible]);

  // Audio Reactivity Logic
  useEffect(() => {
    if (isAudioReactive && audioVolume > 0) {
      if (mode === 'lissajous') {
        setMultiplier(prev => (prev + (audioVolume * audioSensitivity * 0.1)) % 100);
      } else {
        // For Lorenz, maybe modulate rho or sigma?
        setRho(prev => {
          const base = 28;
          const mod = audioVolume * audioSensitivity * 10;
          return base + mod;
        });
      }
    }
  }, [audioVolume, isAudioReactive, audioSensitivity, mode]);

  // Generative Sound Logic (Ref-based for proper cleanup)
  const audioCtxRef = React.useRef<AudioContext | null>(null);
  const activeOscRef = React.useRef<OscillatorNode | null>(null);
  const activeGainRef = React.useRef<GainNode | null>(null);
  const activePanRef = React.useRef<StereoPannerNode | null>(null);
  const activeFilterRef = React.useRef<BiquadFilterNode | null>(null);

  // Life Cycle: Start / Stop Oscillator & Nodes
  useEffect(() => {
    // 1. Cleanup previous sound always
    if (activeOscRef.current) {
      const osc = activeOscRef.current;
      const gain = activeGainRef.current;
      if (gain) gain.gain.setTargetAtTime(0, audioCtxRef.current!.currentTime, 0.05);
      setTimeout(() => {
        try { osc.stop(); osc.disconnect(); } catch(e) {}
      }, 100);
      activeOscRef.current = null;
      activeGainRef.current = null;
    }

    // 2. Start nodes if plotting and not muted
    if (isPlotting && !isMuted) {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const panner = ctx.createStereoPanner();
      const filter = ctx.createBiquadFilter();

      osc.type = soundMode === 'math' ? 'triangle' : soundMode === 'mech' ? 'square' : 'sine';
      filter.type = 'lowpass';
      filter.Q.value = 5;
      
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.05, ctx.currentTime + 0.1);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(panner);
      panner.connect(ctx.destination);
      
      osc.start();

      activeOscRef.current = osc;
      activeGainRef.current = gain;
      activePanRef.current = panner;
      activeFilterRef.current = filter;
    }

    return () => {};
  }, [isPlotting, isMuted, soundMode, soundProfile, mode]);

  // Update Parameters: Frequency, Panning, Filter (Dynamic 3D Mapping)
  useEffect(() => {
    if (activeOscRef.current && audioCtxRef.current) {
      const ctx = audioCtxRef.current;
      
      // Calculate 3D Position of Head from progress
      let x = 0, y = 0, z = 0;
      if (mode === 'lissajous') {
        const t = drawProgress * Math.PI * 2 * cycles;
        x = Math.sin(t * freqX + phaseX);
        y = Math.sin(t * freqY + phaseY);
        z = Math.sin(t * freqZ + phaseZ);
      } else {
        // Simplified Lorenz mapping (pseudo-approximation based on progress)
        x = Math.sin(drawProgress * 50) * Math.cos(drawProgress * 20);
        y = Math.cos(drawProgress * 40);
        z = Math.sin(drawProgress * 30);
      }

      // 1. Pitch Mapping (Y-axis) - Wider 400Hz - 1200Hz range
      const baseFreq = soundMode === 'math' ? 220 : soundMode === 'mech' ? 110 : 80;
      const freq = baseFreq + ((y + 1) * 400) + (freqY * 10);
      activeOscRef.current.frequency.setTargetAtTime(freq, ctx.currentTime, 0.05);

      // 2. Panning Mapping (X-axis) - Stereo L/R
      if (activePanRef.current) {
        activePanRef.current.pan.setTargetAtTime(x * 0.8, ctx.currentTime, 0.05);
      }

      // 3. Filter Mapping (Z-axis) - Brightness modulation
      if (activeFilterRef.current) {
        const cutoff = 400 + ((z + 1) * 2000);
        activeFilterRef.current.frequency.setTargetAtTime(cutoff, ctx.currentTime, 0.05);
      }

      // 4. Gain Modulation (Mech Pulsing)
      if (activeGainRef.current) {
        if (soundMode === 'mech') {
          const pulse = Math.floor(drawProgress * 150) % 2 === 0 ? 0.05 : 0.01;
          activeGainRef.current.gain.setTargetAtTime(pulse, ctx.currentTime, 0.01);
        } else {
          activeGainRef.current.gain.setTargetAtTime(0.05, ctx.currentTime, 0.1);
        }
      }
    }
  }, [drawProgress, freqX, freqY, freqZ, phaseX, phaseY, phaseZ, cycles, soundMode, soundProfile, mode]);

  // Animation loop for automatic parameters
  useEffect(() => {
    let frameId: number;
    const startTime = performance.now();
    
    const animate = (time: number) => {
      const elapsed = (time - startTime) / 1000;
      
      if (isAutoFreqX) setFreqX(10 + Math.sin(elapsed * 0.5) * 9);
      if (isAutoFreqY) setFreqY(10 + Math.cos(elapsed * 0.6) * 9);
      if (isAutoFreqZ) setFreqZ(10 + Math.sin(elapsed * 0.7) * 9);
      
      if (isAutoPhaseX) setPhaseX(prev => (prev + 0.01) % (Math.PI * 2));
      if (isAutoPhaseY) setPhaseY(prev => (prev + 0.012) % (Math.PI * 2));
      if (isAutoPhaseZ) setPhaseZ(prev => (prev + 0.008) % (Math.PI * 2));
      
      if (isAutoCycles) {
        // Need to import handleAutoCycles logic or call it
        // Actually handleAutoCycles depends on current freqs
        const gcd = (a: number, b: number): number => b < 0.001 ? a : gcd(b, a % b);
        const findLCM = (a: number, b: number) => (a * b) / gcd(a, b);
        const fx = Math.round(freqX * 100);
        const fy = Math.round(freqY * 100);
        const fz = Math.round(freqZ * 100);
        const lcmXY = findLCM(fx, fy);
        const lcmXYZ = findLCM(lcmXY, fz);
        const requiredCycles = (lcmXYZ / 100) / Math.min(freqX, freqY, freqZ);
        setCycles(parseFloat(Math.min(requiredCycles + 0.5, 50).toFixed(2)));
      }
      
      frameId = requestAnimationFrame(animate);
    };
    
    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, [isAutoFreqX, isAutoFreqY, isAutoFreqZ, isAutoPhaseX, isAutoPhaseY, isAutoPhaseZ, isAutoCycles, freqX, freqY, freqZ]);

  // Animation loop for plotting
  useEffect(() => {
    let interval: any;
    if (isPlotting) {
      interval = setInterval(() => {
        setDrawProgress((prev) => {
          if (prev >= 1) {
            setIsPlotting(false);
            return 1;
          }
          return prev + plotSpeed;
        });
      }, 16);
    }
    return () => clearInterval(interval);
  }, [isPlotting, plotSpeed]);

  // Auto Multiplier loop
  useEffect(() => {
    let interval: any;
    if (isAutoMultiplier && mode === 'lissajous') {
      interval = setInterval(() => {
        setMultiplier((prev) => (prev + 0.05) % 100);
      }, 16);
    }
    return () => clearInterval(interval);
  }, [isAutoMultiplier, mode]);

  const handleAutoCycles = () => {
    // Math logic to find required cycles to close the curve
    // Since step is 0.01, we work with integers by multiplying by 100
    const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
    
    const nx = Math.round(freqX * 100);
    const ny = Math.round(freqY * 100);
    const nz = Math.round(freqZ * 100);
    const d = 100;
    
    const commonGcd = gcd(nx, gcd(ny, gcd(nz, d)));
    const requiredCycles = d / commonGcd;
    
    // Set cycles, capped at 50
    setCycles(Math.min(requiredCycles, 50));
  };

  const applyLissajousPreset = (p: any) => {
    setFreqX(p.fx); setFreqY(p.fy); setFreqZ(p.fz);
    setPhaseX(p.px); setPhaseY(p.py); setPhaseZ(p.pz);
    setColor(p.color);
    if (p.mod !== undefined) setShowModMath(p.mod);
    if (p.mult !== undefined) setMultiplier(p.mult);
    if (p.rain !== undefined) setIsRainbow(p.rain);
    if (p.cycles !== undefined) setCycles(p.cycles);
    setIsAutoMultiplier(false);
  };

  const applyLorenzPreset = (p: any) => {
    setSigma(p.sigma); setRho(p.rho); setBeta(p.beta);
    setLorenzSpeed(p.speed); setColor(p.color);
    if (p.rain !== undefined) setIsRainbow(p.rain);
  };

  const reset = () => {
    if (mode === 'lissajous') {
      setFreqX(2); setFreqY(3); setFreqZ(5);
      setPhaseX(0); setPhaseY(Math.PI / 2); setPhaseZ(Math.PI / 4);
      setMultiplier(2); setCycles(10); setShowModMath(false);
    } else {
      setSigma(10); setRho(28); setBeta(2.667); setLorenzSpeed(0.01);
    }
    setColor('#3b82f6'); setIsRainbow(false); setDrawProgress(1);
    setIsPlotting(false); setIsAutoMultiplier(false); setIsOrbit(false);
    setIsAudioReactive(false);
  };

  const partialReset = () => {
    setDrawProgress(0);
    setIsPlotting(true);
  };

  const nextPreset = () => {
    const presets = mode === 'lissajous' ? LISSAJOUS_PRESETS : LORENZ_PRESETS;
    const currentName = presets.find(p => p.color === color)?.name; // Rough check
    const currentIndex = presets.findIndex(p => p.name === currentName);
    const nextItem = presets[(currentIndex + 1) % presets.length];
    if (mode === 'lissajous') applyLissajousPreset(nextItem);
    else applyLorenzPreset(nextItem);
  };

  return (
    <div className="relative w-full h-screen bg-zinc-950 overflow-hidden font-sans">
      {/* 3D Scene */}
      <Canvas camera={{ position: [0, 0, 15], fov: 45 }} style={{ touchAction: 'none' }}>
        <color attach="background" args={['#09090b']} />
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        
        <Suspense fallback={null}>
          <group position={[0, -5, 0]}>
            <gridHelper args={[20, 20, '#1e1e1e', '#1e1e1e']} />
          </group>

          <group>
            {mode === 'lissajous' ? (
              <>
                <LissajousCurve 
                  freqX={freqX} freqY={freqY} freqZ={freqZ} 
                  phaseX={phaseX} phaseY={phaseY} phaseZ={phaseZ} 
                  color={color} points={numPointsLissajousMain}
                  autoRotate={autoRotate} autoRotateSpeed={autoRotateSpeed} 
                  rainbow={isRainbow} isProRain={isProRain}
                  drawProgress={drawProgress} showHead={showHead} cycles={cycles}
                  opacity={opacity}
                />
                {showModMath && (
                  <LissajousModMath
                    freqX={freqX} freqY={freqY} freqZ={freqZ}
                    phaseX={phaseX} phaseY={phaseY} phaseZ={phaseZ}
                    multiplier={multiplier} numPoints={numPointsLissajous}
                    color={color} opacity={opacity * 0.5}
                    autoRotate={autoRotate} autoRotateSpeed={autoRotateSpeed} 
                    rainbow={isRainbow} isProRain={isProRain}
                    drawProgress={drawProgress} cycles={cycles}
                  />
                )}
              </>
            ) : mode === 'lorenz' ? (
              <LorenzAttractor 
                sigma={sigma} rho={rho} beta={beta} 
                speed={lorenzSpeed} numPoints={numPointsLorenz}
                color={color} isRainbow={isRainbow} isProRain={isProRain}
                drawProgress={drawProgress} audioVolume={audioVolume}
                opacity={opacity} autoRotate={autoRotate} autoRotateSpeed={autoRotateSpeed}
                showHead={showHead}
              />
            ) : (
              <group position={[0, -5, 0]}>
                <BeamCollider3D 
                  isPlaying={isPlotting} isMuted={isMuted} 
                  activeShape={beamShape} spawnRate={beamSpawnRate} 
                  bounceLimit={beamBounceLimit} soundType={soundProfile}
                  soundMode={soundMode}
                />
              </group>
            )}
          </group>
          
          <EffectComposer>
            {isBloom && <Bloom luminanceThreshold={0.1} mipmapBlur intensity={1.5} radius={0.4} />}
          </EffectComposer>

          <OrbitControls makeDefault autoRotate={isOrbit} autoRotateSpeed={orbitSpeed} enableDamping dampingFactor={0.05} enablePan={true} screenSpacePanning={true} />
          <ContactShadows position={[0, -5, 0]} opacity={0.4} scale={20} blur={2} far={4.5} />
          <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
        </Suspense>
      </Canvas>

      {/* UI Overlay */}
      <div className="absolute inset-0 pointer-events-none p-6 flex flex-col">
        {/* Header */}
        <div className="relative flex justify-between items-start pointer-events-none mb-auto">
          {/* Left: Title */}
          <AnimatePresence>
            {isUIVisible && !isFullscreen && (
              <motion.div 
                initial={{ opacity: 0, x: -20 }} 
                animate={{ opacity: 1, x: 0 }} 
                exit={{ opacity: 0, x: -20 }} 
                className="flex flex-col pointer-events-auto"
              >
                <h1 className="text-2xl font-bold tracking-tighter text-white flex items-center gap-2">
                  {mode === 'lissajous' ? 'LISSAJOUS' : mode === 'lorenz' ? 'LORENZ' : 'BEAM'} <span className="text-zinc-500 font-light italic text-xl">3D</span>
                </h1>
                <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mt-0.5">
                  {mode === 'lissajous' ? 'Frequency Explorer' : mode === 'lorenz' ? 'Chaos Visualization' : 'Physics Collider'}
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Center: Mode Selector */}
          <div className="absolute left-1/2 -translate-x-1/2 top-0 pointer-events-auto">
            <AnimatePresence>
              {isUIVisible && (
                <motion.div 
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="flex bg-zinc-950/40 backdrop-blur-3xl p-1 rounded-full border border-white/5 shadow-2xl"
                >
                  {['lissajous', 'lorenz', 'beam'].map((m) => (
                    <button key={m} onClick={() => setMode(m as any)} className={`px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${mode === m ? 'bg-white text-black shadow-lg shadow-white/10' : 'text-zinc-500 hover:text-white'}`}>
                      {m}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Right: Controls */}
          <div className="flex gap-2 pointer-events-auto">
            <button onClick={() => setIsUIVisible(!isUIVisible)} className={`flex items-center gap-2 px-3 py-2 glass rounded-full transition-all ${!isUIVisible ? 'bg-white/20 text-white' : 'text-zinc-400 hover:text-white'}`}>
              {isUIVisible ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
            {isUIVisible && !isFullscreen && (
              <>
                <button onClick={() => setShowLeftControls(!showLeftControls)} className={`flex items-center gap-2 px-3 py-2 glass rounded-full transition-all ${showLeftControls ? 'bg-blue-500/20 text-blue-400 border-blue-500/50' : 'text-zinc-400 hover:text-white'}`}>
                  <Zap size={18} /><span className="text-[10px] font-bold uppercase tracking-wider hidden sm:inline">Visuals</span>
                </button>
                <button onClick={() => setShowControls(!showControls)} className={`flex items-center gap-2 px-3 py-2 glass rounded-full transition-all ${showControls ? 'bg-amber-500/20 text-amber-400 border-amber-500/50' : 'text-zinc-400 hover:text-white'}`}>
                  <Settings2 size={18} /><span className="text-[10px] font-bold uppercase tracking-wider hidden sm:inline">Params</span>
                </button>
              </>
            )}
          </div>
        </div>

        <div className="flex justify-between items-center pointer-events-none h-full relative">
          {/* Left Sidebar */}
          <AnimatePresence>
            {isUIVisible && showLeftControls && !isFullscreen && (
              <motion.div initial={{ x: -320, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -320, opacity: 0 }} className="w-72 bg-zinc-950/80 backdrop-blur-xl border border-white/10 rounded-3xl flex flex-col overflow-hidden shadow-2xl pointer-events-auto max-h-[85vh]">
                <div className="p-4 border-b border-white/5 flex items-center justify-between bg-gradient-to-r from-blue-500/10 to-purple-500/10 shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/20 rounded-xl text-blue-400"><Zap size={14} /></div>
                    <h2 className="text-[10px] font-black uppercase tracking-widest text-white">Visuals & Audio</h2>
                  </div>
                </div>
                <div className="flex-1 p-5 space-y-6 overflow-y-auto custom-scrollbar">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col"><span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Audio Reactive</span></div>
                      <button onClick={() => setIsAudioReactive(!isAudioReactive)} className={`w-9 h-4.5 rounded-full transition-all relative ${isAudioReactive ? 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.4)]' : 'bg-zinc-700'}`}>
                        <div className={`absolute top-0.5 w-3.5 h-3.5 bg-white rounded-full transition-all ${isAudioReactive ? 'left-5' : 'left-0.5'}`} />
                      </button>
                    </div>
                    {isAudioReactive && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-3 pt-1">
                        <div className="flex items-center gap-2 p-2.5 bg-blue-500/5 rounded-xl border border-blue-500/10">
                          <div className="flex-1 h-1 bg-zinc-800 rounded-full overflow-hidden"><motion.div className="h-full bg-blue-500" animate={{ width: `${audioVolume * 100}%` }} /></div>
                          <Mic size={10} className="text-blue-400" />
                        </div>
                        <ControlSlider label="Sensitivity" value={audioSensitivity} min={0.1} max={5} step={0.1} onChange={setAudioSensitivity} color="text-blue-400" />
                      </motion.div>
                    )}
                  </div>
                  <div className="p-3 bg-zinc-900/50 border border-white/5 rounded-2xl space-y-3 mt-4">
                    <div className="flex items-center justify-between">
                       <div className="flex items-center gap-2">
                         <Music size={12} className="text-zinc-500" />
                         <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Sound Mode</span>
                       </div>
                       <button onClick={() => setIsMuted(!isMuted)} className={isMuted ? 'text-zinc-600' : 'text-blue-400 font-bold'}>
                         {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
                       </button>
                    </div>
                    <div className="space-y-2.5">
                      <div className="flex flex-col gap-1.5">
                        <span className="text-[8px] text-zinc-500 font-mono uppercase pl-1">Waveform Mode</span>
                        <div className="grid grid-cols-3 gap-1.5">
                          {['math', 'mech', 'ambient'].map((m) => (
                            <button key={m} onClick={() => setSoundMode(m as any)} className={`py-1.5 rounded-lg text-[8px] font-black uppercase border transition-all ${soundMode === m && !isMuted ? 'bg-blue-600/20 border-blue-500/50 text-blue-400' : 'bg-zinc-900 border-zinc-950 text-zinc-600'}`}>{m}</button>
                          ))}
                        </div>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <span className="text-[8px] text-zinc-500 font-mono uppercase pl-1">Instrument Profile</span>
                        <div className="grid grid-cols-3 gap-1.5">
                          {['piano', 'bell', 'percussion'].map((p) => (
                            <button key={p} onClick={() => setSoundProfile(p as any)} className={`py-1.5 rounded-lg text-[8px] font-black uppercase border transition-all ${soundProfile === p && !isMuted ? 'bg-amber-600/20 border-amber-500/50 text-amber-400' : 'bg-zinc-900 border-zinc-950 text-zinc-600'}`}>{p}</button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="h-px bg-zinc-800/50" />
                  <div className="space-y-4">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Cinematic</span>
                    <div className="grid grid-cols-1 gap-2">
                      <button onClick={() => setIsBloom(!isBloom)} className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${isBloom ? 'bg-amber-500/20 border-amber-500/50 text-amber-400' : 'bg-zinc-900 border-zinc-800 text-zinc-500'}`}>
                        <div className="flex items-center gap-2"><Zap size={14} /><span className="text-[9px] font-bold uppercase">Neon Glow</span></div>
                        <div className={`w-1.5 h-1.5 rounded-full ${isBloom ? 'bg-amber-400' : 'bg-zinc-700'}`} />
                      </button>
                      <ControlSlider 
                        label="Orbit Speed" 
                        value={orbitSpeed} 
                        min={-10} 
                        max={10} 
                        step={0.1} 
                        onChange={setOrbitSpeed} 
                        color="text-blue-400" 
                        isAuto={isOrbit}
                        onAutoToggle={() => setIsOrbit(!isOrbit)}
                      />
                      
                      <div className="h-2" /> {/* Subtle Spacer */}

                      <ControlSlider 
                        label="Rotate Speed" 
                        value={autoRotateSpeed} 
                        min={-5} 
                        max={5} 
                        step={0.1} 
                        onChange={setAutoRotateSpeed} 
                        color="text-amber-400" 
                        isAuto={autoRotate}
                        onAutoToggle={() => setAutoRotate(!autoRotate)}
                      />

                      <button onClick={() => setShowHead(!showHead)} className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${showHead ? 'bg-amber-500/20 border-amber-500/50 text-amber-400' : 'bg-zinc-900 border-zinc-800 text-zinc-500'}`}>
                        <div className="flex items-center gap-2"><Eye size={14} /><span className="text-[9px] font-bold uppercase">Show Head</span></div>
                        <div className={`w-1.5 h-1.5 rounded-full ${showHead ? 'bg-amber-400' : 'bg-zinc-700'}`} />
                      </button>
                    </div>
                  </div>
                  <div className="h-px bg-zinc-800/50" />
                  <div className="space-y-4">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Global Controls</span>
                    <div className="space-y-3">
                      <ControlSlider 
                        label="Plot Speed" 
                        value={plotSpeed} 
                        min={0.001} 
                        max={0.05} 
                        step={0.001} 
                        onChange={setPlotSpeed} 
                        color="text-emerald-400" 
                      />
                      <ControlSlider 
                        label="Line Opacity" 
                        value={opacity} 
                        min={0} 
                        max={1} 
                        step={0.01} 
                        onChange={setOpacity} 
                        color="text-cyan-400" 
                      />
                    </div>
                  </div>
                  <div className="h-px bg-zinc-800/50" />
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Appearance</span>
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        <button 
                          onClick={() => {
                            const next = !isRainbow;
                            setIsRainbow(next);
                            if (next) setIsProRain(false);
                          }} 
                          className={`flex items-center justify-center gap-2 px-2.5 py-1.5 rounded-lg border transition-all ${isRainbow ? 'bg-gradient-to-r from-red-500 via-green-500 to-blue-500 text-white border-white/20 shadow-lg' : 'bg-zinc-900 border-zinc-800 text-zinc-500'}`}
                        >
                          <Sparkles size={10} />
                          <span className="text-[9px] font-bold uppercase">Rainbow</span>
                        </button>
                        
                        <button 
                          onClick={() => {
                            const next = !isProRain;
                            setIsProRain(next);
                            if (next) setIsRainbow(false);
                          }} 
                          className={`flex items-center justify-center gap-2 px-2.5 py-1.5 rounded-lg border transition-all ${isProRain ? 'bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white border-white/20 shadow-lg' : 'bg-zinc-900 border-zinc-800 text-zinc-500'}`}
                        >
                          <Layers size={10} />
                          <span className="text-[9px] font-bold uppercase">Pro Rain</span>
                        </button>
                      </div>
                    </div>
                    {!isRainbow && (
                      <div className="grid grid-cols-5 gap-2">
                        {[
                          '#3b82f6', '#f43f5e', '#10b981', '#ffffff', '#f59e0b', 
                          '#8b5cf6', '#ec4899', '#06b6d4', '#f97316', '#a8a29e'
                        ].map((c) => (
                          <button 
                            key={c} 
                            onClick={() => setColor(c)} 
                            className={`w-full aspect-square rounded-lg border-2 transition-all ${color === c ? 'border-white scale-110 shadow-lg z-10' : 'border-transparent opacity-40 hover:opacity-100'}`} 
                            style={{ backgroundColor: c }} 
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        <AnimatePresence>
          {isUIVisible && !isFullscreen && (
            <PlayerBox 
              isPlotting={isPlotting}
              setIsPlotting={setIsPlotting}
              drawProgress={drawProgress}
              setDrawProgress={setDrawProgress}
              reset={reset}
              partialReset={partialReset}
              nextPreset={nextPreset}
              plotSpeed={plotSpeed}
              setPlotSpeed={setPlotSpeed}
              isMuted={isMuted}
              setIsMuted={setIsMuted}
              isFullscreen={isFullscreen}
              setIsFullscreen={setIsFullscreen}
            />
          )}
        </AnimatePresence>

          {/* Right Sidebar */}
          <AnimatePresence>
            {isUIVisible && showControls && !isFullscreen && (
              <motion.div initial={{ x: 320, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 320, opacity: 0 }} className="w-80 bg-zinc-950/80 backdrop-blur-xl border border-white/10 rounded-3xl flex flex-col overflow-hidden shadow-2xl pointer-events-auto max-h-[85vh]">
                <div className="p-4 border-b border-white/5 flex items-center justify-between bg-gradient-to-l from-amber-500/10 to-orange-500/10 shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-500/20 rounded-xl text-amber-400"><Settings2 size={14} /></div>
                    <h2 className="text-[10px] font-black uppercase tracking-widest text-white">Parameters</h2>
                  </div>
                </div>
                <div className="flex-1 p-5 space-y-6 overflow-y-auto custom-scrollbar">
                  {/* Mode Specific Controls */}
                  {mode === 'lissajous' ? (
                    <div className="space-y-5">
                      <div className="grid grid-cols-3 gap-1.5">
                        {LISSAJOUS_PRESETS.slice(0, 9).map((p) => (
                          <button key={p.name} onClick={() => applyLissajousPreset(p)} className="px-1 py-1.5 bg-zinc-900/50 border border-white/5 rounded-lg text-[9px] text-zinc-400 hover:bg-white/5 hover:text-white transition-all text-center truncate">{p.name}</button>
                        ))}
                      </div>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Cycles</span>
                          <button 
                            onClick={handleAutoCycles} 
                            className="flex items-center gap-1.5 px-2 py-0.5 rounded-full border bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-amber-500/50 hover:text-amber-400 transition-all active:scale-95"
                            title="Calculate required cycles for current frequencies"
                          >
                            <Zap size={8} />
                            <span className="text-[8px] font-black uppercase tracking-tighter">Auto Fix</span>
                          </button>
                        </div>
                        <ControlSlider 
                          label="Cycles" 
                          value={cycles} 
                          min={1} 
                          max={50} 
                          step={0.1} 
                          onChange={setCycles} 
                          color="text-amber-400"
                          format={(v) => v >= 50 ? "50+ (Max)" : v.toFixed(2)}
                          isAuto={isAutoCycles}
                          onAutoToggle={() => setIsAutoCycles(!isAutoCycles)}
                        />
                        <div className="h-px bg-zinc-800/30 my-1" />
                         <ControlSlider 
                          label="Freq X" 
                          value={freqX} 
                          min={1} 
                          max={20} 
                          step={0.01} 
                          onChange={setFreqX} 
                          isAuto={isAutoFreqX}
                          onAutoToggle={() => setIsAutoFreqX(!isAutoFreqX)}
                          color="text-blue-400"
                        />
                        <ControlSlider 
                          label="Freq Y" 
                          value={freqY} 
                          min={1} 
                          max={20} 
                          step={0.01} 
                          onChange={setFreqY} 
                          isAuto={isAutoFreqY}
                          onAutoToggle={() => setIsAutoFreqY(!isAutoFreqY)}
                          color="text-cyan-400"
                        />
                        <ControlSlider 
                          label="Freq Z" 
                          value={freqZ} 
                          min={1} 
                          max={20} 
                          step={0.01} 
                          onChange={setFreqZ} 
                          isAuto={isAutoFreqZ}
                          onAutoToggle={() => setIsAutoFreqZ(!isAutoFreqZ)}
                          color="text-sky-400"
                        />
                      </div>
                      <div className="space-y-3">
                        <ControlSlider 
                          label="Phase X" 
                          value={phaseX} 
                          min={0} 
                          max={Math.PI * 2} 
                          step={0.01} 
                          onChange={setPhaseX} 
                          isAuto={isAutoPhaseX}
                          onAutoToggle={() => setIsAutoPhaseX(!isAutoPhaseX)}
                          color="text-purple-400"
                        />
                        <ControlSlider 
                          label="Phase Y" 
                          value={phaseY} 
                          min={0} 
                          max={Math.PI * 2} 
                          step={0.01} 
                          onChange={setPhaseY} 
                          isAuto={isAutoPhaseY}
                          onAutoToggle={() => setIsAutoPhaseY(!isAutoPhaseY)}
                          color="text-indigo-400"
                        />
                        <ControlSlider 
                          label="Phase Z" 
                          value={phaseZ} 
                          min={0} 
                          max={Math.PI * 2} 
                          step={0.01} 
                          onChange={setPhaseZ} 
                          isAuto={isAutoPhaseZ}
                          onAutoToggle={() => setIsAutoPhaseZ(!isAutoPhaseZ)}
                          color="text-violet-400"
                        />
                      </div>
                      <div className="space-y-3">
                        <ControlSlider 
                          label="Points" 
                          value={numPointsLissajousMain} 
                          min={100} 
                          max={5000} 
                          step={100} 
                          onChange={setNumPointsLissajousMain} 
                          color="text-teal-400"
                        />
                      </div>
                      <div className="h-px bg-zinc-800/50" />
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Cardioid (Mod Math)</span>
                          </div>
                          <button onClick={() => setShowModMath(!showModMath)} className={`w-9 h-4.5 rounded-full transition-all relative ${showModMath ? 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.4)]' : 'bg-zinc-700'}`}>
                            <div className={`absolute top-0.5 w-3.5 h-3.5 bg-white rounded-full transition-all ${showModMath ? 'left-5' : 'left-0.5'}`} />
                          </button>
                        </div>
                        {showModMath && (
                          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-3 pt-1">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">Auto Multiplier</span>
                              <button onClick={() => setIsAutoMultiplier(!isAutoMultiplier)} className={`w-7 h-3.5 rounded-full transition-all relative ${isAutoMultiplier ? 'bg-amber-500' : 'bg-zinc-800'}`}>
                                <div className={`absolute top-0.5 w-2.5 h-2.5 bg-white rounded-full transition-all ${isAutoMultiplier ? 'left-4' : 'left-0.5'}`} />
                              </button>
                            </div>
                            <ControlSlider 
                              label="Multiplier" 
                              value={multiplier} 
                              min={1} 
                              max={100} 
                              step={0.1} 
                              onChange={setMultiplier} 
                              color="text-orange-400" 
                              isAuto={isAutoMultiplier}
                              onAutoToggle={() => setIsAutoMultiplier(!isAutoMultiplier)}
                            />
                            <ControlSlider 
                              label="Points" 
                              value={numPointsLissajous} 
                              min={50} 
                              max={1000} 
                              step={10} 
                              onChange={setNumPointsLissajous} 
                              color="text-orange-300" 
                            />
                          </motion.div>
                        )}
                      </div>
                    </div>
                  ) : mode === 'lorenz' ? (
                    <div className="space-y-5">
                      <div className="grid grid-cols-2 gap-1.5">
                        {LORENZ_PRESETS.map((p) => (
                          <button key={p.name} onClick={() => applyLorenzPreset(p)} className="px-1 py-1.5 bg-zinc-900/50 border border-white/5 rounded-lg text-[9px] text-zinc-400 hover:bg-white/5 hover:text-white transition-all text-center truncate">{p.name}</button>
                        ))}
                      </div>
                      <div className="space-y-3">
                        <ControlSlider label="Sigma (σ)" value={sigma} min={1} max={50} step={0.1} onChange={setSigma} color="text-blue-400" />
                        <ControlSlider label="Rho (ρ)" value={rho} min={1} max={150} step={0.1} onChange={setRho} color="text-purple-400" />
                        <ControlSlider label="Beta (β)" value={beta} min={0.1} max={10} step={0.001} onChange={setBeta} color="text-pink-400" />
                        <div className="h-px bg-zinc-800/30 my-1" />
                        <ControlSlider label="Lorenz Step" value={lorenzSpeed} min={0.001} max={0.05} step={0.001} onChange={setLorenzSpeed} color="text-emerald-400" />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="space-y-4">
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block">Geometry Type</span>
                        <div className="grid grid-cols-2 gap-1.5">
                          {['semicircle', 'V', 'parabola', 'U'].map((s) => (
                            <button key={s} onClick={() => setBeamShape(s as any)} className={`py-2 rounded-xl text-[9px] font-black uppercase border transition-all ${beamShape === s ? 'bg-white text-black border-white shadow-lg' : 'bg-zinc-900 border-zinc-950 text-zinc-600 hover:text-white'}`}>{s}</button>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-4">
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Dynamics</span>
                        <ControlSlider label="Spawn Rate" value={beamSpawnRate} min={0.01} max={0.2} step={0.01} onChange={setBeamSpawnRate} color="text-amber-400" />
                        <ControlSlider label="Reflect Limit" value={beamBounceLimit} min={1} max={15} step={1} onChange={setBeamBounceLimit} color="text-orange-400" />
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer Info */}
        <AnimatePresence>
          {isUIVisible && !isFullscreen && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="flex justify-between items-end mt-auto pointer-events-none">
              <div className="text-[10px] text-zinc-600 font-mono uppercase tracking-[0.2em] max-w-[200px]">
                {mode === 'lissajous' ? 'Harmonic Motion Explorer' : 'Chaotic System Visualization'}
              </div>
              <div className="flex items-center gap-4 pointer-events-auto">
                <a href="#" className="text-zinc-500 hover:text-white transition-colors"><Github size={14} /></a>
                <button className="text-zinc-500 hover:text-white transition-colors"><Info size={14} /></button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
