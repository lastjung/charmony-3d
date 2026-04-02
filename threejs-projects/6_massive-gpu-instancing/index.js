import * as THREE from "three";
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import getStarfield from "./src/getStarfield.js";
import { getFresnelMat } from "./src/getFresnelMat.js";

/**
 * --- ULTIMATE GPU & AUDIO ENGINE (APPLE UI EDITION) ---
 * Developed by Antigravity
 * 1,000,000 Nodes GPU + Crystalline Piano + Apple Glass HUD
 */

// 1. PROJECT CONFIG
const CONFIG = {
  maxNodes: 1000000, 
  currentDensity: 150000,
  flowVelocity: 1.2,
  atmosIntensity: 2.0,
  modes: ['DATA FLOW', 'NETWORK', 'HEATMAP', 'STAR DRIFT']
};

let currentModeIdx = 0;
let isPlaying = true;
let sHeld = false; // For Apple Shortcut: S + Number

// 2. SCENE SETUP
const w = window.innerWidth;
const h = window.innerHeight;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, w / h, 0.1, 1000);
camera.position.z = 6;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(w, h);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;

// --- STEP 4 & 5 Integration: AUDIO ENGINE & GPU SHADERS ---

class AudioEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.notes = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33, 659.25, 783.99, 880.00]; // Pentatonic
    this.unlocked = false;
    this.isMuted = false;
  }

  unlock() {
    if (this.unlocked) return;
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.masterGain = this.ctx.createGain();
    this.setVolume(0.25);
    this.masterGain.connect(this.ctx.destination);
    this.unlocked = true;
  }

  setVolume(val) {
    if (this.masterGain) this.masterGain.gain.setTargetAtTime(val, this.ctx.currentTime, 0.1);
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.masterGain) {
      this.masterGain.gain.setTargetAtTime(this.isMuted ? 0 : 0.25, this.ctx.currentTime, 0.1);
    }
    return this.isMuted;
  }

  playPiano(frequency, pan = 0, volume = 0.5) {
    if (!this.unlocked || this.isMuted || this.ctx.state === 'suspended') return;
    const time = this.ctx.currentTime;
    
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();
    const panner = this.ctx.createStereoPanner();

    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(frequency, time);
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(frequency * 2, time); 

    gainNode.gain.setValueAtTime(0, time);
    gainNode.gain.linearRampToValueAtTime(volume, time + 0.005); 
    gainNode.gain.exponentialRampToValueAtTime(0.001, time + 1.25); 

    panner.pan.setValueAtTime(pan, time);

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(panner);
    panner.connect(this.masterGain);

    osc1.start(time); osc2.start(time);
    osc1.stop(time + 1.3); osc2.stop(time + 1.3);
  }
}
const audio = new AudioEngine();

// 3. CORE PLANET & GPU SYSTEM
const loader = new THREE.TextureLoader();
const earthGroup = new THREE.Group();
scene.add(earthGroup);

const planetGeo = new THREE.IcosahedronGeometry(1.5, 12);
const earthMesh = new THREE.Mesh(planetGeo, new THREE.MeshPhongMaterial({
  map: loader.load("./textures/00_earthmap1k.jpg"),
  specularMap: loader.load("./textures/02_earthspec1k.jpg"),
  bumpMap: loader.load("./textures/01_earthbump1k.jpg"),
  bumpScale: 0.05,
}));
earthGroup.add(earthMesh);

const lightsMesh = new THREE.Mesh(planetGeo, new THREE.MeshBasicMaterial({
  map: loader.load("./textures/03_earthlights1k.jpg"),
  blending: THREE.AdditiveBlending,
}));
earthGroup.add(lightsMesh);

const cloudsMesh = new THREE.Mesh(planetGeo, new THREE.MeshStandardMaterial({
  map: loader.load("./textures/04_earthcloudmap.jpg"),
  transparent: true, opacity: 0.8,
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

scene.add(getStarfield({ numStars: 3000 }));

// GPGPU SHADERS
const vertexShader = `
  attribute vec4 a_state; attribute float a_heat;
  uniform float u_time; uniform float u_flowVelocity; uniform int u_mode;
  uniform vec3 u_mousePos; uniform bool u_hasMouse; uniform vec4 u_waves[3]; 
  varying float v_intensity; varying float v_heat;
  void main() {
    float phi = a_state.x; float theta = a_state.y;
    float speed = a_state.z; float phase = a_state.w;
    if(u_mode == 0) theta += (u_time * speed * u_flowVelocity);
    if(u_mode == 2) phi += sin(u_time * 3.0 + phase) * 0.005;
    float r = 1.5;
    vec3 basePos = vec3(r * sin(phi) * cos(theta), r * sin(phi) * sin(theta), r * cos(phi));
    float push = 0.0;
    if(u_hasMouse) {
      float d = distance(basePos, u_mousePos);
      if(d < 0.125) push += (0.125 - d) * 8.0;
    }
    for(int i=0; i<3; i++) {
        float waveTime = u_waves[i].w;
        if(waveTime > 0.0 && waveTime < 3.5) {
            float dist = distance(basePos, u_waves[i].xyz);
            float waveRad = waveTime * 1.5;
            float wDist = abs(dist - waveRad);
            if(wDist < 0.12) { push += (1.0 - (wDist / 0.12)) * (1.0 - waveTime / 3.5) * 3.0; }
        }
    }
    push += (u_mode == 2) ? a_heat * 1.5 : a_heat * 0.3;
    v_intensity = push; v_heat = a_heat;
    vec3 finalPos = basePos * (1.0 + push * 0.038);
    vec3 look = normalize(-basePos); vec3 up = vec3(0,1,0); 
    if(abs(look.y) > 0.999) up = vec3(1,0,0);
    vec3 right = normalize(cross(up, look)); up = cross(look, right);
    mat3 rot = mat3(right, up, look);
    float s = (u_mode == 1) ? 2.5 : 1.0;
    s *= (1.0 + push * 0.5 + sin(u_time * 5.0 + phase) * 0.2);
    gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(rot * (position * s) + finalPos, 1.0);
  }
`;

const fragmentShader = `
  varying float v_intensity; varying float v_heat; uniform int u_mode;
  void main() {
    vec3 baseCol = vec3(0.0, 0.96, 1.0);
    if(u_mode == 1) baseCol = vec3(0.75, 0.35, 0.95);
    if(u_mode == 2) baseCol = vec3(1.0, 0.37, 0.0);
    vec3 finalCol = mix(baseCol, vec3(1.0, 1.0, 0.0), clamp(v_intensity, 0.0, 1.0));
    if(u_mode == 2) finalCol = mix(finalCol, vec3(1.0, 0.0, 0.0), v_heat);
    gl_FragColor = vec4(finalCol, 0.5 + v_intensity * 0.2);
  }
`;

const gpuMat = new THREE.ShaderMaterial({
  vertexShader, fragmentShader, transparent: true,
  uniforms: {
    u_time: { value: 0 }, u_flowVelocity: { value: 1.2 }, u_mode: { value: 0 },
    u_mousePos: { value: new THREE.Vector3() }, u_hasMouse: { value: false },
    u_waves: { value: [new THREE.Vector4(), new THREE.Vector4(), new THREE.Vector4()] }
  }
});

const gpuMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.005, 0.005, 0.04), gpuMat, CONFIG.maxNodes);
earthGroup.add(gpuMesh);

// Samping Logic (Night Lights)
const heatCanvas = document.createElement('canvas');
const heatCtx = heatCanvas.getContext('2d', { willReadFrequently: true });
loader.load("./textures/03_earthlights1k.jpg", (tex) => {
  heatCanvas.width = 512; heatCanvas.height = 256;
  heatCtx.drawImage(tex.image, 0, 0, 512, 256);
  const hData = heatCtx.getImageData(0, 0, 512, 256).data;
  const stateArray = new Float32Array(CONFIG.maxNodes * 4);
  const heatArray = new Float32Array(CONFIG.maxNodes);
  for(let i=0; i<CONFIG.maxNodes; i++) {
    const phi = Math.acos(2 * Math.random() - 1);
    const theta = 2 * Math.PI * Math.random();
    stateArray[i*4+0] = phi; stateArray[i*4+1] = theta;
    stateArray[i*4+2] = 0.001 + Math.random() * 0.002;
    stateArray[i*4+3] = Math.random() * Math.PI * 2;
    const u = 1 - (theta / (Math.PI * 2) + 0.5) % 1;
    const v = phi / Math.PI;
    const idx = (Math.floor(v * 255) * 512 + Math.floor(u * 511)) * 4;
    heatArray[i] = hData[idx] / 255;
  }
  gpuMesh.geometry.setAttribute('a_state', new THREE.InstancedBufferAttribute(stateArray, 4));
  gpuMesh.geometry.setAttribute('a_heat', new THREE.InstancedBufferAttribute(heatArray, 1));
  gpuMesh.count = CONFIG.currentDensity;
});

// UI MAPPING (APPLE UI)
const ui = {
  volSlider: document.getElementById('slider-vol'),
  muteBtn: document.getElementById('btn-mute'),
  playBtn: document.getElementById('btn-play'),
  prevBtn: document.getElementById('btn-prev'),
  nextBtn: document.getElementById('btn-next'),
  timeDisp: document.getElementById('time-display'),
  fpsDisp: document.getElementById('val-fps'),
  modeItems: document.querySelectorAll('.dock-item'),
  densitySlider: document.getElementById('slider-density'),
  densityVal: document.getElementById('val-density'),
  flowSlider: document.getElementById('slider-flow'),
  flowVal: document.getElementById('val-flow'),
  atmosSlider: document.getElementById('slider-atmos'),
  atmosVal: document.getElementById('val-atmos'),
  rows: { density: document.getElementById('row-density'), flow: document.getElementById('row-flow'), atmos: document.getElementById('row-atmos') },
  fsBtn: document.getElementById('btn-fullscreen')
};

// Fullscreen Logic
ui.fsBtn.onclick = () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(e => console.error(e));
  } else {
    if (document.exitFullscreen) document.exitFullscreen();
  }
};

document.addEventListener('fullscreenchange', () => {
  const isFS = !!document.fullscreenElement;
  ui.fsBtn.innerHTML = isFS 
    ? '<svg viewBox="0 0 24 24"><path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/></svg>'
    : '<svg viewBox="0 0 24 24"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>';
});

// Mode Controller
function switchMode(idx) {
  currentModeIdx = (idx + 4) % 4;
  gpuMat.uniforms.u_mode.value = currentModeIdx;
  document.getElementById('current-mode').textContent = CONFIG.modes[currentModeIdx];
  ui.modeItems.forEach((item, i) => item.classList.toggle('active', i === currentModeIdx));
  
  // Highlight corresponding row
  Object.values(ui.rows).forEach(r => r.classList.remove('auto-active'));
  if(currentModeIdx === 0) ui.rows.flow.classList.add('auto-active');
  if(currentModeIdx === 2) ui.rows.density.classList.add('auto-active');
}

ui.modeItems.forEach((item, idx) => item.onclick = () => switchMode(idx));
ui.nextBtn.onclick = () => switchMode(currentModeIdx + 1);
ui.prevBtn.onclick = () => switchMode(currentModeIdx - 1);

// Audio UI
ui.volSlider.oninput = (e) => audio.setVolume(parseFloat(e.target.value));
ui.muteBtn.onclick = () => {
  const isMuted = audio.toggleMute();
  ui.muteBtn.classList.toggle('active', !isMuted);
  ui.muteBtn.innerHTML = isMuted ? '<svg viewBox="0 0 24 24"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>' : '<svg viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>';
};

// Playback Logic
ui.playBtn.onclick = () => {
  isPlaying = !isPlaying;
  document.getElementById('icon-play').style.display = isPlaying ? 'none' : 'block';
  document.getElementById('icon-pause').style.display = isPlaying ? 'block' : 'none';
  ui.playBtn.classList.toggle('active', isPlaying);
  audio.unlock();
};

// Sidebar Handlers
ui.densitySlider.oninput = (e) => {
  const val = parseInt(e.target.value);
  gpuMesh.count = val;
  ui.densityVal.textContent = (val/1000).toFixed(0) + 'k';
};
ui.flowSlider.oninput = (e) => {
  gpuMat.uniforms.u_flowVelocity.value = parseFloat(e.target.value);
  ui.flowVal.textContent = e.target.value + 'x';
};
ui.atmosSlider.oninput = (e) => {
  fresnelMat.uniforms.intensity.value = parseFloat(e.target.value);
  ui.atmosVal.textContent = e.target.value;
};

// APPLE SHORTCUTS: S + Number
window.addEventListener('keydown', (e) => {
  if (e.code === 'KeyS') sHeld = true;
  if (sHeld && e.code.startsWith('Digit')) {
    const num = parseInt(e.code.replace('Digit', '')) - 1;
    if (num >= 0 && num <= 3) switchMode(num);
    e.preventDefault();
  }
  if (e.code === 'Space') ui.playBtn.click();
});
window.addEventListener('keyup', (e) => { if (e.code === 'KeyS') sHeld = false; });

// INTERACTION (WAVES & HOVER)
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2(-10, -10);
const startPos = new THREE.Vector2();
const activeWaves = [];

window.addEventListener('mousemove', (e) => {
  mouse.x = (e.clientX / w) * 2 - 1;
  mouse.y = -(e.clientY / h) * 2 + 1;
});

window.addEventListener('mousedown', (e) => startPos.set(e.clientX, e.clientY));
window.addEventListener('mouseup', (e) => {
  if (e.target.closest('.apple-player') || 
      e.target.closest('.apple-sidebar') || 
      e.target.closest('.apple-sidebar-left') || 
      e.target.closest('.mode-dock')) return;
  audio.unlock();
  if (Math.hypot(e.clientX - startPos.x, e.clientY - startPos.y) > 5) return;
  if (gpuMat.uniforms.u_hasMouse.value) {
    const origin = gpuMat.uniforms.u_mousePos.value.clone();
    activeWaves.push({ origin, startTime: performance.now() / 1000 });
    if (activeWaves.length > 3) activeWaves.shift();
    if (!audio.isMuted) {
      audio.playPiano(audio.notes[0], 0, 0.4);
      setTimeout(() => audio.playPiano(audio.notes[2], 0, 0.3), 50);
      setTimeout(() => audio.playPiano(audio.notes[4], 0, 0.2), 100);
    }
  }
});

// ANIMATION
let frames = 0, lastTime = performance.now();
function animate() {
  requestAnimationFrame(animate);
  const time = performance.now() / 1000;
  
  if (isPlaying) {
    gpuMat.uniforms.u_time.value = time;
    earthGroup.rotation.y += 0.001;
    cloudsMesh.rotation.y += 0.0013;
  }

  raycaster.setFromCamera(mouse, camera);
  const hits = raycaster.intersectObject(earthMesh);
  if (hits.length > 0) {
    gpuMat.uniforms.u_mousePos.value.copy(hits[0].point);
    earthGroup.worldToLocal(gpuMat.uniforms.u_mousePos.value);
    gpuMat.uniforms.u_hasMouse.value = true;
  } else {
    gpuMat.uniforms.u_hasMouse.value = false;
  }

  activeWaves.forEach((w, i) => gpuMat.uniforms.u_waves.value[i].set(w.origin.x, w.origin.y, w.origin.z, time - w.startTime));
  for(let i=activeWaves.length; i<3; i++) gpuMat.uniforms.u_waves.value[i].w = -1;

  // HUD Update
  const d = new Date(time * 1000);
  ui.timeDisp.textContent = d.toISOString().substr(11, 8);
  frames++;
  const now = performance.now();
  if (now > lastTime + 1000) {
    ui.fpsDisp.textContent = Math.round((frames * 1000) / (now - lastTime)) + ' FPS';
    frames = 0; lastTime = now;
  }

  controls.update(); renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
