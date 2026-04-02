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

// --- State & Params ---
const params = {
    playing: true,
    flyProgress: 0,
    flySpeed: 1.0,
    tubeRadius: 0.65,
    fov: 75,
    hue: 0.7,
    bloomStrength: 3.5,
    fogDensity: 30, // 0-100 scale for UI
    volume: 0.6
};

let lastActiveVolume = 0.6; // To remember volume when muting

const autoModes = {
    1: { active: false, base: 0.5, amp: 0.5, speed: 0.0005, startTime: 0, min: 0, max: 1 },
    2: { active: false, base: 2.5, amp: 2.4, speed: 0.0008, startTime: 0, min: 0.1, max: 5 },
    3: { active: false, base: 1.05, amp: 0.95, speed: 0.001, startTime: 0, min: 0.1, max: 2 },
    4: { active: false, base: 85, amp: 55, speed: 0.0007, startTime: 0, min: 30, max: 140 }, // Field of View
    5: { active: false, base: 0.45, amp: 0.45, speed: 0.0006, startTime: 0, min: 0, max: 0.9 }, // Hue
    6: { active: false, base: 5.0, amp: 5.0, speed: 0.0004, startTime: 0, min: 0, max: 10 }, // Bloom
    7: { active: false, base: 50, amp: 49, speed: 0.0003, startTime: 0, min: 1, max: 100 }  // Fog
};

// --- Audio Engine ---
let audioCtx, mainGain, droneOsc, whooshFilter, noiseNode;

const initAudio = () => {
    if (audioCtx) return;
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        audioCtx = new AudioContext();
        mainGain = audioCtx.createGain();
        mainGain.gain.setValueAtTime(0, audioCtx.currentTime);
        mainGain.connect(audioCtx.destination);
        
        droneOsc = audioCtx.createOscillator();
        droneOsc.type = 'triangle';
        droneOsc.frequency.setValueAtTime(40, audioCtx.currentTime);
        const droneGain = audioCtx.createGain();
        droneGain.gain.setValueAtTime(0.6, audioCtx.currentTime);
        droneOsc.connect(droneGain);
        droneGain.connect(mainGain);
        droneOsc.start();
        
        const bufferSize = 2 * audioCtx.sampleRate;
        const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) output[i] = Math.random() * 2 - 1;
        noiseNode = audioCtx.createBufferSource();
        noiseNode.buffer = noiseBuffer;
        noiseNode.loop = true;
        
        whooshFilter = audioCtx.createBiquadFilter();
        whooshFilter.type = 'lowpass';
        whooshFilter.frequency.setValueAtTime(500, audioCtx.currentTime);
        whooshFilter.Q.setValueAtTime(0.7, audioCtx.currentTime);
        const whooshGain = audioCtx.createGain();
        whooshGain.gain.setValueAtTime(0.5, audioCtx.currentTime);
        noiseNode.connect(whooshFilter);
        whooshFilter.connect(whooshGain);
        whooshGain.connect(mainGain);
        noiseNode.start();
    } catch (e) { console.warn(e); }
};

const resumeAudio = async () => {
    if (!audioCtx) initAudio();
    if (audioCtx && audioCtx.state === 'suspended') await audioCtx.resume();
};

const updateAudioSync = () => {
    if (!audioCtx || audioCtx.state !== 'running') return;
    const targetGain = params.playing ? params.volume : 0;
    if (targetGain < 0.01) {
        mainGain.gain.setTargetAtTime(0, audioCtx.currentTime, 0.05);
    } else {
        mainGain.gain.setTargetAtTime(targetGain, audioCtx.currentTime, 0.1);
    }
    const speedNorm = (params.flySpeed - 0.1) / 4.9; 
    droneOsc.detune.setTargetAtTime(speedNorm * 2400, audioCtx.currentTime, 0.1);
    const cutoff = 400 + Math.pow(speedNorm, 1.3) * 7000;
    whooshFilter.frequency.setTargetAtTime(cutoff, audioCtx.currentTime, 0.1);
};

const onFirstUserGesture = () => { resumeAudio(); window.removeEventListener('click', onFirstUserGesture); window.removeEventListener('keydown', onFirstUserGesture); };
window.addEventListener('click', onFirstUserGesture);
window.addEventListener('keydown', onFirstUserGesture);

// --- Post-processing ---
const renderScene = new RenderPass(scene, camera);
const bloomPass = new UnrealBloomPass(new THREE.Vector2(w, h), 1.5, 0.4, 100);
bloomPass.threshold = 0.002;
bloomPass.strength = params.bloomStrength;
bloomPass.radius = 0;
const composer = new EffectComposer(renderer);
composer.addPass(renderScene);
composer.addPass(bloomPass);

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

// --- Interaction Logic ---
const inputs = [1, 2, 3, 4, 5, 6, 7].map(id => document.getElementById(`input-${id}`));
const values = [1, 2, 3, 4, 5, 6, 7].map(id => document.getElementById(`val-${id}`));
const rows = [1, 2, 3, 4, 5, 6, 7].map(id => document.getElementById(`row-${id}`));
const indicators = [1, 2, 3, 4, 5, 6, 7].map(id => document.getElementById(`ind-${id}`));
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
    
    document.getElementById('player-timeline').value = params.flyProgress;
    document.getElementById('time-current').innerText = `0:${Math.floor(params.flyProgress * 60).toString().padStart(2, '0')}`;
    playBtn.innerText = params.playing ? "||" : "▶";
    playBtn.classList.toggle('playing', params.playing);
    
    volSlider.value = params.volume;
    const isMuted = params.volume < 0.01;
    volToggle.innerText = isMuted ? "🔇" : "🔊";
    volToggle.classList.toggle('muted', isMuted);
    
    // Ensure rows use theme colors unless auto-active
    [1, 2, 3, 4, 5, 6, 7].forEach(id => {
        const row = rows[id-1];
        if (!autoModes[id].active) {
            row.style.setProperty('--row-color', `var(--theme-${id}-${getRowThemeName(id)})`);
        }
    });
};

const getRowThemeName = (id) => {
    return ["rainbow", "cosmic", "twilight", "aurora", "cyan", "sunset", "lime"][id-1];
};

const setupInteractions = () => {
    inputs[0].oninput = (e) => { params.flyProgress = parseFloat(e.target.value); updateUI(); };
    inputs[1].oninput = (e) => { params.flySpeed = parseFloat(e.target.value); updateUI(); };
    inputs[2].oninput = (e) => { params.tubeRadius = parseFloat(e.target.value); tubeLines.scale.set(params.tubeRadius/0.65, params.tubeRadius/0.65, 1); updateUI(); };
    inputs[3].oninput = (e) => { params.fov = parseFloat(e.target.value); camera.fov = params.fov; camera.updateProjectionMatrix(); updateUI(); };
    inputs[4].oninput = (e) => { params.hue = parseFloat(e.target.value); updateUI(); };
    inputs[5].oninput = (e) => { params.bloomStrength = parseFloat(e.target.value); bloomPass.strength = params.bloomStrength; updateUI(); };
    inputs[6].oninput = (e) => { params.fogDensity = parseFloat(e.target.value); scene.fog.density = params.fogDensity / 1000; updateUI(); };
    
    volSlider.oninput = (e) => { 
        params.volume = parseFloat(e.target.value); 
        if (params.volume > 0) lastActiveVolume = params.volume;
        resumeAudio(); updateUI(); 
    };

    volToggle.onclick = () => {
        resumeAudio();
        if (params.volume > 0) {
            lastActiveVolume = params.volume;
            params.volume = 0;
        } else {
            params.volume = lastActiveVolume || 0.6;
        }
        updateUI();
    };

    playBtn.onclick = () => { resumeAudio(); params.playing = !params.playing; updateUI(); };
    document.getElementById('player-reset').onclick = () => { params.flyProgress = 0; updateUI(); };
    document.getElementById('btn-reset').onclick = () => window.location.reload();
    document.getElementById('btn-pause').onclick = () => { params.playing = !params.playing; updateUI(); };
    document.getElementById('player-speed-up').onclick = () => { params.flySpeed = Math.min(5, params.flySpeed + 0.5); inputs[1].value = params.flySpeed; updateUI(); };
    document.getElementById('player-speed-down').onclick = () => { params.flySpeed = Math.max(0.1, params.flySpeed - 0.5); inputs[1].value = params.flySpeed; updateUI(); };
    document.getElementById('player-fullscreen').onclick = () => { if (!document.fullscreenElement) document.documentElement.requestFullscreen(); else document.exitFullscreen(); };
    document.getElementById('player-timeline').oninput = (e) => { params.flyProgress = parseFloat(e.target.value); params.playing = false; updateUI(); };

    rows.forEach((row, i) => {
        row.querySelector('.setting-header').onclick = (e) => {
            const id = i + 1;
            autoModes[id].active = !autoModes[id].active;
            autoModes[id].startTime = performance.now();
            rows[i].classList.toggle('auto-active', autoModes[id].active);
            indicators[i].innerText = autoModes[id].active ? "||" : "▶";
            e.stopPropagation();
        };
    });

    window.addEventListener('keydown', (e) => {
        if (e.code === 'Space') { resumeAudio(); params.playing = !params.playing; updateUI(); e.preventDefault(); }
        if (e.shiftKey && e.code.startsWith('Digit')) {
            const id = parseInt(e.code.replace('Digit', ''));
            if (autoModes[id]) { 
                autoModes[id].active = !autoModes[id].active;
                autoModes[id].startTime = performance.now();
                rows[id-1].classList.toggle('auto-active', autoModes[id].active);
                indicators[id-1].innerText = autoModes[id].active ? "||" : "▶";
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
            const freq = m.speed;
            const wave = (Math.sin(elapsed * freq) + 1) / 2; // Full 0 to 1 sweep
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

    const path = tubeGeo.parameters.path;
    camera.position.copy(path.getPointAt(params.flyProgress));
    camera.lookAt(path.getPointAt((params.flyProgress + 0.03)%1));
    tubeLinesMat.color.setHSL(params.hue, 1, 0.5);
    boxLines.forEach(bl => bl.mesh.material.color.setHSL((params.hue - bl.offset + 1)%1, 1, 0.5));
    updateAudioSync(); updateUI(); composer.render(scene, camera); controls.update();
}

setupInteractions(); updateUI(); animate(0);
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight); composer.setSize(window.innerWidth, window.innerHeight);
}, false);