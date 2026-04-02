import * as THREE from "three";
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import getStarfield from "./src/getStarfield.js";
import { getFresnelMat } from "./src/getFresnelMat.js";

/**
 * --- MASSIVE GPU ENGINE ---
 * Developed by Antigravity (Powered by User Skills)
 */

// 1. PROJECT CONFIG
const CONFIG = {
  maxNodes: 250000,
  currentDensity: 150000,
  flowVelocity: 1.2,
  atmosIntensity: 2.0,
  lerpFactor: 0.1,
  modes: ['DATA FLOW', 'NETWORK', 'HEATMAP', 'STAR DRIFT']
};

let currentModeIdx = 0;

// 2. SCENE SETUP
const w = window.innerWidth;
const h = window.innerHeight;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, w / h, 0.1, 1000);
camera.position.z = 6;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(w, h);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;

// 3. CORE PLANET
const loader = new THREE.TextureLoader();
const earthGroup = new THREE.Group();
scene.add(earthGroup);

const planetGeo = new THREE.IcosahedronGeometry(1.5, 12);
const planetMat = new THREE.MeshPhongMaterial({
  map: loader.load("./textures/00_earthmap1k.jpg"),
  specularMap: loader.load("./textures/02_earthspec1k.jpg"),
  bumpMap: loader.load("./textures/01_earthbump1k.jpg"),
  bumpScale: 0.05,
});
const earthMesh = new THREE.Mesh(planetGeo, planetMat);
earthGroup.add(earthMesh);

const lightsMesh = new THREE.Mesh(planetGeo, new THREE.MeshBasicMaterial({
  map: loader.load("./textures/03_earthlights1k.jpg"),
  blending: THREE.AdditiveBlending,
}));
earthGroup.add(lightsMesh);

const cloudsMesh = new THREE.Mesh(planetGeo, new THREE.MeshStandardMaterial({
  map: loader.load("./textures/04_earthcloudmap.jpg"),
  transparent: true,
  opacity: 0.8,
  blending: THREE.AdditiveBlending,
  alphaMap: loader.load('./textures/05_earthcloudmaptrans.jpg'),
}));
cloudsMesh.scale.setScalar(1.003);
earthGroup.add(cloudsMesh);

const fresnelMat = getFresnelMat({ color1: 0x00f5ff });
const glowMesh = new THREE.Mesh(planetGeo, fresnelMat);
glowMesh.scale.setScalar(1.01);
earthGroup.add(glowMesh);

const sunLight = new THREE.DirectionalLight(0xffffff, 2.0);
sunLight.position.set(-2, 0.5, 1.5);
scene.add(sunLight);

const stars = getStarfield({ numStars: 3000 });
scene.add(stars);

// 4. MASSIVE GPU INSTANCING (THE CORE)
const instMeshGeo = new THREE.BoxGeometry(0.005, 0.005, 0.04);
const instMeshMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6 });
const instMesh = new THREE.InstancedMesh(instMeshGeo, instMeshMat, CONFIG.maxNodes);

const instanceColors = new Float32Array(CONFIG.maxNodes * 3);
instMesh.instanceColor = new THREE.InstancedBufferAttribute(instanceColors, 3);
earthGroup.add(instMesh);

const dummy = new THREE.Object3D();
const nodeStates = []; 

// HEATMAP DATA SAMPLING
const heatCanvas = document.createElement('canvas');
const heatCtx = heatCanvas.getContext('2d', { willReadFrequently: true });
let heatmapReady = false;
let heatData = null;

const heatLoader = new THREE.TextureLoader();
heatLoader.load("./textures/03_earthlights1k.jpg", (tex) => {
  const img = tex.image;
  heatCanvas.width = 512;
  heatCanvas.height = 256;
  heatCtx.drawImage(img, 0, 0, 512, 256);
  heatData = heatCtx.getImageData(0, 0, 512, 256).data;
  heatmapReady = true;
});

function getHeatValue(phi, theta) {
  if (!heatmapReady) return 0;
  // Convert spherical to UV
  const u = 1 - (theta / (Math.PI * 2) + 0.5) % 1;
  const v = phi / Math.PI;
  const px = Math.floor(u * 511);
  const py = Math.floor(v * 255);
  const idx = (py * 512 + px) * 4;
  return heatData[idx] / 255; // Brightness 0-1
}

function initInstancing(count) {
  const radius = 1.5;
  instMesh.count = count;
  
  for (let i = 0; i < CONFIG.maxNodes; i++) {
    const phi = Math.acos(2 * Math.random() - 1);
    const theta = 2 * Math.PI * Math.random();
    
    if (i < count) {
      dummy.position.set(
        radius * Math.sin(phi) * Math.cos(theta),
        radius * Math.sin(phi) * Math.sin(theta),
        radius * Math.cos(phi)
      );
      dummy.lookAt(0, 0, 0);
      dummy.updateMatrix();
      instMesh.setMatrixAt(i, dummy.matrix);
    }
    
    nodeStates.push({
      phi, theta, 
      speed: 0.001 + Math.random() * 0.002,
      phase: Math.random() * Math.PI * 2,
      initialHeat: 0 // Will populate in first animate pass
    });
  }
}

initInstancing(CONFIG.currentDensity);

// 5. UI & INTERACTION SYSTEM
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2(-10, -10);
const interactionPoint = new THREE.Vector3();
let hasInteraction = false;

const activeWaves = [];

window.addEventListener('mousemove', (e) => {
  mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
});

window.addEventListener('mousedown', () => {
  if (hasInteraction) {
    activeWaves.push({
      origin: interactionPoint.clone(),
      startTime: performance.now() / 1000,
      duration: 3.5
    });
    if (activeWaves.length > 3) activeWaves.shift();
  }
});

const ui = {
  density: { slider: document.getElementById('slider-density'), val: document.getElementById('val-density') },
  flow: { slider: document.getElementById('slider-flow'), val: document.getElementById('val-flow') },
  atmos: { slider: document.getElementById('slider-atmos'), val: document.getElementById('val-atmos') },
  nodeCount: document.getElementById('node-count'),
  fps: document.getElementById('fps-val'),
  modeText: document.getElementById('current-mode'),
  modeBtns: document.querySelectorAll('.mode-btn')
};

ui.density.slider.oninput = (e) => {
  const val = parseInt(e.target.value);
  CONFIG.currentDensity = val;
  ui.density.val.textContent = (val/1000).toFixed(0) + 'k';
  ui.nodeCount.textContent = val.toLocaleString();
  instMesh.count = val;
};

ui.flow.slider.oninput = (e) => {
  CONFIG.flowVelocity = parseFloat(e.target.value);
  ui.flow.val.textContent = CONFIG.flowVelocity.toFixed(1) + 'x';
};

ui.atmos.slider.oninput = (e) => {
  CONFIG.atmosIntensity = parseFloat(e.target.value);
  ui.atmos.val.textContent = CONFIG.atmosIntensity.toFixed(1);
  fresnelMat.uniforms.intensity.value = CONFIG.atmosIntensity;
};

ui.modeBtns.forEach((btn, idx) => {
  btn.onclick = () => switchMode(idx);
});

function switchMode(idx) {
  currentModeIdx = idx;
  const mode = CONFIG.modes[idx];
  ui.modeText.textContent = mode;
  ui.modeBtns.forEach(b => b.classList.remove('active'));
  ui.modeBtns[idx].classList.add('active');

  instMeshMat.color.setHex(0xffffff); 
  if (idx === 1) instMeshMat.opacity = 0.9;
  else instMeshMat.opacity = 0.6;
}

window.addEventListener('keydown', (e) => {
  if (e.code === 'Digit1') switchMode(0);
  if (e.code === 'Digit2') switchMode(1);
  if (e.code === 'Digit3') switchMode(2);
  if (e.code === 'Digit4') switchMode(3);
});

// 6. ANIMATION LOOP
const timer = new THREE.Timer();
let frames = 0;
let lastTime = performance.now();

const colorActive = new THREE.Color(0xffffff);
const colorWave = new THREE.Color(0x00ff88);
const colorBase = new THREE.Color();
const colorHeat = new THREE.Color(0xff4400);

function animate() {
  requestAnimationFrame(animate);
  timer.update();
  const time = timer.getElapsed();
  const dt = timer.getDelta();

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObject(earthMesh);
  if (intersects.length > 0) {
    interactionPoint.copy(intersects[0].point);
    hasInteraction = true;
  } else {
    hasInteraction = false;
  }

  const currentTime = performance.now() / 1000;
  for (let i = activeWaves.length - 1; i >= 0; i--) {
    if (currentTime > activeWaves[i].startTime + activeWaves[i].duration) {
      activeWaves.splice(i, 1);
    }
  }

  earthGroup.rotation.y += 0.001;
  cloudsMesh.rotation.y += 0.0013;
  stars.rotation.y -= 0.0001;

  const baseColors = [0x00f5ff, 0xbf5af2, 0xff5e00, 0xffffff];
  colorBase.setHex(baseColors[currentModeIdx]);
  const radius = 1.5;

  for (let i = 0; i < CONFIG.currentDensity; i++) {
    const s = nodeStates[i];
    
    // Flow/Pulse Logic
    if (currentModeIdx === 0) { 
      s.theta += s.speed * CONFIG.flowVelocity;
    } else if (currentModeIdx === 2) { 
      const pulse = Math.sin(time * 3 + s.phase) * 0.01;
      s.phi += pulse * 0.1;
    }

    const x = radius * Math.sin(s.phi) * Math.cos(s.theta);
    const y = radius * Math.sin(s.phi) * Math.sin(s.theta);
    const z = radius * Math.cos(s.phi);

    dummy.position.set(x, y, z);
    
    // Sampling Heatmap (Only if needed to save CPU/Battery unless in certain modes, but let's do it simply)
    if (s.initialHeat === 0 && heatmapReady) {
      s.initialHeat = getHeatValue(s.phi, s.theta);
    }

    let finalScale = (currentModeIdx === 1) ? 2.5 : 1.0;
    finalScale += Math.sin(time * 5 + s.phase) * 0.2;
    
    const worldPos = dummy.position.clone().applyMatrix4(earthGroup.matrixWorld);
    let interactIntensity = 0;
    let waveIntensity = 0;

    if (hasInteraction) {
      const distSq = worldPos.distanceToSquared(interactionPoint);
      if (distSq < 0.25) interactIntensity = (0.25 - distSq) * 4;
    }

    for (const wave of activeWaves) {
      const dist = worldPos.distanceTo(wave.origin);
      const elapsed = currentTime - wave.startTime;
      const waveRadius = elapsed * 1.5; 
      const waveWidth = 0.4;
      const waveDist = Math.abs(dist - waveRadius);
      if (waveDist < waveWidth) {
        const falloff = 1.0 - (waveDist / waveWidth);
        const strength = falloff * (1.0 - elapsed / wave.duration);
        waveIntensity += strength;
      }
    }

    // HEATMAP TOPOGRAPHY
    const heatImpact = (currentModeIdx === 2) ? s.initialHeat * 1.5 : s.initialHeat * 0.3;
    const combinedPush = interactIntensity + waveIntensity * 3 + heatImpact;
    
    dummy.position.multiplyScalar(1 + combinedPush * 0.15);
    finalScale *= (1 + combinedPush * 1.2);

    if (waveIntensity > 0.1) instMesh.setColorAt(i, colorWave);
    else if (interactIntensity > 0.1) instMesh.setColorAt(i, colorActive);
    else if (currentModeIdx === 2 && s.initialHeat > 0.4) {
      colorBase.lerp(colorHeat, s.initialHeat);
      instMesh.setColorAt(i, colorBase);
      colorBase.setHex(baseColors[currentModeIdx]); // Reset for next node
    } else {
      instMesh.setColorAt(i, colorBase);
    }

    dummy.scale.setScalar(finalScale);
    dummy.lookAt(0, 0, 0); 
    dummy.updateMatrix();
    instMesh.setMatrixAt(i, dummy.matrix);
  }
  
  instMesh.instanceMatrix.needsUpdate = true;
  instMesh.instanceColor.needsUpdate = true;

  frames++;
  const now = performance.now();
  if (now > lastTime + 1000) {
    ui.fps.textContent = Math.round((frames * 1000) / (now - lastTime)) + ' FPS';
    frames = 0;
    lastTime = now;
  }

  controls.update();
  renderer.render(scene, camera);
}

animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
