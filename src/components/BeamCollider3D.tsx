import React, { useMemo, useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// ── Audio Constants ──────────────────────────────────────────────────────────
const SCALE = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33, 659.25]; // Pentatonic C4

// ── Types ────────────────────────────────────────────────────────────────────
interface BeamState {
  id: number;
  points: THREE.Vector3[];
  born: number;
  hue: number;
  playedSound: boolean;
}

interface ShapeType {
  type: 'semicircle' | 'V' | 'parabola' | 'U';
  geometry: THREE.BufferGeometry;
  hue: number;
}

interface BeamCollider3DProps {
  isPlaying: boolean;
  isMuted: boolean;
  activeShape: 'semicircle' | 'V' | 'parabola' | 'U';
  spawnRate: number;
  bounceLimit: number;
  soundType: 'piano' | 'bell' | 'percussion';
  soundMode: 'math' | 'mech' | 'ambient';
}

export const BeamCollider3D: React.FC<BeamCollider3DProps> = ({ 
  isPlaying, isMuted, activeShape, spawnRate, bounceLimit, soundType, soundMode 
}) => {
  const [beams, setBeams] = useState<BeamState[]>([]);
  const beamIdRef = useRef(0);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // 1. Build Geometry for the Active Shape (Centered at local [0,0,0])
  const shape = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    const halfWidth = 4.0; // Scaled down for cleanliness
    const depth = 3.5;
    let hue = 200;

    switch (activeShape) {
      case 'semicircle':
        hue = 200;
        for (let i = 0; i <= 32; i++) {
          const ang = Math.PI + (i / 32) * Math.PI;
          pts.push(new THREE.Vector3(Math.cos(ang) * halfWidth, Math.sin(ang) * halfWidth + halfWidth, 0));
        }
        break;
      case 'V':
        hue = 40;
        pts.push(new THREE.Vector3(-halfWidth, depth, 0));
        pts.push(new THREE.Vector3(0, 0, 0));
        pts.push(new THREE.Vector3(halfWidth, depth, 0));
        break;
      case 'parabola':
        hue = 280;
        for (let i = 0; i <= 32; i++) {
          const x = (i / 32 - 0.5) * halfWidth * 2;
          const y = (x * x * depth) / (halfWidth * halfWidth);
          pts.push(new THREE.Vector3(x, y, 0));
        }
        break;
      case 'U':
        hue = 150;
        pts.push(new THREE.Vector3(-halfWidth, depth, 0));
        pts.push(new THREE.Vector3(-halfWidth, 0, 0));
        pts.push(new THREE.Vector3(halfWidth, 0, 0));
        pts.push(new THREE.Vector3(halfWidth, depth, 0));
        break;
    }

    return { 
      type: activeShape, 
      geometry: new THREE.BufferGeometry().setFromPoints(pts), 
      hue,
      halfWidth,
      depth
    };
  }, [activeShape]);

  // 2. Sound Engine (Combined Mode + Profile)
  const playImpactSound = (xPos: number) => {
    if (isMuted || !isPlaying) return;
    if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') ctx.resume();

    const normalizedX = (xPos + 4) / 8; // x range approx -4 to 4
    const idx = Math.floor(normalizedX * SCALE.length);
    const freq = SCALE[Math.max(0, Math.min(SCALE.length - 1, idx))];

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    // Waveform from soundMode
    osc.type = soundMode === 'math' ? 'triangle' : soundMode === 'mech' ? 'square' : 'sine';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    
    // Impact Profile from soundType
    const decay = soundType === 'piano' ? 1.2 : soundType === 'bell' ? 2.5 : 0.4;
    const volume = soundType === 'percussion' ? 0.12 : 0.08;
    
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2000, ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + decay);

    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + decay);
    
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start();
    osc.stop(ctx.currentTime + decay + 0.1);
  };

  // 3. Beam Physics (Raycast)
  const spawnBeam = () => {
    if (!isPlaying) return;

    // Start from high above, less spread
    const startX = (Math.random() - 0.5) * 6; 
    const path: THREE.Vector3[] = [new THREE.Vector3(startX, 15, 0)];
    let currentPos = path[0].clone();
    let currentDir = new THREE.Vector3((Math.random() - 0.5) * 0.1, -1, 0).normalize();
    let lastHitX: number | null = null;

    for (let b = 0; b < bounceLimit; b++) {
      let minT = 1000;
      let hitOccurred = false;

      // Single shape focused collision
      if (Math.abs(currentPos.x) < shape.halfWidth + 1) {
          const relativeY = currentPos.y; 
          if (currentDir.y < 0 && relativeY > 0) {
              const t = relativeY / -currentDir.y;
              const hitX = currentPos.x + currentDir.x * t;
              
              if (t < minT && t > 0.01 && Math.abs(hitX) < shape.halfWidth) {
                  minT = t;
                  const pt = currentPos.clone().add(currentDir.clone().multiplyScalar(t));
                  path.push(pt);
                  lastHitX = pt.x;
                  
                  // Reflect upward logic (approximation for the "bowl" shapes)
                  const normal = new THREE.Vector3(0, 1, 0); 
                  if (activeShape === 'semicircle') {
                    normal.set(pt.x / shape.halfWidth, 1, 0).normalize();
                  }
                  
                  currentDir.reflect(normal).multiplyScalar(1.02);
                  currentPos = pt.clone();
                  hitOccurred = true;
                }
            }
        }

        if (!hitOccurred) {
            path.push(currentPos.clone().add(currentDir.multiplyScalar(20)));
            break;
        }
    }

    setBeams(prev => [...prev.slice(-20), {
      id: beamIdRef.current++,
      points: path,
      born: Date.now(),
      hue: shape.hue,
      playedSound: false,
      lastHitX: lastHitX
    } as any]);
  };

  // 4. Animation Frame
  useFrame(() => {
    if (!isPlaying) return;

    // Pulse spawn logic based on spawnRate prop
    if (Math.random() < spawnRate) {
        spawnBeam();
    }

    // Sound logic
    const now = Date.now();
    beams.forEach(b => {
        if (!b.playedSound && (b as any).lastHitX !== null && (now - b.born) > 200) {
            playImpactSound((b as any).lastHitX);
            b.playedSound = true;
        }
    });
  });

  // Cleanup old beams
  useEffect(() => {
    const interval = setInterval(() => {
      setBeams(prev => prev.filter(b => Date.now() - b.born < 3000));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <group>
      {/* Active Shape Only */}
      <group>
        <line geometry={shape.geometry}>
           <lineBasicMaterial color={`hsl(${shape.hue}, 80%, 40%)`} transparent opacity={0.3} />
        </line>
        <line geometry={shape.geometry}>
           <lineBasicMaterial color={`hsl(${shape.hue}, 100%, 70%)`} transparent opacity={1.0} />
        </line>
        <pointLight position={[0, 1, 0]} color={`hsl(${shape.hue}, 100%, 70%)`} intensity={1.5} distance={10} />
      </group>

      {/* Dynamic Beams */}
      {beams.map(b => (
        <BeamLine key={b.id} beam={b} />
      ))}
    </group>
  );
};

// ── Sub-component for individual Beam Line ───────────────────────────────────
const BeamLine: React.FC<{ beam: BeamState }> = ({ beam }) => {
    const [opacity, setOpacity] = useState(0);

    useFrame(() => {
        const age = Date.now() - beam.born;
        if (age < 300) setOpacity(age / 300);
        else if (age > 2400) setOpacity(Math.max(0, 1 - (age - 2400) / 600));
        else setOpacity(1);
    });

    const geometry = useMemo(() => {
        return new THREE.BufferGeometry().setFromPoints(beam.points);
    }, [beam.points]);

    return (
        <line geometry={geometry}>
            <lineBasicMaterial 
                color={`hsl(${beam.hue}, 100%, 85%)`} 
                transparent 
                opacity={opacity * 0.7} 
                linewidth={1.5}
            />
        </line>
    );
};

export default BeamCollider3D;
