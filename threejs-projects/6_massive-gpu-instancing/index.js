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
const instMeshMat = new THREE.MeshBasicMaterial({ color: 0x00f5ff, transparent: true, opacity: 0.6 });
const instMesh = new THREE.InstancedMesh(instMeshGeo, instMeshMat, CONFIG.maxNodes);
earthGroup.add(instMesh);

const dummy = new THREE.Object3D();
const nodeStates = []; // Track metadata for animation

function initInstancing(count) {
  const radius = 1.51;
  instMesh.count = count;
  
  // Initialize states for MAX allowed nodes to prevent undefined errors on slider change
  for (let i = 0; i < CONFIG.maxNodes; i++) {
    const phi = Math.acos(2 * Math.random() - 1);
    const theta = 2 * Math.PI * Math.random();
    
    // Only set initial matrix for nodes within current density
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
      phase: Math.random() * Math.PI * 2
    });
  }
  instMesh.instanceMatrix.needsUpdate = true;
}

initInstancing(CONFIG.currentDensity);

// 5. UI INTERACTION
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

  // Change Visuals based on Mode
  const colors = [0x00f5ff, 0xbf5af2, 0xff5e00, 0xffffff];
  instMeshMat.color.setHex(colors[idx]);
  
  if (idx === 1) { // HEATMAP MODE
    instMeshMat.opacity = 0.9;
  } else {
    instMeshMat.opacity = 0.6;
  }
}

// S-Command Shortcut System
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

function animate() {
  requestAnimationFrame(animate);
  timer.update();
  const time = timer.getElapsed();
  const dt = timer.getDelta();

  // EARTH ROTATION
  earthGroup.rotation.y += 0.001;
  cloudsMesh.rotation.y += 0.0013;
  stars.rotation.y -= 0.0001;

  // MASSIVE INSTANCE ANIMATION
  const radius = 1.51;
  for (let i = 0; i < CONFIG.currentDensity; i++) {
    const s = nodeStates[i];
    
    // Flow/Pulse Logic based on Mode
    if (currentModeIdx === 0) { // DATA FLOW
      s.theta += s.speed * CONFIG.flowVelocity;
    } else if (currentModeIdx === 2) { // HEATMAP/PULSE
      const pulse = Math.sin(time * 3 + s.phase) * 0.01;
      s.phi += pulse * 0.1;
    }

    const x = radius * Math.sin(s.phi) * Math.cos(s.theta);
    const y = radius * Math.sin(s.phi) * Math.sin(s.theta);
    const z = radius * Math.cos(s.phi);

    dummy.position.set(x, y, z);
    dummy.lookAt(0, 0, 0); 
    
    // Dynamic Scale
    const scale = (currentModeIdx === 1) ? 2.5 : 1.0;
    dummy.scale.setScalar(scale + Math.sin(time * 5 + s.phase) * 0.2);
    
    dummy.updateMatrix();
    instMesh.setMatrixAt(i, dummy.matrix);
  }
  instMesh.instanceMatrix.needsUpdate = true;

  // FPS COUNTER
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
