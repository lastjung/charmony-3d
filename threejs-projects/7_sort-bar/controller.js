import { dataArray, highlightComparedIndices, updateScaleAndBars, initAudio, setSortMode, getSortMode, setVisualizationPhase, animateSwapIndices, setNodeCount, getNodeCount } from './visualizer.js';
import { algorithms } from './algorithm/index.js';
import { normalizeSortStep } from './sortEvents.js';

let fsmState = 'STOPPED';
let sortLoopPromise = null;
let cancelRequested = false;
let sortSessionId = 0;
let currentAlgorithm = 'bubbleSort';
let speed = 120;
let countdownSeconds = 3;
let countdownInterval = null;
let roundStartData = [];
let pausedAt = 0;
let elapsedBeforePause = 0;
let currentAllIndex = 0;

// New HUD Variables
let startTime = 0;
let stepCount = 0;
let totalStepsEstimate = 1;
let autoCycle = false;
let isMuted = false;
const SPEED_MIN = 1;
const SPEED_MAX = 200;
const ALL_MODE_EXCLUDED_ALGORITHMS = new Set(['slowSort', 'stoogeSort']);

// SVG Icons Constants
const SVG_PLAY = '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>';
const SVG_PAUSE = '<svg viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>';
const SVG_MUTE = '<svg viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>';
const SVG_MUTED = '<svg viewBox="0 0 24 24"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>';

let currentPassLabel = '';
let lastFocusIndices = [];
let implicitPassNumber = 1;
let resetElapsedOnNextSort = false;

const announceEl = document.getElementById('announce');
const announceKicker = document.getElementById('announce-kicker');
const announceTitle = document.getElementById('announce-title');
const announceDetail = document.getElementById('announce-detail');

function showAnnounce(title, detail = '', kicker = 'Sort Visualizer', duration = 1200) {
  if (!announceEl) return;
  announceKicker.textContent = kicker;
  announceTitle.textContent = title;
  announceDetail.textContent = detail;
  announceEl.classList.add('visible');
  
  if (duration > 0) {
    setTimeout(() => {
      announceEl.classList.remove('visible');
    }, duration);
  }
}

function hideAnnounce() {
  if (announceEl) announceEl.classList.remove('visible');
}

function getAllAlgorithmKeys() {
  return Object.keys(algorithms).filter((key) => !ALL_MODE_EXCLUDED_ALGORITHMS.has(key));
}

function isLastAlgorithmInAllMode() {
  const keys = getAllAlgorithmKeys();
  if (keys.length === 0) return true;
  return currentAlgorithm === 'all' && currentAllIndex >= keys.length - 1;
}

function getPlayingAlgorithm() {
  if (currentAlgorithm === 'all') {
    const keys = getAllAlgorithmKeys();
    return keys[currentAllIndex % keys.length];
  }
  return currentAlgorithm;
}

function updateHUDMeta() {
  const metaEl = document.getElementById('ui-meta');
  if (!metaEl) return;
  const playingKey = getPlayingAlgorithm();
  const name = algorithms[playingKey]?.name || playingKey;
  metaEl.innerHTML = `<span class="top-algorithm">${name}</span>`;
}

function setHUDStep(passLine, detailLine = '', kind = 'idle') {
  const hud = document.getElementById('top-pill-hud');
  const detailEl = document.getElementById('ui-detail');
  const contextEl = document.getElementById('ui-context');
  if (hud) hud.dataset.kind = kind;
  if (detailEl) detailEl.textContent = passLine;
  if (contextEl) contextEl.textContent = detailLine;
}

function formatDigitLabel(context) {
  const normalized = String(context || '').toUpperCase();
  if (normalized.includes('ONES')) return "1's digit";
  if (normalized.includes('TENS')) return "10's digit";
  if (normalized.includes('HUNDREDS')) return "100's digit";
  return context ? context.toLowerCase() : 'values';
}

function isBubbleFamily(name) {
  return ['bubbleSort', 'cocktailShakerSort', 'oddEvenSort'].includes(name);
}

function getImplicitPassLabel(event) {
  const nodeCount = dataArray.length;
  const playingKey = getPlayingAlgorithm();

  if (playingKey === 'radixSort') {
    return currentPassLabel || `Pass ${implicitPassNumber}: values`;
  }

  if (playingKey === 'bubbleSort' && event.indices.length >= 2) {
    const [left, right] = event.indices;
    if (left === 0 && right === 1 && lastFocusIndices[0] > 0) {
      implicitPassNumber++;
    }
    const nodes = Math.max(1, nodeCount - (implicitPassNumber - 1));
    return `Pass ${implicitPassNumber}: ${nodes} nodes`;
  }

  if (currentAlgorithm === 'selectionSort' && event.indices.length >= 2) {
    const right = event.indices[1];
    if (lastFocusIndices.length >= 2 && right < lastFocusIndices[1]) {
      implicitPassNumber++;
    }
    const nodes = Math.max(1, nodeCount - (implicitPassNumber - 1));
    return `Pass ${implicitPassNumber}: ${nodes} nodes`;
  }

  if (currentAlgorithm === 'insertionSort' && event.indices.length >= 2) {
    const right = event.indices[1];
    if (lastFocusIndices.length >= 2 && right > lastFocusIndices[1]) {
      implicitPassNumber++;
    }
    return `Pass ${implicitPassNumber}: ${Math.min(nodeCount, implicitPassNumber + 1)} nodes`;
  }

  if (isBubbleFamily(playingKey)) {
    const nodes = Math.max(1, nodeCount - (implicitPassNumber - 1));
    return `Pass ${implicitPassNumber}: ${nodes} nodes`;
  }

  return currentPassLabel || `Pass ${implicitPassNumber}: ${nodeCount} nodes`;
}

function getDetailLabel(event) {
  if (event.kind === 'focus') {
    if (event.indices.length >= 2) {
      return `Compare ${event.indices[0] + 1} ↔ ${event.indices[1] + 1}`;
    }
    if (event.indices.length === 1) {
      return `Scan ${event.indices[0] + 1} / ${dataArray.length}`;
    }
  }

  if (event.kind === 'move') {
    const fromIndex = event.indices[0] ?? -1;
    const toIndex = event.indices[1] ?? fromIndex;
    if (fromIndex === toIndex) {
      return `Write index ${fromIndex + 1}`;
    }
    return `Swap ${fromIndex + 1} ↔ ${toIndex + 1}`;
  }

  return 'Ready';
}

function resetPassTracking() {
  currentPassLabel = `Pass 1: ${dataArray.length} nodes`;
  implicitPassNumber = 1;
  lastFocusIndices = [];
}

function scheduleElapsedReset() {
  elapsedBeforePause = 0;
  startTime = 0;
  pausedAt = 0;
  resetElapsedOnNextSort = false;
}

function updateFSMDisplay() {
  const el = document.getElementById('fsmStateDisplay');
  if (el) el.textContent = fsmState;
  updateHUDMeta();
}

function updateAlgorithmDescription() {
  const playingKey = getPlayingAlgorithm();
  const desc = algorithms[playingKey]?.description || '';
  document.getElementById('algorithmDescription').textContent = desc;
}

function updateStartPauseButton() {
  const btn = document.getElementById('startPauseBtn');
  if (!btn) return;
  if (fsmState === 'SORTING') {
    btn.innerHTML = SVG_PAUSE;
    btn.classList.add('active');
  } else {
    btn.innerHTML = SVG_PLAY;
    btn.classList.remove('active');
  }
}

function formatTime(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const hundredths = Math.floor((ms % 1000) / 10);
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}:${hundredths.toString().padStart(2, '0')}`;
}

function updateHUD() {
  const timerEl = document.getElementById('ui-timer');
  if (!timerEl) return;
  
  let totalMs = elapsedBeforePause;
  if (fsmState === 'SORTING') {
    totalMs += (Date.now() - startTime);
  }
  
  // Calculate ETA for current algorithm
  const currentDelay = getStepDelay();
  // Crude estimation: steps remaining * (delay + small rendering overhead)
  const remainingSteps = Math.max(0, totalStepsEstimate - stepCount);
  const estRemainingMs = remainingSteps * (currentDelay + 10); 
  const totalExpectedMs = totalMs + estRemainingMs;

  const currentStr = formatTime(totalMs);
  const etaStr = formatTime(totalExpectedMs);
  
  timerEl.innerHTML = `${currentStr} <span style="opacity: 0.5; font-size: 0.85em; margin-left: 4px;">/ ETA ${etaStr}</span>`;
}

function getStepDelay() {
  return Math.max(0, 160 - speed * 1.6);
}

function getSwapDuration() {
  return Math.max(8, 160 - speed * 1.2);
}

function getAlgorithmGenerator() {
  const playingKey = getPlayingAlgorithm();
  const algo = algorithms[playingKey];
  const n = dataArray.length;
  if (algo.isSlow) totalStepsEstimate = n * n * 0.5;
  else totalStepsEstimate = n * Math.log2(n) * 4;
  stepCount = 0;
  roundStartData = [...dataArray];
  resetPassTracking();
  return algo.generator(dataArray);
}

async function sortLoop() {
  const sessionId = sortSessionId;
  if (resetElapsedOnNextSort || currentAlgorithm !== 'all') {
    scheduleElapsedReset();
  }
  const sorter = getAlgorithmGenerator();
  pausedAt = 0;
  startTime = Date.now();
  
  const playingKey = getPlayingAlgorithm();
  const algoName = algorithms[playingKey]?.name || playingKey;
  showAnnounce(algoName, 'Starting sort', 'Algorithm Engine', 1000);
  
  setHUDStep(currentPassLabel, 'Starting sort', 'phase');
  for await (const step of sorter) {
    if (cancelRequested || sessionId !== sortSessionId) break;
    if (fsmState === 'PAUSED') {
      while (fsmState === 'PAUSED' && !cancelRequested) { await new Promise(r => setTimeout(r, 50)); }
      if (cancelRequested || sessionId !== sortSessionId) break;
    }
    const event = normalizeSortStep(step);
    stepCount++;
    if (event.kind === 'phase') {
      setVisualizationPhase(step);
      const phaseMatch = String(event.label || '').match(/(\d+)/);
      const passNumber = phaseMatch ? Number.parseInt(phaseMatch[1], 10) : implicitPassNumber;
      implicitPassNumber = Number.isFinite(passNumber) ? passNumber : implicitPassNumber;
      currentPassLabel = `Pass ${implicitPassNumber}: ${formatDigitLabel(event.context)}`;
      setHUDStep(currentPassLabel, 'Scan values', 'phase');
    } else if (event.kind === 'focus') {
      currentPassLabel = getImplicitPassLabel(event);
      lastFocusIndices = [...event.indices];
      if (event.indices.length >= 2) {
        highlightComparedIndices(event.indices[0], event.indices[1]);
        setHUDStep(currentPassLabel, getDetailLabel(event), 'compare');
      } else if (event.indices.length === 1) {
        highlightComparedIndices(event.indices[0], event.indices[0]);
        setHUDStep(currentPassLabel, getDetailLabel(event), 'compare');
      }
    } else if (event.kind === 'move') {
      const fromIndex = event.indices[0] ?? -1;
      const toIndex = event.indices[1] ?? fromIndex;
      await animateSwapIndices(fromIndex, toIndex, getSwapDuration());
      currentPassLabel = getImplicitPassLabel(event);
      setHUDStep(currentPassLabel, getDetailLabel(event), 'swap');
    }
    updateHUD();
    await new Promise(r => setTimeout(r, getStepDelay()));
  }
  highlightComparedIndices(-1, -1);
  setVisualizationPhase(null);
  sortLoopPromise = null;
  if (!cancelRequested) {
    // Record elapsed time for the round before moving to next state
    elapsedBeforePause += (Date.now() - startTime);
    startTime = 0;

    setHUDStep(currentPassLabel, 'Sort complete', 'phase');
    if (currentAlgorithm === 'all' && isLastAlgorithmInAllMode()) {
      transitionTo('STOPPED');
    } else if (autoCycle || currentAlgorithm === 'all') {
      transitionTo('COUNTDOWN');
    } else {
      transitionTo('STOPPED');
    }
  }
}

function transitionTo(newState) {
  if (countdownInterval) {
    clearInterval(countdownInterval);
    countdownInterval = null;
  }

  const previousState = fsmState;
  fsmState = newState;
  updateFSMDisplay();
  updateStartPauseButton();
  if (newState === 'STOPPED') {
    pausedAt = 0;
    elapsedBeforePause = 0;
    const cdEl = document.getElementById('countdownDisplay');
    if (cdEl) cdEl.textContent = '';
    setVisualizationPhase(null);
    setHUDStep(`Pass 1: ${dataArray.length} nodes`, 'Ready', 'idle');
  }
  if (newState === 'SORTING') {
    const isResuming = previousState === 'PAUSED' && sortLoopPromise != null && pausedAt > 0;
    cancelRequested = false;
    if (isResuming) {
      // startTime should be reset to current to only count active time
      startTime = Date.now();
      pausedAt = 0;
    } else if (!sortLoopPromise) {
      sortSessionId++;
      sortLoopPromise = sortLoop();
    }
    const cdEl = document.getElementById('countdownDisplay');
    if (cdEl) cdEl.textContent = '';
  }
  if (newState === 'PAUSED') {
    if (startTime > 0) {
      elapsedBeforePause += (Date.now() - startTime);
      startTime = 0;
    }
    pausedAt = Date.now();
    updateHUD();
    setHUDStep(currentPassLabel || `Pass 1: ${dataArray.length} nodes`, 'Paused', 'phase');
  }
  if (newState === 'STOPPING') {
    cancelRequested = true;
    sortSessionId++;
    setHUDStep(currentPassLabel || `Pass 1: ${dataArray.length} nodes`, 'Stopping', 'phase');
    if (sortLoopPromise) {
      sortLoopPromise.then(() => { cancelRequested = false; transitionTo('SORTING'); });
    } else { cancelRequested = false; transitionTo('SORTING'); }
  }
  if (newState === 'COUNTDOWN') {
    let sl = countdownSeconds;
    const cdEl = document.getElementById('countdownDisplay');
    
    // Get next algorithm name for announcement
    const keys = getAllAlgorithmKeys();
    const nextIdx = (currentAllIndex + 1) % keys.length;
    const nextKey = currentAlgorithm === 'all' ? keys[nextIdx] : currentAlgorithm;
    const nextName = algorithms[nextKey]?.name || nextKey;

    const updateAnnouncement = (seconds) => {
      showAnnounce('', `${nextName} in ${seconds}s`, 'Sequence Transition', 0);
    };

    if (cdEl) cdEl.textContent = `NEXT: ${sl}s`;
    setHUDStep(currentPassLabel || `Pass 1: ${dataArray.length} nodes`, `Next in ${sl}s`, 'phase');
    updateAnnouncement(sl);

    countdownInterval = setInterval(() => {
      sl--;
      if (sl > 0) {
        if (cdEl) cdEl.textContent = `NEXT: ${sl}s`;
        setHUDStep(currentPassLabel || `Pass 1: ${dataArray.length} nodes`, `Next in ${sl}s`, 'phase');
        updateAnnouncement(sl);
      }
      else { 
        clearInterval(countdownInterval); 
        hideAnnounce();
        reshuffle(); 
        pickNext(); 
        transitionTo('SORTING'); 
      }
    }, 1000);
  }
}

function randomizeData() {
  for (let i = dataArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [dataArray[i], dataArray[j]] = [dataArray[j], dataArray[i]];
  }
}

function syncBarsAfterDataChange() {
  updateScaleAndBars();
  stepCount = 0;
  updateHUD();
}

function reshuffle() {
  randomizeData();
  roundStartData = [...dataArray];
  syncBarsAfterDataChange();
}

function restoreRoundStartData() {
  if (roundStartData.length === dataArray.length) {
    dataArray.splice(0, dataArray.length, ...roundStartData);
  }
  syncBarsAfterDataChange();
}

function pickNext() {
  const sel = document.getElementById('algorithmSelect');
  if (currentAlgorithm === 'all') {
    currentAllIndex++;
    updateHUDMeta();
    updateAlgorithmDescription();
    return;
  }
  const nextIdx = (sel.selectedIndex + 1) % sel.options.length;
  sel.selectedIndex = nextIdx;
  currentAlgorithm = sel.options[nextIdx].value;
  updateAlgorithmDescription();
}

export function initController() {
  const sel = document.getElementById('algorithmSelect');
  const nodeCountSlider = document.getElementById('nodeCountSlider');
  const nodeVal = document.getElementById('node-val');
  const speedSlider = document.getElementById('speedSlider');
  const spSub = document.getElementById('sp-val');
  const sortModeSelect = document.getElementById('sortModeSelect');
  const muteBtn = document.getElementById('ui-mute');
  const volumeSlider = document.getElementById('ui-vol');
  const windowFullscreenBtn = document.getElementById('apple-fs');
  sel.innerHTML = '';
  const allOpt = document.createElement('option');
  allOpt.value = 'all';
  allOpt.textContent = 'All Algorithms';
  sel.appendChild(allOpt);

  for (const [k, v] of Object.entries(algorithms)) {
    const o = document.createElement('option'); o.value = k; o.textContent = v.name; sel.appendChild(o);
  }
  
  sel.value = currentAlgorithm;
  if (nodeCountSlider) {
    setNodeCount(nodeCountSlider.value);
    nodeCountSlider.value = String(getNodeCount());
  }
  if (nodeVal) nodeVal.textContent = String(getNodeCount());
  if (sortModeSelect) sortModeSelect.value = getSortMode();
  if (speedSlider) {
    speedSlider.max = String(SPEED_MAX);
    setSp(speedSlider.value);
  } else if (spSub) {
    spSub.textContent = String(speed);
  }
  if (muteBtn) {
    muteBtn.dataset.muted = String(isMuted);
    muteBtn.setAttribute('aria-pressed', String(isMuted));
  }
  if (windowFullscreenBtn) {
    windowFullscreenBtn.dataset.expanded = 'false';
    windowFullscreenBtn.setAttribute('aria-pressed', 'false');
  }

  document.getElementById('startPauseBtn').addEventListener('click', () => {
    initAudio(); 
    if (fsmState === 'STOPPED') transitionTo('SORTING');
    else if (fsmState === 'SORTING') transitionTo('PAUSED');
    else if (fsmState === 'PAUSED') transitionTo('SORTING');
  });

  const stopCurrentSort = () => {
    cancelRequested = true;
    sortSessionId++;
  };

  const fullReset = () => {
    stopCurrentSort();
    reshuffle();
    transitionTo('STOPPED');
  };

  const partialReset = () => {
    stopCurrentSort();
    restoreRoundStartData();
    transitionTo('STOPPED');
  };

  document.getElementById('ui-reset').addEventListener('click', partialReset);
  document.getElementById('ui-reshuffle').addEventListener('click', fullReset);
  document.getElementById('ui-next').addEventListener('click', () => { pickNext(); if (fsmState !== 'STOPPED') transitionTo('STOPPING'); });
  sortModeSelect?.addEventListener('change', (e) => {
    stopCurrentSort();
    setSortMode(e.target.value);
    roundStartData = [...dataArray];
    transitionTo('STOPPED');
  });

  const applyNodeCount = (value) => {
    const nextCount = Number.parseInt(value, 10);
    if (!Number.isFinite(nextCount)) return;
    stopCurrentSort();
    setNodeCount(nextCount);
    roundStartData = [...dataArray];
    if (nodeCountSlider) nodeCountSlider.value = String(getNodeCount());
    if (nodeVal) nodeVal.textContent = String(getNodeCount());
    transitionTo('STOPPED');
  };

  function setSp(v) {
    speed = Math.max(SPEED_MIN, Math.min(SPEED_MAX, parseInt(v, 10)));
    if (speedSlider) speedSlider.value = String(speed);
    if (spSub) spSub.textContent = String(speed);
  }
  const setWindowFullscreen = (expanded) => {
    document.body.classList.toggle('window-fullscreen', expanded);
    if (windowFullscreenBtn) {
      windowFullscreenBtn.dataset.expanded = String(expanded);
      windowFullscreenBtn.setAttribute('aria-pressed', String(expanded));
      windowFullscreenBtn.classList.toggle('active', expanded);
      windowFullscreenBtn.title = expanded ? 'Exit Window Full Screen' : 'Window Full Screen';
    }
  };

  nodeCountSlider?.addEventListener('input', (e) => {
    if (nodeVal) nodeVal.textContent = e.target.value;
    applyNodeCount(e.target.value);
  });
  nodeCountSlider?.addEventListener('change', (e) => applyNodeCount(e.target.value));

  speedSlider?.addEventListener('input', (e) => setSp(e.target.value));
  document.getElementById('ui-up').addEventListener('click', () => setSp(Math.min(SPEED_MAX, speed + 20)));
  document.getElementById('ui-down').addEventListener('click', () => setSp(Math.max(SPEED_MIN, speed - 20)));
  windowFullscreenBtn?.addEventListener('click', () => { 
    setWindowFullscreen(!document.body.classList.contains('window-fullscreen'));
  });

  muteBtn?.addEventListener('click', () => {
    isMuted = !isMuted;
    muteBtn.innerHTML = isMuted ? SVG_MUTED : SVG_MUTE;
    muteBtn.dataset.muted = String(isMuted);
    muteBtn.setAttribute('aria-pressed', String(isMuted));
    // 시각적 피드백을 위해 볼륨 슬라이더 이벤트 발생
    volumeSlider?.dispatchEvent(new Event('input'));
  });

  sel.addEventListener('change', (e) => { 
    currentAlgorithm = e.target.value; 
    currentAllIndex = 0; // Reset index when switching to/from 'all'
    resetElapsedOnNextSort = true;
    updateAlgorithmDescription(); 
    updateFSMDisplay(); 
    if (fsmState !== 'STOPPED') transitionTo('STOPPING'); 
    else updateHUD();
  });

  let sHeld = false;
  window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyS') sHeld = true;
    if (e.code === 'Escape') { 
      setWindowFullscreen(false);
      document.getElementById('apple-hud').classList.remove('hud-hidden');
      document.getElementById('apple-side').classList.remove('side-hidden');
    }
    if (e.code === 'Space') { document.getElementById('startPauseBtn').click(); e.preventDefault(); }
    if (sHeld && e.code === 'Digit1') {
      autoCycle = !autoCycle;
      document.getElementById('apple-hud').style.boxShadow = autoCycle ? '0 0 20px rgba(255, 77, 77, 0.4)' : '';
    }
  });
  window.addEventListener('keyup', (e) => { if (e.code === 'KeyS') sHeld = false; });

  updateAlgorithmDescription();
  updateFSMDisplay();
  updateHUD();
  updateStartPauseButton();
  transitionTo('STOPPED');
}
