import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { playImpactVoice, type Instrument } from '../utils/audioSynth';

const SCALE = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25];
const TRAIL_TTL_MS = 900;
const EPS = 1e-6;

interface BeamCollision {
  x: number;
  pan: number;
  distance: number;
  triggered: boolean;
}

interface BeamState {
  id: number;
  points: THREE.Vector3[];
  collisions: BeamCollision[];
  born: number;
  hue: number;
  progress: number;
  totalLength: number;
  completedAt: number | null;
}

interface BeamCollider3DProps {
  isPlaying: boolean;
  isMuted: boolean;
  activeShape: 'semicircle' | 'V' | 'parabola' | 'U';
  bounceLimit: number;
  instrument: Instrument;
  isParallelLight: boolean;
  beamSpeed: number;
  rayNumber: number;
  revolution: number;
  rotation: number;
  spread: number;
  rayWidth: number;
  alpha: number;
  resetToken: number;
}

const normalizePan = (xPos: number) => Math.max(-1, Math.min(1, xPos / 4));

const noteFromX = (xPos: number) => {
  const normalizedX = (xPos + 4) / 8;
  const idx = Math.floor(normalizedX * SCALE.length);
  return SCALE[Math.max(0, Math.min(SCALE.length - 1, idx))];
};

const buildVisiblePath = (beam: BeamState) => {
  if (beam.points.length === 0) return [];
  if (beam.progress <= 0) return [beam.points[0].clone()];

  const visible: THREE.Vector3[] = [beam.points[0].clone()];
  let remaining = Math.min(beam.progress, beam.totalLength);

  for (let i = 1; i < beam.points.length; i++) {
    const start = beam.points[i - 1];
    const end = beam.points[i];
    const segmentLength = start.distanceTo(end);

    if (remaining >= segmentLength) {
      visible.push(end.clone());
      remaining -= segmentLength;
      continue;
    }

    if (segmentLength > EPS) {
      const point = start.clone().lerp(end, remaining / segmentLength);
      visible.push(point);
    }
    break;
  }

  return visible;
};

const getHeadPosition = (beam: BeamState) => {
  const visible = buildVisiblePath(beam);
  return visible[visible.length - 1] ?? beam.points[0];
};

export const BeamCollider3D: React.FC<BeamCollider3DProps> = ({
  isPlaying,
  isMuted,
  activeShape,
  bounceLimit,
  instrument,
  isParallelLight,
  beamSpeed,
  rayNumber,
  revolution,
  rotation,
  spread,
  rayWidth,
  alpha,
  resetToken,
}) => {
  const [beams, setBeams] = useState<BeamState[]>([]);
  const beamIdRef = useRef(0);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const spawnAccumulatorRef = useRef(0);

  const shape = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    const halfWidth = 4.0;
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
          pts.push(new THREE.Vector3(x, x * x * 1.5, 0));
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
      geometry: new THREE.BufferGeometry().setFromPoints(pts),
      hue,
      halfWidth,
      depth,
    };
  }, [activeShape]);

  const emitterState = useMemo(() => {
    const origin = new THREE.Vector3(0, 6, 0);
    const rotationRad = THREE.MathUtils.degToRad(rotation);
    const spreadRad = THREE.MathUtils.degToRad(spread);
    const baseDirection = new THREE.Vector3().subVectors(new THREE.Vector3(0, 0, 0), origin).normalize();
    baseDirection.applyAxisAngle(new THREE.Vector3(0, 0, 1), rotationRad);
    const perpendicular = new THREE.Vector3(-baseDirection.y, baseDirection.x, 0).normalize();

    return {
      origin,
      baseDirection,
      perpendicular,
      spreadRad,
    };
  }, [rotation, spread]);

  const playImpactSound = (xPos: number, pan: number) => {
    if (isMuted || !isPlaying) return;
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') ctx.resume();
    playImpactVoice(ctx, instrument, noteFromX(xPos), 1, pan);
  };

  const spawnBeam = () => {
    if (!isPlaying) return;

    const origin = emitterState.origin.clone();
    const points: THREE.Vector3[] = [
      isParallelLight
        ? origin.clone().add(emitterState.perpendicular.clone().multiplyScalar((Math.random() - 0.5) * 6))
        : origin.clone(),
    ];
    const collisions: BeamCollision[] = [];
    let currentPos = points[0].clone();
    let currentDir = emitterState.baseDirection.clone();
    if (isParallelLight) {
      currentDir = emitterState.baseDirection.clone();
    } else {
      currentDir.applyAxisAngle(
        new THREE.Vector3(0, 0, 1),
        (Math.random() - 0.5) * emitterState.spreadRad
      ).normalize();
    }
    let totalLength = 0;

    const W = shape.halfWidth;
    const D = shape.depth;

    for (let bounce = 0; bounce < bounceLimit; bounce++) {
      let hitT = Infinity;
      const hitNormal = new THREE.Vector3();
      const hitPoint = new THREE.Vector3();

      if (activeShape === 'semicircle') {
        const radius = W;
        const center = new THREE.Vector3(0, radius, 0);
        const oc = currentPos.clone().sub(center);
        const a = currentDir.dot(currentDir);
        const bCoeff = 2 * oc.dot(currentDir);
        const cCoeff = oc.dot(oc) - radius * radius;
        const disc = bCoeff * bCoeff - 4 * a * cCoeff;

        if (disc >= 0) {
          const sqrtDisc = Math.sqrt(disc);
          const roots = [(-bCoeff - sqrtDisc) / (2 * a), (-bCoeff + sqrtDisc) / (2 * a)];
          roots.forEach((t) => {
            if (t > 0.01 && t < hitT) {
              const point = currentPos.clone().add(currentDir.clone().multiplyScalar(t));
              if (point.y <= radius + 0.1) {
                hitT = t;
                hitPoint.copy(point);
                hitNormal.copy(point.clone().sub(center).normalize().negate());
              }
            }
          });
        }
      } else if (activeShape === 'V') {
        const slope = D / W;
        const normals = [
          new THREE.Vector3(slope, 1, 0).normalize(),
          new THREE.Vector3(-slope, 1, 0).normalize(),
        ];

        normals.forEach((normal) => {
          const denom = currentDir.dot(normal);
          if (Math.abs(denom) > 0.0001) {
            const t = -currentPos.dot(normal) / denom;
            if (t > 0.01 && t < hitT) {
              const point = currentPos.clone().add(currentDir.clone().multiplyScalar(t));
              if (Math.abs(point.x) <= W + 0.1 && point.y <= D + 0.1 && point.y >= -0.1) {
                hitT = t;
                hitPoint.copy(point);
                hitNormal.copy(normal);
              }
            }
          }
        });
      } else if (activeShape === 'parabola') {
        const k = 1.5;
        const A = k * currentDir.x * currentDir.x;
        const B = 2 * k * currentPos.x * currentDir.x - currentDir.y;
        const C = k * currentPos.x * currentPos.x - currentPos.y;

        const roots: number[] = [];
        if (Math.abs(A) < EPS) {
          if (Math.abs(B) > EPS) roots.push(-C / B);
        } else {
          const disc = B * B - 4 * A * C;
          if (disc >= 0) {
            const sqrtDisc = Math.sqrt(disc);
            roots.push((-B - sqrtDisc) / (2 * A), (-B + sqrtDisc) / (2 * A));
          }
        }

        roots.forEach((t) => {
          if (t > 0.01 && t < hitT) {
            const point = currentPos.clone().add(currentDir.clone().multiplyScalar(t));
            if (Math.abs(point.x) <= W + 0.2) {
              hitT = t;
              hitPoint.copy(point);
              hitNormal.set(-2 * k * point.x, 1, 0).normalize();
            }
          }
        });
      } else if (activeShape === 'U') {
        const normals = [
          new THREE.Vector3(0, 1, 0),
          new THREE.Vector3(1, 0, 0),
          new THREE.Vector3(-1, 0, 0),
        ];
        const offsets = [0, W, W];

        normals.forEach((normal, index) => {
          const denom = currentDir.dot(normal);
          if (Math.abs(denom) > 0.0001) {
            const t = (offsets[index] - currentPos.dot(normal)) / denom;
            if (t > 0.01 && t < hitT) {
              const point = currentPos.clone().add(currentDir.clone().multiplyScalar(t));
              const inBounds = index === 0 ? Math.abs(point.x) <= W : point.y >= 0 && point.y <= D;
              if (inBounds) {
                hitT = t;
                hitPoint.copy(point);
                hitNormal.copy(normal);
              }
            }
          }
        });
      }

      if (hitT === Infinity) {
        const exitPoint = currentPos.clone().add(currentDir.clone().multiplyScalar(20));
        totalLength += currentPos.distanceTo(exitPoint);
        points.push(exitPoint);
        break;
      }

      totalLength += currentPos.distanceTo(hitPoint);
      points.push(hitPoint.clone());
      collisions.push({
        x: hitPoint.x,
        pan: normalizePan(hitPoint.x),
        distance: totalLength,
        triggered: false,
      });
      currentDir.reflect(hitNormal).normalize();
      currentPos.copy(hitPoint).add(currentDir.clone().multiplyScalar(0.02));
    }

    setBeams((prev) => [
      ...prev.slice(-(Math.max(1, rayNumber) - 1)),
      {
        id: beamIdRef.current++,
        points,
        collisions,
        born: Date.now(),
        hue: shape.hue,
        progress: 0,
        totalLength,
        completedAt: null,
      },
    ]);
  };

  useFrame((_, delta) => {
    if (isPlaying) {
      const spawnPerSecond = Math.min(60, Math.max(4, rayNumber / 20));
      spawnAccumulatorRef.current += delta * spawnPerSecond;
      while (spawnAccumulatorRef.current >= 1) {
        if (beams.length >= rayNumber) {
          spawnAccumulatorRef.current = 0;
          break;
        }
        spawnBeam();
        spawnAccumulatorRef.current -= 1;
      }
    }

    const now = Date.now();
    const pendingImpacts: Array<{ x: number; pan: number }> = [];

    setBeams((prev) =>
      prev
        .map((beam) => {
          const nextProgress = isPlaying
            ? Math.min(beam.totalLength, beam.progress + beamSpeed * delta)
            : beam.progress;

          const collisions = beam.collisions.map((collision) => {
            if (!collision.triggered && nextProgress >= collision.distance) {
              pendingImpacts.push({ x: collision.x, pan: collision.pan });
              return { ...collision, triggered: true };
            }
            return collision;
          });

          const completedAt =
            beam.completedAt ?? (nextProgress >= beam.totalLength ? now : null);

          return {
            ...beam,
            progress: nextProgress,
            collisions,
            completedAt,
          };
        })
        .filter((beam) => beam.completedAt === null || now - beam.completedAt < TRAIL_TTL_MS)
    );

    pendingImpacts.forEach(({ x, pan }) => playImpactSound(x, pan));
  });

  useEffect(() => {
    setBeams([]);
    spawnAccumulatorRef.current = 0;
  }, [resetToken, activeShape, isParallelLight, revolution, rotation, spread]);

  useEffect(() => {
    return () => {
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
      }
    };
  }, []);

  return (
    <group>
      <group position={emitterState.origin.toArray()}>
        <mesh>
          <sphereGeometry args={[0.12, 20, 20]} />
          <meshStandardMaterial
            color="white"
            emissive={new THREE.Color(`hsl(${shape.hue}, 100%, 70%)`)}
            emissiveIntensity={4}
          />
        </mesh>
        <pointLight color={new THREE.Color(`hsl(${shape.hue}, 100%, 80%)`)} intensity={3} distance={12} />
      </group>

      <group>
        <primitive
          object={
            new THREE.Line(
              shape.geometry,
              new THREE.LineBasicMaterial({
                color: new THREE.Color(`hsl(${shape.hue}, 80%, 40%)`),
                transparent: true,
                opacity: 0.3,
              })
            )
          }
        />
        <primitive
          object={
            new THREE.Line(
              shape.geometry,
              new THREE.LineBasicMaterial({
                color: new THREE.Color(`hsl(${shape.hue}, 100%, 70%)`),
                transparent: true,
                opacity: 1,
              })
            )
          }
        />
        <pointLight
          position={[0, 1, 0]}
          color={new THREE.Color(`hsl(${shape.hue}, 100%, 60%)`)}
          intensity={1.5}
          distance={8}
        />
      </group>

      {beams.map((beam) => (
        <BeamLine key={beam.id} beam={beam} rayWidth={rayWidth} alpha={alpha} />
      ))}
    </group>
  );
};

const BeamLine: React.FC<{ beam: BeamState; rayWidth: number; alpha: number }> = ({ beam, rayWidth, alpha }) => {
  const age = Date.now() - beam.born;
  const trailAge = beam.completedAt ? Date.now() - beam.completedAt : 0;
  const fadeIn = Math.min(1, age / 120);
  const fadeOut = beam.completedAt ? Math.max(0, 1 - trailAge / TRAIL_TTL_MS) : 1;
  const opacity = Math.min(1, (alpha / 3) * 1.2) * fadeIn * fadeOut;
  const visiblePoints = useMemo(() => buildVisiblePath(beam), [beam]);
  const headPosition = useMemo(() => getHeadPosition(beam), [beam]);

  const line = useMemo(() => {
    const geometry = new THREE.BufferGeometry().setFromPoints(visiblePoints);
    const material = new THREE.LineBasicMaterial({
      color: new THREE.Color(`hsl(${beam.hue}, 100%, 90%)`),
      transparent: true,
      opacity,
      linewidth: rayWidth,
    });
    return new THREE.Line(geometry, material);
  }, [beam.hue, opacity, rayWidth, visiblePoints]);

  return (
    <group>
      <primitive object={line} />
      <mesh position={headPosition.toArray()}>
        <sphereGeometry args={[0.05 + rayWidth * 0.03, 16, 16]} />
        <meshStandardMaterial
          color={new THREE.Color(`hsl(${beam.hue}, 100%, 96%)`)}
          emissive={new THREE.Color(`hsl(${beam.hue}, 100%, 75%)`)}
          emissiveIntensity={4 + rayWidth * 0.4}
          transparent
          opacity={opacity}
        />
      </mesh>
      <pointLight
        position={headPosition.toArray()}
        color={new THREE.Color(`hsl(${beam.hue}, 100%, 80%)`)}
        intensity={1.2 * opacity}
        distance={3}
      />
    </group>
  );
};

export default BeamCollider3D;
