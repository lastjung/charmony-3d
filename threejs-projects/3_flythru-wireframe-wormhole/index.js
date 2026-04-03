import * as THREE from "three";
import { OrbitControls } from 'jsm/controls/OrbitControls.js';
import spline from "./spline.js";
import { EffectComposer } from "jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "jsm/postprocessing/UnrealBloomPass.js";

// --- Scene Initialization ---
const w = window.innerWidth;
const h = window.innerHeight;
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x000000, 0.3);

const camera = new THREE.PerspectiveCamera(75, w / h, 0.1, 1000);
camera.position.z = 5;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(w, h);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.03;

// --- State & Params (Start with Paused) ---
const DEFAULT_PARAMS = {
    playing: false, // Start Paused as requested
    flyProgress: 0,
    flySpeed: 1.0,
    tubeRadius: 0.65,
    fov: 75,
    hue: 0.7,
    bloomStrength: 3.5,
    fogDensity: 300, 
    volume: 0
};

const params = { ...DEFAULT_PARAMS };
let lastActiveVolume = 0.6;
let lastNoteTime = 0;

const autoModes = {
    1: { active: false, base: 0.5, amp: 0.5, speed: 0.0005, startTime: 0, min: 0, max: 1 },
    2: { active: false, base: 2.5, amp: 2.4, speed: 0.0008, startTime: 0, min: 0.1, max: 5 },
    3: { active: false, base: 1.05, amp: 0.95, speed: 0.001, startTime: 0, min: 0.1, max: 2 },
    4: { active: false, base: 85, amp: 55, speed: 0.0007, startTime: 0, min: 30, max: 140 },
    5: { active: false, base: 0.45, amp: 0.45, speed: 0.0006, startTime: 0, min: 0, max: 0.9 },
    6: { active: false, base: 5.0, amp: 5.0, speed: 0.0004, startTime: 0, min: 0, max: 10 },
    7: { active: false, base: 250, amp: 240, speed: 0.0003, startTime: 0, min: 10, max: 500 }
};

// --- "Velocity Sync" Piano Audio Engine ---
let audioCtx, mainGain;
const pentatonic = [
    130.81, 146.83, 164.81, 196.00, 220.00, 
    261.63, 293.66, 329.63, 392.00, 440.00, 
    523.25, 587.33, 659.25, 783.99, 880.00,
    1046.50, 1174.66, 1318.51, 1567.98, 1760.00
];

const initAudio = () => {
    if (audioCtx) return;
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        audioCtx = new AudioContext();
        mainGain = audioCtx.createGain();
        mainGain.gain.setValueAtTime(0, audioCtx.currentTime);
        mainGain.connect(audioCtx.destination);
    } catch (e) { console.warn(e); }
};

const triggerPianoNote = (vNorm) => {
    if (!audioCtx || audioCtx.state !== 'running' || !params.playing || params.volume < 0.01) return;
    const now = audioCtx.currentTime;
    const baseIdx = Math.floor(vNorm * (pentatonic.length - 8)); 
    const freq = pentatonic[baseIdx + Math.floor(Math.random() * 3)];
    const oscBody = audioCtx.createOscillator();
    oscBody.type = 'triangle';
    oscBody.frequency.setValueAtTime(freq, now);
    const oscHead = audioCtx.createOscillator();
    oscHead.type = 'sine';
    oscHead.frequency.setValueAtTime(freq * 2, now);
    const env = audioCtx.createGain();
    const attack = 0.002;
    const decay = 0.4 + (1 - vNorm) * 0.8; 
    const velocityGain = 0.3 + vNorm * 0.4; 
    env.gain.setValueAtTime(0, now);
    env.gain.linearRampToValueAtTime(velocityGain * params.volume, now + attack);
    env.gain.exponentialRampToValueAtTime(0.001, now + decay);
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(500 + vNorm * 8000, now);
    filter.Q.setValueAtTime(1.2, now);
    oscBody.connect(env); oscHead.connect(env); env.connect(filter); filter.connect(mainGain);
    oscBody.start(now); oscHead.start(now);
    oscBody.stop(now + decay + 0.1); oscHead.stop(now + decay + 0.1);
    setTimeout(() => { oscBody.disconnect(); oscHead.disconnect(); env.disconnect(); filter.disconnect(); }, (decay + 0.5) * 1000);
};

const updatePianoSeq = (t) => {
    if (!audioCtx || !params.playing) return;
    const vNorm = (params.flySpeed - 0.1) / 4.9; 
    const minInterval = 60;  const maxInterval = 600; 
    const interval = maxInterval - (vNorm * (maxInterval - minInterval));
    if (t - lastNoteTime > interval) { triggerPianoNote(vNorm); lastNoteTime = t; }
};

const resumeAudio = async () => {
    if (!audioCtx) initAudio();
    if (audioCtx && audioCtx.state === 'suspended') await audioCtx.resume();
};

const updateAudioSync = () => {
    if (!audioCtx || audioCtx.state !== 'running') return;
    const targetGain = params.playing ? 1.0 : 0;
    mainGain.gain.setTargetAtTime(targetGain, audioCtx.currentTime, 0.1);
};

// --- Post-processing ---
const renderScene = new RenderPass(scene, camera);
const bloomPass = new UnrealBloomPass(new THREE.Vector2(w, h), 1.5, 0.4, 100);
bloomPass.threshold = 0.002;
bloomPass.strength = params.bloomStrength;
bloomPass.radius = 0;
const composer = new EffectComposer(renderer);
composer.addPass(renderScene); composer.addPass(bloomPass);

// --- Geometry ---
const tubeGeo = new THREE.TubeGeometry(spline, 222, 0.65, 16, true);
const tubeLinesMat = new THREE.LineBasicMaterial({ color: new THREE.Color().setHSL(params.hue, 1, 0.5) });
const tubeLines = new THREE.LineSegments(new THREE.EdgesGeometry(tubeGeo, 0.2), tubeLinesMat);
scene.add(tubeLines);

const boxLines = [];
const numBoxes = 55;
const boxGeo = new THREE.BoxGeometry(0.075, 0.075, 0.075);
for (let i = 0; i < numBoxes; i++) {
    const p = (i / numBoxes + Math.random() * 0.1) % 1;
    const pos = tubeGeo.parameters.path.getPointAt(p);
    pos.x += Math.random() - 0.4; pos.z += Math.random() - 0.4;
    const rote = new THREE.Euler(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
    const boxLine = new THREE.LineSegments(new THREE.EdgesGeometry(boxGeo, 0.2), new THREE.LineBasicMaterial({ color: new THREE.Color().setHSL((params.hue-p+1)%1,1,0.5) }));
    boxLine.position.copy(pos); boxLine.rotation.copy(rote);
    scene.add(boxLine); boxLines.push({ mesh: boxLine, offset: p });
}

// --- Interaction & UI Logic ---
const inputs = [1, 2, 3, 4, 5, 6, 7].map(id => document.getElementById(`input-${id}`));
const values = [1, 2, 3, 4, 5, 6, 7].map(id => document.getElementById(`val-${id}`));
const rows = [1, 2, 3, 4, 5, 6, 7].map(id => document.getElementById(`row-${id}`));
const playBtn = document.getElementById('player-play');
const volToggle = document.getElementById('volume-toggle');
const volSlider = document.getElementById('volume-slider');

const updateUI = () => {
    values[0].innerText = params.flyProgress.toFixed(3);
    values[1].innerText = params.flySpeed.toFixed(2);
    values[2].innerText = params.tubeRadius.toFixed(2);
    values[3].innerText = params.fov.toFixed(1);
    values[4].innerText = params.hue.toFixed(2);
    values[5].innerText = params.bloomStrength.toFixed(2);
    values[6].innerText = (params.fogDensity / 100).toFixed(2); 
    playBtn.innerText = params.playing ? "||" : "▶";
    playBtn.classList.toggle('playing', params.playing);
    volSlider.value = params.volume;
    const isMuted = params.volume < 0.01;
    volToggle.innerText = isMuted ? "🔇" : "🔊";
    volToggle.classList.toggle('muted', isMuted);
    [1, 2, 3, 4, 5, 6, 7].forEach(id => {
        const row = rows[id-1]; if (row) {
            if (!autoModes[id].active) row.style.setProperty('--row-color', `var(--theme-${id}-${getRowThemeName(id)})`);
            row.classList.toggle('auto-active', autoModes[id].active);
        }
    });
};

const getRowThemeName = (id) => ["rainbow", "cosmic", "twilight", "aurora", "cyan", "sunset", "lime"][id-1];

const hardReset = () => {
    // Stop playing immediately
    params.playing = false;
    params.flyProgress = 0;
    
    // Reset all params to defaults
    Object.assign(params, DEFAULT_PARAMS);
    
    // Reset all auto modes
    Object.keys(autoModes).forEach(id => autoModes[id].active = false);
    
    // Apply core visual resets
    tubeLines.scale.set(1, 1, 1);
    camera.fov = params.fov; camera.updateProjectionMatrix();
    bloomPass.strength = params.bloomStrength;
    scene.fog.density = params.fogDensity / 1000;
    
    // Update Slider UI
    inputs.forEach((input, i) => {
        const id = i + 1;
        if (id === 1) input.value = params.flyProgress;
        else if (id === 2) input.value = params.flySpeed;
        else if (id === 3) input.value = params.tubeRadius;
        else if (id === 4) input.value = params.fov;
        else if (id === 5) input.value = params.hue;
        else if (id === 6) input.value = params.bloomStrength;
        else if (id === 7) input.value = params.fogDensity;
    });
    
    updateUI();
};

const setupInteractions = () => {
    inputs[0].oninput = (e) => { params.flyProgress = parseFloat(e.target.value); updateUI(); };
    inputs[1].oninput = (e) => { params.flySpeed = parseFloat(e.target.value); updateUI(); };
    inputs[2].oninput = (e) => { params.tubeRadius = parseFloat(e.target.value); tubeLines.scale.set(params.tubeRadius/0.65, params.tubeRadius/0.65, 1); updateUI(); };
    inputs[3].oninput = (e) => { params.fov = parseFloat(e.target.value); camera.fov = params.fov; camera.updateProjectionMatrix(); updateUI(); };
    inputs[4].oninput = (e) => { params.hue = parseFloat(e.target.value); updateUI(); };
    inputs[5].oninput = (e) => { params.bloomStrength = parseFloat(e.target.value); bloomPass.strength = params.bloomStrength; updateUI(); };
    inputs[6].oninput = (e) => { params.fogDensity = parseFloat(e.target.value); scene.fog.density = params.fogDensity / 1000; updateUI(); };
    volSlider.oninput = (e) => { params.volume = parseFloat(e.target.value); if (params.volume > 0) lastActiveVolume = params.volume; resumeAudio(); updateUI(); };
    volToggle.onclick = () => { resumeAudio(); if (params.volume > 0) { lastActiveVolume = params.volume; params.volume = 0; } else { params.volume = lastActiveVolume || 0.6; } updateUI(); };
    
    playBtn.onclick = () => { resumeAudio(); params.playing = !params.playing; updateUI(); };
    
    // --- New Reset Logic ---
    document.getElementById('player-partial-reset').onclick = () => { 
        params.flyProgress = 0; 
        params.playing = false; // Pause as requested
        updateUI(); 
    };
    
    document.getElementById('player-full-reset').onclick = () => {
        hardReset(); // Internal reset instead of reload
    };

    document.getElementById('player-speed-up').onclick = () => { params.flySpeed = Math.min(5, params.flySpeed + 0.5); inputs[1].value = params.flySpeed; updateUI(); };
    document.getElementById('player-speed-down').onclick = () => { params.flySpeed = Math.max(0.1, params.flySpeed - 0.5); inputs[1].value = params.flySpeed; updateUI(); };
    document.getElementById('player-fullscreen').onclick = () => { if (!document.fullscreenElement) document.documentElement.requestFullscreen(); else document.exitFullscreen(); };

    const sidebar = document.getElementById('sidebar');
    const playerBar = document.getElementById('apple-player');
    const uiToggleBtn = document.getElementById('player-show-all');
    let uiVisible = true;

    const setUiVisibility = (visible) => {
        uiVisible = visible;
        if (uiVisible) {
            sidebar.classList.remove('hidden');
            playerBar.classList.remove('hidden');
            sidebar.style.visibility = 'visible';
            sidebar.style.display = 'block';
            playerBar.style.visibility = 'visible';
            playerBar.style.display = 'flex';
            uiToggleBtn.textContent = '▣';
            uiToggleBtn.title = 'Hide UI panels (Esc)';
        } else {
            sidebar.classList.add('hidden');
            playerBar.classList.add('hidden');
            sidebar.style.visibility = 'hidden';
            sidebar.style.display = 'none';
            playerBar.style.visibility = 'hidden';
            playerBar.style.display = 'none';
            uiToggleBtn.textContent = '⧉';
            uiToggleBtn.title = 'Show UI panels (Esc)';
        }
    };

    uiToggleBtn.onclick = () => setUiVisibility(!uiVisible);
    setUiVisibility(true);

    rows.forEach((row, i) => {
        const header = row.querySelector('.setting-header');
        if (header) header.onclick = (e) => {
            const id = i + 1; 
            const m = autoModes[id];
            
            if (!m.active) {
                const getParamName = (id) => ["flyProgress", "flySpeed", "tubeRadius", "fov", "hue", "bloomStrength", "fogDensity"][id-1];
                const currentVal = params[getParamName(id)];
                const mid = (m.min + m.max) / 2;
                const amp = (m.max - m.min) / 2;
                m.phaseOffset = Math.asin(Math.max(-1, Math.min(1, (currentVal - mid) / amp)));
                m.startTime = performance.now();
            }
            
            m.active = !m.active;
            updateUI(); 
            e.stopPropagation();
        };
    });

    window.addEventListener('keydown', (e) => {
        if (e.code === 'Space') { 
            resumeAudio(); 
            params.playing = !params.playing; 
            updateUI(); 
            e.preventDefault(); 
        }
        if (e.code === 'Escape') {
            setUiVisibility(true);
            e.preventDefault();
        }
        if (e.shiftKey && e.code.startsWith('Digit')) {
            const id = parseInt(e.code.replace('Digit', ''));
            if (autoModes[id]) {
                const m = autoModes[id];
                if (!m.active) {
                    const getParamName = (id) => ["flyProgress", "flySpeed", "tubeRadius", "fov", "hue", "bloomStrength", "fogDensity"][id-1];
                    const currentVal = params[getParamName(id)];
                    const mid = (m.min + m.max) / 2;
                    const amp = (m.max - m.min) / 2;
                    m.phaseOffset = Math.asin(Math.max(-1, Math.min(1, (currentVal - mid) / amp)));
                    m.startTime = performance.now();
                }
                m.active = !m.active;
                updateUI();
                e.preventDefault();
            }
        }
    });
};

const clock = new THREE.Clock();
function animate(t) {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    if (params.playing) params.flyProgress = (params.flyProgress + delta * 0.05 * params.flySpeed) % 1;
    [1, 2, 3, 4, 5, 6, 7].forEach(id => {
        if (autoModes[id].active) {
            const m = autoModes[id]; 
            const elapsed = t - (m.startTime || 0);
            const wave = (Math.sin(elapsed * m.speed + (m.phaseOffset || 0)) + 1) / 2; 
            const next = m.min + wave * (m.max - m.min);
            inputs[id-1].value = next;
            if (id === 1) params.flyProgress = next;
            if (id === 2) params.flySpeed = next;
            if (id === 3) { params.tubeRadius = next; tubeLines.scale.set(next/0.65, next/0.65, 1); }
            if (id === 4) { params.fov = next; camera.fov = next; camera.updateProjectionMatrix(); }
            if (id === 5) params.hue = next;
            if (id === 6) { params.bloomStrength = next; bloomPass.strength = next; }
            if (id === 7) { params.fogDensity = next; scene.fog.density = next / 1000; }
        }
    });
    const path = tubeGeo.parameters.path; camera.position.copy(path.getPointAt(params.flyProgress)); camera.lookAt(path.getPointAt((params.flyProgress + 0.03)%1));
    tubeLinesMat.color.setHSL(params.hue, 1, 0.5); boxLines.forEach(bl => bl.mesh.material.color.setHSL((params.hue - bl.offset + 1)%1, 1, 0.5));
    updateAudioSync(); updatePianoSeq(performance.now()); updateUI(); composer.render(scene, camera); controls.update();
}

setupInteractions(); updateUI(); animate(0);
window.addEventListener('resize', () => { camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth, window.innerHeight); composer.setSize(window.innerWidth, window.innerHeight); }, false);
const onFirstUserGesture = () => { resumeAudio(); window.removeEventListener('click', onFirstUserGesture); window.removeEventListener('keydown', onFirstUserGesture); };
window.addEventListener('click', onFirstUserGesture); window.addEventListener('keydown', onFirstUserGesture);