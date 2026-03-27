import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { getProRainColor } from '../utils/colorUtils';

interface LissajousCurveProps {
  freqX: number;
  freqY: number;
  freqZ: number;
  phaseX: number;
  phaseY: number;
  phaseZ: number;
  points: number;
  color: string;
  autoRotate?: boolean;
  rainbow?: boolean;
  drawProgress?: number; // 0 to 1
  showHead?: boolean;
  cycles?: number;
  opacity?: number;
  autoRotateSpeed?: number;
  isProRain?: boolean;
}

export const LissajousCurve: React.FC<LissajousCurveProps> = ({
  freqX,
  freqY,
  freqZ,
  phaseX,
  phaseY,
  phaseZ,
  points = 1000,
  color = '#00ffcc',
  autoRotate = false,
  autoRotateSpeed = 1,
  rainbow = false,
  drawProgress = 1,
  showHead = false,
  cycles = 10,
  opacity = 0.8,
  isProRain = false,
}) => {
  const lineRef = useRef<THREE.Line>(null);
  const headRef = useRef<THREE.Mesh>(null);

  const { curvePoints, colors, headPos } = useMemo(() => {
    const pts = [];
    const cols = [];
    const colorObj = new THREE.Color();
    const visiblePoints = Math.floor(points * drawProgress);
    
    let lastPos = new THREE.Vector3(0, 0, 0);

    for (let i = 0; i <= visiblePoints; i++) {
      const t = (i / points) * Math.PI * 2 * cycles;
      const x = Math.sin(t * freqX + phaseX);
      const y = Math.sin(t * freqY + phaseY);
      const z = Math.sin(t * freqZ + phaseZ);
      const pos = new THREE.Vector3(x * 3, y * 3, z * 3);
      pts.push(pos);
      lastPos = pos;
      
      if (isProRain) {
        const [r, g, b] = getProRainColor(i / points);
        cols.push(r, g, b);
      } else if (rainbow) {
        colorObj.setHSL(i / points, 0.8, 0.5);
        cols.push(colorObj.r, colorObj.g, colorObj.b);
      }
    }
    return { curvePoints: pts, colors: cols, headPos: lastPos };
  }, [freqX, freqY, freqZ, phaseX, phaseY, phaseZ, points, rainbow, isProRain, drawProgress, cycles]);

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry().setFromPoints(curvePoints);
    if ((rainbow || isProRain) && colors.length > 0) {
      geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    }
    return geo;
  }, [curvePoints, colors, rainbow, isProRain]);

  useFrame(() => {
    if (lineRef.current && autoRotate) {
      lineRef.current.rotation.y += 0.005 * autoRotateSpeed;
      lineRef.current.rotation.x += 0.002 * autoRotateSpeed;
    }
    if (headRef.current && lineRef.current) {
      headRef.current.rotation.copy(lineRef.current.rotation);
    }
  });

  const lineObject = useMemo(() => {
    const useVertexColors = rainbow || isProRain;
    return new THREE.Line(
      geometry, 
      new THREE.LineBasicMaterial({ 
        color: useVertexColors ? 0xffffff : color, 
        vertexColors: useVertexColors,
        transparent: true, 
        opacity: opacity 
      })
    );
  }, [geometry, color, rainbow, isProRain, opacity]);

  return (
    <group>
      <primitive 
        object={lineObject} 
        ref={lineRef} 
      />
      {showHead && drawProgress < 1 && (
        <mesh position={headPos} ref={headRef}>
          <sphereGeometry args={[0.15, 16, 16]} />
          <meshBasicMaterial color={(rainbow || isProRain) ? '#ffffff' : color} />
          <pointLight distance={2} intensity={2} color={(rainbow || isProRain) ? '#ffffff' : color} />
        </mesh>
      )}
    </group>
  );
};
