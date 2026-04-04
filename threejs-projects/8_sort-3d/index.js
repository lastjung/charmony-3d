import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { MOUSE } from "three";
import { algorithms } from "./algorithm/index.js";
import { normalizeSortStep } from "./sortEvents.js";

const state = {
  algorithmKey: "radixSort",
  nodeCount: 64,
  speed: 72,
  layout: "grid",
  shape: "rectangle",
  colorScheme: "aurora",
  sortCriterion: "height",
  activeCriterion: "height",
  showStartMessage: true,
  spacing: 1.2,
  elevation: 1,
  playing: false,
  frameCount: 0,
  lastFpsSample: performance.now(),
  stepCount: 0,
  phaseLabel: "Phase 1",
  contextLabel: "READY",
  compareLabel: "-",
  isMuted: false,
  immersive: false,
};

const ui = {
  algorithmSelect: document.getElementById("algorithm-select"),
  sortCriterion: document.getElementById("sort-criterion"),
  sortCriterionNote: document.getElementById("sort-criterion-note"),
  showStartMessage: document.getElementById("show-start-message"),
  nodeCount: document.getElementById("node-count"),
  nodeCountValue: document.getElementById("node-count-value"),
  speed: document.getElementById("speed"),
  speedValue: document.getElementById("speed-value"),
  spacing: document.getElementById("spacing"),
  spacingValue: document.getElementById("spacing-value"),
  elevation: document.getElementById("elevation"),
  elevationValue: document.getElementById("elevation-value"),
  colorScheme: document.getElementById("color-scheme"),
  statusValue: document.getElementById("status-value"),
  stepValue: document.getElementById("step-value"),
  compareValue: document.getElementById("compare-value"),
  phaseValue: document.getElementById("phase-value"),
  metaAlgorithm: document.getElementById("meta-algorithm"),
  metaLayout: document.getElementById("meta-layout"),
  metaShape: document.getElementById("meta-shape"),
  timelineLabel: document.getElementById("timeline-label"),
  fpsLabel: document.getElementById("fps-label"),
  progressBar: document.getElementById("progress-bar"),
  playBtn: document.getElementById("play-btn"),
  shuffleBtn: document.getElementById("shuffle-btn"),
  resetBtn: document.getElementById("reset-btn"),
  hudAlgorithm: document.getElementById("hud-algorithm"),
  hudTimer: document.getElementById("hud-timer"),
  hudStep: document.getElementById("hud-step"),
  hudContext: document.getElementById("hud-context"),
  hudDetail: document.getElementById("hud-detail"),
  muteBtn: document.getElementById("mute-btn"),
  volSlider: document.getElementById("vol-slider"),
  fullscreenBtn: document.getElementById("fullscreen-btn"),
  speedDownBtn: document.getElementById("speed-down-btn"),
  speedUpBtn: document.getElementById("speed-up-btn"),
  announce: document.getElementById("announce"),
  announceKicker: document.getElementById("announce-kicker"),
  announceTitle: document.getElementById("announce-title"),
  announceDetail: document.getElementById("announce-detail"),
  layoutButtons: Array.from(document.querySelectorAll("[data-layout]")),
  shapeButtons: Array.from(document.querySelectorAll("[data-shape]")),
};

let audioCtx = null;
let masterGain = null;
const PENTATONIC_SCALE = [
  261.63, 293.66, 329.63, 392.0, 440.0,
  523.25, 587.33, 659.25, 783.99, 880.0,
];

const COLOR_SCHEMES = {
  aurora: {
    ui: {
      bg: "#04060d",
      panel: "rgba(10, 14, 24, 0.72)",
      panelBorder: "rgba(255, 255, 255, 0.08)",
      text: "#f7f9fc",
      muted: "rgba(247, 249, 252, 0.62)",
      cyan: "#6de7ff",
      blue: "#5b8cff",
      amber: "#ffc857",
      glowA: "rgba(91, 140, 255, 0.12)",
      glowB: "rgba(109, 231, 255, 0.12)",
    },
    nodes: {
      hueStart: 0.08,
      hueSpan: 0.76,
      saturation: 0.9,
      lightness: 0.56,
      rim: 0x6de7ff,
      gridMajor: 0x28406c,
      gridMinor: 0x162033,
      sceneBg: 0x04060d,
    },
  },
  sunset: {
    ui: {
      bg: "#12060b",
      panel: "rgba(28, 12, 18, 0.72)",
      panelBorder: "rgba(255, 209, 179, 0.14)",
      text: "#fff7f4",
      muted: "rgba(255, 238, 232, 0.66)",
      cyan: "#ff9e7a",
      blue: "#ff7ab6",
      amber: "#ffd166",
      glowA: "rgba(255, 122, 182, 0.14)",
      glowB: "rgba(255, 158, 122, 0.14)",
    },
    nodes: {
      hueStart: 0.96,
      hueSpan: 0.22,
      saturation: 0.88,
      lightness: 0.64,
      rim: 0xff9e7a,
      gridMajor: 0x6a374a,
      gridMinor: 0x2f1821,
      sceneBg: 0x12060b,
    },
  },
  mint: {
    ui: {
      bg: "#04100d",
      panel: "rgba(8, 24, 20, 0.72)",
      panelBorder: "rgba(191, 255, 233, 0.12)",
      text: "#f2fffb",
      muted: "rgba(224, 255, 245, 0.64)",
      cyan: "#7cf7cf",
      blue: "#74d8ff",
      amber: "#e3ff8a",
      glowA: "rgba(116, 216, 255, 0.12)",
      glowB: "rgba(124, 247, 207, 0.12)",
    },
    nodes: {
      hueStart: 0.34,
      hueSpan: 0.28,
      saturation: 0.76,
      lightness: 0.62,
      rim: 0x7cf7cf,
      gridMajor: 0x28594f,
      gridMinor: 0x112b26,
      sceneBg: 0x04100d,
    },
  },
  candy: {
    ui: {
      bg: "#0d0614",
      panel: "rgba(18, 11, 30, 0.74)",
      panelBorder: "rgba(232, 206, 255, 0.14)",
      text: "#fcf7ff",
      muted: "rgba(244, 234, 255, 0.68)",
      cyan: "#97c1ff",
      blue: "#d38bff",
      amber: "#ff9de1",
      glowA: "rgba(211, 139, 255, 0.14)",
      glowB: "rgba(151, 193, 255, 0.12)",
    },
    nodes: {
      hueStart: 0.72,
      hueSpan: 0.22,
      saturation: 0.74,
      lightness: 0.68,
      rim: 0xd38bff,
      gridMajor: 0x4b3476,
      gridMinor: 0x211533,
      sceneBg: 0x0d0614,
    },
  },
};

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x04060d);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.up.set(0, 0, 1);
camera.position.set(16, -16, 12);
camera.lookAt(0, 0, 2);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.enablePan = false;
controls.minDistance = 8;
controls.maxDistance = 64;
controls.maxPolarAngle = Math.PI * 0.48;
controls.mouseButtons = {
  LEFT: MOUSE.ROTATE,
  MIDDLE: MOUSE.DOLLY,
  RIGHT: MOUSE.ROTATE,
};
controls.target.set(0, 0, 2);
controls.update();

scene.add(new THREE.AmbientLight(0xffffff, 0.55));
const keyLight = new THREE.DirectionalLight(0xffffff, 1.1);
keyLight.position.set(8, 12, 14);
scene.add(keyLight);
const rimLight = new THREE.DirectionalLight(0x6de7ff, 0.45);
rimLight.position.set(-12, 4, -10);
scene.add(rimLight);

const ground = new THREE.GridHelper(44, 22, 0x28406c, 0x162033);
ground.rotation.x = Math.PI / 2;
ground.position.z = -0.05;
scene.add(ground);

let data = [];
let auxValues = new Map();
let reverseAuxValues = new Map();
let nodeMeshes = [];
let sortSession = 0;
let nodePulseState = [];
let runStartedAt = 0;
let elapsedBeforePause = 0;
let announceTimeoutId = null;

const baseMaterial = new THREE.MeshStandardMaterial({
  roughness: 0.32,
  metalness: 0.1,
});

function ensureAudio() {
  if (audioCtx) return;
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  masterGain = audioCtx.createGain();
  masterGain.connect(audioCtx.destination);
  updateVolume();
}

function updateVolume() {
  if (!masterGain || !audioCtx) return;
  const volume = state.isMuted ? 0 : Number.parseInt(ui.volSlider.value, 10) / 100;
  masterGain.gain.setTargetAtTime(volume, audioCtx.currentTime, 0.05);
}

function playNote(value, isMove = false) {
  ensureAudio();
  if (audioCtx.state === "suspended") audioCtx.resume();
  if (state.isMuted || !Number.isFinite(value)) return;

  const normalized = state.nodeCount <= 1 ? 0 : (value - 1) / (state.nodeCount - 1);
  const idx = Math.max(0, Math.min(PENTATONIC_SCALE.length - 1, Math.floor(normalized * (PENTATONIC_SCALE.length - 1))));
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  osc.type = isMove ? "triangle" : "sine";
  osc.frequency.setValueAtTime(PENTATONIC_SCALE[idx], audioCtx.currentTime);
  gain.gain.setValueAtTime(isMove ? 0.22 : 0.12, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + (isMove ? 0.28 : 0.1));

  osc.connect(gain);
  gain.connect(masterGain);
  osc.start();
  osc.stop(audioCtx.currentTime + (isMove ? 0.28 : 0.1));
}

function createValueSeries(count) {
  return Array.from({ length: count }, (_, index) => index + 1);
}

function shuffle(values) {
  const next = [...values];
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

function buildAuxValues() {
  const shuffled = shuffle(createValueSeries(state.nodeCount));
  auxValues = new Map();
  reverseAuxValues = new Map();
  const values = createValueSeries(state.nodeCount);
  for (let i = 0; i < values.length; i++) {
    auxValues.set(values[i], shuffled[i]);
    reverseAuxValues.set(shuffled[i], values[i]);
  }
}

function resetData() {
  data = shuffle(createValueSeries(state.nodeCount));
  nodePulseState = Array.from({ length: state.nodeCount }, () => ({ until: 0, strength: 0 }));
  state.stepCount = 0;
  state.phaseLabel = "Phase 1";
  state.contextLabel = "READY";
  state.compareLabel = "-";
  ui.hudTimer.textContent = "00:00:00";
  updateHud();
}

function getNodeGeometry() {
  return state.shape === "sphere"
    ? new THREE.SphereGeometry(0.38, 20, 20)
    : new THREE.BoxGeometry(0.58, 0.44, 1);
}

function getScheme() {
  return COLOR_SCHEMES[state.colorScheme] ?? COLOR_SCHEMES.aurora;
}

function applyColorScheme() {
  const { ui: palette, nodes } = getScheme();
  const root = document.documentElement;

  root.style.setProperty("--bg", palette.bg);
  root.style.setProperty("--panel", palette.panel);
  root.style.setProperty("--panel-border", palette.panelBorder);
  root.style.setProperty("--text", palette.text);
  root.style.setProperty("--muted", palette.muted);
  root.style.setProperty("--cyan", palette.cyan);
  root.style.setProperty("--blue", palette.blue);
  root.style.setProperty("--amber", palette.amber);
  root.style.setProperty("--glow-a", palette.glowA);
  root.style.setProperty("--glow-b", palette.glowB);

  scene.background = new THREE.Color(nodes.sceneBg);
  rimLight.color.setHex(nodes.rim);

  if (Array.isArray(ground.material)) {
    ground.material[0].color.setHex(nodes.gridMajor);
    ground.material[1].color.setHex(nodes.gridMinor);
  } else {
    ground.material.color.setHex(nodes.gridMajor);
  }
}

function getColorForValue(value) {
  const { nodes } = getScheme();
  const sourceValue = auxValues.get(value) ?? value;
  const t = state.nodeCount <= 1 ? 0 : (sourceValue - 1) / (state.nodeCount - 1);
  return new THREE.Color().setHSL(
    (nodes.hueStart + (t * nodes.hueSpan)) % 1,
    nodes.saturation,
    nodes.lightness
  );
}

function getHeightForValue(value) {
  const sourceValue = value;
  const t = state.nodeCount <= 1 ? 0 : (sourceValue - 1) / (state.nodeCount - 1);
  return 0.8 + t * (6 * state.elevation);
}

function getSortRuntime(criterion) {
  const needsProxy = criterion === "hue";
  return {
    workingArray: needsProxy ? data.map(v => auxValues.get(v)) : [...data],
    toDisplayData(workingArray) {
      return needsProxy ? workingArray.map(v => reverseAuxValues.get(v)) : [...workingArray];
    },
  };
}

function getLayoutPosition(index, count = state.nodeCount) {
  const spacing = state.spacing;

  if (state.layout === "cube") {
    const edge = Math.ceil(Math.cbrt(count));
    const x = index % edge;
    const y = Math.floor(index / edge) % edge;
    const z = Math.floor(index / (edge * edge));
    const offset = (edge - 1) / 2;
    return new THREE.Vector3(
      (x - offset) * spacing * 1.4,
      (y - offset) * spacing * 1.4,
      (z - offset) * spacing * 1.4
    );
  }

  if (state.layout === "sphere") {
    const phi = Math.acos(1 - (2 * (index + 0.5)) / count);
    const theta = Math.PI * (1 + Math.sqrt(5)) * (index + 0.5);
    const radius = 8;
    return new THREE.Vector3(
      radius * Math.cos(theta) * Math.sin(phi),
      radius * Math.sin(theta) * Math.sin(phi),
      radius * Math.cos(phi)
    );
  }

  const cols = Math.ceil(Math.sqrt(count));
  const rows = Math.ceil(count / cols);
  const x = index % cols;
  const y = Math.floor(index / cols);
  return new THREE.Vector3(
    (x - (cols - 1) / 2) * spacing,
    (y - (rows - 1) / 2) * spacing,
    0
  );
}

function applyNodeTransform(mesh, index, value, instant = false) {
  const base = getLayoutPosition(index);
  const height = getHeightForValue(value);

  if (state.layout === "grid") {
    mesh.position.set(base.x, base.y, height / 2);
    mesh.rotation.set(0, 0, 0);
    mesh.scale.set(1, 1, height);
  } else if (state.layout === "cube") {
    mesh.position.copy(base);
    mesh.rotation.set(0, 0, 0);
    mesh.scale.setScalar(0.7 + height * 0.06);
  } else {
    const normal = base.clone().normalize();
    mesh.position.copy(base.clone().add(normal.multiplyScalar(height * 0.24)));
    mesh.scale.setScalar(0.5 + height * 0.05);
    mesh.lookAt(mesh.position.clone().add(normal));
  }

  mesh.material.color.copy(getColorForValue(value));
  mesh.material.emissive.copy(mesh.material.color).multiplyScalar(0.04);

  if (instant) {
    mesh.updateMatrix();
  }
}

function rebuildNodes() {
  for (const mesh of nodeMeshes) {
    scene.remove(mesh);
    mesh.geometry.dispose();
    mesh.material.dispose();
  }
  nodeMeshes = [];

  const geometry = getNodeGeometry();
  data.forEach((value, index) => {
    const mesh = new THREE.Mesh(geometry.clone(), baseMaterial.clone());
    applyNodeTransform(mesh, index, value, true);
    scene.add(mesh);
    nodeMeshes.push(mesh);
  });
}

function syncNodes() {
  nodeMeshes.forEach((mesh, index) => {
    applyNodeTransform(mesh, index, data[index], true);
  });
}

function getGridColumns(count = state.nodeCount) {
  return Math.ceil(Math.sqrt(count));
}

function touchIndex(index, strength = 1) {
  if (!Number.isInteger(index) || index < 0 || index >= nodePulseState.length) return;
  const now = performance.now();
  const pulseMs = 80 + ((101 - state.speed) * 2.4);
  nodePulseState[index] = {
    startedAt: now,
    until: now + pulseMs,
    strength: Math.max(nodePulseState[index]?.strength ?? 0, strength),
  };
}

function spreadGridTrail(indices = []) {
  if (state.layout !== "grid") return;
  const cols = getGridColumns();
  for (const index of indices) {
    if (!Number.isInteger(index) || index < 0) continue;
    const rowStart = Math.floor(index / cols) * cols;
    const rowEnd = Math.min(rowStart + cols, state.nodeCount);

    for (let i = rowStart; i < rowEnd; i++) {
      if (i > index) break;
      const progress = index === rowStart ? 1 : (i - rowStart) / Math.max(1, index - rowStart);
      const strength = 0.18 + (0.42 * progress);
      touchIndex(i, strength);
    }
  }
}

function highlightIndices(indices = [], kind = "focus") {
  const valid = indices.filter((value) => Number.isInteger(value) && value >= 0);
  const strength = kind === "move" ? 1 : 0.8;
  valid.forEach((index) => touchIndex(index, strength));
  spreadGridTrail(valid);

  if (valid.length > 0) {
    playNote(data[valid[0]], kind === "move");
  }
}

function updateNodeGlow(now) {
  nodeMeshes.forEach((mesh, index) => {
    const value = data[index];
    const color = getColorForValue(value);
    const pulse = nodePulseState[index];
    const duration = pulse ? Math.max(1, pulse.until - pulse.startedAt) : 1;
    const remaining = pulse ? pulse.until - now : 0;
    const intensity = remaining > 0
      ? Math.max(0, (remaining / duration) * pulse.strength)
      : 0;

    mesh.material.color.copy(color);
    mesh.material.emissive.copy(color).multiplyScalar(0.04 + intensity * 0.72);
  });
}

async function animateSwap(indexA, indexB) {
  if (indexA === indexB || !nodeMeshes[indexA] || !nodeMeshes[indexB]) {
    syncNodes();
    return;
  }

  const meshA = nodeMeshes[indexA];
  const meshB = nodeMeshes[indexB];
  const startA = meshA.position.clone();
  const startB = meshB.position.clone();
  const duration = Math.max(14, 88 - state.speed * 0.66);
  const start = performance.now();

  await new Promise((resolve) => {
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      meshA.position.lerpVectors(startA, startB, eased);
      meshB.position.lerpVectors(startB, startA, eased);
      if (t < 1) {
        requestAnimationFrame(tick);
      } else {
        resolve();
      }
    };
    requestAnimationFrame(tick);
  });

  [nodeMeshes[indexA], nodeMeshes[indexB]] = [nodeMeshes[indexB], nodeMeshes[indexA]];
  syncNodes();
}

function updateHud() {
  const algo = algorithms[state.algorithmKey];
  const sortModeLabel = state.sortCriterion.toUpperCase();
  ui.nodeCountValue.textContent = String(state.nodeCount);
  ui.speedValue.textContent = String(state.speed);
  ui.spacingValue.textContent = state.spacing.toFixed(2);
  ui.elevationValue.textContent = state.elevation.toFixed(2);
  ui.statusValue.textContent = state.playing ? "RUNNING" : "IDLE";
  ui.stepValue.textContent = String(state.stepCount);
  ui.compareValue.textContent = state.compareLabel;
  ui.phaseValue.textContent = state.phaseLabel;
  const criterionLabel = state.activeCriterion.toUpperCase();
  const fullAlgoName = `${algo?.name ?? state.algorithmKey} / ${criterionLabel}`;

  ui.metaAlgorithm.textContent = fullAlgoName;
  ui.metaLayout.textContent = state.layout.toUpperCase();
  ui.metaShape.textContent = state.shape.toUpperCase();
  ui.timelineLabel.textContent = state.contextLabel;
  ui.progressBar.style.width = `${Math.min(100, (state.stepCount / Math.max(1, state.nodeCount * 8)) * 100)}%`;
  ui.playBtn.textContent = state.playing ? "Pause" : "Play";
  ui.muteBtn.textContent = state.isMuted ? "Muted" : "Mute";
  ui.fullscreenBtn.textContent = state.immersive ? "Exit" : "Full";
  ui.hudAlgorithm.textContent = fullAlgoName;
  ui.hudStep.textContent = state.phaseLabel;
  ui.hudContext.textContent = state.contextLabel;
  ui.hudDetail.textContent = state.compareLabel === "-" ? "-" : state.compareLabel;
  ui.sortCriterionNote.textContent = state.sortCriterion === "all"
    ? "All은 Height 정렬을 먼저 실행한 뒤, 같은 데이터로 Hue 정렬을 한 번만 이어서 실행합니다."
    : `${sortModeLabel} 기준으로 다음 실행이 시작됩니다. 선택만으로는 즉시 재정렬되지 않습니다.`;
}

function createPhaseTracker(algorithmKey) {
  return {
    algorithmKey,
    phaseNumber: 1,
    detail: "None",
    lastFocus: [],
  };
}

function updateImplicitPhase(tracker, event) {
  const [left = -1, right = -1] = event.indices;
  const [prevLeft = -1, prevRight = -1] = tracker.lastFocus;

  if (tracker.algorithmKey === "bubbleSort" || tracker.algorithmKey === "cocktailShakerSort") {
    if (left === 0 && right === 1 && prevLeft > 0) {
      tracker.phaseNumber += 1;
    }
    tracker.detail = `n-${tracker.phaseNumber}`;
  } else if (tracker.algorithmKey === "selectionSort") {
    if (right >= 0 && prevRight >= 0 && right < prevRight) {
      tracker.phaseNumber += 1;
    }
    tracker.detail = `Select ${tracker.phaseNumber}`;
  } else if (tracker.algorithmKey === "insertionSort") {
    if (right > prevRight && prevRight >= 0) {
      tracker.phaseNumber += 1;
    }
    tracker.detail = `Insert ${Math.min(state.nodeCount, tracker.phaseNumber + 1)}`;
  } else {
    tracker.detail = tracker.detail || "None";
  }

  tracker.lastFocus = [...event.indices];
}

function formatPhaseLabel(event) {
  const phaseNumber = Number.parseInt(
    event?.meta?.phaseNumber
      ?? (String(event?.label || "").match(/(\d+)/)?.[1] ?? ""),
    10
  );
  return Number.isFinite(phaseNumber) ? `Phase ${phaseNumber}` : "Phase";
}

function formatPhaseDetail(event) {
  const context = String(event?.context || "").trim();
  if (context) {
    const normalized = context.toUpperCase();
    if (normalized.includes("ONES")) return "1's digit";
    if (normalized.includes("TENS")) return "10's digit";
    if (normalized.includes("HUNDREDS")) return "100's digit";
    return context.toLowerCase();
  }
  const label = String(event?.label || "").trim();
  return label || "-";
}

function calcPhaseDisplay(tracker, event) {
  if (event.kind === "phase") {
    const phaseNumber = Number.parseInt(
      event?.meta?.phaseNumber
        ?? (String(event?.label || "").match(/(\d+)/)?.[1] ?? ""),
      10
    );
    tracker.phaseNumber = Number.isFinite(phaseNumber) ? phaseNumber : tracker.phaseNumber;
    tracker.detail = formatPhaseDetail(event);
    return {
      label: `${formatPhaseLabel(event)}: ${tracker.detail}`,
      detail: tracker.detail,
    };
  }

  if (event.kind === "focus" || event.kind === "move") {
    updateImplicitPhase(tracker, event);
  }

  return {
    label: tracker.detail && tracker.detail !== "None"
      ? `Phase ${tracker.phaseNumber}: ${tracker.detail}`
      : `Phase ${tracker.phaseNumber}`,
    detail: tracker.detail || "None",
  };
}

async function waitWithCancel(ms, sessionId) {
  const startedAt = performance.now();
  while ((performance.now() - startedAt) < ms) {
    if (sessionId !== sortSession) return false;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  return true;
}

function setImmersive(nextValue) {
  state.immersive = nextValue;
  document.body.classList.toggle("immersive", nextValue);
  updateHud();
}

function showAnnouncement(title, detail = "", kicker = "Sort 3D", durationMs = 1400) {
  if (!state.showStartMessage) return;
  if (announceTimeoutId) {
    clearTimeout(announceTimeoutId);
    announceTimeoutId = null;
  }

  ui.announceKicker.textContent = kicker;
  ui.announceTitle.textContent = title;
  ui.announceDetail.textContent = detail;
  ui.announce.classList.add("visible");

  announceTimeoutId = window.setTimeout(() => {
    ui.announce.classList.remove("visible");
    announceTimeoutId = null;
  }, durationMs);
}

async function runSort() {
  const sessionId = ++sortSession;
  const phaseTracker = createPhaseTracker(state.algorithmKey);
  const algorithmName = algorithms[state.algorithmKey]?.name ?? state.algorithmKey;
  const isAllFirstStage = state.sortCriterion === "all" && state.activeCriterion === "height";
  state.playing = true;
  if (state.sortCriterion !== "all") {
    state.activeCriterion = state.sortCriterion;
  } else if (state.activeCriterion !== "height" && state.activeCriterion !== "hue") {
    state.activeCriterion = "height";
  }
  runStartedAt = performance.now();
  if (isAllFirstStage) {
    showAnnouncement(
      `Starting ${algorithmName}`,
      "using height and color",
      "Sort 3D",
      2600
    );
    const canContinue = await waitWithCancel(1500, sessionId);
    if (!canContinue || sessionId !== sortSession) return;
  }
  if (state.sortCriterion !== "all") {
    showAnnouncement(
      `Starting ${algorithmName}`,
      `sort by ${state.activeCriterion}`
    );
  } else {
    showAnnouncement(
      `Starting ${algorithmName}`,
      `sort by ${state.activeCriterion}`
    );
  }
  updateHud();

  const chosenCriterion = state.sortCriterion === "all"
    ? state.activeCriterion
    : state.sortCriterion;
  const runtime = getSortRuntime(chosenCriterion);
  const generator = algorithms[state.algorithmKey].generator(runtime.workingArray);
  for await (const rawStep of generator) {
    if (sessionId !== sortSession || !state.playing) break;

    data = runtime.toDisplayData(runtime.workingArray);
    const event = normalizeSortStep(rawStep);
    const phaseDisplay = calcPhaseDisplay(phaseTracker, event);
    state.stepCount += 1;
    state.phaseLabel = phaseDisplay.label;
    if (event.kind === "phase") {
      state.contextLabel = "PHASE";
      state.compareLabel = phaseDisplay.detail;
      highlightIndices([]);
    } else if (event.kind === "focus") {
      state.contextLabel = "SCAN";
      state.compareLabel = event.indices.length >= 2
        ? `${event.indices[0] + 1} ↔ ${event.indices[1] + 1}`
        : `${event.indices[0] + 1}`;
      highlightIndices(event.indices, "focus");
    } else if (event.kind === "move") {
      state.contextLabel = event.indices[0] === event.indices[1] ? "WRITE" : "MOVE";
      state.compareLabel = event.indices.length >= 2
        ? `${event.indices[0] + 1} ↔ ${event.indices[1] + 1}`
        : `${event.indices[0] + 1}`;
      highlightIndices(event.indices, "move");
      const [fromIndex = -1, toIndex = fromIndex] = event.indices;
      await animateSwap(fromIndex, toIndex);
    } else {
      state.contextLabel = "RUN";
    }

    updateHud();
    await new Promise((resolve) => setTimeout(resolve, Math.max(0, 60 - state.speed * 0.53)));
  }

  if (sessionId === sortSession) {
    data = runtime.toDisplayData(runtime.workingArray);
    state.playing = false;
    elapsedBeforePause = 0;
    state.contextLabel = "COMPLETE";
    highlightIndices([]);
    syncNodes();
    updateHud();

    if (state.sortCriterion === "all" && state.activeCriterion === "height") {
      state.contextLabel = "NEXT";
      state.compareLabel = "COLOR IN 2.0s";
      updateHud();

      const canContinue = await waitWithCancel(2000, sessionId);
      if (!canContinue || sessionId !== sortSession) return;

      state.compareLabel = "-";
      state.contextLabel = "READY";
      state.activeCriterion = "hue";
      await runSort();
      return;
    }

    if (state.sortCriterion === "all" && state.activeCriterion === "hue") {
      state.activeCriterion = "height";
      updateHud();
    }
  }
}

function populateAlgorithms() {
  Object.entries(algorithms).forEach(([key, algo]) => {
    const option = document.createElement("option");
    option.value = key;
    option.textContent = algo.name;
    ui.algorithmSelect.appendChild(option);
  });
  ui.algorithmSelect.value = state.algorithmKey;
}

function toggleLayout(nextLayout) {
  state.layout = nextLayout;
  ui.layoutButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.layout === nextLayout);
  });
  syncNodes();
  updateHud();
}

function toggleShape(nextShape) {
  state.shape = nextShape;
  ui.shapeButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.shape === nextShape);
  });
  rebuildNodes();
  updateHud();
}

function bindUi() {
  ui.algorithmSelect.addEventListener("change", () => {
    state.algorithmKey = ui.algorithmSelect.value;
    state.phaseLabel = "Phase 1";
    state.contextLabel = "READY";
    updateHud();
  });

  ui.sortCriterion.addEventListener("change", () => {
    const nextValue = ui.sortCriterion.value;
    state.sortCriterion = nextValue === "hue" || nextValue === "all" ? nextValue : "height";
    if (!state.playing) {
      state.activeCriterion = state.sortCriterion === "all" ? "height" : state.sortCriterion;
    }
    updateHud();
  });

  ui.showStartMessage.addEventListener("change", () => {
    state.showStartMessage = ui.showStartMessage.checked;
    if (!state.showStartMessage) {
      ui.announce.classList.remove("visible");
    }
  });

  ui.nodeCount.addEventListener("input", () => {
    state.nodeCount = Number.parseInt(ui.nodeCount.value, 10);
    buildAuxValues();
    resetData();
    rebuildNodes();
  });

  ui.speed.addEventListener("input", () => {
    state.speed = Number.parseInt(ui.speed.value, 10);
    updateHud();
  });

  ui.spacing.addEventListener("input", () => {
    state.spacing = Number.parseFloat(ui.spacing.value);
    syncNodes();
    updateHud();
  });

  ui.elevation.addEventListener("input", () => {
    state.elevation = Number.parseFloat(ui.elevation.value);
    syncNodes();
    updateHud();
  });

  ui.colorScheme.addEventListener("change", () => {
    state.colorScheme = ui.colorScheme.value in COLOR_SCHEMES
      ? ui.colorScheme.value
      : "aurora";
    applyColorScheme();
    syncNodes();
    updateHud();
  });

  ui.layoutButtons.forEach((button) => {
    button.addEventListener("click", () => toggleLayout(button.dataset.layout));
  });

  ui.shapeButtons.forEach((button) => {
    button.addEventListener("click", () => toggleShape(button.dataset.shape));
  });

  ui.shuffleBtn.addEventListener("click", () => {
    ensureAudio();
    sortSession += 1;
    state.playing = false;
    elapsedBeforePause = 0;
    state.activeCriterion = state.sortCriterion === "all" ? "height" : state.sortCriterion;
    buildAuxValues();
    resetData();
    syncNodes();
  });

  ui.resetBtn.addEventListener("click", () => {
    ensureAudio();
    sortSession += 1;
    state.playing = false;
    elapsedBeforePause = 0;
    state.activeCriterion = state.sortCriterion === "all" ? "height" : state.sortCriterion;
    resetData();
    syncNodes();
  });

  ui.playBtn.addEventListener("click", async () => {
    ensureAudio();
    if (state.playing) {
      elapsedBeforePause += performance.now() - runStartedAt;
      state.playing = false;
      sortSession += 1;
      updateHud();
      return;
    }
    await runSort();
  });

  ui.muteBtn.addEventListener("click", () => {
    ensureAudio();
    state.isMuted = !state.isMuted;
    updateVolume();
    updateHud();
  });

  ui.volSlider.addEventListener("input", () => {
    ensureAudio();
    updateVolume();
  });

  ui.fullscreenBtn.addEventListener("click", () => {
    setImmersive(!state.immersive);
  });

  ui.speedDownBtn.addEventListener("click", () => {
    state.speed = Math.max(1, state.speed - 10);
    ui.speed.value = String(state.speed);
    updateHud();
  });

  ui.speedUpBtn.addEventListener("click", () => {
    state.speed = Math.min(100, state.speed + 10);
    ui.speed.value = String(state.speed);
    updateHud();
  });

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && state.immersive) {
      setImmersive(false);
      return;
    }
    if (event.code === "Space") {
      event.preventDefault();
      ui.playBtn.click();
    }
  });
}

function animate(now) {
  requestAnimationFrame(animate);
  updateNodeGlow(now);
  if (state.playing) {
    const elapsed = elapsedBeforePause + (now - runStartedAt);
    const totalSeconds = Math.floor(elapsed / 1000);
    const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
    const seconds = String(totalSeconds % 60).padStart(2, "0");
    const hundredths = String(Math.floor((elapsed % 1000) / 10)).padStart(2, "0");
    ui.hudTimer.textContent = `${minutes}:${seconds}:${hundredths}`;
  }
  state.frameCount += 1;
  if (now - state.lastFpsSample > 500) {
    const fps = Math.round((state.frameCount * 1000) / (now - state.lastFpsSample));
    ui.fpsLabel.textContent = `${fps} FPS`;
    state.frameCount = 0;
    state.lastFpsSample = now;
  }
  controls.update();
  renderer.render(scene, camera);
}

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

populateAlgorithms();
bindUi();
ui.showStartMessage.checked = state.showStartMessage;
ui.colorScheme.value = state.colorScheme;
applyColorScheme();
buildAuxValues();
resetData();
rebuildNodes();
updateHud();
animate(performance.now());
