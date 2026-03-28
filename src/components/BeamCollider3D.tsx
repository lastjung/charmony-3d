import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  createImpactVoicePool,
  disposeImpactVoicePool,
  getAdaptiveImpactResponse,
  getImpactInstrumentConfig,
  playPooledImpactVoice,
  type ImpactVoicePool,
  type Instrument,
} from '../utils/audioSynth';

const SCALE = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25];
const TRAIL_TTL_MS = 900;
const EPS = 1e-6;
const MAX_AUDIO_EVENTS_PER_FRAME = 5;

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

interface BeamCollision {
  x: number;
  pan: number;
  distance: number;
  energy: number;
}

interface RayDefinition {
  points: THREE.Vector3[];
  collisions: BeamCollision[];
  totalLength: number;
}

interface PooledRay {
  id: number;
  alive: boolean;
  born: number;
  progress: number;
  totalLength: number;
  points: THREE.Vector3[];
  collisions: BeamCollision[];
  nextCollisionIndex: number;
}

interface GhostTrail {
  active: boolean;
  points: THREE.Vector3[];
  expiresAt: number;
}

const EMPTY_POINT = new THREE.Vector3(0, 0, 0);

const normalizePan = (xPos: number) => Math.max(-1, Math.min(1, xPos / 4));

const noteFromX = (xPos: number) => {
  const normalizedX = (xPos + 4) / 8;
  const idx = Math.floor(normalizedX * SCALE.length);
  return SCALE[Math.max(0, Math.min(SCALE.length - 1, idx))];
};

const createDeadRay = (id: number): PooledRay => ({
  id,
  alive: false,
  born: 0,
  progress: 0,
  totalLength: 0,
  points: [],
  collisions: [],
  nextCollisionIndex: 0,
});

const createGhostTrail = (): GhostTrail => ({
  active: false,
  points: [],
  expiresAt: 0,
});

const getVisibleHeadState = (ray: PooledRay) => {
  if (ray.points.length === 0) {
    return {
      position: EMPTY_POINT,
      direction: new THREE.Vector3(0, -1, 0),
    };
  }

  let remaining = Math.min(ray.progress, ray.totalLength);
  for (let i = 1; i < ray.points.length; i++) {
    const start = ray.points[i - 1];
    const end = ray.points[i];
    const segmentLength = start.distanceTo(end);
    if (remaining >= segmentLength) {
      remaining -= segmentLength;
      continue;
    }
    const direction = end.clone().sub(start).normalize();
    return {
      position: segmentLength > EPS ? start.clone().lerp(end, remaining / segmentLength) : start.clone(),
      direction: direction.lengthSq() > EPS ? direction : new THREE.Vector3(0, -1, 0),
    };
  }

  const finalPoint = ray.points[ray.points.length - 1];
  const prevPoint = ray.points[ray.points.length - 2] ?? finalPoint;
  const direction = finalPoint.clone().sub(prevPoint).normalize();
  return {
    position: finalPoint,
    direction: direction.lengthSq() > EPS ? direction : new THREE.Vector3(0, -1, 0),
  };
};

const appendVisibleSegments = (
  ray: PooledRay,
  buffer: Float32Array,
  segmentCursor: number
) => {
  if (ray.points.length < 2) return segmentCursor;

  let remaining = Math.min(ray.progress, ray.totalLength);
  let cursor = segmentCursor;

  for (let i = 1; i < ray.points.length; i++) {
    const start = ray.points[i - 1];
    const end = ray.points[i];
    const segmentLength = start.distanceTo(end);

    if (segmentLength <= EPS) continue;

    let visibleEnd = end;
    if (remaining < segmentLength) {
      if (remaining <= 0) break;
      visibleEnd = start.clone().lerp(end, remaining / segmentLength);
    }

    buffer[cursor++] = start.x;
    buffer[cursor++] = start.y;
    buffer[cursor++] = start.z;
    buffer[cursor++] = visibleEnd.x;
    buffer[cursor++] = visibleEnd.y;
    buffer[cursor++] = visibleEnd.z;

    remaining -= segmentLength;
    if (remaining <= 0) break;
  }

  return cursor;
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
  const EMITTER_ORIGIN = new THREE.Vector3(0, 5, 0);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const impactVoicePoolRef = useRef<ImpactVoicePool | null>(null);
  const poolCursorRef = useRef(0);
  const rayPoolRef = useRef<PooledRay[]>([]);
  const ghostCursorRef = useRef(0);
  const ghostTrailsRef = useRef<GhostTrail[]>([]);
  const lineSegmentsRef = useRef<THREE.LineSegments>(null);
  const ghostLineSegmentsRef = useRef<THREE.LineSegments>(null);
  const headMeshRef = useRef<THREE.InstancedMesh>(null);
  const leadPointMeshRef = useRef<THREE.InstancedMesh>(null);
  const prevIsPlayingRef = useRef(isPlaying);
  const linePositionsRef = useRef<Float32Array | null>(null);
  const ghostPositionsRef = useRef<Float32Array | null>(null);
  const audioDensityRef = useRef(0);
  const instanceDummy = useMemo(() => new THREE.Object3D(), []);

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
    const origin = EMITTER_ORIGIN.clone();
    const rotationRad = THREE.MathUtils.degToRad(rotation);
    const spreadRad = THREE.MathUtils.degToRad(spread);
    const baseDirection = new THREE.Vector3(Math.cos(rotationRad), Math.sin(rotationRad), 0).normalize();
    const perpendicular = new THREE.Vector3(-baseDirection.y, baseDirection.x, 0).normalize();

    return {
      origin,
      baseDirection,
      perpendicular,
      spreadRad,
    };
  }, [rotation, spread]);

  const maxSegments = Math.max(1, rayNumber * (bounceLimit + 1));
  const densityAlphaFactor = useMemo(() => {
    const alphaFromDensity = 28 / Math.sqrt(Math.max(24, rayNumber));
    return Math.max(0.42, Math.min(1, alphaFromDensity));
  }, [rayNumber]);

  const lineGeometry = useMemo(() => {
    const positions = new Float32Array(maxSegments * 2 * 3);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setDrawRange(0, 0);
    linePositionsRef.current = positions;
    return geometry;
  }, [maxSegments]);

  const ghostLineGeometry = useMemo(() => {
    const positions = new Float32Array(maxSegments * 2 * 3);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setDrawRange(0, 0);
    ghostPositionsRef.current = positions;
    return geometry;
  }, [maxSegments]);

  const beamMaterial = useMemo(
    () =>
      new THREE.LineBasicMaterial({
        color: new THREE.Color(`hsl(${shape.hue}, 100%, 90%)`),
        transparent: true,
        opacity: Math.min(0.72, Math.max(0.2, (alpha / 3) * 1.45 * densityAlphaFactor)),
      }),
    [alpha, densityAlphaFactor, shape.hue]
  );

  const ghostBeamMaterial = useMemo(
    () =>
      new THREE.LineBasicMaterial({
        color: new THREE.Color(`hsl(${shape.hue}, 100%, 85%)`),
        transparent: true,
        opacity: Math.min(0.22, Math.max(0.045, (alpha / 3) * 0.5 * densityAlphaFactor)),
      }),
    [alpha, densityAlphaFactor, shape.hue]
  );

  const shapeGhostMaterial = useMemo(
    () =>
      new THREE.LineBasicMaterial({
        color: new THREE.Color(`hsl(${shape.hue}, 80%, 40%)`),
        transparent: true,
        opacity: 0.3,
      }),
    [shape.hue]
  );

  const shapeCoreMaterial = useMemo(
    () =>
      new THREE.LineBasicMaterial({
        color: new THREE.Color(`hsl(${shape.hue}, 100%, 70%)`),
        transparent: true,
        opacity: 1,
      }),
    [shape.hue]
  );

  const shapeGhostLine = useMemo(
    () => new THREE.Line(shape.geometry, shapeGhostMaterial),
    [shape.geometry, shapeGhostMaterial]
  );

  const shapeCoreLine = useMemo(
    () => new THREE.Line(shape.geometry, shapeCoreMaterial),
    [shape.geometry, shapeCoreMaterial]
  );

  const initializePool = () => {
    rayPoolRef.current = Array.from({ length: rayNumber }, (_, index) => createDeadRay(index));
    ghostTrailsRef.current = Array.from({ length: rayNumber }, () => createGhostTrail());
    poolCursorRef.current = 0;
    ghostCursorRef.current = 0;
    if (linePositionsRef.current) linePositionsRef.current.fill(0);
    if (ghostPositionsRef.current) ghostPositionsRef.current.fill(0);
    if (lineGeometry) lineGeometry.setDrawRange(0, 0);
    if (ghostLineGeometry) ghostLineGeometry.setDrawRange(0, 0);
    if (isPlaying) {
      const now = Date.now();
      for (let i = 0; i < rayNumber; i++) {
        activateNextRay(now);
      }
    }
  };

  const playImpactSound = (xPos: number, pan: number, velocity = 1, priority = velocity) => {
    if (isMuted || !isPlaying) return;
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') ctx.resume();
    const impactConfig = getImpactInstrumentConfig(instrument);
    if (!impactVoicePoolRef.current) {
      impactVoicePoolRef.current = createImpactVoicePool(ctx, instrument, impactConfig.poolSize);
    }
    playPooledImpactVoice(
      impactVoicePoolRef.current,
      ctx,
      instrument,
      noteFromX(xPos),
      velocity,
      pan,
      priority
    );
  };

  const buildRayDefinition = (): RayDefinition => {
    const origin = emitterState.origin.clone();
    const points: THREE.Vector3[] = [
      isParallelLight
        ? origin.clone().add(emitterState.perpendicular.clone().multiplyScalar((Math.random() - 0.5) * 6))
        : origin.clone(),
    ];
    const collisions: BeamCollision[] = [];
    let currentPos = points[0].clone();
    let currentDir = emitterState.baseDirection.clone();
    if (!isParallelLight) {
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
        const exitPoint = currentPos.clone().add(currentDir.clone().multiplyScalar(18));
        totalLength += currentPos.distanceTo(exitPoint);
        points.push(exitPoint);
        break;
      }

      totalLength += currentPos.distanceTo(hitPoint);
      const incidenceEnergy = Math.max(0.2, Math.min(1, Math.abs(currentDir.dot(hitNormal))));
      points.push(hitPoint.clone());
      collisions.push({
        x: hitPoint.x,
        pan: normalizePan(hitPoint.x),
        distance: totalLength,
        energy: incidenceEnergy,
      });
      currentDir.reflect(hitNormal).normalize();
      currentPos.copy(hitPoint).add(currentDir.clone().multiplyScalar(0.02));
    }

    return {
      points,
      collisions,
      totalLength,
    };
  };

  const activateNextRay = (now: number) => {
    if (rayPoolRef.current.length === 0) return;

    for (let attempt = 0; attempt < rayPoolRef.current.length; attempt++) {
      const index = (poolCursorRef.current + attempt) % rayPoolRef.current.length;
      const ray = rayPoolRef.current[index];
      if (ray.alive) continue;

      const definition = buildRayDefinition();
      ray.alive = true;
      ray.born = now;
      ray.progress = 0;
      ray.totalLength = definition.totalLength;
      ray.points = definition.points;
      ray.collisions = definition.collisions;
      ray.nextCollisionIndex = 0;

      poolCursorRef.current = (index + 1) % rayPoolRef.current.length;
      return;
    }
  };

  const pushGhostTrail = (points: THREE.Vector3[], now: number) => {
    if (ghostTrailsRef.current.length === 0 || points.length < 2) return;
    const index = ghostCursorRef.current % ghostTrailsRef.current.length;
    ghostTrailsRef.current[index] = {
      active: true,
      points: points.map((point) => point.clone()),
      expiresAt: now + TRAIL_TTL_MS,
    };
    ghostCursorRef.current = (index + 1) % ghostTrailsRef.current.length;
  };

  const appendFullSegments = (
    points: THREE.Vector3[],
    buffer: Float32Array,
    segmentCursor: number
  ) => {
    let cursor = segmentCursor;
    for (let i = 1; i < points.length; i++) {
      const start = points[i - 1];
      const end = points[i];
      if (start.distanceTo(end) <= EPS) continue;
      buffer[cursor++] = start.x;
      buffer[cursor++] = start.y;
      buffer[cursor++] = start.z;
      buffer[cursor++] = end.x;
      buffer[cursor++] = end.y;
      buffer[cursor++] = end.z;
    }
    return cursor;
  };

  useEffect(() => {
    initializePool();
  }, [lineGeometry, ghostLineGeometry, resetToken, activeShape, bounceLimit, isParallelLight, rayNumber, rotation, spread]);

  useEffect(() => {
    return () => {
      if (impactVoicePoolRef.current) {
        disposeImpactVoicePool(impactVoicePoolRef.current);
        impactVoicePoolRef.current = null;
      }
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
      }
    };
  }, []);

  useEffect(() => {
    if (!audioCtxRef.current) return;
    if (impactVoicePoolRef.current) {
      disposeImpactVoicePool(impactVoicePoolRef.current);
    }
    impactVoicePoolRef.current = createImpactVoicePool(
      audioCtxRef.current,
      instrument,
      getImpactInstrumentConfig(instrument).poolSize
    );
  }, [instrument]);

  useEffect(() => {
    const wasPlaying = prevIsPlayingRef.current;
    prevIsPlayingRef.current = isPlaying;

    if (isPlaying && !wasPlaying) {
      initializePool();
    }
  }, [isPlaying, rayNumber, activeShape, bounceLimit, isParallelLight, rotation, spread]);

  useFrame((_, delta) => {
    const now = Date.now();
    let activeRayCount = 0;
    const pendingImpacts: Array<{ x: number; pan: number; velocity: number; priority: number }> = [];

    for (const ray of rayPoolRef.current) {
      if (!ray.alive) continue;
      activeRayCount += 1;

      if (isPlaying) {
        ray.progress = Math.min(ray.totalLength, ray.progress + beamSpeed * delta);
        while (
          ray.nextCollisionIndex < ray.collisions.length &&
          ray.progress >= ray.collisions[ray.nextCollisionIndex].distance
        ) {
          if (pendingImpacts.length < MAX_AUDIO_EVENTS_PER_FRAME) {
            const collision = ray.collisions[ray.nextCollisionIndex];
            const impactConfig = getImpactInstrumentConfig(instrument);
            const centerWeight = 1 - Math.abs(collision.pan) * 0.35;
            const bounceWeight = Math.max(0.72, 1 - ray.nextCollisionIndex * 0.06);
            const rawVelocity = centerWeight * bounceWeight * collision.energy;
            const adaptiveResponse = getAdaptiveImpactResponse(instrument, audioDensityRef.current);
            const adaptiveVelocity = Math.max(
              impactConfig.velocityFloor,
              Math.pow(rawVelocity, adaptiveResponse.velocityExponent),
              adaptiveResponse.velocityFloor
            );
            pendingImpacts.push({
              x: collision.x,
              pan: collision.pan,
              velocity: adaptiveVelocity,
              priority: adaptiveVelocity * adaptiveResponse.priorityScale * collision.energy,
            });
          }
          ray.nextCollisionIndex += 1;
        }

        if (ray.progress >= ray.totalLength) {
          pushGhostTrail(ray.points, now);
          ray.alive = false;
          ray.progress = ray.totalLength;
        }
      }
    }

    const targetDensity = Math.min(
      1,
      activeRayCount / Math.max(1, rayNumber) * 0.55 + pendingImpacts.length / MAX_AUDIO_EVENTS_PER_FRAME * 0.45
    );
    audioDensityRef.current += (targetDensity - audioDensityRef.current) * 0.12;

    const buffer = linePositionsRef.current;
    const ghostBuffer = ghostPositionsRef.current;
    const lineSegments = lineSegmentsRef.current;
    const ghostLineSegments = ghostLineSegmentsRef.current;
    const headMesh = headMeshRef.current;
    const leadPointMesh = leadPointMeshRef.current;
    if (!buffer || !ghostBuffer || !lineSegments || !ghostLineSegments || !headMesh || !leadPointMesh) return;

    let bufferCursor = 0;
    let ghostCursor = 0;
    let headIndex = 0;
    const headScale = 0.014 + rayWidth * 0.008;
    const leadPointScale = Math.max(0.006, headScale * 0.46);
    const leadPointOffset = Math.max(0.018, headScale * 1.6);
    const hiddenScale = 0.0001;

    for (const ray of rayPoolRef.current) {
      if (!ray.alive) continue;

      bufferCursor = appendVisibleSegments(ray, buffer, bufferCursor);
      const headState = getVisibleHeadState(ray);
      instanceDummy.position.copy(headState.position);
      instanceDummy.scale.setScalar(headScale);

      instanceDummy.updateMatrix();
      headMesh.setMatrixAt(headIndex, instanceDummy.matrix);

      instanceDummy.position.copy(
        headState.position.clone().add(headState.direction.clone().multiplyScalar(leadPointOffset))
      );
      instanceDummy.scale.setScalar(leadPointScale);
      instanceDummy.updateMatrix();
      leadPointMesh.setMatrixAt(headIndex, instanceDummy.matrix);
      headIndex += 1;
    }

    for (let i = headIndex; i < rayPoolRef.current.length; i++) {
      instanceDummy.position.set(0, -9999, 0);
      instanceDummy.scale.setScalar(hiddenScale);
      instanceDummy.updateMatrix();
      headMesh.setMatrixAt(i, instanceDummy.matrix);
      leadPointMesh.setMatrixAt(i, instanceDummy.matrix);
    }

    for (const ghost of ghostTrailsRef.current) {
      if (!ghost.active) continue;
      if (ghost.expiresAt <= now) {
        ghost.active = false;
        ghost.points = [];
        continue;
      }
      ghostCursor = appendFullSegments(ghost.points, ghostBuffer, ghostCursor);
    }

    const positionAttribute = lineGeometry.getAttribute('position') as THREE.BufferAttribute;
    const ghostPositionAttribute = ghostLineGeometry.getAttribute('position') as THREE.BufferAttribute;
    positionAttribute.needsUpdate = true;
    ghostPositionAttribute.needsUpdate = true;
    lineGeometry.setDrawRange(0, bufferCursor / 3);
    ghostLineGeometry.setDrawRange(0, ghostCursor / 3);
    headMesh.instanceMatrix.needsUpdate = true;
    leadPointMesh.instanceMatrix.needsUpdate = true;

    pendingImpacts.forEach(({ x, pan, velocity, priority }) =>
      playImpactSound(x, pan, velocity, priority)
    );
  });

  return (
    <group>
      <group position={emitterState.origin.toArray()}>
        <mesh>
          <sphereGeometry args={[0.065, 16, 16]} />
          <meshStandardMaterial
            color={new THREE.Color('#f8fafc')}
            emissive={new THREE.Color('#ffffff')}
            emissiveIntensity={2.2}
          />
        </mesh>
        <pointLight color={new THREE.Color('#ffffff')} intensity={0.9} distance={5} />
      </group>

      <primitive object={shapeGhostLine} />
      <primitive object={shapeCoreLine} />
      <pointLight
        position={[0, 1, 0]}
        color={new THREE.Color(`hsl(${shape.hue}, 100%, 60%)`)}
        intensity={0.55}
        distance={5}
      />

      <lineSegments ref={ghostLineSegmentsRef} geometry={ghostLineGeometry} material={ghostBeamMaterial} frustumCulled={false} />
      <lineSegments ref={lineSegmentsRef} geometry={lineGeometry} material={beamMaterial} frustumCulled={false} />
      <instancedMesh ref={headMeshRef} args={[undefined, undefined, rayNumber]} frustumCulled={false}>
        <sphereGeometry args={[1, 10, 10]} />
        <meshStandardMaterial
          color={new THREE.Color(`hsl(${shape.hue}, 100%, 96%)`)}
          emissive={new THREE.Color(`hsl(${shape.hue}, 100%, 75%)`)}
          emissiveIntensity={1.2 + rayWidth * 0.12}
          transparent
          opacity={Math.min(0.18, Math.max(0.05, (alpha / 3) * 0.55 * densityAlphaFactor))}
        />
      </instancedMesh>
      <instancedMesh ref={leadPointMeshRef} args={[undefined, undefined, rayNumber]} frustumCulled={false}>
        <sphereGeometry args={[1, 8, 8]} />
        <meshBasicMaterial
          color={new THREE.Color(`hsl(${shape.hue}, 100%, 98%)`)}
          transparent
          opacity={Math.min(0.26, Math.max(0.08, (alpha / 3) * 0.7 * densityAlphaFactor))}
        />
      </instancedMesh>
    </group>
  );
};

export default BeamCollider3D;
