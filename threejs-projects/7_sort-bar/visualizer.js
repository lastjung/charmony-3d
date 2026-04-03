import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const DEFAULT_BAR_COUNT = 50;
const DEFAULT_SORT_MODE = 'height';
const DATA_VALUE_MIN = 19;
const DATA_VALUE_STEP = 20;

// The data array representing the sorting state

// These will be dynamically calculated
let BAR_WIDTH = 1;

let barCount = DEFAULT_BAR_COUNT;
let sortMode = DEFAULT_SORT_MODE;
let valueVisuals = new Map();
let BAR_SPACING = 0.2;
let MAX_HEIGHT = 10;

// --- Audio Engine (Web Audio API) ---
let audioCtx = null;
let masterGain = null;
const PENTATONIC_SCALE = [
  261.63, 293.66, 329.63, 392.00, 440.00, // C4, D4, E4, G4, A4
  523.25, 587.33, 659.25, 783.99, 880.00, // C5, D5, E5, G5, A5
  1046.50, 1174.66, 1318.51, 1567.98, 1760.00 // C6, D6, E6, G6, A6
];

export function initAudio() {
  if (audioCtx) return;
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  masterGain = audioCtx.createGain();
  masterGain.connect(audioCtx.destination);
  
  // HUD 볼륨 및 뮤트 연동
  const volSlider = document.getElementById('ui-vol');
  const muteBtn = document.getElementById('ui-mute');
  
  const updateVolume = () => {
    const isMuted = muteBtn?.dataset.muted === 'true';
    const volume = isMuted ? 0 : (volSlider ? volSlider.value / 100 : 0.8);
    masterGain.gain.setTargetAtTime(volume, audioCtx.currentTime, 0.05);
  };

  if (volSlider) volSlider.addEventListener('input', updateVolume);
  if (muteBtn) muteBtn.addEventListener('click', updateVolume);
  updateVolume();
}

function normalizeDataValue(value) {
  const values = getSortableValues();
  const dataMin = values[0] ?? DATA_VALUE_MIN;
  const dataMax = values[values.length - 1] ?? DATA_VALUE_MIN;
  if (!Number.isFinite(value) || dataMax === dataMin) return 0;
  const clampedValue = Math.min(dataMax, Math.max(dataMin, value));
  return (clampedValue - dataMin) / (dataMax - dataMin);
}

export function playSynthesizedNote(value, maxValue = getDataMaxValue(), isSwap = false) {
  if (!audioCtx) initAudio();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  if (!Number.isFinite(value)) return;

  const osc = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();
  
  // 펜타토닉 음계 매핑
  const dataMin = getDataMinValue();
  const normalizedValue = maxValue > dataMin
    ? Math.min(1, Math.max(0, (value - dataMin) / (maxValue - dataMin)))
    : normalizeDataValue(value);
  const scaleIdx = Math.floor(normalizedValue * (PENTATONIC_SCALE.length - 1));
  osc.frequency.setValueAtTime(PENTATONIC_SCALE[scaleIdx], audioCtx.currentTime);
  
  // 음색 설정 (실로폰 스타일: Sine + Triangle)
  osc.type = isSwap ? 'triangle' : 'sine';
  
  gainNode.gain.setValueAtTime(isSwap ? 0.25 : 0.15, audioCtx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + (isSwap ? 0.3 : 0.1));
  
  osc.connect(gainNode);
  gainNode.connect(masterGain);
  
  osc.start();
  osc.stop(audioCtx.currentTime + (isSwap ? 0.3 : 0.1));
}

export let dataArray = [];
let scene, camera, renderer, controls, barsGroup;
let ambientLight, directionalLight;
let barMeshes = [];

// Indicator dots group
let indicatorGroup = null;
let activePhaseLabel = '';
let activePhaseContext = '';

function createSequentialValues() {
  return getSortableValues();
}

function getSortableValues() {
  return Array.from({ length: barCount }, (_, index) => DATA_VALUE_MIN + (index * DATA_VALUE_STEP));
}

function getDataMinValue() {
  return DATA_VALUE_MIN;
}

function getDataMaxValue() {
  return DATA_VALUE_MIN + ((barCount - 1) * DATA_VALUE_STEP);
}

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function rebuildVisualMappings() {
  const independentValues = shuffleArray(createSequentialValues());
  valueVisuals = new Map();
  const sortableValues = createSequentialValues();

  for (let index = 0; index < sortableValues.length; index++) {
    const sortableValue = sortableValues[index];
    const independentValue = independentValues[index];
    const heightValue = sortMode === 'color' ? independentValue : sortableValue;
    const colorValue = sortMode === 'color' ? sortableValue : independentValue;

    valueVisuals.set(sortableValue, {
      sortValue: sortableValue,
      heightValue,
      colorValue,
    });
  }
}

function resetDataOrder() {
  dataArray = shuffleArray(createSequentialValues());
}

function getBarX(index) {
  const totalWidth = dataArray.length * (BAR_WIDTH + BAR_SPACING);
  return index * (BAR_WIDTH + BAR_SPACING) - totalWidth / 2 + (BAR_WIDTH + BAR_SPACING) / 2;
}

function getBarHeight(value) {
  const visual = valueVisuals.get(value);
  const heightValue = visual?.heightValue ?? value;
  return normalizeDataValue(heightValue) * (MAX_HEIGHT * 0.8) + (MAX_HEIGHT * 0.2);
}

function getBarColor(value) {
  const visual = valueVisuals.get(value);
  const colorValue = visual?.colorValue ?? value;
  const hue = normalizeDataValue(colorValue);
  return new THREE.Color().setHSL(hue, 1.0, 0.5);
}

function createBarMesh(value, index) {
  const height = getBarHeight(value);
  const color = getBarColor(value);
  const emissive = new THREE.Color(0x000000);
  if (activePhaseLabel.includes('RADIX PASS')) {
    emissive.copy(color).multiplyScalar(0.18);
  }

  const bar = new THREE.Mesh(
    new THREE.BoxGeometry(BAR_WIDTH, height, BAR_WIDTH),
    new THREE.MeshStandardMaterial({ color, emissive })
  );
  bar.position.x = getBarX(index);
  bar.position.y = height / 2 - MAX_HEIGHT / 2;
  bar.position.z = 0;
  return bar;
}

function rebuildBars() {
  barsGroup.clear();
  barMeshes = dataArray.map((value, index) => createBarMesh(value, index));
  for (const bar of barMeshes) barsGroup.add(bar);
}

function syncBarMeshesToData() {
  if (barMeshes.length !== dataArray.length) {
    rebuildBars();
    return;
  }

  for (let i = 0; i < dataArray.length; i++) {
    const value = dataArray[i];
    const bar = barMeshes[i];
    const height = getBarHeight(value);
    const color = getBarColor(value);
    const emissive = new THREE.Color(0x000000);
    if (activePhaseLabel.includes('RADIX PASS')) {
      emissive.copy(color).multiplyScalar(0.18);
    }

    bar.geometry.dispose();
    bar.geometry = new THREE.BoxGeometry(BAR_WIDTH, height, BAR_WIDTH);
    bar.material.color.copy(color);
    bar.material.emissive.copy(emissive);
    bar.position.x = getBarX(i);
    bar.position.y = height / 2 - MAX_HEIGHT / 2;
    bar.position.z = 0;
  }
}

export function setSortMode(nextSortMode) {
  sortMode = nextSortMode === 'color' ? 'color' : 'height';
  rebuildVisualMappings();
  resetDataOrder();
  updateScaleAndBars();
}

export function getSortMode() {
  return sortMode;
}

export function setNodeCount(nextCount) {
  const parsedCount = Number.parseInt(nextCount, 10);
  const clampedCount = Math.max(10, Math.min(200, Number.isFinite(parsedCount) ? parsedCount : DEFAULT_BAR_COUNT));
  if (clampedCount === barCount) return;

  barCount = clampedCount;
  rebuildVisualMappings();
  resetDataOrder();
  updateScaleAndBars();
}

export function getNodeCount() {
  return barCount;
}

export function initVisualizer(canvas) {
  // WebGL support check
  // Inline WebGL support checks
  function showWebGLError(canvas, message) {
    if (!canvas || !canvas.parentNode) return;
    // Prevent duplicate error messages
    if (canvas.parentNode.querySelector('.webgl-error-message')) return;
    const errorMsg = document.createElement('div');
    errorMsg.className = 'webgl-error-message';
    errorMsg.style.position = 'absolute';
    errorMsg.style.top = '0';
    errorMsg.style.left = '0';
    errorMsg.style.width = '100%';
    errorMsg.style.height = '100%';
    errorMsg.style.background = '#202020';
    errorMsg.style.color = '#fff';
    errorMsg.style.display = 'flex';
    errorMsg.style.alignItems = 'center';
    errorMsg.style.justifyContent = 'center';
    errorMsg.style.fontSize = '1.5em';
    errorMsg.style.zIndex = '1000';
    errorMsg.innerText = message;
    canvas.parentNode.appendChild(errorMsg);
  }

  // Removed redundant pre-check for WebGL2/WebGL1 support.

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);

  // Camera setup
  const fov = 45;
  const aspect = window.innerWidth / window.innerHeight;
  const near = 0.1;
  const far = 1000;
  camera = new THREE.PerspectiveCamera(fov, aspect, near, far);

  // Lighting
  ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);

  directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(0, 20, 10);
  scene.add(directionalLight);

  // Renderer
  // Try to create renderer (WebGL2 only, as Three.js r163+ does not support WebGL1)
  let rendererCreationError = null;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  } catch (e) {
    rendererCreationError = e;
  }
  if (!renderer) {
    let extraMsg = '';
    if (rendererCreationError && typeof rendererCreationError.message === 'string' && rendererCreationError.message.length > 0) {
      extraMsg = '\n\nDetails: ' + rendererCreationError.message;
    }
    showWebGLError(
      canvas,
      'WebGL context could not be created.\n\nPlease check your browser and graphics settings.\n\nIf the problem persists, try updating your browser or using a different one that supports WebGL2.' + extraMsg
    );
    return false;
  }
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);

  // Controls
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;

  // Bars group
  barsGroup = new THREE.Group();
  scene.add(barsGroup);

  rebuildVisualMappings();
  resetDataOrder();

  updateScaleAndBars();

  positionCamera();

  window.addEventListener('resize', onWindowResize);

  animate();
  return true;
}

export function highlightComparedIndices(index1, index2) {
  if (!indicatorGroup) {
    indicatorGroup = new THREE.Group();
    scene.add(indicatorGroup);
  }

  // Clear previous indicators
  indicatorGroup.clear();

  const activeIndices = Array.from(new Set([index1, index2].filter(i => i >= 0 && i < barMeshes.length)));

  // Reset all bars and indicators first (piano keyboard style)
  barMeshes.forEach((bar, i) => {
    if (!bar) return;
    const isActive = activeIndices.includes(i);
    
    // 1. 막대 자체의 하이라이트 (피아노 건반 느낌)
    if (isActive) {
      // 활성화된 막대: 밝게 발광하고 위로 살짝 팝업
      bar.material.emissive.setHex(0xffffff);
      bar.material.emissiveIntensity = 0.5;
      bar.scale.set(1.05, 1.05, 1.05); // 살짝 강조
      
      // 소환음 (Sine)
      if (i === index1) {
        playSynthesizedNote(dataArray[i], getDataMaxValue(), false);
      }
    } else {
      // 비활성화된 막대: 원래 상태로 복구
      const value = dataArray[i];
      const color = getBarColor(value);
      bar.material.emissive.setHex(0x000000);
      bar.material.emissiveIntensity = 0;
      bar.scale.set(1, 1, 1);
      
      // 만약 RADIX PASS 등의 특수 상태라면 소량의 발광 유지
      if (activePhaseLabel.includes('RADIX PASS')) {
        bar.material.emissive.copy(color).multiplyScalar(0.18);
        bar.material.emissiveIntensity = 1;
      }
    }

    // 2. 하단 보조 인디케이터 (건반 표시)
    const keyGeometry = new THREE.BoxGeometry(BAR_WIDTH * 0.9, BAR_WIDTH * 0.18, BAR_WIDTH * 0.8);
    const keyMaterial = new THREE.MeshStandardMaterial({
      color: isActive ? 0xfff1a8 : 0x1a1a1a,
      emissive: isActive ? 0xffea00 : 0x000000,
      emissiveIntensity: isActive ? 0.6 : 0,
      transparent: true,
      opacity: isActive ? 1 : 0.4
    });
    const key = new THREE.Mesh(keyGeometry, keyMaterial);

    key.position.x = getBarX(i);
    key.position.y = -MAX_HEIGHT / 2 - (BAR_WIDTH * 0.32);
    key.position.z = 0;

    indicatorGroup.add(key);
  });
}

export function updateScaleAndBars() {
  // Fixed world scale
  const totalTargetWidth = 50; // units
  const targetMaxHeight = 20;  // units

  BAR_WIDTH = totalTargetWidth / (barCount * 1.2);
  BAR_SPACING = BAR_WIDTH * 0.25;
  MAX_HEIGHT = targetMaxHeight;

  console.log('BAR_WIDTH:', BAR_WIDTH.toFixed(2), 'BAR_SPACING:', BAR_SPACING.toFixed(2), 'MAX_HEIGHT:', MAX_HEIGHT.toFixed(2));

  // 무겁고 경쾌한 교체음 (Triangle)
  const randomValue = dataArray[Math.floor(Math.random() * dataArray.length)];
  playSynthesizedNote(randomValue, getDataMaxValue(), true);
  syncBarMeshesToData();
}

export async function animateSwapIndices(index1, index2, duration = 220) {
  if (index1 === index2) {
    syncBarMeshesToData();
    return;
  }

  const barA = barMeshes[index1];
  const barB = barMeshes[index2];
  if (!barA || !barB) {
    syncBarMeshesToData();
    return;
  }

  const startAX = barA.position.x;
  const startBX = barB.position.x;
  const start = performance.now();

  await new Promise((resolve) => {
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      barA.position.x = startAX + (startBX - startAX) * eased;
      barB.position.x = startBX + (startAX - startBX) * eased;
      if (t < 1) requestAnimationFrame(tick);
      else resolve();
    };
    requestAnimationFrame(tick);
  });

  [barMeshes[index1], barMeshes[index2]] = [barMeshes[index2], barMeshes[index1]];
  syncBarMeshesToData();
}

export function setVisualizationPhase(step) {
  activePhaseLabel = step?.label || '';
  activePhaseContext = step?.context || '';

  if (!ambientLight || !directionalLight) return;

  if (step == null) {
    ambientLight.color.setHex(0xffffff);
    directionalLight.color.setHex(0xffffff);
    activePhaseLabel = '';
    activePhaseContext = '';
    return;
  }

  let phaseColor = 0x64b5ff;
  if (activePhaseContext.includes('ONES')) phaseColor = 0xff8a65;
  else if (activePhaseContext.includes('TENS')) phaseColor = 0x64b5ff;
  else if (activePhaseContext.includes('HUNDREDS')) phaseColor = 0x9c88ff;

  ambientLight.color.setHex(phaseColor);
  directionalLight.color.setHex(phaseColor);
  updateScaleAndBars();
}


function positionCamera() {
  const totalWidth = barCount * (BAR_WIDTH + BAR_SPACING);
  const fovRadians = (camera.fov * Math.PI) / 180;
  const aspect = camera.aspect;

  // Calculate base distance so that the whole width fits in view
  let distance = (totalWidth / 2) / Math.tan(fovRadians / 2);

  // If portrait/narrow aspect (mobile), push the camera back further proportionally
  // to ensure the full width is still visible.
  if (aspect < 1.2) {
    distance = distance / (aspect * 0.82);
  }

  console.log('Camera distance:', distance.toFixed(2), 'Camera aspect:', aspect.toFixed(2));

  camera.position.set(0, MAX_HEIGHT / 2, distance * 0.85);
  camera.lookAt(0, 0, 0);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);

  updateScaleAndBars();
  positionCamera();
}

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
