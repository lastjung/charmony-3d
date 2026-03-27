import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface LissajousModMathProps {
  freqX: number;
  freqY: number;
  freqZ: number;
  phaseX: number;
  phaseY: number;
  phaseZ: number;
  multiplier: number;
  numPoints: number;
  color: string;
  opacity: number;
  autoRotate?: boolean;
  rainbow?: boolean;
  drawProgress?: number;
  cycles?: number;
  autoRotateSpeed?: number;
}

export const LissajousModMath: React.FC<LissajousModMathProps> = ({
  freqX,
  freqY,
  freqZ,
  phaseX,
  phaseY,
  phaseZ,
  multiplier,
  numPoints = 200,
  color = '#ffffff',
  opacity = 0.2,
  autoRotate = false,
  autoRotateSpeed = 1,
  rainbow = false,
  drawProgress = 1,
  cycles = 10,
}) => {
  const groupRef = useRef<THREE.Group>(null);

  const { lines, colors } = useMemo(() => {
    const points: THREE.Vector3[] = [];
    const colorObj = new THREE.Color();
    
    // Calculate all points first
    for (let i = 0; i < numPoints; i++) {
      const t = (i / numPoints) * Math.PI * 2 * cycles;
      const x = Math.sin(t * freqX + phaseX) * 3;
      const y = Math.sin(t * freqY + phaseY) * 3;
      const z = Math.sin(t * freqZ + phaseZ) * 3;
      points.push(new THREE.Vector3(x, y, z));
    }

    const linePoints: THREE.Vector3[] = [];
    const cols: number[] = [];
    const visibleLimit = Math.floor(numPoints * drawProgress);
    const baseColor = new THREE.Color(color);
    const highlightColor = new THREE.Color(color).offsetHSL(0.1, 0.2, 0.1);

    for (let i = 0; i < visibleLimit; i++) {
      const targetIndex = Math.floor((i * multiplier) % numPoints);
      
      linePoints.push(points[i]);
      linePoints.push(points[targetIndex]);
      
      if (rainbow) {
        colorObj.setHSL((i / numPoints + multiplier * 0.01) % 1, 0.8, 0.5);
        cols.push(colorObj.r, colorObj.g, colorObj.b);
        colorObj.setHSL((targetIndex / numPoints + multiplier * 0.01) % 1, 0.8, 0.5);
        cols.push(colorObj.r, colorObj.g, colorObj.b);
      } else {
        // Gradient from base color to a slightly shifted highlight color
        cols.push(baseColor.r, baseColor.g, baseColor.b);
        cols.push(highlightColor.r, highlightColor.g, highlightColor.b);
      }
    }

    return { lines: linePoints, colors: cols };
  }, [freqX, freqY, freqZ, phaseX, phaseY, phaseZ, multiplier, numPoints, rainbow, drawProgress, cycles, color]);

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry().setFromPoints(lines);
    if (colors.length > 0) {
      geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    }
    return geo;
  }, [lines, colors]);

  useFrame(() => {
    if (groupRef.current && autoRotate) {
      groupRef.current.rotation.y += 0.005 * autoRotateSpeed;
      groupRef.current.rotation.x += 0.002 * autoRotateSpeed;
    }
  });

  return (
    <group ref={groupRef}>
      <lineSegments geometry={geometry}>
        <lineBasicMaterial 
          attach="material" 
          vertexColors={true}
          transparent 
          opacity={opacity} 
          blending={THREE.AdditiveBlending}
        />
      </lineSegments>
    </group>
  );
};
