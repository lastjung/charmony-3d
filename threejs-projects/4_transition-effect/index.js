import * as THREE from "three";
import { getFXScene } from "./FXScene.js";
import { getTransition } from "./Transition.js";

const clock = new THREE.Clock();
let transition;
const renderer = new THREE.WebGLRenderer({ antialias: true });

// --- HUD State & UI Elements ---
const autoModes = {
  1: { active: false, base: 0.5, amp: 0.5, speed: 0.0005, startTime: 0 },
  2: { active: false, base: 0.3, amp: 0.3, speed: 0.0008, startTime: 0 },
  3: { active: false, base: 1.0, amp: 0.9, speed: 0.001, startTime: 0 },
  4: { active: false, base: 0.5, amp: 0.5, speed: 0.0006, startTime: 0 },
  5: { active: false, base: 1, amp: 1, speed: 0.0004, startTime: 0 }
};

const sidebar = document.getElementById('sidebar');
const grip = document.getElementById('sidebar-grip');
const inputs = [1, 2, 3, 4, 5].map(id => document.getElementById(`input-${id}`));
const values = [1, 2, 3, 4, 5].map(id => document.getElementById(`val-${id}`));
const indicators = [1, 2, 3, 4, 5].map(id => document.getElementById(`ind-${id}`));
const rows = [1, 2, 3, 4, 5].map(id => document.getElementById(`row-${id}`));

const lerp = (a, b, t) => a + (b - a) * t;
const updateUI = () => {
  if (!transition) return;
  values[0].innerText = transition.params.transition.toFixed(2);
  values[1].innerText = transition.params.threshold.toFixed(2);
  values[2].innerText = transition.params.animate ? "RUN" : "PAUSE";
  // Show rotation speed for Row 4
  values[3].innerText = sceneA.rotationSpeed ? sceneA.rotationSpeed.x.toFixed(2) : "0.00";
  values[4].innerText = transition.params.texture;
};

let sceneA, sceneB;

init();

function init() {
  const container = document.getElementById("container");
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  container.appendChild(renderer.domElement);

  const materialA = new THREE.MeshBasicMaterial({ color: 0x00FF00, wireframe: true });
  const materialB = new THREE.MeshStandardMaterial({ color: 0xFF9900, flatShading: true });
  
  sceneA = getFXScene({ renderer, material: materialA, clearColor: 0x000000 });
  sceneB = getFXScene({ renderer, material: materialB, clearColor: 0x000000, needsAnimatedColor: true });

  transition = getTransition({ renderer, sceneA, sceneB });
  transition.params.threshold = 0.1; // Initialize threshold
  
  setupInteractions();
  animate(0);
}

function setupInteractions() {
  const toggleAuto = (id) => {
    const isActive = !autoModes[id].active;
    autoModes[id].active = isActive;
    if (isActive) {
      autoModes[id].base = parseFloat(inputs[id-1].value);
      autoModes[id].startTime = performance.now();
      if (id === 1) transition.params.animate = false; // Override TWEEN if manual/auto ratio
    }
    rows[id-1].classList.toggle('auto-active', isActive);
    indicators[id-1].innerText = isActive ? "||" : "▶";
  };

  rows.forEach((row, i) => {
    const header = row.querySelector('.setting-header');
    header.style.cursor = 'pointer';
    header.onclick = () => toggleAuto(i + 1);
  });

  inputs[0].oninput = (e) => { transition.params.transition = parseFloat(e.target.value); transition.params.animate = false; updateUI(); updatePlayState(); };
  inputs[1].oninput = (e) => { transition.params.threshold = parseFloat(e.target.value); updateUI(); };
  inputs[2].oninput = (e) => { 
    const speed = parseFloat(e.target.value);
    transition.params.animDuration = 4500 / speed; 
    if (transition.startTween) transition.startTween();
    updateUI(); 
  };
  inputs[3].oninput = (e) => { 
    if (sceneA.rotationSpeed) {
      const s = parseFloat(e.target.value);
      sceneA.rotationSpeed.set(s, -s * 2, s * 1.5);
      sceneB.rotationSpeed.set(s, -s * 2, s * 1.5);
    }
    updateUI(); 
  };
  inputs[4].oninput = (e) => { transition.params.texture = parseInt(e.target.value); updateUI(); };

  // --- Play Box Logic ---
  const playBtn = document.getElementById('player-play');
  const updatePlayState = () => {
    if (!transition) return;
    const isPlaying = transition.params.animate;
    playBtn.innerText = isPlaying ? "Pause" : "Play";
    playBtn.classList.toggle('playing', isPlaying);
  };

  playBtn.onclick = () => {
    transition.params.animate = !transition.params.animate;
    updatePlayState();
  };

  document.getElementById('player-timeline').oninput = (e) => {
    transition.params.transition = parseFloat(e.target.value);
    transition.params.animate = false; // Pause when seeking
    updatePlayState();
    updateUI();
  };

  document.getElementById('player-next-track').onclick = () => {
    transition.params.texture = (transition.params.texture + 1) % 3;
    updateUI();
  };
  
  document.getElementById('player-partial-reset').onclick = () => {
    transition.params.transition = 0;
    transition.params.animate = false;
    updatePlayState();
    updateUI();
  };

  document.getElementById('player-speed-up').onclick = () => { inputs[2].value = Math.min(5, parseFloat(inputs[2].value) + 0.5); inputs[2].dispatchEvent(new Event('input')); };
  document.getElementById('player-speed-down').onclick = () => { inputs[2].value = Math.max(0.1, parseFloat(inputs[2].value) - 0.5); inputs[2].dispatchEvent(new Event('input')); };
  document.getElementById('player-full-reset').onclick = () => window.location.reload();

  // Integrated Shortcuts
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') { transition.params.animate = !transition.params.animate; updatePlayState(); e.preventDefault(); }
    if (e.code === 'Escape') { sidebar.style.opacity = "1"; document.getElementById('apple-player').style.opacity = "1"; }
  });

  document.getElementById('btn-pause').onclick = () => { transition.params.animate = !transition.params.animate; updatePlayState(); };
  document.getElementById('btn-swap').onclick = () => { transition.params.transition = transition.params.transition > 0.5 ? 0 : 1; transition.params.animate = false; updateUI(); updatePlayState(); };
  document.getElementById('btn-reset').onclick = () => window.location.reload();

  let sHeld = false;
  window.onkeydown = (e) => {
    if (e.code === 'KeyS') sHeld = true;
    if (sHeld && e.code.startsWith('Digit')) {
      const id = parseInt(e.code.replace('Digit', ''));
      if (autoModes[id]) { toggleAuto(id); e.preventDefault(); }
    }
  };
  window.onkeyup = (e) => { if (e.code === 'KeyS') sHeld = false; };
  
  updatePlayState();
}

function animate(t) {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();

  // Sync Video-like Seek Bar
  const timeline = document.getElementById('player-timeline');
  if (transition && timeline) {
    timeline.value = transition.params.transition;
    document.getElementById('time-current').innerText = `0:${Math.floor(transition.params.transition * 60).toString().padStart(2, '0')}`;
  }

  // Handle Rotation Mapping (Lerp start/stop based on play state)
  const rotTarget = (transition && transition.params.animate) ? 1.0 : 0.0;
  if (sceneA.rotationSpeed) {
    const currentRot = sceneA.rotationSpeed.x;
    const targetSpeed = lerp(currentRot, rotTarget, 0.05); // Smooth acceleration
    sceneA.rotationSpeed.set(targetSpeed, -targetSpeed * 2, targetSpeed * 1.5);
    sceneB.rotationSpeed.set(targetSpeed, -targetSpeed * 2, targetSpeed * 1.5);
  }

  // Handle Auto Modes
  [1, 2, 3, 4, 5].forEach(id => {
    if (autoModes[id].active) {
      const elapsed = t - (autoModes[id].startTime || 0);
      const next = autoModes[id].base + Math.sin(elapsed * autoModes[id].speed) * autoModes[id].amp;
      const input = inputs[id-1];
      input.value = next;
      input.dispatchEvent(new Event('input'));
    }
  });

  transition.render(delta);
}

window.addEventListener('resize', () => { 
  renderer.setSize(window.innerWidth, window.innerHeight);
});
