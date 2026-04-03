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

// New HUD Variables
let startTime = 0;
let stepCount = 0;
let totalStepsEstimate = 1;
let autoCycle = false;
let isMuted = false;
const SPEED_MIN = 1;
const SPEED_MAX = 200;

// SVG Icons Constants
const SVG_PLAY = '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>';
const SVG_PAUSE = '<svg viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>';
const SVG_MUTE = '<svg viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>';
const SVG_MUTED = '<svg viewBox="0 0 24 24"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>';

function formatStateLabel(state) {
  const labels = {
    STOPPED: 'Stopped',
    SORTING: 'Sorting',
    PAUSED: 'Paused',
    STOPPING: 'Stopping',
    COUNTDOWN: 'Next Up',
  };
  return labels[state] || state;
}

function updateHUDMeta() {
  const metaEl = document.getElementById('ui-meta');
  if (!metaEl) return;
  const name = algorithms[currentAlgorithm]?.name || currentAlgorithm;
  metaEl.innerHTML = `<span class="top-algorithm">${name}</span><span class="top-state">${formatStateLabel(fsmState)}</span>`;
}

function setHUDStep(detail, context = '', kind = 'idle') {
  const hud = document.getElementById('top-pill-hud');
  const detailEl = document.getElementById('ui-detail');
  const contextEl = document.getElementById('ui-context');
  if (hud) hud.dataset.kind = kind;
  if (detailEl) detailEl.textContent = detail;
  if (contextEl) contextEl.textContent = context;
}

function updateFSMDisplay() {
  const el = document.getElementById('fsmStateDisplay');
  if (el) el.textContent = fsmState;
  updateHUDMeta();
}

function updateAlgorithmDescription() {
  const desc = algorithms[currentAlgorithm]?.description || '';
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
  if (fsmState === 'SORTING') {
    timerEl.textContent = formatTime(elapsedBeforePause + (Date.now() - startTime));
  } else if (fsmState === 'PAUSED') {
    timerEl.textContent = formatTime(elapsedBeforePause);
  }
}

function getStepDelay() {
  return Math.max(0, 160 - speed * 1.6);
}

function getSwapDuration() {
  return Math.max(8, 160 - speed * 1.2);
}

function getAlgorithmGenerator() {
  const algo = algorithms[currentAlgorithm];
  const n = dataArray.length;
  if (algo.isSlow) totalStepsEstimate = n * n * 0.5;
  else totalStepsEstimate = n * Math.log2(n) * 4;
  stepCount = 0;
  roundStartData = [...dataArray];
  return algo.generator(dataArray);
}

async function sortLoop() {
  const sessionId = sortSessionId;
  const sorter = getAlgorithmGenerator();
  elapsedBeforePause = 0;
  pausedAt = 0;
  startTime = Date.now();
  setHUDStep('SORT START', algorithms[currentAlgorithm]?.name || currentAlgorithm, 'phase');
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
      setHUDStep(event.label || 'PHASE', event.context || '', 'phase');
    } else if (event.kind === 'focus') {
      if (event.indices.length >= 2) {
        highlightComparedIndices(event.indices[0], event.indices[1]);
        setHUDStep(
          event.label || 'FOCUS',
          `${event.indices[0] + 1} ↔ ${event.indices[1] + 1}`,
          'compare'
        );
      } else if (event.indices.length === 1) {
        highlightComparedIndices(event.indices[0], event.indices[0]);
        setHUDStep(event.label || 'FOCUS', `BAR ${event.indices[0] + 1}`, 'compare');
      }
    } else if (event.kind === 'move') {
      const fromIndex = event.indices[0] ?? -1;
      const toIndex = event.indices[1] ?? fromIndex;
      await animateSwapIndices(fromIndex, toIndex, getSwapDuration());
      const label = fromIndex === toIndex ? (event.label || 'WRITE') : (event.label || 'SWAP');
      setHUDStep(label, `BARS ${fromIndex + 1} ↔ ${toIndex + 1}`, 'swap');
    }
    updateHUD();
    await new Promise(r => setTimeout(r, getStepDelay()));
  }
  highlightComparedIndices(-1, -1);
  setVisualizationPhase(null);
  sortLoopPromise = null;
  if (!cancelRequested) {
    setHUDStep('SORT COMPLETE', 'WAITING FOR NEXT ACTION', 'phase');
    if (autoCycle) transitionTo('COUNTDOWN');
    else transitionTo('STOPPED');
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
    setHUDStep('READY', 'WAITING FOR START', 'idle');
  }
  if (newState === 'SORTING') {
    const isResuming = previousState === 'PAUSED' && sortLoopPromise != null && pausedAt > 0;
    cancelRequested = false;
    if (isResuming) {
      elapsedBeforePause += Date.now() - pausedAt;
      pausedAt = 0;
    } else if (!sortLoopPromise) {
      sortSessionId++;
      sortLoopPromise = sortLoop();
    }
    const cdEl = document.getElementById('countdownDisplay');
    if (cdEl) cdEl.textContent = '';
  }
  if (newState === 'PAUSED') {
    if (pausedAt === 0) {
      pausedAt = Date.now();
    }
    updateHUD();
    setHUDStep('PAUSED', 'PRESS PLAY TO RESUME', 'phase');
  }
  if (newState === 'STOPPING') {
    cancelRequested = true;
    sortSessionId++;
    setHUDStep('STOPPING', 'FINISHING CURRENT STEP', 'phase');
    if (sortLoopPromise) {
      sortLoopPromise.then(() => { cancelRequested = false; transitionTo('SORTING'); });
    } else { cancelRequested = false; transitionTo('SORTING'); }
  }
  if (newState === 'COUNTDOWN') {
    let sl = countdownSeconds;
    const cdEl = document.getElementById('countdownDisplay');
    if (cdEl) cdEl.textContent = `NEXT: ${sl}s`;
    setHUDStep('AUTO NEXT', `RESTARTS IN ${sl} SECONDS`, 'phase');
    countdownInterval = setInterval(() => {
      sl--;
      if (sl > 0) {
        if (cdEl) cdEl.textContent = `NEXT: ${sl}s`;
        setHUDStep('AUTO NEXT', `RESTARTS IN ${sl} SECONDS`, 'phase');
      }
      else { clearInterval(countdownInterval); reshuffle(); pickNext(); transitionTo('SORTING'); }
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

  sel.addEventListener('change', (e) => { currentAlgorithm = e.target.value; updateAlgorithmDescription(); updateFSMDisplay(); if (fsmState !== 'STOPPED') transitionTo('STOPPING'); });

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
