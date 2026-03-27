import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { getProRainColor } from '../utils/colorUtils';

interface LorenzAttractorProps {
  sigma: number;
  rho: number;
  beta: number;
  speed: number;
  numPoints: number;
  color: string;
  isRainbow: boolean;
  drawProgress: number;
  audioVolume: number;
  opacity?: number;
  autoRotate?: boolean;
  autoRotateSpeed?: number;
  showHead?: boolean;
  isProRain?: boolean;
}

const LorenzAttractor: React.FC<LorenzAttractorProps> = ({
  sigma,
  rho,
  beta,
  speed,
  numPoints,
  color,
  isRainbow,
  drawProgress,
  audioVolume,
  opacity = 0.8,
  autoRotate = false,
  autoRotateSpeed = 1,
  showHead = true,
  isProRain = false,
}) => {
  const lineRef = useRef<THREE.Line>(null);
  const headRef = useRef<THREE.Mesh>(null);

  // Pre-calculate the trajectory with robust normalization and warm-up
  const { points, finalScale } = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    let x = 1;
    let y = 1;
    let z = 1;

    // 1. Warm-up phase: Run the simulation for a bit to reach the attractor basin
    // This ensures we don't start at the unstable origin
    for (let i = 0; i < 500; i++) {
      const dx = sigma * (y - x);
      const dy = x * (rho - z) - y;
      const dz = x * y - beta * z;
      x += dx * speed;
      y += dy * speed;
      z += dz * speed;
    }

    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;

    // 2. Main calculation pass
    const rawPts: {x: number, y: number, z: number}[] = [];
    for (let i = 0; i < numPoints; i++) {
      const dx = sigma * (y - x);
      const dy = x * (rho - z) - y;
      const dz = x * y - beta * z;

      const nextX = x + dx * speed;
      const nextY = y + dy * speed;
      const nextZ = z + dz * speed;
      
      // Safety check for stability
      if (isNaN(nextX) || isNaN(nextY) || isNaN(nextZ) || !isFinite(nextX)) {
        break;
      }

      x = nextX;
      y = nextY;
      z = nextZ;

      rawPts.push({x, y, z});
      
      minX = Math.min(minX, x); maxX = Math.max(maxX, x);
      minY = Math.min(minY, y); maxY = Math.max(maxY, y);
      minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z);
    }

    // 3. Robust centering and scaling
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const centerZ = (minZ + maxZ) / 2;
    
    const sizeX = maxX - minX;
    const sizeY = maxY - minY;
    const sizeZ = maxZ - minZ;
    const maxSize = Math.max(sizeX, sizeY, sizeZ, 0.1);
    
    // Normalize all points to be centered and fit in a standard volume
    const scale = 7.2 / maxSize;
    
    for (const p of rawPts) {
      pts.push(new THREE.Vector3(
        (p.x - centerX) * scale,
        (p.y - centerY) * scale,
        (p.z - centerZ) * scale
      ));
    }

    return { points: pts, finalScale: 1 };
  }, [sigma, rho, beta, speed, numPoints]);

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const visibleCount = Math.floor(points.length * drawProgress);
    const visiblePoints = points.slice(0, visibleCount);
    
    if (visiblePoints.length < 2) {
      geo.setFromPoints([new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,0)]);
      return geo;
    }

    geo.setFromPoints(visiblePoints);

    // Color attribute for rainbow effect
    if (isRainbow || isProRain) {
      const colors = new Float32Array(visiblePoints.length * 3);
      const colorObj = new THREE.Color();
      for (let i = 0; i < visiblePoints.length; i++) {
        if (isProRain) {
          const [r, g, b] = getProRainColor(i / visiblePoints.length);
          colors[i * 3] = r;
          colors[i * 3 + 1] = g;
          colors[i * 3 + 2] = b;
        } else {
          colorObj.setHSL(i / visiblePoints.length, 0.8, 0.5);
          colors[i * 3] = colorObj.r;
          colors[i * 3 + 1] = colorObj.g;
          colors[i * 3 + 2] = colorObj.b;
        }
      }
      geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    }

    return geo;
  }, [points, drawProgress, isRainbow]);

  const headPos = useMemo(() => {
    const visibleCount = Math.floor(points.length * drawProgress);
    if (visibleCount === 0) return new THREE.Vector3(0, 0, 0);
    return points[visibleCount - 1] || new THREE.Vector3(0, 0, 0);
  }, [points, drawProgress]);

  const material = useMemo(() => {
    const useVertexColors = isRainbow || isProRain;
    return new THREE.LineBasicMaterial({
      color: useVertexColors ? 'white' : color,
      vertexColors: useVertexColors,
      transparent: true,
      opacity: opacity,
      linewidth: 1,
    });
  }, [color, isRainbow, isProRain, opacity]);

  const line = useMemo(() => {
    return new THREE.Line(geometry, material);
  }, [geometry, material]);

  useFrame((state) => {
    if (lineRef.current) {
      // Subtle rotation
      if (autoRotate) {
        lineRef.current.rotation.y += 0.002 * autoRotateSpeed;
      }
      
      // Audio reactivity: scale or pulse
      if (audioVolume > 0) {
        const scale = 1 + audioVolume * 0.2;
        lineRef.current.scale.set(scale, scale, scale);
      } else {
        lineRef.current.scale.set(1, 1, 1);
      }
    }

    if (headRef.current && lineRef.current) {
      headRef.current.rotation.copy(lineRef.current.rotation);
      if (audioVolume > 0) {
        const scale = 1 + audioVolume * 0.5;
        headRef.current.scale.set(scale, scale, scale);
      } else {
        headRef.current.scale.set(1, 1, 1);
      }
    }
  });

  return (
    <group scale={1}>
      <primitive ref={lineRef} object={line} />
      {showHead && drawProgress < 1 && headPos && (
        <mesh position={headPos} ref={headRef}>
          <sphereGeometry args={[0.08, 16, 16]} />
          <meshBasicMaterial color={(isRainbow || isProRain) ? 'white' : color} />
          <pointLight distance={2} intensity={2} color={(isRainbow || isProRain) ? 'white' : color} />
        </mesh>
      )}
    </group>
  );
};

export default LorenzAttractor;
