import * as THREE from "three";
import { getBody, getMouseBall } from "./getBodies.js";
import RAPIER from 'rapier';
import { UltraHDRLoader } from 'jsm/loaders/UltraHDRLoader.js';
import { OrbitControls } from 'jsm/controls/OrbitControls.js';
import getLayer from "./getLayer.js";

const w = window.innerWidth;
const h = window.innerHeight;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, w / h, 0.1, 1000);
camera.position.set(0, 0, 8);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(w, h);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);

const ctrls = new OrbitControls(camera, renderer.domElement);
ctrls.enableDamping = true;

// --- Premium UI & State ---
const params = {
  gravityY: 0.0,
  mouseBallRadius: 0.75,
  timeScale: 1.0,
  glowIntensity: 0.2,
  autoRotate: 0.0,
  showDebug: false,
};

const autoModes = {
  1: { active: false, base: 0, amp: 10, speed: 0.0005 },  // Gravity Y (Very slow)
  2: { active: false, base: 1.5, amp: 1.4, speed: 0.0008 }, // Radius
  3: { active: false, base: 1.0, amp: 0.9, speed: 0.001 },  // Time Scale
  4: { active: false, base: 5, amp: 4.8, speed: 0.0012 }, // Glow
  5: { active: false, base: 0.5, amp: 0.5, speed: 0.0006 }  // Auto Rotate
};

// UI Elements
const sidebar = document.getElementById('sidebar');
const grip = document.getElementById('sidebar-grip');
const inputs = [1, 2, 3, 4, 5].map(id => document.getElementById(`input-${id}`));
const values = [1, 2, 3, 4, 5].map(id => document.getElementById(`val-${id}`));
const indicators = [1, 2, 3, 4, 5].map(id => document.getElementById(`ind-${id}`));
const rows = [1, 2, 3, 4, 5].map(id => document.getElementById(`row-${id}`));

// Initialize UI Values
const updateUI = () => {
  values[0].innerText = params.gravityY.toFixed(2);
  values[1].innerText = params.mouseBallRadius.toFixed(2);
  values[2].innerText = params.timeScale.toFixed(2);
  values[3].innerText = params.glowIntensity.toFixed(1);
  values[4].innerText = params.autoRotate > 0.1 ? params.autoRotate.toFixed(2) : "OFF";
};

// --- Physics Logic ---
await RAPIER.init();
const world = new RAPIER.World({ x: 0, y: 0, z: 0 });

const numBodies = 100;
const bodies = [];
for (let i = 0; i < numBodies; i++) {
  const body = getBody(RAPIER, world);
  bodies.push(body);
  scene.add(body.mesh);
}
const mouseBall = getMouseBall(RAPIER, world);
scene.add(mouseBall.mesh);

// --- HDR & Environment ---
const hdrLoader = new UltraHDRLoader();
hdrLoader.load('envs/san_giuseppe_bridge_2k.jpg', (hdr) => {
  hdr.mapping = THREE.EquirectangularReflectionMapping;
  scene.environment = hdr;
});

const hemiLight = new THREE.HemisphereLight(0x00bbff, 0xaa00ff, 0.2);
scene.add(hemiLight);
scene.add(getLayer({ hue: 0.6, numSprites: 8, opacity: 0.2, radius: 10, size: 24, z: -10.5 }));

const pointsGeo = new THREE.BufferGeometry();
const points = new THREE.Points(pointsGeo, new THREE.PointsMaterial({ size: 0.035, vertexColors: true }));
scene.add(points);

// --- Event Listeners ---
inputs[0].oninput = (e) => { params.gravityY = parseFloat(e.target.value); world.gravity.y = params.gravityY; updateUI(); };
inputs[1].oninput = (e) => { 
  params.mouseBallRadius = parseFloat(e.target.value); 
  mouseBall.collider.setRadius(params.mouseBallRadius); 
  mouseBall.mesh.scale.setScalar(params.mouseBallRadius / 0.75); // Ensure scale updates with radius
  updateUI(); 
};
inputs[2].oninput = (e) => { params.timeScale = parseFloat(e.target.value); updateUI(); };
inputs[3].oninput = (e) => { params.glowIntensity = parseFloat(e.target.value); updateUI(); };
inputs[4].oninput = (e) => { params.autoRotate = parseFloat(e.target.value); updateUI(); };

document.getElementById('btn-debug').onclick = () => { params.showDebug = !params.showDebug; points.visible = params.showDebug; };
document.getElementById('btn-explode').onclick = () => {
  bodies.forEach(b => {
    const p = b.rigid.translation();
    const f = new THREE.Vector3(p.x, p.y, p.z).normalize().multiplyScalar(3.0);
    b.rigid.applyImpulse({ x: f.x, y: f.y, z: f.z }, true);
  });
};
document.getElementById('btn-reset').onclick = () => {
  bodies.forEach(b => { b.rigid.setTranslation(b.initialTranslation, true); b.rigid.setRotation(b.initialRotation, true); b.rigid.setLinvel({x:0,y:0,z:0}, true); b.rigid.setAngvel({x:0,y:0,z:0}, true); });
  params.gravityY = 0; world.gravity.y = 0; inputs[0].value = 0;
  params.mouseBallRadius = 0.75; mouseBall.collider.setRadius(0.75); mouseBall.mesh.scale.setScalar(1.0); inputs[1].value = 0.75;
  params.timeScale = 1.0; inputs[2].value = 1.0;
  params.glowIntensity = 0.2; inputs[3].value = 0.2;
  params.autoRotate = 0; inputs[4].value = 0;
  [1, 2, 3, 4, 5].forEach(id => { autoModes[id].active = false; rows[id-1].classList.remove('auto-active'); indicators[id-1].innerText = "▶"; });
  camera.position.set(0, 0, 8); ctrls.target.set(0, 0, 0); ctrls.update(); updateUI();
};

// --- Drag & Shortcuts ---
let startX, startY, isDragging = false;
grip.onmousedown = (e) => { isDragging = true; startX = e.clientX - sidebar.offsetLeft; startY = e.clientY - sidebar.offsetTop; sidebar.style.transition = 'none'; };
window.onmousemove = (e) => { if (!isDragging) return; sidebar.style.left = (e.clientX - startX) + 'px'; sidebar.style.top = (e.clientY - startY) + 'px'; sidebar.style.right = 'auto'; };
window.onmouseup = () => { isDragging = false; sidebar.style.transition = 'transform 0.6s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.6s'; };

let sHeld = false;
// --- Auto Mode Toggle Logic ---
const toggleAutoMode = (id) => {
  if (autoModes[id]) {
    const isActive = !autoModes[id].active;
    autoModes[id].active = isActive;
    
    if (isActive) {
      // Set current position as the base for the new oscillation
      autoModes[id].base = parseFloat(inputs[id - 1].value);
      autoModes[id].startTime = performance.now();
    }
    
    rows[id - 1].classList.toggle('auto-active', isActive);
    indicators[id - 1].innerText = isActive ? "||" : "▶";
  }
};

// Bind Click Events to Rows
rows.forEach((row, index) => {
  const header = row.querySelector('.setting-header');
  header.style.cursor = 'pointer';
  header.onclick = () => {
    toggleAutoMode(index + 1);
    updateUI();
  };
});

window.onkeydown = (e) => {
  if (e.code === 'KeyS') sHeld = true;
  if (sHeld && e.code.startsWith('Digit')) {
    const id = parseInt(e.code.replace('Digit', ''));
    if (autoModes[id]) {
      toggleAutoMode(id);
      updateUI();
      e.preventDefault();
    }
  }
};
window.onkeyup = (e) => { if (e.code === 'KeyS') sHeld = false; };

// --- Main Loop ---
const raycaster = new THREE.Raycaster();
const pointerPos = new THREE.Vector2();
const mousePos = new THREE.Vector3();
const mousePlane = new THREE.Mesh(new THREE.PlaneGeometry(50, 50), new THREE.MeshBasicMaterial({ visible: false }));
scene.add(mousePlane);

window.addEventListener('mousemove', (e) => { pointerPos.set((e.clientX / w) * 2 - 1, -(e.clientY / h) * 2 + 1); });

function animate(t) {
  requestAnimationFrame(animate);
  
  // 1. Auto Mode Logic (Dynamic Base Start)
  [1, 2, 3, 4, 5].forEach(id => {
    if (autoModes[id].active) {
      const elapsed = t - (autoModes[id].startTime || 0);
      const next = autoModes[id].base + Math.sin(elapsed * autoModes[id].speed) * autoModes[id].amp;
      
      const input = inputs[id-1];
      input.value = next;
      // Trigger the input event so that the listeners (oninput) can react to the change
      input.dispatchEvent(new Event('input'));
    }
  });

  // 2. Physics Step
  world.timestep = params.timeScale * (1/60);
  world.step();

  // 3. Interactions
  mousePlane.lookAt(camera.position);
  raycaster.setFromCamera(pointerPos, camera);
  const hits = raycaster.intersectObject(mousePlane);
  if (hits.length > 0) mousePos.copy(hits[0].point);
  mouseBall.update(mousePos);

  // 4. Update Visuals
  bodies.forEach(b => {
    b.update();
    b.mesh.material.emissiveIntensity = params.glowIntensity;
  });
  
  if (params.showDebug) {
    const { vertices, colors } = world.debugRender();
    pointsGeo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    pointsGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  }

  if (params.autoRotate > 0.01) {
    scene.rotation.y += params.autoRotate * 0.01;
  }

  ctrls.update();
  renderer.render(scene, camera);
}

updateUI();
animate(0);

window.addEventListener('resize', () => { 
  camera.aspect = window.innerWidth / window.innerHeight; 
  camera.updateProjectionMatrix(); 
  renderer.setSize(window.innerWidth, window.innerHeight); 
});




